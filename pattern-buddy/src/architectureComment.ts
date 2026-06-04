import * as core   from '@actions/core';
import * as github from '@actions/github';
import { ArchitectureContext } from './types';

/**
 * Posts a short comment on the merged PR linking to the freshly-updated map.
 */
export async function postArchitectureComment(context: ArchitectureContext): Promise<ArchitectureContext> {
  const { repoOwner, repoName, prNumber, baseBranch } = context;
  const { output } = context.config.architectureMap;

  const octokit = github.getOctokit(core.getInput('github-token'));
  const url     = `${process.env.GITHUB_SERVER_URL ?? 'https://github.com'}/${repoOwner}/${repoName}/blob/${baseBranch}/${output}`;

  await octokit.rest.issues.createComment({
    owner:        repoOwner,
    repo:         repoName,
    issue_number: prNumber,
    body: `📐 **Architecture map updated** — this merge reshaped the codebase's topology.\n\n[View the living architecture map](${url}) 🗺️`
  });

  core.info(`PatternBuddy: Posted architecture-map comment on PR #${prNumber}.`);
  return context;
}
