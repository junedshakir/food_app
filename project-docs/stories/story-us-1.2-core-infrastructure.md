# Story US-1.2 — Core Infrastructure

| Field | Value |
|---|---|
| Story ID | US-1.2 (legacy: US-02) |
| Epic | E1 — Project Foundation |
| Priority | P0 |
| Size | M |
| Depends on | US-1.1 |
| PRD refs | NFR-7, NFR-9, §3.3 #3–5, #14 |
| Architecture refs | §3, §6.1, §8.1–8.2, §11 |
| State | Tracked in [`stories.yaml`](../stories.yaml) (single source of truth) |

## User Story

**As a** developer,
**I want** shared infrastructure for configuration, database access, error handling, logging and API responses,
**so that** every feature reuses the same proven patterns instead of reinventing them.

## Context

All later stories depend on these building blocks. This story adds no user-facing features other than a real health check.

## Manual Steps (Product Owner)

- [ ] Create a free **MongoDB Atlas M0** cluster and database user.
- [ ] Add `MONGODB_URI` and `MONGODB_DB_NAME` (use a dev database name, e.g. `fooddelivery_dev`) to `.env.local`.
- [ ] Allow network access (`0.0.0.0/0` for the free tier) in Atlas.

## Acceptance Criteria

1. **Given** a required environment variable is missing or invalid, **when** the app starts, **then** it fails fast with a message naming the variable (validated by Zod in `lib/config`); server-only values cannot be imported into client code.
2. **Given** a valid `MONGODB_URI`, **when** many requests (or hot reloads) occur, **then** a single cached Mongoose connection is reused.
3. **Given** a service throws an `AppError` subclass (`ValidationError`, `UnauthorizedError`, `ForbiddenError`, `NotFoundError`, `ConflictError`, `RateLimitError`), **then** the central mapper converts it to the matching HTTP status.
4. **Given** any route handler built with the shared `route()` wrapper, **then** success responses are `{ "data": ... }` (with optional `meta`) and failures are `{ "error": { "code", "message", "details?" } }`; unknown errors return a generic 500 and are logged without leaking internals.
5. **Given** a request, **then** the wrapper assigns a request ID and a pino logger records it with route, status and duration; secrets and tokens are redacted.
6. **Given** a handler declares a Zod schema for body/query/params, **when** input is invalid, **then** a 400 `VALIDATION_ERROR` with field details is returned.
7. **Given** the UI needs the API, **then** `lib/api-client` provides a typed fetch wrapper that unwraps the envelope and throws a typed `ApiError` (`code`, `status`).
8. **Given** the app is running, **when** `GET /api/health` is called, **then** it returns app status and database connectivity (`ok` / `degraded`) without exposing secrets.
9. **Given** the new modules, **then** unit tests cover config validation, error mapping, the response envelope and the money helper (`lib/money.ts`, integer paise ↔ INR formatting).

## Tasks

- [ ] `lib/config`: Zod env schema, typed export, `server-only` guard
- [ ] `lib/db`: Mongoose connection singleton cached on `globalThis`
- [ ] `lib/errors`: `AppError` hierarchy and error-to-HTTP mapper
- [ ] `lib/http`: `route()` wrapper (request ID, validation, envelope, error handling)
- [ ] `lib/logger.ts`: pino with redaction and request-scoped child loggers
- [ ] `lib/money.ts`: paise helpers and INR formatting
- [ ] `lib/api-client/http.ts`: base client and `ApiError`
- [ ] Upgrade `GET /api/health` to include DB status
- [ ] Update `.env.example` if variables change
- [ ] Unit tests for the items above
- [ ] Add ESLint `no-restricted-imports` rules enforcing the dependency rule (Architecture §3.1)

## Technical Notes

- Next.js 16: route handler `params` is a `Promise`; type contexts with the global `RouteContext` helper. Verify against `node_modules/next/dist/docs/` before coding.
- Services must not import `Request`/`Response`; HTTP concerns stay in `lib/http`.
- Auth wiring in `route()` is stubbed (`auth: "none"`) here and completed in Epic 2.

## Dependencies

US-1.1 complete. Requires the MongoDB Atlas manual steps above for the health check against a real DB.

## Definition of Done

- All acceptance criteria met; lint, typecheck, tests and build pass
- Unit tests for new logic; no secrets committed
- Story state updated in `stories.yaml`

## Change Log

| Date | Change |
|---|---|
| 2026-11-08 | Story created |
