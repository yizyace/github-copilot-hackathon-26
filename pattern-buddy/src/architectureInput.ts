import * as core   from '@actions/core';
import * as github from '@actions/github';
import * as fs     from 'fs';
import * as path   from 'path';
import { ArchitectureContext } from './types';
import { loadConfig } from './config';

const MD_PATH = path.join(process.cwd(), '.pattern-pointers.md');

/**
 * Builds the context for the post-merge architecture pass. Unlike the per-PR
 * analysis, this reads the full accumulated pattern memory and targets the
 * branch the PR was merged into (so the committed map lands on the base branch).
 */
export async function buildArchitectureInput(): Promise<ArchitectureContext> {
  const octokit = github.getOctokit(core.getInput('github-token'));
  const ctx     = github.context;

  const prFromEvent = ctx.payload.pull_request;
  const prNumInput  = core.getInput('pr-number');
  const prNumber    = prFromEvent?.number ?? (prNumInput ? parseInt(prNumInput, 10) : undefined);

  if (!prNumber) throw new Error('PatternBuddy: No pull request found. Provide pr-number input when triggering manually.');

  const { data: pr } = await octokit.rest.pulls.get({
    owner:       ctx.repo.owner,
    repo:        ctx.repo.repo,
    pull_number: prNumber
  });

  const memory = fs.existsSync(MD_PATH) ? fs.readFileSync(MD_PATH, 'utf8') : '';

  return {
    prNumber,
    prTitle:    pr.title,
    author:     pr.user?.login ?? 'unknown',
    baseBranch: pr.base.ref,
    repoOwner:  ctx.repo.owner,
    repoName:   ctx.repo.repo,
    config:     loadConfig(),
    memory,
    architecture: { mermaid: '', summary: '', markdown: '' }
  };
}
