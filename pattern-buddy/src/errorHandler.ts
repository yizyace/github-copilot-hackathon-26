import * as core   from '@actions/core';
import * as github from '@actions/github';

export async function handleError(error: unknown): Promise<void> {
  const message = error instanceof Error ? error.message : String(error);
  core.error(`PatternBuddy pipeline failed: ${message}`);

  try {
    const octokit = github.getOctokit(core.getInput('github-token'));
    const ctx     = github.context;
    const pr      = ctx.payload.pull_request;

    if (!pr) return;

    await octokit.rest.issues.createComment({
      owner:        ctx.repo.owner,
      repo:         ctx.repo.repo,
      issue_number: pr.number,
      body: `> **PatternBuddy** ran into an issue and couldn't complete its analysis.\n> Check the [Action run logs](${process.env.GITHUB_SERVER_URL}/${ctx.repo.owner}/${ctx.repo.repo}/actions) for details. We'll get it next time. 🤖`
    });
  } catch (commentError) {
    core.error(`PatternBuddy: Also failed to post error comment: ${commentError}`);
  }

  core.setFailed(`PatternBuddy: ${message}`);
}
