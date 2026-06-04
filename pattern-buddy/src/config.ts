import * as core from '@actions/core';
import * as fs   from 'fs';
import * as path from 'path';
import { BuddyConfig } from './types';

export const DEFAULT_CONFIG: BuddyConfig = {
  tone:       'mentor',
  strictness: 'balanced',
  architectureMap: {
    enabled:  false,
    output:   'docs/architecture.md',
    updateOn: 'merge'
  }
};

/** Raw shape of pattern-pointers.config.json (snake_case as written on disk). */
interface RawConfig {
  tone?:       BuddyConfig['tone'];
  strictness?: BuddyConfig['strictness'];
  architecture_map?: {
    enabled?:   boolean;
    output?:    string;
    update_on?: 'merge' | 'open';
  };
}

export function loadConfig(): BuddyConfig {
  const configPath = path.join(process.cwd(), 'pattern-pointers.config.json');
  if (!fs.existsSync(configPath)) {
    core.info('PatternBuddy: No config file found. Using defaults (mentor / balanced).');
    return DEFAULT_CONFIG;
  }
  try {
    const raw    = fs.readFileSync(configPath, 'utf8');
    const parsed = JSON.parse(raw) as RawConfig;
    const am     = parsed.architecture_map ?? {};
    return {
      tone:       parsed.tone       ?? DEFAULT_CONFIG.tone,
      strictness: parsed.strictness ?? DEFAULT_CONFIG.strictness,
      architectureMap: {
        enabled:  am.enabled   ?? DEFAULT_CONFIG.architectureMap.enabled,
        output:   am.output    ?? DEFAULT_CONFIG.architectureMap.output,
        updateOn: am.update_on ?? DEFAULT_CONFIG.architectureMap.updateOn
      }
    };
  } catch {
    core.warning('PatternBuddy: Config file is malformed. Using defaults.');
    return DEFAULT_CONFIG;
  }
}
