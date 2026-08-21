# Sharp Edge — Barbershop Business Management System

A full-stack management platform for a barbershop: appointment booking &
scheduling, a barber roster with working hours, a client CRM, a point-of-sale
checkout with inventory tracking, and revenue/performance reporting.

## Stack

- **Backend:** Node.js, Express, TypeScript, Prisma ORM, SQLite (swap the
  `DATABASE_URL` for Postgres/MySQL in production), JWT auth, Zod validation.
- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS, React Router,
  Recharts.

## Features

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

## Getting started

### 1. Backend

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

### 2. Frontend

```bash
cd frontend
cp .env.example .env
npm install
npm run dev         # http://localhost:5173
```

The Vite dev server proxies `/api` to the backend on port 4000.

### Root-level (npm workspaces)

From the repo root you can also run:

```bash
npm install
npm run dev:backend
npm run dev:frontend
```

## Project structure

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

## API overview

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
