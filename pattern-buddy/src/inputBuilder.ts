import * as core   from '@actions/core';
import * as github from '@actions/github';
import { AnalysisContext, InputPayload, PRMetadata } from './types';
import { loadConfig } from './config';

export async function buildInput(): Promise<AnalysisContext> {
  const octokit = github.getOctokit(core.getInput('github-token'));
  const ctx     = github.context;

  const prFromEvent  = ctx.payload.pull_request;
  const prNumInput   = core.getInput('pr-number');
  const prNumber     = prFromEvent?.number ?? (prNumInput ? parseInt(prNumInput, 10) : undefined);

  if (!prNumber) throw new Error('PatternBuddy: No pull request found. Provide pr-number input when using workflow_dispatch.');

  const { data: prData } = await octokit.rest.pulls.get({
    owner:       ctx.repo.owner,
    repo:        ctx.repo.repo,
    pull_number: prNumber
  });

  const { data: files } = await octokit.rest.pulls.listFiles({
    owner:       ctx.repo.owner,
    repo:        ctx.repo.repo,
    pull_number: prNumber
  });

  const { data: diffData } = await octokit.rest.pulls.get({
    owner:       ctx.repo.owner,
    repo:        ctx.repo.repo,
    pull_number: prNumber,
    mediaType:   { format: 'diff' }
  }) as unknown as { data: string };

  const prMetadata: PRMetadata = {
    prNumber,
    prTitle:      prFromEvent?.title as string ?? prData.title,
    author:       (prFromEvent?.user as { login: string } | undefined)?.login ?? prData.user.login,
    branch:       (prFromEvent?.head as { ref: string } | undefined)?.ref ?? prData.head.ref,
    repoName:     ctx.repo.repo,
    repoOwner:    ctx.repo.owner,
    filesChanged: files.map(f => f.filename)
  };

  const config = loadConfig();

  const input: InputPayload = {
    prMetadata,
    diffContent: diffData,
    config,
    history:     ''   // Populated by historyLoader
  };

  return {
    input,
    analysis: { findings: [] },
    output:   { comments: [], mdUpdates: [] }
  };
}
