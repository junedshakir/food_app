# Architecture Document — Food Delivery App (MVP)

| Field | Value |
|---|---|
| Status | **Draft — awaiting approval** |
| Version | 0.1 |
| Date | 2026-11-08 |
| Inputs | [prd.md](prd.md) v0.3 (approved), [user-stories.md](user-stories.md), `CLAUDE.md` |
| Framework | Next.js 16 (App Router), React 19, TypeScript (strict), Tailwind 4, shadcn/ui |

---

## 1. Goals and Constraints

**Goals:** a layered MVC codebase where each concern has one home, business rules are testable without HTTP or a browser, and the API can later serve a mobile app unchanged.

**Hard constraints**
- Stack: TypeScript, Next.js, Tailwind, shadcn/ui, MongoDB Atlas (Mongoose), Firebase Auth.
- All services in a services layer; all UI logic in UI components; all APIs in `/api` as Next.js route handlers.
- Only free services; no paid plan or card (PRD §3.2a).
- UI built from shadcn/ui components wherever possible (`CLAUDE.md`).
- Next.js 16 conventions: request interception lives in `proxy.ts` (formerly `middleware`), and route handler `params` is a `Promise`. Read `node_modules/next/dist/docs/` before writing framework-specific code (`AGENTS.md`).

## 2. System Context

```
 Browser (Customer / Owner / Admin)
        │  HTTPS
        ▼
 ┌─────────────────────────── Vercel (Hobby) ───────────────────────────┐
 │  Next.js app                                                         │
 │   ├─ React UI (RSC + client components)                              │
 │   └─ /api route handlers (JSON)                                      │
 └──────┬───────────────┬───────────────┬───────────────┬───────────────┘
        │               │               │               │
   MongoDB Atlas   Firebase Auth   Cloudinary       Razorpay
   (M0, data)      (identity,      (image store,    (test mode
                    ID tokens)      CDN)             payments)
```

| External system | Used for | Direction |
|---|---|---|
| Firebase Auth | Sign-up/in, ID tokens, password reset | Browser ↔ Firebase; server verifies tokens (Admin SDK) |
| MongoDB Atlas | All application data | Server only |
| Cloudinary | Image upload and delivery | Browser uploads directly using server-signed params |
| Razorpay | Payment order, checkout widget, webhook | Browser ↔ Razorpay; Razorpay → our webhook |

## 3. Architectural Style: MVC with a Services Layer

| MVC role | Where | Responsibility | Must not |
|---|---|---|---|
| **View** | `src/app/**/page.tsx`, `layout.tsx`, `src/components`, `src/hooks` | Rendering, form state, client-side interaction, calling the API client | Contain business rules, import services, repositories or models |
| **Controller** | `src/app/api/**/route.ts` | Parse and validate input (Zod), authenticate and authorise, call **one** service method, map result to the response envelope | Contain business rules, query the DB |
| **Service** | `src/services` | All business logic: rules, orchestration, state machines, price calculation, ownership checks, transactions | Know about HTTP (`Request`, `Response`, status codes) |
| **Repository** | `src/repositories` | Query building and persistence via Mongoose | Contain business rules |
| **Model** | `src/models` | Mongoose schema, indexes, types | Contain business rules |

### 3.1 Dependency rule (enforced by ESLint `no-restricted-imports` and review)

```
 components/hooks ──► lib/api-client ══HTTP══► api route handlers
                                                    │
                                                    ▼
                                                services ──► repositories ──► models ──► MongoDB
                                                    │
                                                    └──► providers (payment, storage, auth)
```

Allowed imports only point downwards. Concretely:
- `components/**`, `hooks/**`, `app/**/page.tsx` may import: `lib/api-client`, `types`, `validators` (for form schemas), `components/ui`.
- `app/api/**` may import: `services`, `validators`, `lib/auth`, `lib/errors`, `lib/http`.
- `services/**` may import: `repositories`, `providers`, `lib/errors`, `types`, `lib/config`.
- `repositories/**` may import: `models`, `lib/db`.
- Nothing imports upward.

> **Server-component data fetching:** pages that benefit from SSR/SEO (home, restaurant detail) call the same HTTP API via the api-client (server-side `fetch` to our own base URL with caching/revalidation set), so the API remains the single contract. Pages never call services directly.

## 4. Repository Layout

```
src/
├─ app/
│  ├─ (public)/                 home, restaurants/[slug]
│  ├─ (auth)/                   login, register, forgot-password, partner signup
│  ├─ (customer)/               cart, checkout, orders, orders/[id], profile, addresses
│  ├─ owner/                    dashboard, orders, menu, profile
│  ├─ admin/                    restaurants, users, orders, dashboard
│  ├─ api/                      controllers (see §8)
│  ├─ layout.tsx, error.tsx, not-found.tsx
│  └─ globals.css
├─ proxy.ts                     coarse route gating (redirect to login) — UX only, not security
├─ components/
│  ├─ ui/                       shadcn generated (do not hand edit except theming)
│  └─ features/                 restaurant/, menu/, cart/, checkout/, orders/, owner/, admin/, layout/
├─ hooks/                       useAuth, useCart, useDebounce, usePolling ...
├─ lib/
│  ├─ api-client/               typed fetch wrapper + one module per resource
│  ├─ auth/                     server: verifyIdToken, requireAuth, requireRole; client: AuthProvider
│  ├─ config/                   validated env (Zod)
│  ├─ db/                       mongoose connection singleton
│  ├─ errors/                   AppError hierarchy + mapper
│  ├─ firebase/                 client.ts, admin.ts
│  ├─ http/                     route-handler wrapper, response helpers
│  ├─ logger.ts                 pino
│  └─ money.ts                  paise ↔ INR helpers, formatting
├─ models/                      User, Restaurant, MenuCategory, Dish, Cart, Address, Order, Payment
├─ repositories/                one per model
├─ services/                    AuthService, UserService, RestaurantService, MenuService,
│                               DiscoveryService, CartService, PricingService, CheckoutService,
│                               OrderService, PaymentService, UploadService, AdminService
├─ providers/                   payment/ (PaymentProvider, Razorpay, Cod), storage/ (Cloudinary)
├─ validators/                  Zod schemas shared by client and server
└─ types/                       DTOs, enums, API envelope types
tests/  unit/ integration/ e2e/        scripts/ seed.ts, make-admin.ts
```

## 5. Authentication and Authorisation

### 5.1 Identity flow (Firebase)

```
Browser                         Firebase                 Next.js API             MongoDB
  │ signIn(email,pw) ───────────► │                          │                      │
  │ ◄────────── ID token (1h) ─── │                          │                      │
  │ POST /api/auth/sync  Authorization: Bearer <idToken> ──► │ verifyIdToken (Admin)│
  │                               │                          │ upsert User ────────►│
  │ ◄─────────────────────────────────────── { user, role } ─│                      │
  │ subsequent calls: Authorization: Bearer <idToken> ─────► │ verify → load user ─►│
```

- The client SDK holds the session and refreshes tokens automatically; `lib/api-client` fetches a fresh ID token for each request (`getIdToken()`), so there is **no custom session cookie** in the MVP.
- The server **always** verifies the token with `firebase-admin`; the client's claims are never trusted.
- The MongoDB `User` (keyed by `firebaseUid`) is the source of truth for **role** and `restaurantId`. Roles are not stored in Firebase custom claims, so changing a role takes effect immediately without token refresh.

### 5.2 Guards

| Layer | Mechanism | Purpose |
|---|---|---|
| `proxy.ts` / layouts | Redirect unauthenticated users hitting protected routes to `/login?next=...` | UX only |
| Client route groups | Layout-level role check using `useAuth()` | UX only |
| **Route handler** | `requireAuth()` → `AuthContext {user}`; `requireRole('owner')` | **Real enforcement** |
| **Service** | Ownership/resource checks (e.g. dish belongs to the caller's restaurant) | **Real enforcement** |

`requireAuth` and `requireRole` are composable wrappers around the handler (see §8.2). Services receive an explicit `actor` argument (`{ userId, role, restaurantId? }`) so they are testable and never reach into request state.

### 5.3 Roles

| Role | Created by | Notes |
|---|---|---|
| `customer` | Default on first sync | |
| `owner` | `POST /api/owner/register` | Restaurant starts `PENDING` |
| `admin` | `npm run make-admin -- <email>` | No public path to admin |

## 6. Data Architecture (MongoDB)

### 6.1 Conventions
- Mongoose, `timestamps: true`, `strict` schemas, `toJSON` transforms `_id` → `id` and drops `__v`.
- **Money is an integer in paise** everywhere (`price: 24900` = ₹249.00). Formatting happens only in `lib/money.ts` and UI.
- Connection singleton cached on `globalThis` to survive hot reload and serverless reuse.
- References by `ObjectId`; no deep joins. Snapshots are embedded where history must not change (orders).
- Transactions (Atlas M0 supports replica-set transactions) are used where multiple documents must change atomically: owner registration, order creation from a verified payment.

### 6.2 Collections

**users**
| Field | Type | Notes |
|---|---|---|
| `firebaseUid` | string | unique index |
| `email` | string | unique, lowercased |
| `name`, `phone` | string | |
| `role` | `customer \| owner \| admin` | index |
| `restaurantId` | ObjectId? | set for owners |

**restaurants**
| Field | Type | Notes |
|---|---|---|
| `ownerId` | ObjectId | unique (one restaurant per owner) |
| `name`, `slug` | string | `slug` unique |
| `description`, `cuisines[]`, `isVeg` | | |
| `address{line1, city, pincode}`, `city` | | `city` indexed |
| `image{url, publicId}` | | Cloudinary |
| `openingHours` | `{day, open, close}[]` | |
| `isOpen` | boolean | owner toggle |
| `status` | `PENDING \| ACTIVE \| REJECTED \| SUSPENDED` | indexed; `rejectionReason?` |
| `minOrder`, `deliveryFee` | int paise | |
| Indexes | text(`name`, `cuisines`), compound(`status`,`city`,`isVeg`) | |

**menucategories** — `restaurantId`, `name`, `sortOrder`; unique (`restaurantId`,`name`).

**dishes** — `restaurantId`, `categoryId`, `name`, `description`, `price` (paise), `isVeg`, `image`, `isAvailable`; index (`restaurantId`,`categoryId`); text(`name`).

**addresses** — `userId`, `label`, `line1`, `line2`, `city`, `pincode`, `isDefault`; index `userId`.

**carts** — `userId` (unique), `items[{restaurantId, dishId, quantity}]`. Stores **no prices**; prices are looked up at read time.

**orders**
| Field | Notes |
|---|---|
| `orderNumber` | human friendly, unique (e.g. `FD-20261108-4F9K`) |
| `checkoutId` | groups orders from one checkout; indexed |
| `userId`, `restaurantId` | indexed (`userId, createdAt`), (`restaurantId, status, createdAt`) |
| `items[{dishId, name, price, quantity, isVeg}]` | **price snapshot** |
| `addressSnapshot` | copy of the chosen address |
| `charges{subtotal, deliveryFee, tax, total}` | paise, computed by `PricingService` |
| `paymentMethod`, `paymentStatus` | `RAZORPAY \| COD`; `PENDING \| PAID \| FAILED \| REFUND_PENDING` |
| `status`, `statusHistory[{status, at, by, reason?}]` | state machine (§9) |
| `instructions` | |

**payments** — `checkoutId` (unique), `userId`, `provider`, `razorpayOrderId` (unique), `razorpayPaymentId?`, `amount`, `currency: "INR"`, `status` (`CREATED \| PAID \| FAILED`), `cartSnapshot` (restaurants, items, address, instructions captured at checkout), `processedAt?`.

> **Why `payments.cartSnapshot`:** the server must create orders after the payment is verified (from either `verify` or the webhook, whichever arrives first). The snapshot freezes exactly what the customer was charged for, so a cart edit in between cannot change what is ordered.

### 6.3 Relationships

```
User 1─0..1 Restaurant 1─* MenuCategory 1─* Dish
User 1─* Address            User 1─1 Cart (items → Dish)
User 1─* Order *─1 Restaurant     Order *─1 Payment (via checkoutId)
```

## 7. Service Layer Design

Services are plain TypeScript classes with constructor-injected dependencies (repositories, providers, clock, logger). A small composition root (`src/services/container.ts`) wires production instances; tests construct services with fakes. This gives dependency inversion without a DI framework.

| Service | Key responsibilities |
|---|---|
| `AuthService` | `syncUser(decodedToken)`; role lookup |
| `UserService` | profile read/update |
| `RestaurantService` | owner registration (transaction), profile update, open/closed, admin status transitions with validation |
| `MenuService` | category and dish CRUD with ownership checks, availability |
| `DiscoveryService` | list/search/filter/sort active restaurants; public restaurant + menu read |
| `CartService` | add/update/remove/clear, merge, enriched cart view |
| `PricingService` | **single source of truth** for totals: per-restaurant subtotal, delivery fee, tax, grand total, minimum-order check |
| `CheckoutService` | validate cart, build the payment snapshot, call `PaymentProvider`, COD path |
| `PaymentService` | verify signature, handle webhook, idempotent order creation |
| `OrderService` | create orders, status transitions (owner/customer), history, queries |
| `UploadService` | produce signed Cloudinary upload parameters |
| `AdminService` | cross-platform queries and dashboard counts |

### 7.1 Design patterns in use

| Pattern | Where | Why |
|---|---|---|
| Repository | `repositories/*` | Isolates Mongoose; services stay unit-testable |
| Strategy | `PaymentProvider` (`RazorpayProvider`, `CodProvider`) | Add gateways without touching checkout logic |
| State machine | `OrderStateMachine`, `RestaurantStatusMachine` | Centralise legal transitions |
| Facade | Services expose use-case methods to controllers | Controllers stay thin |
| Dependency injection | Constructor injection, composition root | Testability, inversion of control |
| Adapter | `CloudinaryStorage`, Firebase Admin wrapper | Third-party SDKs behind our interfaces |
| Singleton | DB connection, Firebase Admin app | Serverless connection reuse |
| DTO + Validation | Zod schemas in `validators/` | One contract for client and server |
| Template/wrapper | `route()` handler wrapper | Uniform auth, validation, errors, logging |

### 7.2 Pricing (single place, deterministic)

```
subtotal(r)   = Σ dish.price × quantity            (from DB prices)
deliveryFee(r)= restaurant.deliveryFee
tax(r)        = round(subtotal(r) × TAX_RATE)      (TAX_RATE = 0.05, rounding half up, in paise)
total(r)      = subtotal + deliveryFee + tax
grandTotal    = Σ total(r)
```
Rules: a restaurant group fails checkout if `subtotal < minOrder`, the restaurant is not `ACTIVE`+open, or any dish is missing/unavailable. The Razorpay amount is `grandTotal` in paise.

## 8. API Architecture (Controllers)

### 8.1 Conventions
- Route handlers at `src/app/api/<resource>/route.ts` (and `[id]/route.ts`) exporting `GET`/`POST`/`PATCH`/`DELETE`.
- JSON in and out. **Envelope:** success `{ "data": ... , "meta"?: {page, pageSize, total} }`; failure `{ "error": { "code", "message", "details"? } }`.
- Dynamic params are awaited: `ctx.params` is a Promise in Next 16.
- Status codes: 200/201/204, 400 validation, 401 unauthenticated, 403 forbidden, 404 not found (also for resources the caller may not know exist), 409 conflict/invalid transition, 429 rate limit, 500.
- Pagination: `?page=1&pageSize=12` (max 50); lists return `meta`.
- Money in responses is integer paise plus the client formats.

### 8.2 The handler wrapper

Every handler is built with one wrapper so cross-cutting behaviour is not repeated:

```ts
export const POST = route({
  auth: "owner",                       // none | any | customer | owner | admin
  body: createDishSchema,              // Zod; 400 on failure
  rateLimit: "write",
  handler: async ({ body, actor }) => menuService.createDish(actor, body),
});
```
The wrapper: assigns a request id, verifies the token and loads the actor, validates params/query/body, applies the rate limit, invokes the handler, wraps the result in the envelope, and converts thrown `AppError`s to the error envelope (unknown errors → logged 500 with no internals leaked).

### 8.3 Endpoint catalogue

| Area | Endpoint | Auth | Service call |
|---|---|---|---|
| Health | `GET /api/health` | none | DB ping |
| Auth | `POST /api/auth/sync` | any token | `AuthService.syncUser` |
| Profile | `GET, PATCH /api/me` | any | `UserService` |
| Addresses | `GET, POST /api/addresses`; `PATCH, DELETE /api/addresses/[id]` | customer | `AddressService` |
| Restaurants | `GET /api/restaurants`; `GET /api/restaurants/[id]`; `GET /api/restaurants/[id]/menu` | none | `DiscoveryService` |
| Cart | `GET, DELETE /api/cart`; `POST /api/cart/items`; `PATCH, DELETE /api/cart/items/[dishId]`; `POST /api/cart/merge` | customer | `CartService` |
| Checkout | `POST /api/checkout` | customer | `CheckoutService` |
| Payments | `POST /api/payments/verify` (customer); `POST /api/payments/webhook` (Razorpay signature) | see left | `PaymentService` |
| Orders | `GET /api/orders`; `GET /api/orders/[id]`; `POST /api/orders/[id]/cancel` | customer | `OrderService` |
| Owner signup | `POST /api/owner/register` | any token | `RestaurantService` |
| Owner | `GET, PATCH /api/owner/restaurant`; `PATCH /api/owner/restaurant/open`; CRUD `/api/owner/categories`, `/api/owner/dishes`; `GET /api/owner/orders`; `PATCH /api/owner/orders/[id]/status` | owner | `RestaurantService`, `MenuService`, `OrderService` |
| Uploads | `POST /api/uploads/sign` | owner/admin | `UploadService` |
| Admin | `GET /api/admin/restaurants`; `PATCH /api/admin/restaurants/[id]/status`; `GET /api/admin/users`; `GET /api/admin/orders`; `GET /api/admin/stats` | admin | `AdminService` |

### 8.4 Client API layer

`lib/api-client/http.ts` wraps `fetch`: base URL, attaches the Firebase ID token, unwraps the envelope, throws a typed `ApiError` carrying `code` and `status`. Resource modules (`restaurants.ts`, `cart.ts`, `orders.ts`, ...) expose typed functions. UI uses them through **TanStack Query** hooks (`useQuery`/`useMutation`) for caching, retries, invalidation and polling.

## 9. Key Flows

### 9.1 Order state machine

```
              ┌────────► REJECTED (owner, reason required)
 PLACED ──────┼────────► CANCELLED (customer, only while PLACED)
   │          │
   ▼          │
 ACCEPTED ────┘(owner may still reject)
   ▼
 PREPARING ─► OUT_FOR_DELIVERY ─► DELIVERED
```
- `DELIVERED`, `CANCELLED`, `REJECTED` are terminal.
- Allowed transitions live in one table inside `OrderStateMachine`; every transition records `statusHistory` and the actor.
- Optimistic concurrency: updates use `findOneAndUpdate({_id, status: current})`, so two simultaneous changes cannot both win (loser gets 409).
- Cancelling/rejecting an order with `paymentStatus = PAID` sets it to `REFUND_PENDING` (refund simulated in test mode).

### 9.2 Checkout with Razorpay (multi-restaurant, split orders)

```
Customer          Next.js API                         Razorpay            MongoDB
  │ POST /api/checkout {addressId, instructions, method=RAZORPAY}
  │ ─────────────────► CheckoutService
  │                    cart → PricingService (revalidate all)  ───────────────►
  │                    create Razorpay order(grandTotal) ────────► order_id
  │                    save Payment(CREATED, cartSnapshot) ──────────────────►
  │ ◄───── {razorpayOrderId, amount, keyId}
  │ open Razorpay Checkout (browser) ────────────────────────────► pay
  │ ◄── {payment_id, order_id, signature}
  │ POST /api/payments/verify
  │ ─────────────────► PaymentService.verify
  │                    HMAC check (key secret) → mark Payment PAID
  │                    TX: create 1 Order per restaurant (PLACED, PAID), clear cart ─►
  │ ◄───── {orders[]}                     (webhook may arrive first or second)
```
- **Idempotency:** order creation is keyed on `checkoutId`. `payments.status` moves `CREATED → PAID` with a conditional update; whichever of `verify`/webhook wins creates the orders, the other becomes a no-op returning the existing orders. A unique index on (`checkoutId`, `restaurantId`) in orders is the last line of defence.
- **Webhook:** raw body is read and the `X-Razorpay-Signature` header is verified with the webhook secret before any parsing is trusted. Handles `payment.captured` and `payment.failed`.
- **Failure/abandonment:** no orders are created; the Payment stays `CREATED`/`FAILED`, the cart is untouched, and the user can retry (a new Razorpay order is created if the cart changed).
- **COD (P1):** `CodProvider` skips Razorpay; orders are created immediately with `paymentMethod: COD, paymentStatus: PENDING`.

### 9.3 Restaurant onboarding and approval

```
Owner registers → User(role=owner) + Restaurant(PENDING)  [transaction]
Admin reviews  → PENDING → ACTIVE | REJECTED(reason)
ACTIVE ⇄ SUSPENDED (admin)         REJECTED → PENDING (owner edits and resubmits)
```
Only `ACTIVE` restaurants are returned by public endpoints; others return 404 to the public.

### 9.4 Order status updates (polling)
The customer tracking page and owner order list use TanStack Query `refetchInterval` (~10 s), stopping at terminal states and pausing when the tab is hidden. The endpoints are cheap, indexed reads. SSE can replace polling later behind the same hooks.

### 9.5 Image upload
Owner selects a file → `POST /api/uploads/sign` (role-checked, returns timestamp, signature, folder `restaurants/{id}`, allowed formats, max size) → browser POSTs the file **directly to Cloudinary** → receives `{secure_url, public_id}` → saved through the normal restaurant/dish update call. The API secret never leaves the server, and large files never pass through Vercel functions.

## 10. Frontend Architecture

- **Rendering:** server components for public, SEO-relevant pages (home, restaurant detail) with `revalidate`; client components for interactive areas (cart, checkout, dashboards).
- **State:** server state in TanStack Query; local UI state in React; auth state in `AuthProvider`. No global store in the MVP.
- **Forms:** shadcn form primitives + react-hook-form + the shared Zod schemas.
- **UI:** shadcn/ui first; custom components compose shadcn primitives (`CLAUDE.md`). Feature components live in `components/features/<area>`.
- **Layouts:** route groups provide customer, owner and admin shells; mobile-first with a `Sheet` for navigation.
- **UX states:** every data view has loading (Skeleton), empty, and error states; mutations use toasts (sonner).
- **Accessibility:** semantic landmarks, labelled form controls, keyboard operable dialogs/menus (inherited from Radix primitives), alt text on images, colour contrast checked.

## 11. Cross-Cutting Concerns

| Concern | Design |
|---|---|
| **Validation** | Zod on every body/query/param; schemas in `validators/` shared with forms |
| **Errors** | `AppError` base with `code`, `httpStatus`; subclasses `ValidationError`, `UnauthorizedError`, `ForbiddenError`, `NotFoundError`, `ConflictError`, `RateLimitError`; one mapper in `lib/errors` |
| **Logging** | pino JSON logs with `requestId`, `userId`, route, duration; secrets and tokens are redacted |
| **Config** | `lib/config` parses `process.env` with Zod at startup and exports typed config; server-only values are never imported into client code (`server-only` package) |
| **Rate limiting** | In-memory token bucket per IP/user for write, auth-sync, upload-sign and payment endpoints. Limitation: per-instance on serverless, so it is best-effort (acceptable for MVP; documented) |
| **Security headers** | CSP (allow Firebase, Razorpay checkout and Cloudinary origins), HSTS, `X-Content-Type-Options`, `Referrer-Policy`, frame protection in `next.config.ts` |
| **Secrets** | Env vars only; `.env.local` ignored; Vercel project env for deploys |
| **Time and IDs** | Injected `Clock` for testability; order numbers from date + random suffix with a retry on collision |
| **Caching** | Public restaurant/menu reads use short `revalidate` windows; all authenticated reads are `no-store` |

## 12. Security Architecture

**Threat → control**
| Threat | Control |
|---|---|
| Forged identity | Server-side `verifyIdToken` on every protected call |
| Privilege escalation | Role from MongoDB, not client; `requireRole` + service ownership checks; admin only via script |
| IDOR (reading another user's order/address) | Queries always scoped by actor (`{_id, userId}`), 404 otherwise |
| Price tampering | Client never sends prices; server computes from DB; orders snapshot prices |
| Replay/double payment | Idempotent `checkoutId`, signature verification, unique indexes |
| Fake payment callback | HMAC signature on verify and webhook |
| Injection | Zod validation; Mongoose typed schemas; reject unknown keys; strip `$`-prefixed operators from input |
| XSS | React escaping; no `dangerouslySetInnerHTML`; CSP |
| Malicious uploads | Signed params restrict folder, format and size; `next/image` domain allow-list |
| Abuse | Rate limits; pagination caps |
| Secret leakage | `server-only`, log redaction, no stack traces in responses, `.gitignore` for env files |

## 13. Testing Strategy

| Level | Tooling | Targets |
|---|---|---|
| Unit | Vitest | Services with fake repositories/providers: pricing, state machines, cart rules, checkout validation, payment idempotency, guards. Target ≥70% coverage on `src/services` |
| Component | Vitest + Testing Library | Key forms and cart interactions |
| Integration | Vitest + `mongodb-memory-server` (or a dedicated test DB) | Route handlers end to end with auth stubbed at the verification boundary |
| E2E | Playwright | Customer order journey, owner fulfilment, admin approval |
| CI | GitHub Actions | install → lint → typecheck → test → build on every PR |

## 14. Deployment and Environments

| Environment | Hosting | Data | Notes |
|---|---|---|---|
| Local | `npm run dev` | Atlas M0 dev database (`MONGODB_DB_NAME=fooddelivery_dev`) | `.env.local` |
| Production (MVP) | Vercel Hobby | Atlas M0 (`fooddelivery_prod`) | Env vars in Vercel; Firebase authorised domain added; Razorpay stays in **test mode** |

- Branching: feature branches → PR into `release/dev` → release to `main` (per `CLAUDE.md`). Vercel deploys `main`; preview deploys per PR.
- Atlas network access: allow `0.0.0.0/0` for the free tier on Vercel (dynamic IPs), protected by a strong DB user password.
- Seed and `make-admin` scripts refuse to run when `MONGODB_DB_NAME` indicates production.

## 15. Performance and Scalability

- Stateless handlers; DB connection reused across invocations.
- Every list query is backed by an index listed in §6; pagination is mandatory.
- Public pages are cached/revalidated; images are served by Cloudinary CDN with automatic format/size via `next/image`.
- Polling intervals are conservative, paused on hidden tabs.
- Known scaling steps beyond MVP: SSE/WebSockets for tracking, Redis (e.g. free Upstash tier) for rate limiting, Atlas Search for richer search, a job queue for notifications.

## 16. Architecture Decision Records (summary)

| # | Decision | Alternatives | Rationale |
|---|---|---|---|
| ADR-1 | Firebase Auth, roles in MongoDB | Clerk, Auth.js, Supabase | Free with no card; no unused DB; role changes apply instantly |
| ADR-2 | Mongoose + repository layer | Native driver, Prisma | Required MongoDB; schemas/indexes in code; repositories isolate it |
| ADR-3 | Bearer ID tokens, no custom session cookie | Session cookies | Simpler, API reusable by a future mobile app |
| ADR-4 | Money as integer paise | Floats, Decimal128 | Exact arithmetic, simple |
| ADR-5 | Cart stores no prices | Price snapshot in cart | Avoids stale prices; snapshot happens at order time |
| ADR-6 | Orders created only after verified payment, from a payment snapshot | Create order first, then pay | No orphan orders; idempotent across verify/webhook |
| ADR-7 | One order per restaurant, grouped by `checkoutId` | One mixed order | Each restaurant owns its own fulfilment lifecycle |
| ADR-8 | Polling for status | WebSockets/SSE | Works on serverless free tier; trivially upgradeable |
| ADR-9 | Direct-to-Cloudinary signed uploads | Proxy uploads through API | Avoids function size/time limits and exposes no secrets |
| ADR-10 | TanStack Query for server state | Redux, SWR | Caching, polling, mutations built in |
| ADR-11 | Services as DI classes, no framework | NestJS, tsyringe | Minimal overhead; fully testable |
| ADR-12 | API consumed even by server components | Direct service calls in RSC | Keeps one contract; strict MVC |

## 17. Risks and Mitigations

| Risk | Mitigation |
|---|---|
| Mongoose connection growth on serverless | Cached singleton; Atlas connection limits monitored |
| In-memory rate limiting is per instance | Documented; Upstash Redis as a later upgrade |
| Webhook and verify race | Conditional state update + unique indexes (§9.2) |
| Vercel Hobby is non-commercial | Documented; revisit hosting before a commercial launch |
| Free tier quotas (Atlas 512 MB, Cloudinary credits) | Image size limits, indexes, pagination; monitor usage |
| Polling load | Pause on hidden tab; short, cheap indexed reads |

## 18. Mapping to User Stories

| Epic | Architecture sections |
|---|---|
| E1 Foundation | §4, §6.1, §11, §14 |
| E2 Auth | §5 |
| E3 Onboarding/Approval | §5.3, §9.3 |
| E4 Menu | §6.2, §9.5 |
| E5 Discovery | §3.1 note, §8, §15 |
| E6 Cart & Addresses | §7.2, §6.2 |
| E7 Checkout & Payments | §9.2, §7.1 (Strategy) |
| E8 Fulfilment & Tracking | §9.1, §9.4 |
| E9 Admin | §8.3 |
| E10 Hardening | §11–§13 |

## 19. Approval

| Role | Name | Decision | Date |
|---|---|---|---|
| Product Owner | Shakir | ☐ Approved ☐ Changes requested | |
