# Food Delivery App

Zomato-inspired, browser-only food delivery web app (MVP). Mobile app is out of scope until after web launch.

## Tech Stack

TypeScript, Next.js (App Router), Tailwind CSS, shadcn/ui, MongoDB Atlas via Mongoose, Firebase Authentication (Spark plan), Cloudinary (images), Razorpay (test mode). Only free services; no paid plans or cards (PRD §3.2a).

## Product Decisions

- Payment: Razorpay test mode (P0); COD as an extra (P1). Currency INR, flat 5% tax.
- Restaurants self-register and need admin approval before going live.
- Cart supports multiple restaurants; checkout creates one order per restaurant.

## Architecture Rules (MVC)

- **View:** UI logic only in UI components (`src/app`, `src/components`).
- **Controller:** all APIs in `src/app/api/**/route.ts`, following Next.js route handler standards. Validate, authorise, delegate to services. No business logic.
- **Services:** all business logic in `src/services`.
- **Models/Repositories:** Mongoose schemas in `src/models`; DB access only via `src/repositories`/services, never from route handlers or components.
- Follow SOLID and standard design patterns; keep code well structured.

## UI Component Rules

- Every UI component must come from the shadcn/ui library wherever possible (Button, Input, Card, Dialog, Select, Table, Form, etc.). Check shadcn/ui first before building anything custom.
- Add missing components via the CLI (`npx shadcn@latest add <component>`) into `src/components/ui`; do not hand-write equivalents.
- Build custom components only when shadcn/ui has no suitable one; compose them from shadcn/ui primitives and Tailwind utilities, and state why in the PR/commit.
- Do not introduce other UI libraries (MUI, Chakra, Ant, etc.).
- Do not modify generated files in `src/components/ui` except for theming/variants.

## Documentation Conventions

- All project-specific docs live in `/Users/shakir/trainings/food-delivery-app/project-docs`.
- `my-docs/` holds user-authored inputs (e.g. `requirements.md`); do not put generated docs there.

| Document                  | Location                           |
| ------------------------- | ---------------------------------- |
| Requirements (user input) | `my-docs/requirements.md`          |
| PRD (Step 1)              | `project-docs/prd.md`              |
| Firebase auth setup guide | `project-docs/auth-setup-guide.md` |
| User stories (Step 2)     | `project-docs/user-stories.md`     |
| Architecture (Step 3)     | `project-docs/architecture.md` (draft, awaiting approval) |
| Story state tracker       | `project-docs/stories.yaml`        |
| Story files               | `project-docs/stories/`            |

## Workflow

Deliverables are strictly ordered: PRD → User Stories → Architecture. Start each step only after the user approves the previous one. User stories are grouped into epics; project scaffolding is the first story.

## Story Management

Stories are tracked in `project-docs/stories.yaml` (single source of truth for state, covering **all** epics) and described in story files under `project-docs/stories/`.

**Story IDs:** `<epic>.<index>` (e.g. `1.1`, `2.3`). `legacy_id` in the YAML maps to the `US-nn` numbering in `user-stories.md`.

**Story files**

- Always created in `project-docs/stories/`.
- File name is kebab-case: `story-us-<id>-<short-title>.md` (e.g. `story-us-1.1-project-scaffolding.md`, `story-us-2.1-sign-up-with-role.md`).
- Standard agile format: header table, user story (**As a / I want / so that**), context, Given/When/Then acceptance criteria, tasks, technical notes, dependencies, definition of done, change log.
- Story files are created **only for the epic(s) the user asks for**. Currently only Epic 1 (1.1–1.3) has files. Do not create story files for other epics until the user asks; when created, set `story_file` in the YAML.
- Story files do not carry state; state lives only in `stories.yaml`.

**State lifecycle** (`status` field in `stories.yaml`): `ready-for-dev` → `in-progress` → `review` → `done`

| Event | Set status | Also record |
|---|---|---|
| Initial state of every story | `ready-for-dev` | |
| A feature branch is created to build the story | `in-progress` | `branch` |
| A PR is opened for the story | `review` | `pr` (URL or number) |
| PR is reviewed, issues resolved, and merged | `done` | |

**Rules**

- Work on one story per branch. Branch name: `feature/us-<id>-<short-title>` (e.g. `feature/us-1.2-core-infrastructure`).
- Update `stories.yaml` in the same branch/commit as the event it records, so state never lags the code. Check off completed tasks in the story file as you go.
- Do not start a story whose `depends_on` stories are not `done` (unless the user explicitly overrides).
- Stories marked `manual_steps: true` need the user's action first (accounts, keys); list these steps and wait before building.
- Never mark a story `done` before its PR is merged.

## Branching Rules

- `release/dev` is the integration branch; `main` is the release branch.
- Every new task (i.e. each new Claude chat/context) must start on a new feature branch created from the latest `release/dev`:
  `git checkout release/dev && git pull && git checkout -b feature/<short-task-name>`
- Do this before making any changes. Never commit directly to `release/dev` or `main`.
- Branch names: `feature/<short-kebab-case-description>`; for stories use `feature/us-<id>-<short-title>` (see Story Management).
- After the task is completed, follow this sequence:
  1. Commit the changes on the feature branch.
  2. Push the branch to the remote.
  3. Open a PR into `release/dev`.
  4. Review the PR — skip this step if the task is UI mock-ups only.
  5. Resolve any issues found in the review and push the fixes.
  6. Merge the PR, then switch back to `release/dev` and pull the latest.
