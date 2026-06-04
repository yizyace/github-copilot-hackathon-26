import * as core   from '@actions/core';
import * as github from '@actions/github';
import { AnalysisContext } from './types';

export async function postComments(context: AnalysisContext): Promise<AnalysisContext> {
  const { comments }   = context.output;
  const { prNumber, repoOwner, repoName } = context.input.prMetadata;

  if (comments.length === 0) {
    core.info('PatternBuddy: No findings to post.');
    return context;
  }

  const octokit = github.getOctokit(core.getInput('github-token'));

  const { data: pr } = await octokit.rest.pulls.get({
    owner:       repoOwner,
    repo:        repoName,
    pull_number: prNumber
  });

  const commitId = pr.head.sha;

  const reviewComments = comments.map(comment => ({
    path:       comment.filePath,
    line:       comment.lineEnd,
    start_line: comment.lineStart !== comment.lineEnd ? comment.lineStart : undefined,
    body:       comment.body
  }));

  await octokit.rest.pulls.createReview({
    owner:       repoOwner,
    repo:        repoName,
    pull_number: prNumber,
    commit_id:   commitId,
    event:       'COMMENT',
    comments:    reviewComments
  });

  core.info(`PatternBuddy: Posted ${comments.length} inline comment(s).`);

  return context;
}
