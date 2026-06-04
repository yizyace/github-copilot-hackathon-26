/**
 * mention.ts — the @patternbuddy tuning handler.
 *
 * A teammate comments `@patternbuddy <instruction>` on a PR (e.g. "be stricter",
 * "switch to roast", "stop flagging factory patterns", "focus on coupling").
 * We:
 *   1. read the comment from `github.context.payload`; bot-loop guard on author
 *   2. strip the trigger; ask Claude to map NL → a structured `ApplyChange`
 *   3. dispatch the change by committing to the repo's *default branch* via the
 *      GitHub API (no backend):
 *        set_tone / set_strictness        → pattern-pointers.config.json
 *        enable_skill / disable_skill     → flip `enabled:` in skills/<slug>.md
 *        create_skill                     → write a new skills/<slug>.md
 *        none                             → explain only, no write
 *   4. reply on the PR thread confirming the change (or a friendly error)
 *
 * The Claude call reuses anthropicClient (createClient / ANTHROPIC_MODEL /
 * extractJSONObject) so we don't re-resolve the key. The commit pattern mirrors
 * mdUpdater.ts (default branch → getContent sha → createOrUpdateFileContents).
 */
import * as core   from '@actions/core';
import * as github from '@actions/github';
import { createClient, ANTHROPIC_MODEL, extractJSONObject } from './anthropicClient';

const TRIGGER = '@patternbuddy';
const CONFIG_PATH = 'pattern-pointers.config.json';
const SKILLS_DIR  = 'pattern-buddy/skills';

/** Slugs of the playbooks that ship with the action — given to Claude so it can
 *  map "stop flagging factory patterns" → disable_skill factory-singleton. */
const KNOWN_SKILL_SLUGS = [
  'abstraction-altitude',
  'circular-deps',
  'coupling',
  'dry',
  'factory-singleton',
  'solid',
] as const;

const TONES        = ['mentor', 'roast', 'zen'] as const;
const STRICTNESSES = ['strict', 'balanced', 'relaxed'] as const;
const CATEGORIES   = [
  'coupling',
  'solid',
  'dry',
  'factory_singleton',
  'circular_dependency',
  'other',
] as const;

const APPLY_ACTIONS = [
  'set_tone',
  'set_strictness',
  'enable_skill',
  'disable_skill',
  'create_skill',
  'none',
] as const;

export type ApplyAction = (typeof APPLY_ACTIONS)[number];

export interface ApplyChange {
  action:         ApplyAction;
  tone?:          string;
  strictness?:    string;
  skill_slug?:    string;
  skill_name?:    string;
  skill_category?: string;
  rule_markdown?: string;
  human_summary:  string;
}

export interface Config {
  tone:       string;
  strictness: string;
}

const DEFAULT_CONFIG: Config = { tone: 'mentor', strictness: 'balanced' };

// --- Pure helpers (exported for unit tests) ---------------------------------

/** Remove every occurrence of the trigger token, collapse whitespace, trim. */
export function stripTrigger(body: string, trigger: string = TRIGGER): string {
  return body.split(trigger).join(' ').replace(/\s+/g, ' ').trim();
}

/**
 * Flip the `enabled:` line in a skill file's frontmatter to `enabled` and return
 * the new content. Tolerates `true`/`false` (any case), surrounding spaces, and
 * an optional trailing comment; preserves the file's existing line endings
 * (CRLF-safe). When no `enabled:` line exists inside the frontmatter, one is
 * inserted as the last frontmatter line.
 */
export function setSkillEnabled(fileContent: string, enabled: boolean): string {
  const value = enabled ? 'true' : 'false';
  // Match an `enabled:` line anywhere (frontmatter is the only place it appears),
  // capturing its leading indentation and trailing line break so we can rewrite
  // just the value while keeping CR/LF intact.
  const line = /^([ \t]*)enabled[ \t]*:[ \t]*\S+([ \t]*)(\r?\n|\r|$)/m;
  if (line.test(fileContent)) {
    return fileContent.replace(line, (_m, indent, _trail, eol) => `${indent}enabled: ${value}${eol}`);
  }

  // No enabled: line — insert one as the last line of the frontmatter block.
  const fm = /^(---\s*(?:\r\n|\r|\n)[\s\S]*?)(\r\n|\r|\n)(---\s*(?:\r\n|\r|\n|$))/;
  const m = fm.exec(fileContent);
  if (m) {
    const eol = m[2];
    return fileContent.replace(fm, `$1${eol}enabled: ${value}$2$3`);
  }
  return fileContent;
}

/** Build a complete skill markdown file (frontmatter + body) for a new skill. */
export function buildSkillFile(args: { slug: string; name: string; category: string; body: string }): string {
  const category = (CATEGORIES as readonly string[]).includes(args.category) ? args.category : 'other';
  const body = args.body.trim();
  return (
    `---\n` +
    `slug: ${args.slug}\n` +
    `name: ${args.name}\n` +
    `category: ${category}\n` +
    `severity_ceiling: major\n` +
    `enabled: true\n` +
    `---\n\n` +
    `${body}\n`
  );
}

/**
 * Extract JSON from a model response and validate it as an {@link ApplyChange}.
 * Returns `null` when the JSON is unparseable, `action` is not in the enum, or
 * `human_summary` is not a string.
 */
export function parseApplyChange(raw: string): ApplyChange | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(extractJSONObject(raw));
  } catch {
    return null;
  }
  if (typeof parsed !== 'object' || parsed === null) return null;
  const obj = parsed as Record<string, unknown>;
  if (typeof obj.action !== 'string' || !(APPLY_ACTIONS as readonly string[]).includes(obj.action)) {
    return null;
  }
  if (typeof obj.human_summary !== 'string') return null;

  const out: ApplyChange = {
    action:        obj.action as ApplyAction,
    human_summary: obj.human_summary,
  };
  if (typeof obj.tone === 'string')           out.tone = obj.tone;
  if (typeof obj.strictness === 'string')     out.strictness = obj.strictness;
  if (typeof obj.skill_slug === 'string')     out.skill_slug = obj.skill_slug;
  if (typeof obj.skill_name === 'string')     out.skill_name = obj.skill_name;
  if (typeof obj.skill_category === 'string') out.skill_category = obj.skill_category;
  if (typeof obj.rule_markdown === 'string')  out.rule_markdown = obj.rule_markdown;
  return out;
}

/** Prompt Claude to translate a free-text instruction into an ApplyChange JSON. */
export function buildMentionPrompt(instruction: string): string {
  return [
    'You are PatternBuddy, a GitHub Action that reviews pull requests for software-design',
    'pattern problems. A teammate has mentioned you in a PR comment with an instruction to',
    'tune your behavior. Translate that instruction into exactly ONE structured change.',
    '',
    'Reply with ONLY a single JSON object (no prose, no code fences) of this shape:',
    '{',
    '  "action": "set_tone" | "set_strictness" | "enable_skill" | "disable_skill" | "create_skill" | "none",',
    `  "tone": ${TONES.map(t => `"${t}"`).join(' | ')},                 // only for set_tone`,
    `  "strictness": ${STRICTNESSES.map(s => `"${s}"`).join(' | ')},    // only for set_strictness`,
    '  "skill_slug": "<one of the known slugs>",       // for enable_skill/disable_skill/create_skill',
    '  "skill_name": "<human name>",                   // for create_skill',
    `  "skill_category": ${CATEGORIES.map(c => `"${c}"`).join(' | ')},  // for create_skill`,
    '  "rule_markdown": "<markdown body>",             // for create_skill',
    '  "human_summary": "<one short sentence confirming what you changed, in the first person>"',
    '}',
    '',
    'Rules:',
    `- Valid tones: ${TONES.join(', ')}. Valid strictness levels: ${STRICTNESSES.join(', ')}.`,
    `- Known skill slugs you may enable/disable: ${KNOWN_SKILL_SLUGS.join(', ')}.`,
    '- "be stricter"/"be more strict" → set_strictness strict. "relax"/"chill" → set_strictness relaxed.',
    '- "switch to roast"/"roast me" → set_tone roast. "be gentle"/"mentor" → set_tone mentor. "zen" → set_tone zen.',
    '- "stop flagging factory patterns"/"ignore singletons" → disable_skill factory-singleton.',
    '- "focus on coupling"/"care about coupling more" → enable_skill coupling.',
    '- "stop checking circular deps" → disable_skill circular-deps.',
    '- Map the instruction to the closest known slug. Only use create_skill when the instruction',
    '  describes a genuinely new rule not covered by a known slug; invent a short kebab-case slug.',
    '- If you cannot confidently interpret the instruction, use action "none" and explain why in human_summary.',
    '- human_summary is REQUIRED and must always be a friendly one-liner.',
    '',
    `Instruction: ${instruction}`,
  ].join('\n');
}

// --- GitHub API helpers (impure) --------------------------------------------

type Octokit = ReturnType<typeof github.getOctokit>;

interface RepoRef { owner: string; repo: string; }

async function getDefaultBranch(octokit: Octokit, ref: RepoRef): Promise<string> {
  const { data } = await octokit.rest.repos.get({ owner: ref.owner, repo: ref.repo });
  return data.default_branch;
}

interface RemoteFile { content: string; sha: string | undefined; }

/** Read a file from a branch. Returns sha=undefined (404) so callers can create it. */
async function readFile(octokit: Octokit, ref: RepoRef, path: string, branch: string): Promise<RemoteFile> {
  try {
    const { data } = await octokit.rest.repos.getContent({
      owner: ref.owner, repo: ref.repo, path, ref: branch,
    }) as unknown as { data: { sha: string; content: string } };
    return { content: Buffer.from(data.content, 'base64').toString('utf8'), sha: data.sha };
  } catch (err) {
    if ((err as { status?: number }).status === 404) return { content: '', sha: undefined };
    throw err;
  }
}

async function commitFile(
  octokit: Octokit,
  ref: RepoRef,
  path: string,
  content: string,
  message: string,
  branch: string,
  sha: string | undefined,
): Promise<void> {
  await octokit.rest.repos.createOrUpdateFileContents({
    owner: ref.owner, repo: ref.repo, path,
    message,
    content: Buffer.from(content).toString('base64'),
    sha,
    branch,
  });
}

/** Class used to short-circuit dispatch with a user-facing message (e.g. skill 404). */
class DispatchError extends Error {}

/** Allowed skill-slug shape: lowercase kebab-case, ≤64 chars. The slug comes
 *  from model output (influenced by the comment), so this guards the file path
 *  against traversal — e.g. a slug of `../../.github/workflows/x` must be rejected
 *  before it's ever joined into a path the bot can write with `contents: write`. */
export const SAFE_SLUG = /^[a-z0-9][a-z0-9-]{0,63}$/;

export function safeSlug(slug: string): string {
  if (!SAFE_SLUG.test(slug)) {
    throw new DispatchError(`\`${slug}\` isn't a valid skill name (use lowercase letters, numbers, and hyphens), so nothing changed.`);
  }
  return slug;
}

/**
 * Apply the structured change by committing to the default branch.
 * Returns a confirmation message to post back. Throws {@link DispatchError} for
 * expected, user-facing problems (e.g. the skill doesn't exist).
 */
async function dispatch(
  octokit: Octokit,
  ref: RepoRef,
  branch: string,
  change: ApplyChange,
  commitMsg: string,
): Promise<string> {
  switch (change.action) {
    case 'set_tone':
    case 'set_strictness': {
      const file = await readFile(octokit, ref, CONFIG_PATH, branch);
      let config: Config = { ...DEFAULT_CONFIG };
      if (file.content.trim()) {
        try {
          config = { ...DEFAULT_CONFIG, ...(JSON.parse(file.content) as Partial<Config>) };
        } catch {
          // Corrupt config — fall back to defaults rather than failing the run.
          config = { ...DEFAULT_CONFIG };
        }
      }
      if (change.action === 'set_tone') {
        if (!change.tone || !(TONES as readonly string[]).includes(change.tone)) {
          throw new DispatchError("I understood a tone change but couldn't tell which tone, so nothing changed.");
        }
        config.tone = change.tone;
      } else {
        if (!change.strictness || !(STRICTNESSES as readonly string[]).includes(change.strictness)) {
          throw new DispatchError("I understood a strictness change but couldn't tell the level, so nothing changed.");
        }
        config.strictness = change.strictness;
      }
      const body = JSON.stringify(config, null, 2) + '\n';
      await commitFile(octokit, ref, CONFIG_PATH, body, commitMsg, branch, file.sha);
      return change.human_summary;
    }

    case 'enable_skill':
    case 'disable_skill': {
      if (!change.skill_slug) {
        throw new DispatchError("I couldn't tell which skill to toggle, so nothing changed.");
      }
      const slug = safeSlug(change.skill_slug);
      const path = `${SKILLS_DIR}/${slug}.md`;
      const file = await readFile(octokit, ref, path, branch);
      if (file.sha === undefined) {
        throw new DispatchError(`I couldn't find a skill called \`${slug}\`, so nothing changed.`);
      }
      const updated = setSkillEnabled(file.content, change.action === 'enable_skill');
      await commitFile(octokit, ref, path, updated, commitMsg, branch, file.sha);
      return change.human_summary;
    }

    case 'create_skill': {
      if (!change.skill_slug || !change.skill_name || !change.rule_markdown) {
        throw new DispatchError('I need a slug, a name, and the rule text to create a skill, so nothing changed.');
      }
      const slug = safeSlug(change.skill_slug);
      const path = `${SKILLS_DIR}/${slug}.md`;
      const existing = await readFile(octokit, ref, path, branch);
      if (existing.sha !== undefined) {
        throw new DispatchError(`A skill called \`${slug}\` already exists — say "enable ${slug}" to turn it on instead.`);
      }
      const body = buildSkillFile({
        slug,
        name:     change.skill_name,
        category: change.skill_category ?? 'other',
        body:     change.rule_markdown,
      });
      await commitFile(octokit, ref, path, body, commitMsg, branch, existing.sha);
      return change.human_summary;
    }

    case 'none':
    default:
      return change.human_summary;
  }
}

/** Ask Claude to interpret the instruction; null on any parse/validation failure. */
async function interpret(instruction: string): Promise<ApplyChange | null> {
  const client = createClient();
  const message = await client.messages.create({
    model:      ANTHROPIC_MODEL,
    max_tokens: 1024,
    messages: [{ role: 'user', content: buildMentionPrompt(instruction) }],
  });
  const block = message.content[0];
  if (!block || block.type !== 'text') return null;
  return parseApplyChange(block.text);
}

// --- Entry point ------------------------------------------------------------

export async function runMention(): Promise<void> {
  const { payload, repo } = github.context;
  const comment = payload.comment;

  if (!comment) {
    core.info('PatternBuddy mention: no comment in payload; nothing to do.');
    return;
  }

  // --- 1. loop guard: never react to a bot's own comment ---
  if (comment.user?.type === 'Bot') {
    core.info('PatternBuddy mention: comment authored by a bot; ignoring (loop guard).');
    return;
  }

  const prNumber: number | undefined = payload.issue?.number ?? payload.pull_request?.number;
  if (!prNumber) {
    core.info('PatternBuddy mention: no PR number in payload; nothing to do.');
    return;
  }

  const octokit = github.getOctokit(core.getInput('github-token'));
  const body = String(comment.body ?? '');
  const instruction = stripTrigger(body, TRIGGER);

  const reply = async (text: string): Promise<void> => {
    await octokit.rest.issues.createComment({
      owner: repo.owner, repo: repo.repo, issue_number: prNumber, body: text,
    });
  };

  if (!instruction) {
    await reply(
      'Hi! Mention me with an instruction, e.g. `@patternbuddy be stricter`, ' +
      '`@patternbuddy switch to roast`, or `@patternbuddy stop flagging factory patterns`.',
    );
    return;
  }

  try {
    const change = await interpret(instruction);
    if (!change) {
      await reply(
        "**PatternBuddy:** I couldn't confidently interpret that, so I didn't change anything. " +
        'Try e.g. "be stricter", "switch to roast", or "focus on coupling".',
      );
      return;
    }

    const branch = await getDefaultBranch(octokit, repo);
    // GITHUB_TOKEN commits don't re-trigger workflows ([skip ci] is just belt-and-
    // suspenders); loop safety on our *reply* comes from the workflow's
    // user.type != 'Bot' gate. Truncate + quote-strip the user text for a tidy log.
    const shortInstruction = instruction.replace(/"/g, "'").replace(/\s+/g, ' ').slice(0, 120);
    const commitMsg = `chore: PatternBuddy applies "${shortInstruction}" from PR #${prNumber} [skip ci]`;
    const note = await dispatch(octokit, repo, branch, change, commitMsg);

    const hint = change.action === 'none' ? '' : '\n\nThe next review will use these settings.';
    await reply(`**PatternBuddy:** ${note}${hint}`);
    core.info(`PatternBuddy mention: action=${change.action} → "${note}"`);
  } catch (err) {
    if (err instanceof DispatchError) {
      await reply(`**PatternBuddy:** ${err.message}`);
      core.info(`PatternBuddy mention: ${err.message}`);
      return;
    }
    const msg = err instanceof Error ? err.message : String(err);
    await reply(`**PatternBuddy:** I hit an error trying to apply that: ${msg}`);
    core.warning(`PatternBuddy mention failed: ${msg}`);
  }
}

if (require.main === module) {
  runMention().catch((err) => {
    core.setFailed(`PatternBuddy mention failed: ${err instanceof Error ? err.message : String(err)}`);
  });
}
