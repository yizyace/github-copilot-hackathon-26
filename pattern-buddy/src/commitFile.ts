import * as core   from '@actions/core';
import * as github from '@actions/github';

interface CommitFileOptions {
  readonly owner:   string;
  readonly repo:    string;
  readonly branch:  string;
  readonly path:    string;
  readonly content: string;
  readonly message: string;
}

/**
 * Creates or updates a single file on a branch via the GitHub Contents API.
 *
 * Looks up the existing blob SHA when the file is already present (required for
 * updates) and omits it when the file is new, so the same call works for both
 * the first commit and every commit after it.
 */
export async function commitFile(opts: CommitFileOptions): Promise<void> {
  const octokit = github.getOctokit(core.getInput('github-token'));
  const encoded = Buffer.from(opts.content).toString('base64');

  let sha: string | undefined;
  try {
    const { data } = await octokit.rest.repos.getContent({
      owner: opts.owner,
      repo:  opts.repo,
      path:  opts.path,
      ref:   opts.branch
    }) as unknown as { data: { sha: string } };
    sha = data.sha;
  } catch {
    sha = undefined; // File doesn't exist on the branch yet — first commit.
  }

  await octokit.rest.repos.createOrUpdateFileContents({
    owner:   opts.owner,
    repo:    opts.repo,
    path:    opts.path,
    message: opts.message,
    content: encoded,
    sha,
    branch:  opts.branch
  });
}
