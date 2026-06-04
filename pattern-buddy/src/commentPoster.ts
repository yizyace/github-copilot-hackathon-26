import * as core   from '@actions/core';
import * as github from '@actions/github';
import { AnalysisContext } from './types';

function buildSummaryComment(context: AnalysisContext): string {
  const { comments } = context.output;
  const { findings } = context.analysis;

  const lines: string[] = ['## PatternBuddy Analysis\n'];

  for (let i = 0; i < findings.length; i++) {
    const f = findings[i];
    const body = comments[i]?.body ?? '';
    lines.push(`### \`${f.filePath}\` · lines ${f.lineStart}–${f.lineEnd}\n`);
    lines.push(body);
    lines.push('');
  }

  return lines.join('\n');
}

export async function postComments(context: AnalysisContext): Promise<AnalysisContext> {
  const { comments }   = context.output;
  const { prNumber, repoOwner, repoName } = context.input.prMetadata;

  if (comments.length === 0) {
    core.info('PatternBuddy: No findings to post.');
    return context;
  }

  const octokit  = github.getOctokit(core.getInput('github-token'));

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

  try {
    await octokit.rest.pulls.createReview({
      owner:       repoOwner,
      repo:        repoName,
      pull_number: prNumber,
      commit_id:   commitId,
      event:       'COMMENT',
      comments:    reviewComments
    });
    core.info(`PatternBuddy: Posted ${comments.length} inline comment(s).`);
  } catch (err) {
    core.warning(`PatternBuddy: Inline comments failed (${err}) — falling back to summary comment.`);
    await octokit.rest.issues.createComment({
      owner:        repoOwner,
      repo:         repoName,
      issue_number: prNumber,
      body:         buildSummaryComment(context)
    });
    core.info(`PatternBuddy: Posted findings as a summary comment.`);
  }

  return context;
}
