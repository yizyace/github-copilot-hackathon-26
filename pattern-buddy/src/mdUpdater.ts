import * as core   from '@actions/core';
import * as github from '@actions/github';
import * as fs     from 'fs';
import * as path   from 'path';
import { AnalysisContext } from './types';

const MD_PATH = path.join(process.cwd(), '.pattern-pointers.md');

const SECTION_HEADERS: Record<string, string> = {
  'factory-patterns':   '## Factory Patterns',
  'singleton-patterns': '## Singleton Patterns',
  'coupling-issues':    '## Coupling Issues',
  'solid-violations':   '## SOLID Violations',
  'dry-violations':     '## DRY Violations',
  'observer-patterns':  '## Observer Patterns',
  'best-practices':     '## Best Practices',
  'other':              '## Other'
};

function appendToSection(content: string, sectionHeader: string, entry: string): string {
  const idx = content.indexOf(sectionHeader);
  if (idx === -1) return content + `\n${sectionHeader}\n${entry}\n`;

  const afterHeader  = content.indexOf('\n', idx) + 1;
  const nextHeader   = content.indexOf('\n## ', afterHeader);
  const insertPoint  = nextHeader === -1 ? content.length : nextHeader;

  return content.slice(0, insertPoint) + entry + '\n' + content.slice(insertPoint);
}

export async function updateMD(context: AnalysisContext): Promise<AnalysisContext> {
  const { mdUpdates }  = context.output;
  const { prNumber, repoOwner, repoName, branch } = context.input.prMetadata;

  if (mdUpdates.length === 0) {
    core.info('PatternBuddy: No MD updates to commit.');
    return context;
  }

  let content = fs.existsSync(MD_PATH)
    ? fs.readFileSync(MD_PATH, 'utf8')
    : '';

  for (const update of mdUpdates) {
    const header = SECTION_HEADERS[update.category] ?? SECTION_HEADERS['other'];
    content = appendToSection(content, header, update.entry);
  }

  fs.writeFileSync(MD_PATH, content, 'utf8');

  const octokit   = github.getOctokit(core.getInput('github-token'));
  const encoded   = Buffer.from(content).toString('base64');

  const { data: existing } = await octokit.rest.repos.getContent({
    owner: repoOwner,
    repo:  repoName,
    path:  '.pattern-pointers.md',
    ref:   branch
  }) as unknown as { data: { sha: string } };

  await octokit.rest.repos.createOrUpdateFileContents({
    owner:   repoOwner,
    repo:    repoName,
    path:    '.pattern-pointers.md',
    message: `chore: PatternBuddy updates pattern memory for PR #${prNumber}`,
    content: encoded,
    sha:     existing.sha,
    branch
  });

  core.info(`PatternBuddy: Committed ${mdUpdates.length} update(s) to .pattern-pointers.md`);

  return context;
}
