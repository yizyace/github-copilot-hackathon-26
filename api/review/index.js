'use strict'

// POST /api/review
// Runs a "soul stack" code review through Claude, in the persona/lenses defined
// by the caller's SoulStack. Always returns HTTP 200 with a valid ReviewResult:
// if the API key is missing or anything fails, a deterministic stub is returned
// so the demo keeps working before secrets are wired up.

const SAMPLE_FILENAME = 'src/validation/slug.ts'
const SAMPLE_CODE = [
  'export function isSlug(slug: string): boolean {',
  '  // validate URL slug',
  '  return /^([a-z]+-?)+$/.test(slug)',
  '}',
].join('\n')

const DEFAULT_MODEL = 'claude-sonnet-4-6'

module.exports = async function (context, req) {
  const started = Date.now()
  const body = req.body || {}
  const stack = body.stack || {}
  const manifest = stack.manifest || {}
  const persona = manifest.persona || {}

  const filename =
    typeof body.filename === 'string' && body.filename ? body.filename : SAMPLE_FILENAME
  const code = typeof body.code === 'string' && body.code ? body.code : SAMPLE_CODE

  const enabledLenses = Array.isArray(manifest.lenses)
    ? manifest.lenses.filter((l) => l && l.enabled)
    : []
  const memories = Array.isArray(stack.journal) ? stack.journal : []

  const additions = code.split('\n').length

  const respond = (result) => {
    context.res = {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
      body: result,
    }
  }

  // --- Deterministic stub (used as graceful fallback) -----------------------
  const buildStub = (modelLabel) => {
    const lensSeed = enabledLenses[0] || { id: 'security', title: 'Security' }
    const redosLine = findRedosLine(code)
    const comment = {
      file: filename,
      line: redosLine,
      code: lineAt(code, redosLine),
      severity: 'blocking',
      label: 'ReDoS',
      body:
        "This regex nests a quantifier inside a group (`([a-z]+-?)+`), which is a " +
        'classic catastrophic-backtracking pattern. A crafted input can hang the event ' +
        'loop. Anchor and flatten the character class instead, e.g. `/^[a-z]+(?:-[a-z]+)*$/`.',
      citations: memories.slice(0, 1).map((m) => m.id).filter(Boolean),
    }
    return {
      persona: persona.displayName || 'Soul Reviewer',
      avatar: persona.avatar || '',
      verdict: 'comment',
      summary:
        "I took a pass through this with my lenses on. One thing stands out as worth a " +
        'second look before this ships — see the inline note.',
      comments: [comment],
      lenses: [
        {
          id: lensSeed.id,
          title: lensSeed.title,
          retrieved: memories.slice(0, 2).map((m, i) => ({
            id: m.id,
            type: m.type,
            source: 'human',
            score: 0.82 - i * 0.1,
            summary: m.summary || m.title || '',
          })),
          comments: [comment],
        },
      ],
      meta: {
        model: modelLabel,
        lensesRun: enabledLenses.length || 1,
        durationMs: Date.now() - started,
        diff: { file: filename, additions, deletions: 0 },
      },
    }
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    respond(buildStub('stub'))
    return
  }

  const model = manifest.models && manifest.models.review ? manifest.models.review : DEFAULT_MODEL

  // --- Build the persona/instructions system prompt -------------------------
  const lensBlock = enabledLenses
    .map(
      (l, i) =>
        `${i + 1}. [${l.id}] ${l.title}\n   Role: ${l.rolePrompt || ''}` +
        (l.rulesFocus ? `\n   Rules focus: ${l.rulesFocus}` : '') +
        (l.severityCeiling ? `\n   Severity ceiling: ${l.severityCeiling}` : ''),
    )
    .join('\n')

  const memoryBlock = memories
    .map((m) => `- id=${m.id} type=${m.type}: ${m.summary || m.title || ''}`)
    .join('\n')

  const system = [
    `You are ${persona.displayName || 'a senior code reviewer'}, reviewing code as a living persona.`,
    persona.tagline ? `Your tagline: "${persona.tagline}".` : '',
    stack.soul ? `Your identity (soul.md):\n${stack.soul}` : '',
    stack.ego ? `Your current ego/state:\n${stack.ego}` : '',
    stack.rules ? `Hard rules you enforce:\n${stack.rules}` : '',
    '',
    'You review through a set of LENSES. Run EACH enabled lens below in its role.',
    'You retrieve relevant MEMORIES (past journal entries) to ground your review;',
    'cite the memory ids each lens used.',
    '',
    'LENSES:',
    lensBlock || '1. [general] General review',
    '',
    'MEMORIES (retrievable):',
    memoryBlock || '(none)',
    '',
    'Respond with ONLY a single JSON object (no prose, no markdown fences) matching:',
    '{',
    '  "persona": string, "avatar": string,',
    '  "verdict": "approve" | "request_changes" | "comment",',
    '  "summary": string (written in your persona voice),',
    '  "comments": ReviewComment[],',
    '  "lenses": LensResult[],',
    '  "meta": { "model": string, "lensesRun": number, "durationMs": number, "diff": { "file": string, "additions": number, "deletions": number } }',
    '}',
    'ReviewComment = { "file": string, "line": number, "code"?: string, "severity": "blocking"|"non-blocking", "label": string, "body": string, "citations"?: string[] }',
    'LensResult = { "id": string, "title": string, "retrieved": RetrievedMemory[], "comments": ReviewComment[] }',
    'RetrievedMemory = { "id": string, "type": string, "source": "human"|"agent", "score": number (0..1), "summary": string }',
    'Rules: one LensResult per enabled lens; each lens cites which memory ids it retrieved with a plausible score 0..1;',
    'top-level "comments" aggregates the comments from all lenses; line numbers MUST refer to the provided code.',
    `Set persona="${persona.displayName || 'Soul Reviewer'}" and avatar="${persona.avatar || ''}".`,
  ]
    .filter((line) => line !== '')
    .join('\n')

  const userContent = [
    `File: ${filename}`,
    '```',
    code,
    '```',
    '',
    'Review the code above through every enabled lens and return the JSON object.',
  ].join('\n')

  try {
    const apiRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model,
        max_tokens: 2048,
        system,
        messages: [{ role: 'user', content: userContent }],
      }),
    })

    if (!apiRes.ok) {
      context.log('Anthropic API non-200:', apiRes.status)
      respond(buildStub('stub'))
      return
    }

    const payload = await apiRes.json()
    const text = (payload.content || [])
      .map((c) => (c && typeof c.text === 'string' ? c.text : ''))
      .join('')

    const result = parseReviewJson(text)
    if (!result) {
      respond(buildStub('stub'))
      return
    }

    // Backfill / normalise meta and persona regardless of what the model returned.
    result.persona = result.persona || persona.displayName || 'Soul Reviewer'
    result.avatar = result.avatar || persona.avatar || ''
    result.comments = Array.isArray(result.comments) ? result.comments : []
    result.lenses = Array.isArray(result.lenses) ? result.lenses : []
    result.meta = result.meta || {}
    result.meta.model = model
    result.meta.lensesRun = enabledLenses.length
    result.meta.durationMs = Date.now() - started
    result.meta.diff = { file: filename, additions, deletions: 0 }

    respond(result)
  } catch (err) {
    context.log('Review error:', err && err.message ? err.message : err)
    respond(buildStub('stub'))
  }
}

// --- helpers ----------------------------------------------------------------

function parseReviewJson(text) {
  if (!text) return null
  let cleaned = text.trim()
  // strip ```json ... ``` fences if present
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')
  const start = cleaned.indexOf('{')
  const end = cleaned.lastIndexOf('}')
  if (start === -1 || end === -1 || end < start) return null
  try {
    return JSON.parse(cleaned.slice(start, end + 1))
  } catch (e) {
    return null
  }
}

function findRedosLine(code) {
  const lines = code.split('\n')
  for (let i = 0; i < lines.length; i++) {
    if (/test\(|RegExp|\/\^|\.\*|\+\)\+|\+\?/.test(lines[i])) return i + 1
  }
  return Math.min(3, lines.length)
}

function lineAt(code, lineNo) {
  const lines = code.split('\n')
  return lines[lineNo - 1] || ''
}
