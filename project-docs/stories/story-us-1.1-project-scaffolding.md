# Story US-1.1 — Project Scaffolding

| Field | Value |
|---|---|
| Story ID | US-1.1 (legacy: US-01) |
| Epic | E1 — Project Foundation |
| Priority | P0 |
| Size | L |
| Depends on | none |
| PRD refs | §8 (Project Scaffolding) |
| State | Tracked in [`stories.yaml`](../stories.yaml) (single source of truth) |

## User Story

**As a** developer,
**I want** a clean Next.js project with the agreed tooling and folder structure,
**so that** every later story builds on a consistent, working base.

## Context

The workspace contains only documentation. This story creates the application skeleton from a clean slate. No business features are built here; core infrastructure (config, DB, errors) is US-1.2.

## Acceptance Criteria

1. **Given** an empty workspace, **when** the project is generated, **then** it is a Next.js (App Router) TypeScript project using a `src/` directory, the `@/*` import alias, Tailwind CSS and strict TypeScript.
2. **Given** the project, **when** shadcn/ui is initialised, **then** the base components (button, input, card, dialog, dropdown-menu, select, sheet, sonner, table, badge, skeleton, label) exist in `src/components/ui`.
3. **Given** the project, **when** dependencies are installed, **then** the libraries in PRD §8.2 are present (mongoose, zod, firebase, firebase-admin, react-hook-form, @hookform/resolvers, @tanstack/react-query, pino; dev: vitest, testing-library, playwright, prettier, husky, lint-staged, tsx).
4. **Given** the repository, **then** the folder structure from PRD §8.3 exists (empty folders hold a `.gitkeep`).
5. **Given** a developer clones the repo, **then** `.env.example` lists every variable from PRD §8.4 and `.env.local` is git-ignored while `.env.example` is not.
6. **Given** the project, **when** a developer runs `npm run dev`, `build`, `lint`, `typecheck`, `format:check` and `test`, **then** each completes successfully.
7. **Given** the app is running, **when** the home page is opened, **then** it renders a heading and a shadcn `Button` styled with Tailwind, and `GET /api/health` returns `{ "data": { "status": "ok" } }`.
8. **Given** a commit is made, **then** Husky runs lint-staged (Prettier + ESLint) on staged files.
9. **Given** the work is complete, **then** it is committed on a feature branch (never directly on `release/dev` or `main`).

## Tasks

- [x] Generate Next.js app (TypeScript, Tailwind, ESLint, App Router, `src/`, alias `@/*`)
- [x] Initialise shadcn/ui and add base components
- [x] Install runtime and dev dependencies
- [x] Configure Prettier (+ Tailwind plugin), `.prettierignore`, Husky, lint-staged
- [x] Configure Vitest (jsdom) and add a sample test; add Playwright config
- [x] Create folder structure from PRD §8.3
- [x] Add `.env.example`; adjust `.gitignore` to keep it tracked
- [x] Replace default home page; add placeholder `/api/health`
- [x] Add npm scripts (`typecheck` runs `next typegen` first)
- [x] Write project README
- [ ] Commit on feature branch, push, open PR, review, merge

## Technical Notes

- Next.js 16: request interception is `proxy.ts`; route handler `params` is a Promise. See `AGENTS.md` and `node_modules/next/dist/docs/`.
- `@types/node` is pinned to v24 because Vitest 5 requires `^22 || >=24`.
- Do not exclude `.env.example` from git; ignore all other `.env*` files.
- Do not hand-edit generated files in `src/components/ui`.

## Out of Scope

Config loader, DB connection, error handling, logging, API client (US-1.2); CI and deploy (US-1.3); authentication (Epic 2).

## Definition of Done

- All acceptance criteria met; lint, typecheck, format check, tests and build pass
- No secrets committed
- Story state updated in `stories.yaml`

## Change Log

| Date | Change |
|---|---|
| 2026-11-08 | Story created and implemented on `feature/project-scaffolding` |
