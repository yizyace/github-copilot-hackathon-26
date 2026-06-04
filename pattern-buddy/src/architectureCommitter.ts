import * as core from '@actions/core';
import { ArchitectureContext } from './types';
import { commitFile } from './commitFile';

/**
 * Commits the rendered architecture map to the configured output path on the
 * branch the PR was merged into.
 */
export async function commitArchitectureMap(context: ArchitectureContext): Promise<ArchitectureContext> {
  const { output } = context.config.architectureMap;

  await commitFile({
    owner:   context.repoOwner,
    repo:    context.repoName,
    branch:  context.baseBranch,
    path:    output,
    content: context.architecture.markdown,
    message: `chore: PatternBuddy updates architecture map for PR #${context.prNumber}`
  });

  core.info(`PatternBuddy: Committed architecture map to ${output} on ${context.baseBranch}.`);
  return context;
}
