import * as core   from '@actions/core';
import * as github from '@actions/github';
import { AnalysisContext } from './types';
import { buildDiffIndex, mapFinding } from './diffPositions';

type ReviewComment = {
  path:        string;
  line:        number;
  side:        'RIGHT';
  start_line?: number;
  start_side?: 'RIGHT';
  body:        string;
};

export async function postComments(context: AnalysisContext): Promise<AnalysisContext> {
  const { comments, summary } = context.output;
  const { prNumber, repoOwner, repoName } = context.input.prMetadata;

  const octokit = github.getOctokit(core.getInput('github-token'));

  // Map each finding to a commentable diff position. Comments that can't be
  // placed on the diff are rolled into the summary body instead of 422-ing the
  // whole review.
  const index = buildDiffIndex(context.input.diffContent);
  const reviewComments: ReviewComment[] = [];
  const rolled: string[] = [];

  for (const c of comments) {
    const mapped = mapFinding({ filePath: c.filePath, lineStart: c.lineStart, lineEnd: c.lineEnd }, index);
    if (mapped.kind === 'inline') {
      reviewComments.push({
        path: mapped.path,
        line: mapped.line,
        side: 'RIGHT',
        ...(mapped.startLine ? { start_line: mapped.startLine, start_side: 'RIGHT' as const } : {}),
        body: c.body
      });
    } else if (mapped.kind === 'snap') {
      reviewComments.push({
        path: mapped.path,
        line: mapped.line,
        side: 'RIGHT',
        body: `_(re: \`${c.filePath}\` line ${mapped.originalLine})_\n\n${c.body}`
      });
    } else {
      rolled.push(`### \`${c.filePath}\` · line ${mapped.originalLine}\n\n${c.body}`);
    }
  }

  let body = summary;
  if (rolled.length > 0) {
    body += `\n\n---\n\n### Notes on lines outside this diff\n\n${rolled.join('\n\n')}`;
  }

  const { data: pr } = await octokit.rest.pulls.get({
    owner: repoOwner, repo: repoName, pull_number: prNumber
  });
  const commitId = pr.head.sha;

  // Always post exactly one review: a summary body plus whatever inline comments
  // are placeable. A clean PR still gets one encouraging review.
  try {
    await octokit.rest.pulls.createReview({
      owner:       repoOwner,
      repo:        repoName,
      pull_number: prNumber,
      commit_id:   commitId,
      event:       'COMMENT',
      body,
      comments:    reviewComments
    });
    core.info(`PatternBuddy: Posted review with ${reviewComments.length} inline comment(s).`);
    return context;
  } catch (err) {
    core.warning(`PatternBuddy: Inline review rejected (${err}) — retrying with comments folded into the summary.`);
  }

  // Retry once with no inline comments: fold them into the body so nothing is lost.
  const folded = reviewComments
    .map(rc => `- \`${rc.path}:${rc.line}\`: ${rc.body}`)
    .join('\n\n');
  const retryBody = reviewComments.length > 0
    ? `${body}\n\n---\n\n### Inline notes\n\n${folded}`
    : body;

  try {
    await octokit.rest.pulls.createReview({
      owner:       repoOwner,
      repo:        repoName,
      pull_number: prNumber,
      commit_id:   commitId,
      event:       'COMMENT',
      body:        retryBody
    });
    core.info('PatternBuddy: Posted review summary (inline comments folded into the body).');
  } catch (err) {
    core.warning(`PatternBuddy: createReview failed again (${err}) — falling back to an issue comment.`);
    await octokit.rest.issues.createComment({
      owner:        repoOwner,
      repo:         repoName,
      issue_number: prNumber,
      body:         retryBody
    });
    core.info('PatternBuddy: Posted summary as an issue comment.');
  }

  return context;
}
