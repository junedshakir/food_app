# User Stories — Food Delivery App (MVP)

| Field  | Value                            |
| ------ | -------------------------------- |
| Status | **Draft — awaiting approval**    |
| Source | [prd.md](prd.md) v0.3 (approved) |
| Date   | 2026-11-08                       |

## How to use this document

- Stories are numbered in **execution order**. Implement `US-01`, then `US-02`, and so on. Each story's dependencies are always earlier stories.
- Every story is a vertical slice that follows the layering rules: UI component → api-client → route handler (controller) → service → model.
- **Size:** S ≈ half a day, M ≈ 1 day, L ≈ 2 days (rough guide for one developer).
- **Definition of Done (applies to every story):**
  - Acceptance criteria met; strict TypeScript, lint and type-check pass
  - No business logic in components or route handlers
  - Inputs validated with Zod; errors use the standard envelope
  - Unit tests for new service logic; manual walkthrough of the UI flow on mobile and desktop widths
  - No secrets committed; `.env.example` updated if new variables are added
  - Only free services used (PRD §3.2a)
- Stories marked **[You]** need a manual step from you (account creation, keys).

## Epic overview

| #   | Epic                                   | Stories       | Outcome                                     |
| --- | -------------------------------------- | ------------- | ------------------------------------------- |
| E1  | Project Foundation                     | US-01 – US-03 | Running skeleton with CI and a deployed URL |
| E2  | Authentication & Accounts              | US-04 – US-08 | Register, log in, roles, profile            |
| E3  | Restaurant Onboarding & Admin Approval | US-09 – US-11 | Owners sign up; admin approves              |
| E4  | Menu Management                        | US-12 – US-15 | Owners manage images, categories, dishes    |
| E5  | Discovery                              | US-16 – US-19 | Customers browse, search, view menus        |
| E6  | Cart & Addresses                       | US-20 – US-22 | Multi-restaurant cart, saved addresses      |
| E7  | Checkout & Payments                    | US-23 – US-25 | Razorpay test payment, split orders         |
| E8  | Order Fulfilment & Tracking            | US-26 – US-29 | Owner processes orders; customer tracks     |
| E9  | Admin Oversight                        | US-30         | Admin dashboards and lists                  |
| E10 | Hardening & Release                    | US-31 – US-33 | Security, tests, accessibility, go-live     |

---

## E1 — Project Foundation

### US-01 Project scaffolding — Size L

**As a** developer, **I want** a clean Next.js project with the agreed tooling and structure, **so that** all later stories build on a consistent base.

**Acceptance criteria**

- Next.js (App Router, TypeScript, `src/` dir, `@/*` alias) is generated with Tailwind; shadcn/ui is initialised with the base components listed in PRD §8.2.
- Dependencies from PRD §8.2 are installed; `strict` TypeScript, ESLint and Prettier are configured; Husky + lint-staged run on commit.
- Folder structure from PRD §8.3 exists (with placeholder `index`/README files where empty).
- `.env.example` lists all variables from PRD §8.4; `.env.local` is git-ignored.
- `npm run dev`, `build`, `lint`, `typecheck`, `test` all work; Vitest runs a sample test.
- A home page renders using Tailwind and a shadcn `Button`.
- The `.gitignore` is correct and the project is committed on a feature branch.

**Dependencies:** none. **PRD:** §8.

### US-02 Core infrastructure — Size M **[You]**

**As a** developer, **I want** shared infrastructure (config, DB, errors, logging, API envelope), **so that** every feature reuses the same patterns.

**You do:** create the MongoDB Atlas M0 free cluster and share the connection string (put it in `.env.local`).

**Acceptance criteria**

- Validated env loader (`lib/config`) fails fast with a clear message on missing variables.
- Cached Mongoose connection singleton (safe for serverless hot reload).
- `AppError` hierarchy (`ValidationError`, `UnauthorizedError`, `ForbiddenError`, `NotFoundError`, `ConflictError`) and a central error-to-HTTP mapper.
- Standard response envelope `{ data }` / `{ error: { code, message, details? } }` and a route-handler wrapper that applies it.
- `pino` logger with request IDs.
- Typed `lib/api-client` base (fetch wrapper that unwraps the envelope and throws typed errors).
- `GET /api/health` returns app and DB status.

**Dependencies:** US-01. **PRD:** NFR-7, NFR-9, §3.3 #3–5, #14.

### US-03 CI pipeline and first deploy — Size S **[You]**

**As a** developer, **I want** automated checks and a deployed URL from day one, **so that** regressions are caught early.

**You do:** create a GitHub repo, and a Vercel (Hobby) account to import it.

**Acceptance criteria**

- GitHub Actions runs install, lint, typecheck, test and build on every push and PR.
- Vercel deploys `main`; environment variables are configured in Vercel.
- `/api/health` works on the deployed URL.

**Dependencies:** US-02. **PRD:** NFR-5, §3.3 #16.

---

## E2 — Authentication & Accounts

### US-04 Firebase setup and login/registration — Size L **[You]**

**As a** visitor, **I want** to register and log in with email and password, **so that** I can use personalised features.

**You do:** follow [auth-setup-guide.md](auth-setup-guide.md) and add the keys to `.env.local`.

**Acceptance criteria**

- Firebase client and admin initialisers exist in `lib/firebase`.
- Register and login pages (shadcn form, react-hook-form, Zod) with inline validation and friendly Firebase error messages.
- Auth state is available app-wide via a provider/hook; session persists across refresh; logout works.
- Header shows Login/Register or user menu depending on state.

**Dependencies:** US-02. **PRD:** FR-AUTH-1, FR-AUTH-3.

### US-05 User sync and role-based access control — Size L

**As the** system, **I want** every authenticated user mapped to a MongoDB user with a role, **so that** access can be enforced on the server.

**Acceptance criteria**

- `User` model (firebaseUid, email, name, phone, role, timestamps) with unique indexes.
- `POST /api/auth/sync` verifies the Firebase ID token and creates the user (role `customer`) if missing; called automatically after login/registration.
- Server auth helper `requireAuth` and `requireRole(...roles)` for route handlers; invalid/missing token returns 401, wrong role returns 403.
- Client attaches the ID token via the api-client; Next.js middleware/layout guards redirect unauthenticated users from protected pages to login with a return URL.
- Role-aware route groups: `(customer)`, `/owner`, `/admin` are inaccessible to other roles.
- Unit tests cover the auth/role guards and sync service.

**Dependencies:** US-04. **PRD:** FR-AUTH-5, 6, 7.

### US-06 Password reset — Size S

**As a** user, **I want** to reset my password via email, **so that** I can recover my account.

**Acceptance criteria**

- "Forgot password" page sends a Firebase reset email; the UI shows a generic success message whether or not the email exists.
- Reset flow completes and the user can log in with the new password.

**Dependencies:** US-04. **PRD:** FR-AUTH-4.

### US-07 Google sign-in — Size S (P1)

**As a** visitor, **I want** to continue with Google, **so that** I can sign up faster.

**Acceptance criteria**

- "Continue with Google" button on login/register; first-time Google users are synced as customers.
- Popup-blocked and cancelled cases show friendly messages.

**Dependencies:** US-05. **PRD:** FR-AUTH-2.

### US-08 Profile management — Size S

**As a** user, **I want** to view and edit my name and phone, **so that** my orders have correct contact details.

**Acceptance criteria**

- `GET/PATCH /api/me`; profile page with form and validation (phone format).
- Changes persist and show in the header.

**Dependencies:** US-05. **PRD:** FR-AUTH-8.

---

## E3 — Restaurant Onboarding & Admin Approval

### US-09 Owner self-registration — Size M

**As a** restaurant owner, **I want** to sign up as a partner and register my restaurant, **so that** I can start selling.

**Acceptance criteria**

- "Partner with us" page: account details plus restaurant details (name, cuisines, veg-only flag, address, city, phone).
- `POST /api/owner/register` creates the user with role `owner` and a `Restaurant` in `PENDING` status in one service transaction (rollback on failure); slug is unique.
- `Restaurant` model and indexes are created.
- After login, owners land on `/owner` showing status (pending / active / rejected with reason / suspended) and can edit details while pending.
- A pending restaurant is not publicly visible.

**Dependencies:** US-05. **PRD:** FR-AUTH-9, FR-AUTH-10.

### US-10 Admin bootstrap and restaurant approval — Size M

**As an** admin, **I want** to review and decide on restaurant registrations, **so that** only valid restaurants go live.

**Acceptance criteria**

- A script/CLI (`npm run make-admin -- <email>`) promotes an existing user to `admin` (there is no public way to become admin).
- `/admin/restaurants` lists restaurants filterable by status, with a pending queue first.
- Admin can approve, reject (with a required reason), suspend, and reactivate; transitions are validated in the service (e.g., cannot approve an already-active restaurant).
- Owner sees the new status on their dashboard.
- Only `admin` can call `/api/admin/*`.

**Dependencies:** US-09. **PRD:** FR-ADM-1, FR-ADM-2.

### US-11 Restaurant profile and open/closed toggle — Size M

**As an** owner, **I want** to edit my restaurant profile and toggle open/closed, **so that** customers see accurate information.

**Acceptance criteria**

- `GET/PATCH /api/owner/restaurant`: description, cuisines, address, opening hours, min order, delivery fee (INR, validated ranges).
- Open/closed toggle is separate from approval status; takes effect immediately.
- Owner can only access their own restaurant (ownership enforced in service).

**Dependencies:** US-09. **PRD:** FR-OWN-1 (excluding images), FR-OWN-2.

---

## E4 — Menu Management

### US-12 Image upload with Cloudinary — Size M **[You]**

**As an** owner, **I want** to upload images, **so that** my restaurant and dishes look appealing.

**You do:** create a free Cloudinary account and add the three credentials to `.env.local`.

**Acceptance criteria**

- `POST /api/uploads/sign` (owner/admin only) returns signed upload params with a restricted folder, size, and format.
- Reusable `ImageUploader` component with preview, progress, validation (JPG/PNG/WebP, max 5 MB) and error states.
- Stored value is `{ url, publicId }`; `next/image` is configured for the Cloudinary domain.
- Restaurant cover image is wired into the profile (completes FR-OWN-1a for restaurants).

**Dependencies:** US-11. **PRD:** FR-OWN-1a, §3.3 #6.

### US-13 Menu categories — Size S

**As an** owner, **I want** to manage menu categories, **so that** dishes are organised.

**Acceptance criteria**

- CRUD for categories with ordering; deleting a category with dishes is blocked with a clear message.
- Names are unique per restaurant.

**Dependencies:** US-11. **PRD:** FR-OWN-3.

### US-14 Dish management — Size L

**As an** owner, **I want** to add and edit dishes, **so that** customers can order them.

**Acceptance criteria**

- CRUD for dishes (name, description, price in INR, veg/non-veg, category, image via `ImageUploader`).
- Availability toggle from the dish list; changes are instant.
- Price stored as integer paise (no floating-point money); a shared money utility formats INR.
- Ownership enforced: an owner cannot touch another restaurant's dishes.

**Dependencies:** US-12, US-13. **PRD:** FR-OWN-4, FR-OWN-5.

### US-15 Seed data script — Size S

**As a** developer, **I want** realistic sample data, **so that** discovery and ordering can be built and demoed.

**Acceptance criteria**

- `npm run seed` creates (idempotently) an admin, several owners, ~8 active restaurants across 2–3 cities with categories, dishes and Cloudinary-hosted or public placeholder images.
- Documented in the README; refuses to run against a production DB name.

**Dependencies:** US-14. **PRD:** §3.3 #19.

---

## E5 — Discovery

### US-16 Restaurant listing (home) — Size M

**As a** guest or customer, **I want** to see active restaurants, **so that** I can choose where to order.

**Acceptance criteria**

- Home page with hero and a paginated grid of active restaurants (cards: image, name, cuisines, min order, open/closed badge).
- `GET /api/restaurants` returns only `ACTIVE` restaurants, paginated; loading skeletons and empty state.
- Closed restaurants appear marked as closed.

**Dependencies:** US-15. **PRD:** FR-DISC-1, FR-DISC-7.

### US-17 Search, filter and sort — Size M

**As a** customer, **I want** to search and filter restaurants, **so that** I find what I like quickly.

**Acceptance criteria**

- Search by restaurant name or cuisine (MongoDB text index); filters for cuisine, veg-only, city; sort by name and minimum order (P1: delivery time).
- Filters are reflected in the URL (shareable, back-button friendly) and debounced.
- Empty-result state with a clear-filters action.

**Dependencies:** US-16. **PRD:** FR-DISC-2, 3, 4.

### US-18 Restaurant detail and menu — Size M

**As a** customer, **I want** to view a restaurant's menu, **so that** I can pick dishes.

**Acceptance criteria**

- `/restaurants/[slug]` shows info, hours, open/closed state and menu grouped by category with veg/non-veg markers and unavailable dishes greyed out.
- `GET /api/restaurants/:id` and `/menu`; pending/rejected/suspended restaurants return 404 to the public.
- SEO metadata and Open Graph tags for the page.
- P1: in-restaurant dish search.

**Dependencies:** US-16. **PRD:** FR-DISC-5, 6, 7.

### US-19 Responsive layout and navigation polish — Size S

**As a** customer on a phone, **I want** a clean mobile layout, **so that** browsing is comfortable.

**Acceptance criteria**

- Header with search, cart icon (badge placeholder), auth menu; mobile nav via shadcn `Sheet`; footer.
- Layouts verified at 360 px, 768 px, and 1280 px widths; keyboard focus order and alt text are correct.

**Dependencies:** US-18. **PRD:** NFR-6.

---

## E6 — Cart & Addresses

### US-20 Addresses — Size M

**As a** customer, **I want** to save delivery addresses, **so that** checkout is quick.

**Acceptance criteria**

- `Address` model and CRUD API (`/api/addresses`); address book page and add/edit dialog.
- Exactly one default address per user (service enforces this); deleting the default promotes another.

**Dependencies:** US-05. **PRD:** FR-ADDR-1, 2.

### US-21 Multi-restaurant cart — Size L

**As a** customer, **I want** to add dishes from one or more restaurants to my cart, **so that** I can order what I want in one go.

**Acceptance criteria**

- "Add" buttons on the menu with quantity steppers; requires login (guest is redirected to login and returned).
- `Cart` model and API (`/api/cart`, `/api/cart/items`); cart stored server-side per user.
- Cart page and slide-over: items grouped by restaurant, quantity change, remove, clear; header badge shows item count.
- Totals from the server: per-restaurant subtotal and delivery fee, 5% tax, grand total; minimum-order warning per group.
- Unavailable/removed dishes or closed restaurants are flagged and block checkout until resolved.
- Prices always come from the database, never from the client.

**Dependencies:** US-18, US-05. **PRD:** FR-CART-1–5.

### US-22 Guest cart merge — Size S (P1)

**As a** guest, **I want** my cart kept when I log in, **so that** I don't lose my selections.

**Acceptance criteria**

- Guest cart in local storage; on login it merges into the server cart (quantities summed, unavailable items dropped with a notice).

**Dependencies:** US-21. **PRD:** FR-CART-6.

---

## E7 — Checkout & Payments

### US-23 Checkout and order placement — Size L

**As a** customer, **I want** to review and place my order, **so that** restaurants start preparing it.

**Acceptance criteria**

- Checkout page: choose/add address, add delivery instructions per restaurant, see itemised charges, choose payment method.
- `Order` model with price snapshots, address snapshot, charges, `statusHistory`, `checkoutId`, `orderNumber`.
- Service revalidates everything at placement (availability, restaurant active and open, minimum order, prices) and returns specific errors.
- Order status machine implemented as a standalone, unit-tested class.
- COD path (P1): places one order per restaurant in `PLACED` immediately and clears the cart.
- Confirmation page lists the orders with order numbers.

**Dependencies:** US-20, US-21. **PRD:** FR-ORD-1, 2a, 2b, 3, 4.

### US-24 Razorpay test-mode payment — Size L **[You]**

**As a** customer, **I want** to pay online, **so that** my order is confirmed without cash.

**You do:** create a Razorpay account, stay in **Test mode**, and generate test API keys and a webhook secret.

**Acceptance criteria**

- `PaymentProvider` interface with `RazorpayProvider` and `CodProvider`; `Payment` model.
- `POST /api/checkout` creates the Razorpay order for the cart total from server-calculated amounts; the client opens Razorpay Checkout.
- `POST /api/payments/verify` verifies the signature server-side; on success creates one `PLACED` order per restaurant, marks paid, and clears the cart.
- `POST /api/payments/webhook` handles `payment.captured`/`failed` idempotently (verifies webhook signature); duplicate calls never create duplicate orders.
- Failed, cancelled, or abandoned payments create no orders; the user can retry from the cart.
- Verified using Razorpay's test cards/UPI.

**Dependencies:** US-23. **PRD:** FR-ORD-2, 2b, 2c, §3.3 #9.

### US-25 Customer order history and detail — Size M

**As a** customer, **I want** to see my past and current orders, **so that** I can review them.

**Acceptance criteria**

- `/orders` lists orders (paginated, newest first, status badges); `/orders/[id]` shows items, charges, address, payment status and timeline.
- A customer can only see their own orders (403/404 otherwise).
- P1: "Reorder" adds the items back to the cart, skipping unavailable ones with a notice.

**Dependencies:** US-24. **PRD:** FR-ORD-5, 8.

---

## E8 — Order Fulfilment & Tracking

### US-26 Owner incoming orders — Size M

**As an** owner, **I want** to see new orders as they arrive, **so that** I can act quickly.

**Acceptance criteria**

- `/owner/orders` shows active orders, newest first, with auto-refresh (polling every ~10 s), a visible new-order indicator, and status filter.
- `GET /api/owner/orders` returns only the owner's restaurant's orders.
- P1: order history view.

**Dependencies:** US-24. **PRD:** FR-OWN-6, 8.

### US-27 Owner order status updates — Size M

**As an** owner, **I want** to accept, reject, and advance orders, **so that** customers see progress.

**Acceptance criteria**

- `PATCH /api/owner/orders/:id/status`; owner sees only valid next actions (Accept/Reject → Preparing → Out for delivery → Delivered).
- Invalid transitions return 409; each change is timestamped in `statusHistory`; rejection requires a reason.
- Rejecting a paid order marks the payment `REFUND_PENDING`.

**Dependencies:** US-26. **PRD:** FR-OWN-7, lifecycle in §4.5.

### US-28 Customer tracking page — Size M

**As a** customer, **I want** live status, **so that** I know when my food will arrive.

**Acceptance criteria**

- Tracking page shows a visual stepper and timeline, polling every ~10 s and stopping at a terminal state.
- Multi-restaurant checkouts show each order's status separately.
- Rejected/cancelled orders show the reason.

**Dependencies:** US-27. **PRD:** FR-ORD-6.

### US-29 Customer cancellation — Size S

**As a** customer, **I want** to cancel an order before it is accepted, **so that** I'm not charged for something I no longer want.

**Acceptance criteria**

- Cancel button is visible only while the order is `PLACED`; service enforces this; the owner's list updates.
- Paid orders become `REFUND_PENDING` (simulated refund in test mode).

**Dependencies:** US-27. **PRD:** FR-ORD-7.

---

## E9 — Admin Oversight

### US-30 Admin users, orders and dashboard — Size M

**As an** admin, **I want** visibility across the platform, **so that** I can monitor and support it.

**Acceptance criteria**

- Read-only paginated lists of users and orders with filters (role, status, date, restaurant).
- Dashboard cards: orders today, active restaurants, pending approvals, total users (P1).

**Dependencies:** US-27. **PRD:** FR-ADM-3, 4.

---

## E10 — Hardening & Release

### US-31 Security hardening — Size M

**Acceptance criteria**

- Security headers (CSP, HSTS, X-Frame-Options, etc.) configured in Next.js.
- Rate limiting on auth-sync, checkout, payments, and upload-signing endpoints.
- Every route reviewed for authN/authZ and ownership checks; Zod validation on all inputs; no secrets or stack traces in responses.
- Dependency audit clean of high/critical issues.

**Dependencies:** US-30. **PRD:** NFR-2.

### US-32 Test suite and E2E flows — Size L

**Acceptance criteria**

- ≥70% coverage on `src/services`; integration tests for key API routes against an in-memory/test MongoDB.
- Playwright E2E for: customer registers → searches → adds to cart → pays (test mode) → tracks; owner accepts and advances the order; admin approves a restaurant.
- Tests run in CI.

**Dependencies:** US-30. **PRD:** NFR-8.

### US-33 Performance, accessibility, and go-live checklist — Size M

**Acceptance criteria**

- Indexes verified with `explain` on list/search queries; Lighthouse performance and accessibility ≥ 90 on home and restaurant pages; images optimised.
- Custom 404/500 pages and graceful error boundaries.
- Production env vars set; Firebase authorised domains updated; README with setup, scripts and architecture overview; known limitations documented (Razorpay test mode, Vercel Hobby non-commercial terms).
- PRD success metrics (§10) verified in a final walkthrough.

**Dependencies:** US-31, US-32. **PRD:** NFR-1, 6, 10, §10.

---

## Execution order at a glance

`US-01 → 02 → 03 → 04 → 05 → 06 → 08 → 09 → 10 → 11 → 12 → 13 → 14 → 15 → 16 → 17 → 18 → 19 → 20 → 21 → 23 → 24 → 25 → 26 → 27 → 28 → 29 → 30 → 31 → 32 → 33`

Optional (P1) stories can be done any time after their dependency: **US-07** (after 05), **US-22** (after 21).

## Your manual action checklist

| When         | Action                                                                     | Story |
| ------------ | -------------------------------------------------------------------------- | ----- |
| Before US-02 | Create MongoDB Atlas M0 cluster and database user; share connection string | US-02 |
| Before US-03 | Create GitHub repo and Vercel Hobby account                                | US-03 |
| Before US-04 | Firebase project and keys ([guide](auth-setup-guide.md))                   | US-04 |
| Before US-12 | Cloudinary free account and credentials                                    | US-12 |
| Before US-24 | Razorpay account in test mode, API keys and webhook secret                 | US-24 |

## Traceability

All P0 functional requirements in the PRD map to a story: AUTH → US-04–09, DISC → US-16–18, CART → US-21–22, ADDR → US-20, ORD → US-23–29, OWN → US-11–14, 26–27, ADM → US-10, 30. NFRs are covered by the Definition of Done and E10.

## Approval

| Role          | Name   | Decision                       | Date |
| ------------- | ------ | ------------------------------ | ---- |
| Product Owner | Shakir | ☐ Approved ☐ Changes requested |      |
