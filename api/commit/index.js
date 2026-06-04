'use strict'

// POST /api/commit
// Takes a set of files from the Soul editor, commits them on a fresh branch in
// the target repo via the GitHub REST API, and opens a PR. Always returns HTTP
// 200: if no bot token is configured it returns a stub; on any error it returns
// { prUrl: null, error } so the UI degrades gracefully (never 500).

const DEFAULT_REPO = 'yizyace/github-copilot-hackathon-26'
const GH_API = 'https://api.github.com'
const UA = 'soul-review-app'

module.exports = async function (context, req) {
  const body = req.body || {}
  const files = Array.isArray(body.files) ? body.files.filter((f) => f && f.path) : []
  const message =
    typeof body.message === 'string' && body.message
      ? body.message
      : 'soul: update .soul/ from the editor'

  const respond = (status, payload) => {
    context.res = {
      status,
      headers: { 'Content-Type': 'application/json' },
      body: payload,
    }
  }

  const token = process.env.GH_PR_TOKEN || process.env.GITHUB_BOT_TOKEN
  const repo = process.env.PR_TARGET_REPO || DEFAULT_REPO

  if (!token) {
    respond(200, {
      prUrl: null,
      stub: true,
      message: 'No bot token configured — set GH_PR_TOKEN in Azure app settings.',
    })
    return
  }

  if (files.length === 0) {
    respond(200, { prUrl: null, error: 'No files provided.' })
    return
  }

  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': UA,
  }

  const gh = async (method, path, payload) => {
    const res = await fetch(`${GH_API}${path}`, {
      method,
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: payload ? JSON.stringify(payload) : undefined,
    })
    const text = await res.text()
    let json = null
    try {
      json = text ? JSON.parse(text) : null
    } catch (e) {
      json = null
    }
    if (!res.ok) {
      const msg = (json && (json.message || json.error)) || text || `HTTP ${res.status}`
      throw new Error(`${method} ${path} → ${res.status}: ${msg}`)
    }
    return json
  }

  try {
    // 1. Default branch.
    const repoInfo = await gh('GET', `/repos/${repo}`)
    const defaultBranch = repoInfo.default_branch

    // 2. Base commit sha.
    const ref = await gh('GET', `/repos/${repo}/git/ref/heads/${defaultBranch}`)
    const baseSha = ref.object.sha

    // 3. Base tree sha.
    const baseCommit = await gh('GET', `/repos/${repo}/git/commits/${baseSha}`)
    const baseTreeSha = baseCommit.tree.sha

    // 4. Create a blob per file.
    const treeEntries = []
    for (const file of files) {
      const blob = await gh('POST', `/repos/${repo}/git/blobs`, {
        content: file.content != null ? String(file.content) : '',
        encoding: 'utf-8',
      })
      treeEntries.push({
        path: file.path,
        mode: '100644',
        type: 'blob',
        sha: blob.sha,
      })
    }

    // 5. Create a tree based on the base tree.
    const tree = await gh('POST', `/repos/${repo}/git/trees`, {
      base_tree: baseTreeSha,
      tree: treeEntries,
    })

    // 6. Create a commit.
    const commit = await gh('POST', `/repos/${repo}/git/commits`, {
      message,
      tree: tree.sha,
      parents: [baseSha],
    })

    // 7. Create the branch ref.
    const branch =
      typeof body.branch === 'string' && body.branch ? body.branch : `soul/update-${Date.now()}`
    await gh('POST', `/repos/${repo}/git/refs`, {
      ref: `refs/heads/${branch}`,
      sha: commit.sha,
    })

    // 8. Open a PR.
    const title = message.split('\n')[0]
    const pr = await gh('POST', `/repos/${repo}/pulls`, {
      title,
      head: branch,
      base: defaultBranch,
      body: 'This PR was generated from the Soul editor.',
    })

    // 9. Done.
    respond(200, { prUrl: pr.html_url, branch })
  } catch (err) {
    context.log('Commit error:', err && err.message ? err.message : err)
    respond(200, { prUrl: null, error: err && err.message ? err.message : String(err) })
  }
}
