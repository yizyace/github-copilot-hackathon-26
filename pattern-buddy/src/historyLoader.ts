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

const SECTION_KEYWORDS: Record<string, string[]> = {
  'factory-patterns':   ['factory', 'create', 'builder', 'instantiat'],
  'singleton-patterns': ['singleton', 'instance', 'static'],
  'coupling-issues':    ['import', 'require', 'depend', 'inject', 'coupled'],
  'solid-violations':   ['solid', 'single', 'responsibility', 'open', 'closed', 'liskov', 'interface', 'dependency'],
  'dry-violations':     ['duplicate', 'repeat', 'copy', 'dry'],
  'observer-patterns':  ['event', 'listener', 'subscribe', 'observer', 'emit'],
  'best-practices':     ['best', 'practice', 'pattern', 'principle'],
  'other':              []
};

function extractSections(content: string, relevantSections: string[]): string {
  const lines    = content.split('\n');
  const result:  string[] = [];
  let   current: string | null = null;
  let   capture  = false;

  for (const line of lines) {
    const headingMatch = line.match(/^## (.+)$/);
    if (headingMatch) {
      const sectionSlug = headingMatch[1].toLowerCase().replace(/\s+/g, '-');
      current = sectionSlug;
      capture = relevantSections.includes(sectionSlug);
      if (capture) result.push(line);
    } else if (capture && current) {
      result.push(line);
    }
  }

  return result.join('\n').trim();
}

function getRelevantSections(filesChanged: string[]): string[] {
  const relevant = new Set<string>();
  const allFiles = filesChanged.join(' ').toLowerCase();

  for (const [section, keywords] of Object.entries(SECTION_KEYWORDS)) {
    if (section === 'other') continue;
    if (keywords.some(kw => allFiles.includes(kw))) {
      relevant.add(section);
    }
  }

  // Always include coupling-issues and solid-violations — universally relevant
  relevant.add('coupling-issues');
  relevant.add('solid-violations');

  return Array.from(relevant);
}

export async function loadHistory(context: AnalysisContext): Promise<AnalysisContext> {
  if (!fs.existsSync(MD_PATH)) {
    core.info('PatternBuddy: No .pattern-pointers.md found. Creating from template.');
    fs.writeFileSync(MD_PATH, COLD_START_TEMPLATE, 'utf8');
    return {
      ...context,
      input: { ...context.input, history: '' }
    };
  }

  const content          = fs.readFileSync(MD_PATH, 'utf8');
  const relevantSections = getRelevantSections(context.input.prMetadata.filesChanged);
  const history          = extractSections(content, relevantSections);

  core.info(`PatternBuddy: Loaded history sections: ${relevantSections.join(', ')}`);

  return {
    ...context,
    input: { ...context.input, history }
  };
}
