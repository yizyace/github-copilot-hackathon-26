import * as core   from '@actions/core';
import * as github from '@actions/github';
import * as fs     from 'fs';
import * as path   from 'path';
import { AnalysisContext } from './types';
import { commitFile } from './commitFile';

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
  const { prNumber, repoOwner, repoName } = context.input.prMetadata;

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

  // Pattern memory belongs on the default branch (main), not on PR branches —
  // observations accumulate there and are available to every future PR.
  const octokit          = github.getOctokit(core.getInput('github-token'));
  const { data: repo }   = await octokit.rest.repos.get({ owner: repoOwner, repo: repoName });
  const defaultBranch    = repo.default_branch;

  await commitFile({
    owner:   repoOwner,
    repo:    repoName,
    branch:  defaultBranch,
    path:    '.pattern-pointers.md',
    content,
    message: `chore: PatternBuddy updates pattern memory for PR #${prNumber}`
  });

  core.info(`PatternBuddy: Committed ${mdUpdates.length} update(s) to .pattern-pointers.md on ${defaultBranch}`);

  return context;
}
