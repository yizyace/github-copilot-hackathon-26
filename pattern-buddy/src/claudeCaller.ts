import * as core from '@actions/core';
import { AnalysisContext, Finding, AnalysisPayload } from './types';
import { buildPrompt } from './prompt.template';
import { createAnthropicClient } from './anthropicClient';
import { extractJson } from './extractJson';

function validateFinding(obj: unknown): obj is Finding {
  if (typeof obj !== 'object' || obj === null) return false;
  const f = obj as Record<string, unknown>;
  return (
    typeof f.patternName   === 'string' &&
    typeof f.category      === 'string' &&
    typeof f.severity      === 'string' &&
    typeof f.filePath      === 'string' &&
    typeof f.lineStart     === 'number' &&
    typeof f.lineEnd       === 'number' &&
    typeof f.observation   === 'string' &&
    typeof f.suggestion    === 'string' &&
    typeof f.mdSection     === 'string' &&
    typeof f.isRecurring   === 'boolean'
  );
}

function parseFindings(raw: string): Finding[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(extractJson(raw));
  } catch {
    core.error(`PatternBuddy: Claude returned unparseable JSON.\nRaw response:\n${raw}`);
    throw new Error('Claude response could not be parsed as JSON.');
  }

  if (!Array.isArray(parsed)) {
    core.error(`PatternBuddy: Claude response was not a JSON array.\nRaw response:\n${raw}`);
    throw new Error('Claude response was not a JSON array.');
  }

  const valid = parsed.filter(validateFinding);
  if (valid.length < parsed.length) {
    core.warning(`PatternBuddy: ${parsed.length - valid.length} finding(s) failed validation and were dropped.`);
  }

  return valid;
}

export async function callClaude(context: AnalysisContext): Promise<AnalysisContext> {
  const client = createAnthropicClient();
  const prompt = buildPrompt(context);

  const message = await client.messages.create({
    model:      'claude-sonnet-4-6',
    max_tokens: 4096,
    messages: [
      {
        role:    'user',
        content: prompt
      }
    ]
  });

  const rawContent = message.content[0];
  if (rawContent.type !== 'text') {
    throw new Error('Unexpected Claude response type — expected text block.');
  }

  const findings = parseFindings(rawContent.text);

  const analysis: AnalysisPayload = { findings };

  return {
    ...context,
    analysis
  };
}
