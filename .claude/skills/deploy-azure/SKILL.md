---
name: deploy-azure
description: Deploy this site (Soul Review) to Azure Static Web Apps. Use when asked to deploy, ship, publish, release, or push the site live, or to set up / rotate AZURE_STATIC_WEB_APPS_API_TOKEN. Documents the existing Azure resource plus the CI (push to main) and manual (token) deploy paths, and how to verify the live site.
---

# Deploy to Azure Static Web Apps

The site (the React + Vite app in `src/`) is hosted on **Azure Static Web Apps** (Free SKU — no cost). SPA deep-link routing is handled by `public/staticwebapp.config.json` (copied into `dist/` on build).

## Live URL
https://green-sea-012dd340f.7.azurestaticapps.net/

## The Azure resource (already created)

| | |
|---|---|
| Subscription | `Azure subscription 1` — `77d1db33-ff1f-4266-ba56-a3046d7280f7` (account `yizyace@gmail.com`) |
| Resource group | `soul-review-rg` |
| Static Web App | `soul-review-hackathon-26` |
| Region / SKU | `eastus2` / `Free` |
| Default hostname | `green-sea-012dd340f.7.azurestaticapps.net` |
| Deployment source | **"Other"** (not portal-linked) — deploy via the committed workflow or the token |

## Path A — CI (preferred): push to `main`

`.github/workflows/azure-static-web-apps.yml` builds and uploads `dist/` on every push to `main` (and on PRs to `main` as preview environments). It uses the repo secret **`AZURE_STATIC_WEB_APPS_API_TOKEN`** (already set).

```bash
git push origin main          # or merge the PR into main
gh run watch -R yizyace/github-copilot-hackathon-26   # follow the deploy
```

Nothing else is needed — the secret is in place and the workflow handles build + upload.

## Path B — Manual (go live now, without merging)

Use when you need the live site updated immediately from local `dist/`.

Prereqs: Azure CLI (`brew install azure-cli`), `gh` authenticated, Node. Then:

```bash
# 1. Sign in. INTERACTIVE — only a human can approve the device code.
#    Run it in the background, read the code from the output, and relay it.
az login --use-device-code

# 2. Read the deployment token (never echo it into a command argument).
TOKEN=$(az staticwebapp secrets list -n soul-review-hackathon-26 -g soul-review-rg \
  --query "properties.apiKey" -o tsv)

# 3. Build, then deploy dist/ to the production environment.
npm run build
npx -y @azure/static-web-apps-cli@latest deploy ./dist \
  --deployment-token "$TOKEN" --env production
```

The SWA CLI may print `missing property "jobs.build_and_deploy_job"` while peeking at the workflow file — **harmless**; it falls back to uploading `./dist`, which is what we want.

## Set / rotate the GitHub secret

```bash
TOKEN=$(az staticwebapp secrets list -n soul-review-hackathon-26 -g soul-review-rg --query "properties.apiKey" -o tsv)
printf '%s' "$TOKEN" | gh secret set AZURE_STATIC_WEB_APPS_API_TOKEN -R yizyace/github-copilot-hackathon-26
```

Always pipe the token via stdin — never as an argument and never committed.

## Recreate the resource from scratch (if it's deleted)

```bash
az group create -n soul-review-rg -l eastus2
az staticwebapp create -n soul-review-hackathon-26 -g soul-review-rg -l eastus2 --sku Free
```

Then set the secret (above) and deploy. The hostname will change — update it in `src/config.ts` (`siteUrl`), `README.md`, and this skill.

## Verify the live site

Load the hero **and** a deep link — a working `/editor` proves the SPA fallback (not a 404):

```bash
open https://green-sea-012dd340f.7.azurestaticapps.net/
open https://green-sea-012dd340f.7.azurestaticapps.net/editor
```

With the Playwright MCP: `/` should show the "A reviewer with a soul. And a memory." hero; `/editor` should show the Soul editor seeded with the PatternBuddy sample. Both must render.

## Notes

- Free SKU is free. To tear down after the hackathon: `az group delete -n soul-review-rg --yes --no-wait`.
- `az login` is the only step a fresh agent can't complete alone — surface the device code to a human and wait.
- A stale auto-generated secret (`AZURE_STATIC_WEB_APPS_API_TOKEN_*`) from an early portal attempt may exist; it's unused by our workflow and safe to delete.
