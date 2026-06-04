# AI Agents Guidelines

<!-- This file is managed by dd-dm -->
<!-- See CONSTITUTION.md for project rules and guidelines -->

## Project Conventions

For project conventions and coding standards, refer to: [CONSTITUTION.md](./CONSTITUTION.md)

The CONSTITUTION.md file contains all engineering rules and conventions that should be followed when working on this project. All AI agents (GitHub Copilot, Claude, etc.) should read and adhere to those guidelines.

---

<!-- dd-dm:custom:start -->
<!-- Add project-specific agent overrides below this line -->
<!-- These overrides will be preserved during dd-dm pull operations -->

## Project Context (GitHub Copilot Hackathon 2026)

This repo is **dual-purpose**: it is the source for our **website / pitch deck**
(in `src/`) *and* the home for the **tooling we build**. The project is
**Soul Review** — a GitHub Action that drops a code reviewer with a *personality
and a memory* into a repo (a layered `soul` / `ego` / `rules`, plus a journal of
lessons fetched on demand). The site also hosts a client-side **Soul editor** at
`/editor` for authoring the `.soul/` stack.

**Start here:**
- [`README.md`](./README.md) — overview, getting started, team.
- [`docs/`](./docs/) — planning docs (the drifting source of truth):
  - [`docs/project-plan.md`](./docs/project-plan.md) — full project plan.
  - [`docs/eli5.md`](./docs/eli5.md) — simple version (pitch / website copy).
  - [`docs/team.md`](./docs/team.md) — team + GitHub handles.
  - The full Soul Review design set lives on the `docs/soul-review-design-proposal` branch.
- [`CONSTITUTION.md`](./CONSTITUTION.md) — **engineering rules (read this)**.
- [`SUBMISSION_CRITERIA.md`](./SUBMISSION_CRITERIA.md) — hackathon judging rubric,
  submission checklist, and the 3:15 deadline. Keep this in mind when prioritizing.

**Where code lives:**
- `src/` — the React + TypeScript site (Vite): the scroll-snap landing/pitch deck
  and the `/editor`. Deploys to **Azure Static Web Apps** via
  `.github/workflows/azure-static-web-apps.yml`.
- `tools/` — hackathon tooling (the review engine, added as we build it).

**Run it:** `npm install`, then `npm run dev` (dev) / `npm run build` (build) / `npm test` (tests).

**Conventions:** atomic + conventional commits (see `CONSTITUTION.md`). Vite `base`
is `/` (Azure serves from the domain root); SPA deep-link routing is handled by
`public/staticwebapp.config.json`.

**Task tracking:** work is tracked in **beads** (`bd-work`); the `.beads/` store is
git-excluded and lives outside the repo.

## Judging Criteria

Judged against the standard hackathon rubric (working set — replace if official
criteria are published). The site is structured to speak to each:

1. **Innovation & originality** — novelty of the idea and the approach.
2. **Technical execution & effective use of GitHub Copilot** — implementation
   quality and how well Copilot was leveraged.
3. **Impact & usefulness** — does it solve a real problem; who benefits.
4. **Demo & presentation** — clarity and polish of the live demo / pitch (the
   landing page doubles as the presentation deck).

<!-- dd-dm:custom:end -->
