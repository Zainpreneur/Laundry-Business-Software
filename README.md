# Claude Business Management Systems

This repository hosts two independent full-stack business management
applications, each with its own backend, frontend, and Prisma/SQLite
database — pick the one you need and follow its setup steps below.

| App | Domain | Directories | Ports |
| --- | --- | --- | --- |
| [LaundryBiz](#laundrybiz--laundry-business-management-software) | Laundry / dry-cleaning | `server/`, `client/` | API `4000`, web `5173` |
| [Sharp Edge](#sharp-edge--barbershop-business-management-system) | Barbershop | `backend/`, `frontend/` | API `4000`, web `5173` |

Both use the same ports by default (each is meant to be run on its own, not
side by side) — set `PORT` / `VITE_API_URL` if you need to run them
simultaneously.

---

## LaundryBiz — Laundry Business Management Software

A full-stack web application for running a laundry / dry-cleaning business: customer
management, service pricing, order tracking from drop-off to delivery, payments, and
a staff-facing dashboard.

### Stack

- **Backend**: Node.js, Express, TypeScript, Prisma ORM, SQLite (dev) / PostgreSQL (prod), JWT auth
- **Frontend**: React, TypeScript, Vite, Tailwind CSS, React Router

### Features

- 🔐 **Auth & roles** — email/password login, JWT sessions, `ADMIN` / `MANAGER` / `STAFF` roles.
  The first account ever created becomes an `ADMIN` automatically.
- 👥 **Customers** — searchable directory with contact info, notes, and full order history.
- 🧺 **Services & Pricing** — configurable catalog of services (wash & fold, dry cleaning,
  ironing, alterations, bedding, …), priced per item / per kg / per load. Services in use on
  past orders are soft-deleted (deactivated) instead of removed, to preserve order history.
- 🧾 **Orders** — multi-item orders with automatic subtotal/total calculation, discounts,
  optional tax, and a status workflow: `Received → In Progress → Ready for Pickup →
  Out for Delivery → Completed` (or `Cancelled`).
- 💳 **Payments** — record partial or full payments per order (cash, card, mobile money,
  bank transfer, online); payment status (`Unpaid` / `Partial` / `Paid`) updates automatically.
- 🖨️ **Printable invoices** — each order page has a print-friendly invoice view.
- 📊 **Dashboard** — orders today, active orders, customer count, revenue this month, order
  status breakdown, and a recent-orders feed.
- 🧑‍💼 **Staff management** (admin only) — create staff accounts, assign roles, activate/deactivate.

### Project layout

```
server/   Express + Prisma API (port 4000)
client/   React + Vite frontend (port 5173, proxies /api to the server)
```

### Getting started

#### 1. Backend

```bash
cd server
cp .env.example .env
npm install
npx prisma migrate dev --name init   # creates dev.db and applies the schema
npm run seed                         # optional: adds demo users, services, customers, orders
npm run dev                          # starts the API on http://localhost:4000
```

Seeded demo logins (from `npm run seed`):

| Role  | Email                     | Password  |
|-------|---------------------------|-----------|
| Admin | admin@laundrybiz.com      | Admin@123 |
| Staff | staff@laundrybiz.com      | Staff@123 |

#### 2. Frontend

```bash
cd client
npm install
npm run dev                          # starts the app on http://localhost:5173
```

Open http://localhost:5173 and log in (or use "Create account" — the very first
account you register becomes an admin).

### Switching to PostgreSQL for production

SQLite is used by default for zero-config local development. For production:

1. In `server/prisma/schema.prisma`, change the datasource provider:
   ```prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
   }
   ```
2. Set `DATABASE_URL` in `server/.env` to your Postgres connection string.
3. Run `npx prisma migrate dev` again to regenerate migrations for Postgres.

(SQLite has no native enum type, so status/role/category fields are stored as plain
strings validated by `zod` at the API layer — see `server/src/constants.ts`. This
still works fine on Postgres; you may optionally convert them to real Prisma enums.)

### API overview

All endpoints are under `/api` and (except `/api/auth/login` and `/api/auth/register`)
require an `Authorization: Bearer <token>` header.

| Method & Path                     | Description                          | Role          |
|-----------------------------------|---------------------------------------|---------------|
| POST `/api/auth/register`         | Create an account                     | Public        |
| POST `/api/auth/login`            | Log in                                | Public        |
| GET `/api/auth/me`                | Current user                          | Any           |
| GET/POST `/api/customers`         | List / create customers               | Any           |
| GET/PUT `/api/customers/:id`      | View / update a customer              | Any           |
| DELETE `/api/customers/:id`       | Delete a customer (no orders)         | Admin/Manager |
| GET/POST `/api/services`          | List / create services                | Any / Admin+Mgr |
| PUT/DELETE `/api/services/:id`    | Update / deactivate a service         | Admin/Manager |
| GET/POST `/api/orders`            | List / create orders                  | Any           |
| GET `/api/orders/:id`             | Order detail                          | Any           |
| PATCH `/api/orders/:id/status`    | Update order status                   | Any           |
| POST `/api/orders/:id/payments`   | Record a payment                      | Any           |
| DELETE `/api/orders/:id`          | Delete an order                       | Admin/Manager |
| GET `/api/dashboard/summary`      | Dashboard stats                       | Any           |
| GET/POST `/api/users`             | List / create staff accounts          | Admin         |
| PUT `/api/users/:id`              | Update role / active status           | Admin         |

### Building for production

```bash
cd server && npm run build && npm start
cd client && npm run build   # outputs static assets to client/dist
```

---

## Sharp Edge — Barbershop Business Management System

A full-stack management platform for a barbershop: appointment booking &
scheduling, a barber roster with working hours, a client CRM, a point-of-sale
checkout with inventory tracking, and revenue/performance reporting.

### Stack

- **Backend:** Node.js, Express, TypeScript, Prisma ORM, SQLite (swap the
  `DATABASE_URL` for Postgres/MySQL in production), JWT auth, Zod validation.
- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS, React Router,
  Recharts.

### Features

- **Auth & roles** — Admin, Barber, and Client accounts with JWT-based
  role-gated access on both API and UI.
- **Booking & scheduling** — Clients book online against real-time
  availability computed from each barber's working hours, time off, and
  existing appointments (no double-booking).
- **Barber management** — Admins onboard barbers, set commission rates, and
  configure weekly hours; barbers manage their own schedule and time off.
- **Services catalog** — Admins manage services (duration, price, category).
- **Client CRM** — Search clients, view appointment history, loyalty points,
  and notes.
- **Point of sale** — Ring up services and retail products in one checkout,
  apply tax/discount/tip, and automatically decrement product stock.
- **Inventory** — Track stock levels with low-stock alerts and quick +/-
  adjustments.
- **Dashboard & reports** — Daily/monthly revenue, upcoming appointments,
  revenue trend chart, top services, and barber performance (admin).
- **Business settings** — Shop name, address, hours, currency, tax rate.

### Getting started

#### 1. Backend

```bash
cd backend
cp .env.example .env
npm install
npm run prisma:generate
npx prisma migrate dev --name init
npm run seed      # creates demo admin/barber/client accounts + sample data
npm run dev        # http://localhost:4000
```

Demo accounts (password `password123`):

- `admin@barbershop.com` — Admin
- `marco@barbershop.com`, `jamie@barbershop.com`, `sam@barbershop.com` — Barbers
- `chris@example.com`, `pat@example.com`, `riley@example.com` — Clients

#### 2. Frontend

```bash
cd frontend
cp .env.example .env
npm install
npm run dev         # http://localhost:5173
```

The Vite dev server proxies `/api` to the backend on port 4000.

#### Root-level (npm workspaces)

From the repo root you can also run:

```bash
npm install
npm run dev:backend
npm run dev:frontend
```

### Project structure

```
backend/
  prisma/schema.prisma   # data model
  prisma/seed.ts         # demo data
  src/
    app.ts               # Express app + route mounting
    routes/               # REST endpoints, one file per resource
    middleware/           # auth (JWT), error handling
    lib/, utils/          # Prisma client, password/JWT helpers
frontend/
  src/
    pages/                # one component per screen
    components/           # Layout, route guard, shared UI atoms
    context/AuthContext.tsx
    lib/api.ts            # axios instance with auth header + 401 handling
```

### API overview

All endpoints are namespaced under `/api` and (except `/auth/*` and public
GETs) require `Authorization: Bearer <token>`.

| Resource | Endpoints |
| --- | --- |
| Auth | `POST /auth/register`, `POST /auth/login`, `GET /auth/me` |
| Users | `GET/POST /users`, `POST /users/staff`, `GET /users/barbers/all` |
| Services | `GET/POST/PATCH/DELETE /services` |
| Appointments | `GET/POST /appointments`, `GET /appointments/availability`, `PATCH /appointments/:id/status` |
| Clients | `GET /clients`, `GET/PATCH /clients/:id` |
| Products | `GET/POST/PATCH/DELETE /products`, `PATCH /products/:id/stock` |
| Sales (POS) | `GET/POST /sales`, `POST /sales/:id/refund` |
| Schedule | `GET/PUT /schedule/:barberId/working-hours`, `GET/POST /schedule/:barberId/time-off` |
| Dashboard | `GET /dashboard/summary`, `/revenue-trend`, `/top-services`, `/barber-performance` |
| Settings | `GET/PATCH /settings` |
| Reviews | `GET /reviews/barber/:barberId`, `POST /reviews` |
