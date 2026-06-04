import * as core from '@actions/core';
import * as fs   from 'fs';
import * as path from 'path';
import { AnalysisContext } from './types';

const MD_PATH = path.join(process.cwd(), '.pattern-pointers.md');

const COLD_START_TEMPLATE = `# PatternBuddy — Pattern Memory

> This file is maintained automatically by PatternBuddy. You can read, edit, and add to it.
> Each entry links back to the PR where the pattern was first observed.

## Factory Patterns

## Singleton Patterns

## Coupling Issues

## SOLID Violations

## DRY Violations

## Observer Patterns

## Best Practices

## Other
`;

export async function loadHistory(context: AnalysisContext): Promise<AnalysisContext> {
  if (!fs.existsSync(MD_PATH)) {
    core.info('PatternBuddy: No .pattern-pointers.md found. Creating from template.');
    fs.writeFileSync(MD_PATH, COLD_START_TEMPLATE, 'utf8');
    return {
      ...context,
      input: { ...context.input, history: '' }
    };
  }

  // The memory file is small, so load it whole. The previous keyword-on-filepath
  // selection almost always collapsed to just coupling + SOLID, starving the
  // model of relevant prior patterns. Only pass history once there's a real
  // entry (a "- " bullet); a bare template stays empty so the prompt's
  // "no history yet" path still kicks in on fresh repos.
  const content    = fs.readFileSync(MD_PATH, 'utf8');
  const hasEntries = /^\s*-\s+/m.test(content);
  const history    = hasEntries ? content.trim() : '';

  core.info(hasEntries
    ? 'PatternBuddy: Loaded full pattern history.'
    : 'PatternBuddy: Pattern memory has no entries yet.');

  return {
    ...context,
    input: { ...context.input, history }
  };
}
