// Pattern Pointers — PR analysis engine (POC, decision #5).
//
// Reads the diff of a pull request, asks Claude to identify higher-order
// software-engineering patterns (SOLID, coupling, factories, DRY, ...), and
// posts the findings back as INLINE review comments anchored to the diff lines.
//
// This is the minimal first cut: no .pattern-pointers.md memory layer and no
// tone/strictness config yet (those are decisions #3 and #9). It exists to
// prove the PR -> Action -> Claude -> inline-comment loop end to end.
//
// Dependency-free on purpose: plain ESM, Node 22 global fetch, no SDK install.
// Required env: ANTHROPIC_API_KEY, GITHUB_TOKEN, GITHUB_REPOSITORY, PR_NUMBER.

const {
  ANTHROPIC_API_KEY,
  GITHUB_TOKEN,
  GITHUB_REPOSITORY,
  PR_NUMBER,
  ANTHROPIC_MODEL = "claude-sonnet-4-6",
} = process.env;

const GITHUB_API = "https://api.github.com";
const ANTHROPIC_API = "https://api.anthropic.com/v1/messages";

function requireEnv() {
  const missing = ["ANTHROPIC_API_KEY", "GITHUB_TOKEN", "GITHUB_REPOSITORY", "PR_NUMBER"].filter(
    (k) => !process.env[k],
  );
  if (missing.length) {
    console.error(`Missing required env: ${missing.join(", ")}`);
    process.exit(1);
  }
}

// --- GitHub helpers ---------------------------------------------------------

async function gh(path, init = {}) {
  const res = await fetch(`${GITHUB_API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });
  if (!res.ok) {
    throw new Error(`GitHub ${init.method || "GET"} ${path} -> ${res.status}: ${await res.text()}`);
  }
  return res.status === 204 ? null : res.json();
}

async function listPrFiles(owner, repo, pull) {
  const files = [];
  for (let page = 1; ; page++) {
    const batch = await gh(`/repos/${owner}/${repo}/pulls/${pull}/files?per_page=100&page=${page}`);
    files.push(...batch);
    if (batch.length < 100) break;
  }
  return files;
}

// --- Diff parsing -----------------------------------------------------------

// Parse a unified-diff `patch` into the new-file line numbers we can comment on
// (the RIGHT side of the diff: added + context lines), and an annotated render
// with explicit line numbers so Claude can cite exact lines reliably.
function parsePatch(patch) {
  const commentable = new Set(); // new-file line numbers valid as review targets
  const rendered = [];
  let newLine = 0;

  for (const raw of patch.split("\n")) {
    const hunk = raw.match(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
    if (hunk) {
      newLine = parseInt(hunk[1], 10);
      rendered.push(`      ${raw}`);
      continue;
    }
    if (raw.startsWith("+")) {
      commentable.add(newLine);
      rendered.push(`${String(newLine).padStart(5)} + ${raw.slice(1)}`);
      newLine++;
    } else if (raw.startsWith("-")) {
      rendered.push(`      - ${raw.slice(1)}`); // removed: no new-file line number
    } else {
      // context line: present in the new file, valid comment target
      commentable.add(newLine);
      rendered.push(`${String(newLine).padStart(5)}   ${raw.slice(1)}`);
      newLine++;
    }
  }

  return { commentable, rendered: rendered.join("\n") };
}

// --- Claude -----------------------------------------------------------------

const SYSTEM_PROMPT = `You are Pattern Pointers, a senior engineer reviewing a pull request for
higher-order software-engineering patterns — SOLID violations, tight coupling,
circular dependencies, DRY issues, factory/singleton/observer patterns, and
similar architectural concerns.

Scope is strictly methodology and structure. Do NOT comment on syntax, style,
formatting, naming nitpicks, or anything a linter would catch.

You receive the changed files of a PR. Each line is prefixed with its line
number in the new file. You may only attach a comment to a line that has a
number shown.

Respond with ONLY a JSON object, no prose and no markdown fences:
{
  "observations": [
    { "path": "<file path>", "line": <numbered line>, "category": "<e.g. Coupling>", "comment": "<plain-language observation>" }
  ]
}
Return an empty observations array if nothing rises to the level of an
architectural observation. Be selective: quality over quantity.`;

async function analyze(diffText) {
  const res = await fetch(ANTHROPIC_API, {
    method: "POST",
    headers: {
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: `Analyze this pull request diff:\n\n${diffText}` }],
    }),
  });
  if (!res.ok) {
    throw new Error(`Anthropic ${res.status}: ${await res.text()}`);
  }
  const data = await res.json();
  const text = (data.content || []).map((b) => b.text || "").join("");
  return parseObservations(text);
}

// Claude is instructed to return raw JSON, but be defensive about fences/prose.
function parseObservations(text) {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1) return [];
  try {
    const parsed = JSON.parse(text.slice(start, end + 1));
    return Array.isArray(parsed.observations) ? parsed.observations : [];
  } catch {
    console.error("Could not parse Claude response as JSON:\n", text);
    return [];
  }
}

// --- Main -------------------------------------------------------------------

async function main() {
  requireEnv();
  const [owner, repo] = GITHUB_REPOSITORY.split("/");
  const pull = PR_NUMBER;

  const files = await listPrFiles(owner, repo, pull);
  const commentableByPath = new Map();
  const sections = [];

  for (const file of files) {
    if (!file.patch) continue; // binary or too-large; nothing to comment on
    const { commentable, rendered } = parsePatch(file.patch);
    commentableByPath.set(file.filename, commentable);
    sections.push(`File: ${file.filename}\n${rendered}`);
  }

  if (!sections.length) {
    console.log("No textual diff to analyze; nothing to do.");
    return;
  }

  const observations = await analyze(sections.join("\n\n"));
  console.log(`Claude returned ${observations.length} observation(s).`);

  // Keep only observations anchored to a line we can actually comment on.
  const comments = [];
  for (const obs of observations) {
    const commentable = commentableByPath.get(obs.path);
    if (commentable && commentable.has(obs.line)) {
      comments.push({
        path: obs.path,
        line: obs.line,
        side: "RIGHT",
        body: `**${obs.category || "Pattern"}** — ${obs.comment}`,
      });
    } else {
      console.warn(`Dropping observation on un-commentable ${obs.path}:${obs.line}`);
    }
  }

  if (!comments.length) {
    await gh(`/repos/${owner}/${repo}/issues/${pull}/comments`, {
      method: "POST",
      body: JSON.stringify({
        body: "🧭 **Pattern Pointers**: no notable architectural patterns in this diff.",
      }),
    });
    console.log("Posted summary comment (no inline findings).");
    return;
  }

  await gh(`/repos/${owner}/${repo}/pulls/${pull}/reviews`, {
    method: "POST",
    body: JSON.stringify({
      event: "COMMENT",
      body: `🧭 **Pattern Pointers** found ${comments.length} pattern observation(s).`,
      comments,
    }),
  });
  console.log(`Posted review with ${comments.length} inline comment(s).`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
