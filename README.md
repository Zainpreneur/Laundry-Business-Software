# LaundryBiz — Laundry Business Management Software

A full-stack web application for running a laundry / dry-cleaning business: customer
management, service pricing, order tracking from drop-off to delivery, payments, and
a staff-facing dashboard.

## Stack

- **Backend**: Node.js, Express, TypeScript, Prisma ORM, SQLite (dev) / PostgreSQL (prod), JWT auth
- **Frontend**: React, TypeScript, Vite, Tailwind CSS, React Router

## Features

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

## Project layout

```
server/   Express + Prisma API (port 4000)
client/   React + Vite frontend (port 5173, proxies /api to the server)
```

## Getting started

### 1. Backend

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

### 2. Frontend

```bash
cd client
npm install
npm run dev                          # starts the app on http://localhost:5173
```

Open http://localhost:5173 and log in (or use "Create account" — the very first
account you register becomes an admin).

## Switching to PostgreSQL for production

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

## API overview

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

## Building for production

```bash
cd server && npm run build && npm start
cd client && npm run build   # outputs static assets to client/dist
```
