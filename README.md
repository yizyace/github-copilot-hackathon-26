# GitHub Copilot Hackathon 2026

[![Azure Static Web Apps](https://github.com/yizyace/github-copilot-hackathon-26/actions/workflows/azure-static-web-apps.yml/badge.svg)](https://github.com/yizyace/github-copilot-hackathon-26/actions/workflows/azure-static-web-apps.yml)

> _A code reviewer with a soul — and a memory._

🌐 **Live site:** **https://pattern-buddy.com** ✅ — also reachable at **https://www.pattern-buddy.com**

> _Backup:_ the Azure Static Web Apps default hostname **https://green-sea-012dd340f.7.azurestaticapps.net/** stays live as a fallback.

Status: **🚧 Hackathon WIP** — the site/pitch deck is live; the review engine is in progress.

## What is this?

_TBD — see the **[ELI5](./docs/eli5.md)** for the simple version and the **[project plan](./docs/project-plan.md)** for the full picture._

This repo is **dual-purpose**: it is the source for our **website** *and* the home for the **tooling** we build during the hackathon (under `tools/`).

## Team

| Name | GitHub | Notes / TODO |
|---|---|---|
| Andrew | [@yizyace](https://github.com/yizyace) | repo owner |
| Ben | [@benjyi](https://github.com/benjyi) | — |
| Richard | [@rlin25](https://github.com/rlin25) | — |
| Nghia | [@N-star-dot](https://github.com/N-star-dot) | — |
| Dilasha | [@P-dilasha-004](https://github.com/P-dilasha-004) | — |

**TODO:** collect emails/roles; confirm repo write access. (See [docs/team.md](./docs/team.md).)

## Getting started

```bash
npm install      # install dependencies
npm run dev      # start the dev server (http://localhost:5173)
npm run build    # type-check + production build to dist/
npm run preview  # preview the production build locally
npm test         # run the test suite (vitest)
```

Requires Node 20+ (CI uses Node 22 LTS).

## Deploy

The site auto-deploys to **Azure Static Web Apps** via GitHub Actions on every push to `main` (`.github/workflows/azure-static-web-apps.yml`). Connect an Azure Static Web Apps resource and set the `AZURE_STATIC_WEB_APPS_API_TOKEN` repo secret; SPA deep-link routing is handled by `public/staticwebapp.config.json`.

**Custom domain:** `pattern-buddy.com` (apex) and `www.pattern-buddy.com` are served by the same Azure Static Web App — DNS on **Cloudflare** (DNS-only), TLS managed by Azure. The Azure default hostname stays live as a backup. DNS records are documented in the [deploy runbook](./.claude/skills/deploy-azure/SKILL.md).

## Project docs

All planning lives in **[`docs/`](./docs/)**:

- **[Project plan](./docs/project-plan.md)** — the full plan.
- **[ELI5](./docs/eli5.md)** — the simple version (pitch / website).
- **[Team](./docs/team.md)** — who's who.

> Docs will drift — they're living documents and the source for the website, slides, and this README.

## Repo layout

```
src/        React + TypeScript website (deploys to Azure Static Web Apps)
public/     static assets
docs/       planning docs
tools/      hackathon tooling (added as we build it)
.github/    CI / deploy workflows
```

## Conventions

See **[CONSTITUTION.md](./CONSTITUTION.md)** — we use **atomic** + **conventional** commits. Agent/AI context lives in **[AGENTS.md](./AGENTS.md)**.
