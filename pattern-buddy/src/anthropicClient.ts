import Anthropic from '@anthropic-ai/sdk';
import * as core from '@actions/core';

export const ANTHROPIC_MODEL = 'claude-sonnet-4-6';

/**
 * Resolve and validate the Anthropic API key from the action input or env.
 * Throws a user-facing error when missing or obviously malformed.
 */
export function resolveApiKey(): string {
  const apiKey = core.getInput('anthropic-api-key') || process.env.ANTHROPIC_API_KEY || '';
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY secret is not set or is empty. Add it under repo Settings → Secrets → Actions.');
  }
  if (!apiKey.startsWith('sk-ant-')) {
    throw new Error(`ANTHROPIC_API_KEY looks incorrect — expected it to start with "sk-ant-" but got a key starting with "${apiKey.slice(0, 6)}...". Check the secret value.`);
  }
  return apiKey;
}

/** Construct an Anthropic client with a validated key. */
export function createClient(): Anthropic {
  return new Anthropic({ apiKey: resolveApiKey() });
}

/**
 * Extract the first JSON object from a model response, tolerating ```json fences
 * or surrounding prose. Returns the raw JSON substring (caller parses it).
 */
export function extractJSONObject(raw: string): string {
  const trimmed = raw.trim();
  const fenced  = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) return fenced[1].trim();
  const start = trimmed.indexOf('{');
  const end   = trimmed.lastIndexOf('}');
  if (start !== -1 && end > start) return trimmed.slice(start, end + 1);
  return trimmed;
}
