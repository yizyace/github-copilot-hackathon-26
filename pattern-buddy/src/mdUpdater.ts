import * as core   from '@actions/core';
import * as github from '@actions/github';
import * as fs     from 'fs';
import * as path   from 'path';
import { AnalysisContext, MDUpdate } from './types';

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

// Stable identity of a memory entry, independent of PR number and of Claude's
// run-to-run observation wording. Matches the prefix emitted by
// outputBuilder.buildMDEntry(); the trailing en-dash after lineStart stops
// "4" from matching "42".
function entrySignature(update: MDUpdate): string {
  return `**${update.patternName}** in \`${update.filePath}\` (lines ${update.lineStart}–`;
}

export async function updateMD(context: AnalysisContext): Promise<AnalysisContext> {
  const { mdUpdates }  = context.output;
  const { prNumber, repoOwner, repoName } = context.input.prMetadata;

  if (mdUpdates.length === 0) {
    core.info('PatternBuddy: No MD updates to commit.');
    return context;
  }

  const octokit = github.getOctokit(core.getInput('github-token'));

  // Pattern memory is the source of truth on the default branch. Read, update,
  // and commit it *there* so PRs build on the latest memory instead of
  // overwriting it with a (possibly stale) copy from the PR branch.
  const { data: repo } = await octokit.rest.repos.get({ owner: repoOwner, repo: repoName });
  const defaultBranch  = repo.default_branch;

  let baseContent = '';
  let existingSha: string | undefined;
  try {
    const { data: existing } = await octokit.rest.repos.getContent({
      owner: repoOwner,
      repo:  repoName,
      path:  '.pattern-pointers.md',
      ref:   defaultBranch
    }) as unknown as { data: { sha: string; content: string } };
    existingSha = existing.sha;
    baseContent = Buffer.from(existing.content, 'base64').toString('utf8');
  } catch {
    // Cold start: no memory on the default branch yet. Seed from the local copy
    // (historyLoader writes a template) so the committed file keeps its sections.
    baseContent = fs.existsSync(MD_PATH) ? fs.readFileSync(MD_PATH, 'utf8') : '';
    core.info('PatternBuddy: .pattern-pointers.md not found on default branch — creating it.');
  }

  let content = baseContent;
  let added   = 0;
  for (const update of mdUpdates) {
    if (content.includes(entrySignature(update))) {
      core.info(`PatternBuddy: Skipping duplicate memory entry (${update.patternName} @ ${update.filePath}:${update.lineStart}).`);
      continue;
    }
    const header = SECTION_HEADERS[update.category] ?? SECTION_HEADERS['other'];
    content = appendToSection(content, header, update.entry);
    added++;
  }

  if (added === 0) {
    core.info('PatternBuddy: No new memory entries — all findings already recorded.');
    return context;
  }

  // Keep the local working copy in sync; historyLoader reads it within this run.
  fs.writeFileSync(MD_PATH, content, 'utf8');

  await octokit.rest.repos.createOrUpdateFileContents({
    owner:   repoOwner,
    repo:    repoName,
    path:    '.pattern-pointers.md',
    message: `chore: PatternBuddy updates pattern memory for PR #${prNumber}`,
    content: Buffer.from(content).toString('base64'),
    sha:     existingSha,
    branch:  defaultBranch
  });

  core.info(`PatternBuddy: Committed ${added} new memory ${added === 1 ? 'entry' : 'entries'} to .pattern-pointers.md on ${defaultBranch}`);

  return context;
}
