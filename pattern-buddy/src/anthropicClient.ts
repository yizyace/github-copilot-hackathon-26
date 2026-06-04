import Anthropic from '@anthropic-ai/sdk';
import * as core from '@actions/core';

/**
 * Resolves the Anthropic API key from the Action inputs / environment and
 * returns a configured client. Centralising this keeps the runtime-environment
 * coupling out of the business-logic modules that call Claude.
 */
export function createAnthropicClient(): Anthropic {
  const apiKey = core.getInput('anthropic-api-key') || process.env.ANTHROPIC_API_KEY || '';

  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY secret is not set or is empty. Add it under repo Settings → Secrets → Actions.');
  }
  if (!apiKey.startsWith('sk-ant-')) {
    throw new Error(`ANTHROPIC_API_KEY looks incorrect — expected it to start with "sk-ant-" but got a key starting with "${apiKey.slice(0, 6)}...". Check the secret value.`);
  }

  core.info(`PatternBuddy: Anthropic API key resolved: yes (length ${apiKey.length}, prefix ok)`);
  return new Anthropic({ apiKey });
}
