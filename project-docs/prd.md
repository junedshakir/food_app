# Product Requirements Document — Food Delivery App (MVP)

| Field       | Value                                                   |
| ----------- | ------------------------------------------------------- |
| Status      | **Approved**                                            |
| Version     | 0.3 (all open questions resolved)                       |
| Date        | 2026-11-08                                              |
| Inspiration | Zomato (web)                                            |
| Platform    | Browser-based web app only (mobile app is out of scope) |

---

## 1. Purpose & Background

Build a browser-based food delivery web app, inspired by Zomato, that lets customers discover restaurants, order food, and track the order; lets restaurant owners manage their menu and fulfil orders; and lets an admin oversee the platform. This release is the **MVP**: the minimum set of features needed to complete a real order end to end.

### 1.1 Goals

- A customer can sign up, browse restaurants, build a cart, place an order, and see its status.
- A restaurant owner can manage a restaurant profile and menu and move orders through their lifecycle.
- An admin can approve restaurants and view all orders.
- A clean, layered codebase (MVC) that can later back a mobile app.

### 1.2 Non-Goals (Out of MVP scope)

- Native/mobile apps
- Real-time GPS tracking and a delivery-partner app (delivery is simulated by status changes)
- Live payments with real money (MVP uses Razorpay **test mode** only; going live is a later config change)
- Ratings & reviews, coupons/promotions, loyalty, wallet
- Multi-language / multi-currency, push/SMS notifications, chat support
- Table booking, dine-in, grocery
- Recommendation engine, advanced analytics

---

## 2. Users & Roles

| Role                 | Description                                                          | Key capabilities                                         |
| -------------------- | -------------------------------------------------------------------- | -------------------------------------------------------- |
| **Guest**            | Not logged in                                                        | Browse/search restaurants and menus                      |
| **Customer**         | Registered user                                                      | Cart, checkout, addresses, order history, order tracking |
| **Restaurant Owner** | Self-registers; owns one restaurant; needs admin approval to go live | Manage restaurant profile, menu, incoming orders         |
| **Admin**            | Platform operator                                                    | Approve/suspend restaurants, view all orders and users   |

Roles are stored in MongoDB (keyed by auth UID) and enforced server-side.

---

## 3. Technology & Architecture Decisions

### 3.1 Mandated stack (from requirements)

- **TypeScript**, **Next.js** (App Router), **Tailwind CSS**, **shadcn/ui**
- **MongoDB** on **MongoDB Atlas** (via Mongoose)
- MVC with strict layering:
  - **View** → React UI components (all UI logic lives here)
  - **Controller** → Next.js Route Handlers under `/app/api/**` (thin: parse, authorise, call service, shape response)
  - **Model** → Mongoose models/schemas
  - **Services layer** → all business logic (`/src/services`); controllers never touch models directly, UI never touches services directly (UI calls the API via a client layer).

### 3.2 Authentication recommendation: **Firebase Authentication**

| Criterion           | Firebase Auth                                                 | Supabase Auth                                  |
| ------------------- | ------------------------------------------------------------- | ---------------------------------------------- |
| Free tier           | Generous (Spark plan, email/password and Google sign-in free) | Free tier, but projects pause after inactivity |
| Fit with MongoDB    | Auth-only usage; no unused database                           | Bundles Postgres we would not use              |
| Setup effort        | ~10 minutes, console only                                     | ~10 minutes                                    |
| Server verification | `firebase-admin` verifies ID tokens in API routes             | JWT verification                               |

**Decision (confirmed):** Firebase Authentication on the free Spark plan, no credit card (email/password + Google). The client signs in with the Firebase Web SDK; API routes verify the ID token with `firebase-admin`. Step-by-step setup is in [auth-setup-guide.md](auth-setup-guide.md).

### 3.2a Free-of-cost constraint

Every service must be usable with **no payment, no card on file, and no paid plan**:

| Need            | Service                  | Free tier used                                                        |
| --------------- | ------------------------ | --------------------------------------------------------------------- |
| Auth            | Firebase Authentication  | Spark plan (no card); email/password and Google only, never phone/SMS |
| Database        | MongoDB Atlas            | M0 free cluster (512 MB)                                              |
| Images          | Cloudinary               | Free plan (no card)                                                   |
| Payments        | Razorpay                 | Test mode only (no KYC, no fees)                                      |
| Hosting         | Vercel                   | Hobby plan (free; non-commercial use)                                 |
| CI              | GitHub Actions           | Free minutes for public/private repos                                 |
| Logging/testing | pino, Vitest, Playwright | Open source                                                           |

Rule: do not introduce any dependency or service that requires a paid plan. Hosting on Vercel Hobby is for the MVP/demo; commercial launch would need a re-evaluation.

### 3.3 Architecture review — components you may have missed

These are included in the MVP unless marked _deferred_.

1. **Authorization (RBAC)** — roles and route/API guards, separate from authentication.
2. **User profile sync** — create a MongoDB user record on first login linked to the Firebase UID.
3. **Input validation** — Zod schemas shared between client and API.
4. **Consistent error handling & API response envelope** — typed errors, HTTP status mapping.
5. **Configuration & secrets management** — validated env vars, `.env.example`, never commit secrets.
6. **Image storage** — **Cloudinary** (free tier): signed direct uploads from the browser, stored as URL + public ID, served via CDN with automatic resizing.
7. **Order state machine** — explicit allowed status transitions, enforced in the service layer.
8. **Price integrity** — server recalculates totals from DB prices; never trusts client prices. Order items store a price **snapshot**.
9. **Payment abstraction** — `PaymentProvider` interface with `RazorpayProvider` (test mode) and `CodProvider`. Server creates the Razorpay order, verifies the payment signature, and handles the webhook idempotently.
10. **Order status updates** — MVP uses polling (e.g., every 10s) rather than WebSockets (_deferred:_ SSE/WebSockets).
11. **Database indexing & pagination** — indexes for search/filters; cursor/offset pagination on lists.
12. **Search** — MongoDB text index for restaurants/dishes (_deferred:_ Atlas Search).
13. **Rate limiting & security headers** — basic protection on auth-adjacent and write APIs.
14. **Logging** — structured server logs (e.g., pino).
15. **Testing** — unit tests (services), API/integration tests, a few E2E flows.
16. **CI/CD & hosting** — GitHub Actions (lint, type-check, test) and deployment to Vercel.
17. **Delivery partner & geolocation** — _deferred;_ MVP uses city/area text filter and a manual delivery address.
18. **Email notifications** — _deferred._
19. **Seed data script** — sample restaurants and menus for development and demo.
20. **Accessibility & SEO basics** — semantic HTML, metadata, Open Graph for public pages.

---

## 4. Functional Requirements

Priority: **P0** = must have for MVP, **P1** = should have if time permits.

### 4.1 Authentication & Accounts

| ID         | Requirement                                                                                                                                                                 | Priority |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| FR-AUTH-1  | Users can register and log in with email + password                                                                                                                         | P0       |
| FR-AUTH-2  | Users can log in with Google                                                                                                                                                | P1       |
| FR-AUTH-3  | Users can log out; sessions persist across refresh                                                                                                                          | P0       |
| FR-AUTH-4  | Password reset via email link                                                                                                                                               | P0       |
| FR-AUTH-5  | On first login, a user record with role `customer` is created in MongoDB                                                                                                    | P0       |
| FR-AUTH-6  | Protected pages redirect unauthenticated users to login                                                                                                                     | P0       |
| FR-AUTH-7  | Role-based access: customer, owner, admin areas are isolated (UI and API)                                                                                                   | P0       |
| FR-AUTH-8  | Users can edit their profile (name, phone)                                                                                                                                  | P0       |
| FR-AUTH-9  | Restaurant owners self-register via a separate "Partner with us" signup, creating a restaurant in `PENDING` status; it is invisible to customers until an admin approves it | P0       |
| FR-AUTH-10 | Owners see their approval status (pending / active / suspended / rejected) and can edit details while pending                                                               | P0       |

### 4.2 Restaurant Discovery (Guest & Customer)

| ID        | Requirement                                                                      | Priority |
| --------- | -------------------------------------------------------------------------------- | -------- |
| FR-DISC-1 | Home page lists active restaurants (paginated)                                   | P0       |
| FR-DISC-2 | Search restaurants by name or cuisine                                            | P0       |
| FR-DISC-3 | Filter by cuisine, veg-only, and city/area                                       | P0       |
| FR-DISC-4 | Sort by name, delivery time, and minimum order                                   | P1       |
| FR-DISC-5 | Restaurant detail page: info, hours, open/closed state, menu grouped by category | P0       |
| FR-DISC-6 | Dish search within a restaurant                                                  | P1       |
| FR-DISC-7 | Closed or suspended restaurants are visible as closed and cannot be ordered from | P0       |

### 4.3 Cart

| ID        | Requirement                                                                                                                                         | Priority |
| --------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| FR-CART-1 | Add, remove, and change quantity of dishes                                                                                                          | P0       |
| FR-CART-2 | Cart can hold items from **multiple restaurants**, grouped by restaurant, each group showing its own subtotal, delivery fee and minimum-order check | P0       |
| FR-CART-3 | Cart persists for logged-in users (server-side) and survives refresh/devices                                                                        | P0       |
| FR-CART-4 | Cart shows per-restaurant and overall subtotal, delivery fees, 5% tax, and total (INR)                                                              | P0       |
| FR-CART-5 | Unavailable dishes are flagged and block checkout until removed                                                                                     | P0       |
| FR-CART-6 | Guests can build a local cart; it is merged on login                                                                                                | P1       |

### 4.4 Addresses

| ID        | Requirement                                        | Priority |
| --------- | -------------------------------------------------- | -------- |
| FR-ADDR-1 | Customers can add, edit, delete delivery addresses | P0       |
| FR-ADDR-2 | One address can be marked default                  | P0       |

### 4.5 Checkout & Orders (Customer)

| ID        | Requirement                                                                                                                                                                                                | Priority |
| --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| FR-ORD-1  | Checkout: choose address, review items and charges, add delivery instructions                                                                                                                              | P0       |
| FR-ORD-2  | Payment: online via **Razorpay (test mode)**                                                                                                                                                               | P0       |
| FR-ORD-2a | Payment: Cash on Delivery as an alternative                                                                                                                                                                | P1       |
| FR-ORD-2b | One checkout with several restaurants creates **one order per restaurant** linked by a `checkoutId`, paid in a single payment; orders are created only after payment verification (or immediately for COD) | P0       |
| FR-ORD-2c | Failed or abandoned payments create no confirmed orders and can be retried                                                                                                                                 | P0       |
| FR-ORD-3  | Server revalidates prices, availability, and restaurant open state at placement                                                                                                                            | P0       |
| FR-ORD-4  | Order confirmation page with order number                                                                                                                                                                  | P0       |
| FR-ORD-5  | Order history list and order detail page                                                                                                                                                                   | P0       |
| FR-ORD-6  | Order tracking page showing current status and timeline (polling)                                                                                                                                          | P0       |
| FR-ORD-7  | Customer can cancel an order while status is `PLACED`; paid orders are marked `REFUND_PENDING` (refund is simulated in test mode)                                                                          | P0       |
| FR-ORD-8  | Reorder from a past order                                                                                                                                                                                  | P1       |

**Order lifecycle (state machine):**
`PLACED → ACCEPTED → PREPARING → OUT_FOR_DELIVERY → DELIVERED`
Alternative exits: `PLACED → CANCELLED` (by customer or restaurant), `PLACED/ACCEPTED → REJECTED` (by restaurant). Terminal states cannot change. Every transition is timestamped.

### 4.6 Restaurant Owner Dashboard

| ID        | Requirement                                                                                                  | Priority |
| --------- | ------------------------------------------------------------------------------------------------------------ | -------- |
| FR-OWN-1  | Edit restaurant profile (name, description, cuisines, address, hours, image upload, min order, delivery fee) | P0       |
| FR-OWN-1a | Upload images (restaurant cover, dishes) to Cloudinary; JPG/PNG/WebP, max 5 MB                               | P0       |
| FR-OWN-2  | Toggle restaurant open/closed                                                                                | P0       |
| FR-OWN-3  | CRUD menu categories                                                                                         | P0       |
| FR-OWN-4  | CRUD dishes (name, description, price, veg/non-veg, image, category)                                         | P0       |
| FR-OWN-5  | Toggle dish availability                                                                                     | P0       |
| FR-OWN-6  | View incoming/active orders, newest first, auto-refreshing                                                   | P0       |
| FR-OWN-7  | Accept/reject orders and advance status along the allowed transitions                                        | P0       |
| FR-OWN-8  | Order history with status filter                                                                             | P1       |

### 4.7 Admin

| ID       | Requirement                                                        | Priority |
| -------- | ------------------------------------------------------------------ | -------- |
| FR-ADM-1 | View queue of pending restaurant registrations with details        | P0       |
| FR-ADM-2 | Approve, reject (with reason), suspend, and reactivate restaurants | P0       |
| FR-ADM-3 | View all users and all orders (read-only, filterable)              | P0       |
| FR-ADM-4 | Basic dashboard counts (orders today, restaurants, users)          | P1       |

---

## 5. Non-Functional Requirements

| ID     | Category        | Requirement                                                                                                                                                                                                  |
| ------ | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| NFR-1  | Performance     | Listing and detail pages load in under 2 s (p95) on broadband with seed-scale data; API p95 under 500 ms                                                                                                     |
| NFR-2  | Security        | All API writes require a verified Firebase ID token; role checks in the service/controller layer; secrets only in env vars; input validated with Zod; security headers set; rate limiting on write endpoints |
| NFR-3  | Data integrity  | Totals computed server-side; order item price snapshots; status transitions validated                                                                                                                        |
| NFR-4  | Scalability     | Stateless API suited to serverless; indexed queries; pagination everywhere                                                                                                                                   |
| NFR-5  | Availability    | Hosted on managed platforms (Vercel + Atlas); graceful error pages                                                                                                                                           |
| NFR-6  | Usability       | Responsive (mobile-first) layout since the web app is used on phones; accessible (WCAG 2.1 AA target for core flows)                                                                                         |
| NFR-7  | Maintainability | Strict TypeScript, ESLint + Prettier, layered MVC, no business logic in controllers or components, dependency injection-friendly services                                                                    |
| NFR-8  | Testability     | Services unit-tested; ≥70% coverage on services; key flows covered by E2E                                                                                                                                    |
| NFR-9  | Observability   | Structured logs with request IDs; errors logged with context                                                                                                                                                 |
| NFR-10 | Browser support | Latest two versions of Chrome, Edge, Firefox, Safari                                                                                                                                                         |
| NFR-11 | Privacy         | Store minimum personal data (name, email, phone, addresses); users can delete their account (P1)                                                                                                             |
| NFR-12 | Cost            | Entire MVP runs on free tiers (auth service, Atlas M0, Cloudinary free, Razorpay test mode, Vercel Hobby)                                                                                                    |

---

## 6. Data Model (high level)

Detailed schemas are defined in the Architecture Document (Step 3).

- **User** — `firebaseUid`, `email`, `name`, `phone`, `role`, `restaurantId?`, timestamps
- **Address** — `userId`, `label`, `line1`, `line2`, `city`, `pincode`, `isDefault`
- **Restaurant** — `name`, `slug`, `description`, `cuisines[]`, `isVeg`, `address`, `city`, `image{url, publicId}`, `openingHours`, `isOpen`, `status` (`PENDING|ACTIVE|REJECTED|SUSPENDED`), `minOrder`, `deliveryFee`, `ownerId`
- **MenuCategory** — `restaurantId`, `name`, `sortOrder`
- **Dish** — `restaurantId`, `categoryId`, `name`, `description`, `price`, `isVeg`, `imageUrl`, `isAvailable`
- **Cart** — `userId`, `items[{restaurantId, dishId, quantity}]` (multi-restaurant)
- **Payment** — `checkoutId`, `userId`, `provider`, `razorpayOrderId`, `razorpayPaymentId`, `amount`, `currency=INR`, `status`, timestamps
- **Order** — `orderNumber`, `checkoutId`, `userId`, `restaurantId`, `items[{dishId, name, price, quantity}]`, `addressSnapshot`, `charges{subtotal, deliveryFee, tax, total}`, `paymentMethod`, `paymentStatus`, `status`, `statusHistory[]`, `instructions`, timestamps

## 7. API Surface (high level)

All under `/app/api`, JSON, versioned by path not required in MVP.

| Area             | Endpoints                                                                                                                                                |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Auth/User        | `POST /api/auth/sync`, `GET/PATCH /api/me`                                                                                                               |
| Addresses        | `GET/POST /api/addresses`, `PATCH/DELETE /api/addresses/:id`                                                                                             |
| Restaurants      | `GET /api/restaurants`, `GET /api/restaurants/:id`, `GET /api/restaurants/:id/menu`                                                                      |
| Cart             | `GET/PUT/DELETE /api/cart`, `POST /api/cart/items`, `PATCH/DELETE /api/cart/items/:dishId`                                                               |
| Checkout/Payment | `POST /api/checkout` (create payment), `POST /api/payments/verify`, `POST /api/payments/webhook`                                                         |
| Uploads          | `POST /api/uploads/sign` (signed Cloudinary params)                                                                                                      |
| Owner signup     | `POST /api/owner/register`                                                                                                                               |
| Orders           | `GET /api/orders`, `GET /api/orders/:id`, `POST /api/orders/:id/cancel`                                                                                  |
| Owner            | `GET/PATCH /api/owner/restaurant`, `CRUD /api/owner/categories`, `CRUD /api/owner/dishes`, `GET /api/owner/orders`, `PATCH /api/owner/orders/:id/status` |
| Admin            | `GET /api/admin/restaurants`, `PATCH /api/admin/restaurants/:id/status`, `GET /api/admin/orders`, `GET /api/admin/users`                                 |

---

## 8. Project Scaffolding (from a clean slate to a working skeleton)

The workspace is empty apart from docs, so scaffolding is the **first user story**. The plan:

### 8.1 Prerequisites

- Node.js 20 LTS or newer, npm (or pnpm), Git, VS Code
- Accounts: auth service (see [auth-setup-guide.md](auth-setup-guide.md); Firebase), MongoDB Atlas, Cloudinary, Razorpay (test mode), GitHub, Vercel

### 8.2 Seeding steps

1. `npx create-next-app@latest .` → TypeScript, ESLint, Tailwind, App Router, `src/` directory, import alias `@/*`.
2. `npx shadcn@latest init`, then add components as needed (button, input, form, card, dialog, dropdown-menu, select, sheet, toast/sonner, table, badge, skeleton).
3. Install dependencies: `mongoose`, `zod`, `firebase`, `firebase-admin`, `react-hook-form`, `@hookform/resolvers`, `@tanstack/react-query`, `pino`; dev: `vitest`, `@testing-library/react`, `playwright`, `prettier`, `husky`, `lint-staged`, `tsx`.
4. Enable `strict` mode in `tsconfig.json`; add Prettier and ESLint rules.
5. Create `.env.example` and `.env.local` (git-ignored) with the variables listed in 8.4.
6. Create the folder structure (8.3), DB connection singleton, Firebase client/admin initialisers, and a health endpoint `GET /api/health`.
7. Add a seed script (`npm run seed`) and npm scripts for lint, type-check, test.
8. Set up GitHub Actions CI and connect the repo to Vercel.

### 8.3 Target folder structure

```
food-delivery-app/
├─ CLAUDE.md
├─ project-docs/                 # PRD, stories, architecture, setup guides
├─ my-docs/                      # original requirements
├─ scripts/                      # seed.ts
├─ src/
│  ├─ app/                       # Next.js App Router
│  │  ├─ (public)/               # home, restaurant pages
│  │  ├─ (auth)/                 # login, register, reset
│  │  ├─ (customer)/             # cart, checkout, orders, profile
│  │  ├─ owner/                  # owner dashboard
│  │  ├─ admin/                  # admin dashboard
│  │  └─ api/                    # CONTROLLERS (route handlers)
│  ├─ components/                # VIEW: ui/ (shadcn), feature components
│  ├─ hooks/                     # view-layer hooks
│  ├─ lib/
│  │  ├─ api-client/             # typed fetch wrappers used by UI
│  │  ├─ firebase/               # client + admin init
│  │  ├─ db/                     # mongoose connection
│  │  ├─ auth/                   # token verification, role guards
│  │  ├─ errors/                 # AppError hierarchy, error mapper
│  │  └─ config/                 # validated env
│  ├─ models/                    # MODEL: mongoose schemas
│  ├─ repositories/              # data access (optional thin layer over models)
│  ├─ services/                  # business logic (all of it)
│  ├─ validators/                # zod schemas (shared)
│  └─ types/                     # shared TS types / DTOs
└─ tests/                        # unit, integration, e2e
```

### 8.4 Environment variables

```
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=
MONGODB_URI=
MONGODB_DB_NAME=
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
NEXT_PUBLIC_RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
RAZORPAY_WEBHOOK_SECRET=
TAX_RATE=0.05
```

### 8.5 Layering rules (enforced in review)

1. UI components call only `lib/api-client` (never services/models).
2. Route handlers parse + validate input, authenticate/authorise, call **one** service method, return the response envelope.
3. Services contain business rules, call repositories/models, throw typed `AppError`s.
4. Models hold schema, indexes, and no business logic.

---

## 9. Delivery Plan (build order summary)

Detailed stories come in Step 2. Expected epic order:

1. Project scaffolding & foundation
2. Authentication & user accounts
3. Restaurant & menu management (owner/admin) plus seed data
4. Discovery (browse, search, restaurant page)
5. Cart & addresses
6. Checkout & order placement
7. Order fulfilment (owner) & tracking (customer)
8. Admin tools
9. Hardening: testing, security, performance, deployment

## 10. Success Metrics (MVP)

- A new customer completes signup → order placement in under 3 minutes.
- An owner can update a dish and accept an order without admin help.
- All P0 requirements implemented; CI green; deployed to a public URL.

## 11. Assumptions, Risks & Open Questions

**Assumptions**

- Single country, currency **INR**, single time zone.
- One restaurant per owner; one outlet per restaurant.
- Delivery fee is a flat per-restaurant fee; tax is a flat **5%** of subtotal (configurable).
- Delivery is simulated through status updates by the restaurant owner.

**Risks**

- Polling for status adds load; acceptable at MVP scale, revisit with SSE.
- Serverless + Mongoose can exhaust connections; mitigated by a cached connection singleton.
- Free tiers have limits (Atlas M0 storage, Firebase quotas).

**Decisions made (v0.2)**

- Currency INR with flat 5% tax.
- Razorpay test-mode online payment is P0; COD is an optional extra (P1).
- Owners self-register and are approved by an admin.
- Cart supports multiple restaurants; checkout splits into one order per restaurant.
- Images via Cloudinary signed uploads.

**Still open**
None.

---

## 12. Approval

| Role          | Name   | Decision                       | Date |
| ------------- | ------ | ------------------------------ | ---- |
| Product Owner | Shakir | ☐ Approved ☐ Changes requested |      |
