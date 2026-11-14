# Story US-1.3 — CI Pipeline and First Deploy

| Field | Value |
|---|---|
| Story ID | US-1.3 (legacy: US-03) |
| Epic | E1 — Project Foundation |
| Priority | P0 |
| Size | S |
| Depends on | US-1.2 |
| PRD refs | NFR-5, §3.3 #16 |
| Architecture refs | §13, §14 |
| State | Tracked in [`stories.yaml`](../stories.yaml) (single source of truth) |

## User Story

**As a** developer,
**I want** automated checks on every change and a deployed URL from day one,
**so that** regressions are caught early and the app is always demonstrable.

## Manual Steps (Product Owner)

- [ ] Create a GitHub repository (or confirm the existing remote) and push `release/dev` and `main`.
- [ ] Create a free **Vercel Hobby** account and import the repository.
- [ ] Add all required environment variables in Vercel (Project → Settings → Environment Variables).

## Acceptance Criteria

1. **Given** a push or pull request, **when** GitHub Actions runs, **then** it executes install, lint, typecheck, test and build, and fails the check if any step fails.
2. **Given** CI runs, **then** it uses a pinned Node LTS version and caches npm dependencies.
3. **Given** `main` is updated, **then** Vercel deploys it automatically; pull requests receive preview deployments.
4. **Given** the deployed URL, **when** `/api/health` is requested, **then** it returns `ok` including database connectivity.
5. **Given** the deployment, **then** no secrets are present in the repository, build logs or client bundle.
6. **Given** the README, **then** it documents the CI workflow, the deployment setup and required environment variables.

## Tasks

- [ ] Add `.github/workflows/ci.yml` (install → lint → typecheck → test → build)
- [ ] Configure branch protection guidance for `release/dev` and `main` (require CI to pass)
- [ ] Connect repository to Vercel; configure environment variables
- [ ] Verify production and preview deployments and the health endpoint
- [ ] Document CI/CD and the Vercel Hobby non-commercial limitation in the README

## Technical Notes

- CI must not require real third-party secrets: tests use fakes; the build uses placeholder values supplied through the workflow environment where the config loader requires them.
- Vercel Hobby is for non-commercial use (PRD §3.2a); revisit hosting before a commercial launch.

## Dependencies

US-1.2 complete (health check with DB status, validated config).

## Definition of Done

- All acceptance criteria met; CI green on the PR; first deployment reachable
- README updated; story state updated in `stories.yaml`

## Change Log

| Date | Change |
|---|---|
| 2026-11-08 | Story created |
