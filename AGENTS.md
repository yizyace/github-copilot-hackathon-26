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

This repo is **dual-purpose**: it is the source for our **GitHub Pages website**
(the project's public / pitch face) *and* the home for the **tooling we build**
during the hackathon. The specific product is still **TBD**.

**Start here:**
- [`README.md`](./README.md) — overview, getting started, team.
- [`docs/`](./docs/) — planning docs (the drifting source of truth):
  - [`docs/project-plan.md`](./docs/project-plan.md) — full project plan.
  - [`docs/eli5.md`](./docs/eli5.md) — simple version (pitch / website copy).
  - [`docs/team.md`](./docs/team.md) — team + GitHub handles.
- [`CONSTITUTION.md`](./CONSTITUTION.md) — **engineering rules (read this)**.
- [`SUBMISSION_CRITERIA.md`](./SUBMISSION_CRITERIA.md) — hackathon judging rubric,
  submission checklist, and the 3:15 deadline. Keep this in mind when prioritizing.

**Where code lives:**
- `src/` — the React + TypeScript website (Vite). Deploys to
  `https://yizyace.github.io/github-copilot-hackathon-26/` via
  `.github/workflows/deploy.yml` (GitHub Actions → Pages).
- `tools/` — hackathon tooling (added as we build it).

**Run it:** `npm install`, then `npm run dev` (dev) / `npm run build` (build) / `npm test` (tests).

**Conventions:** atomic + conventional commits (see `CONSTITUTION.md`). The Vite
`base` and the react-router `basename` are both `/github-copilot-hackathon-26/`
(wired via `import.meta.env.BASE_URL`).

**Task tracking:** work is tracked in **beads** (`bd-work`); the `.beads/` store is
git-excluded and lives outside the repo.

<!-- dd-dm:custom:end -->
