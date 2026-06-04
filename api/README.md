# Soul Review API (Azure Static Web Apps managed Functions)

Two Node Functions (classic v3 model, `function.json` + `index.js`, no build step,
dependency-free using the Node global `fetch`):

- `POST /api/review` — runs a soul-stack code review through Claude.
- `POST /api/commit` — commits editor files to a branch and opens a PR.

## Required app settings

Set these in the **Azure portal → your Static Web App → Configuration**
(Application settings). They are read at runtime via `process.env`:

| Setting | Used by | Notes |
| --- | --- | --- |
| `ANTHROPIC_API_KEY` | `/api/review` | If missing, `/api/review` returns a deterministic stub (HTTP 200). |
| `GH_PR_TOKEN` | `/api/commit` | GitHub token with `contents` + `pull_requests` write. Falls back to `GITHUB_BOT_TOKEN`. If missing, `/api/commit` returns a stub. |
| `PR_TARGET_REPO` | `/api/commit` | Optional. Defaults to `yizyace/github-copilot-hackathon-26`. |

Both endpoints always return HTTP 200 with a valid payload, so the demo keeps
working before any secrets are set.
