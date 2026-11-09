# Food Delivery App

Zomato-inspired food delivery web app (MVP). Next.js (App Router) + TypeScript + Tailwind + shadcn/ui, MongoDB Atlas, Firebase Auth.

Docs live in [project-docs/](project-docs/): PRD, user stories, auth setup guide. Project rules are in [CLAUDE.md](CLAUDE.md).

## Getting started

```bash
npm install
cp .env.example .env.local   # fill in values as each story requires them
npm run dev                  # http://localhost:3000
```

## Scripts

| Script                                   | Purpose                      |
| ---------------------------------------- | ---------------------------- |
| `npm run dev` / `build` / `start`        | Run, build, serve            |
| `npm run lint` / `typecheck`             | ESLint / TypeScript          |
| `npm run format` / `format:check`        | Prettier                     |
| `npm test` / `test:watch` / `test:e2e`   | Vitest / Playwright          |
| `npm run seed`                           | Seed sample data (US-15)     |

## Structure

`src/app` (pages + `api/` controllers), `src/components` (views), `src/services` (business logic), `src/repositories`, `src/models`, `src/validators`, `src/lib`, `tests/`.
