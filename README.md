# Barkside Grooming

A full-stack appointment booking and business management system for a dog grooming shop. Customers can browse services, manage their pets, upload required documents, save payment methods, and book appointments with online payment. Staff manage scheduling, services, pricing, customers, documents, invoices, roles, and business reports through a dedicated admin panel.

## Architecture

The app is a monolithic [Nuxt 4](https://nuxt.com/) application with a clear separation between frontend and backend, organized using Nuxt's **layer** system to split the UI by role:

```
barkside-grooming/
├── app/                  # Shared base layer (public pages, auth, common components)
├── layers/
│   ├── admin/            # Admin portal — dashboards, settings, reports, management
│   └── customer/         # Customer portal — booking, pets, documents, payment methods
├── server/
│   ├── api/              # 100+ REST API routes
│   ├── db/               # Drizzle ORM schema, migrations, seed
│   ├── services/         # Business logic layer (16 domain services)
│   ├── reports/          # Report registry + definitions for admin analytics
│   ├── tasks/            # Nitro scheduled tasks (reminders, vaccination holds)
│   ├── middleware/       # Server-side auth middleware
│   ├── plugins/          # Server bootstrap (e.g. MinIO bucket init)
│   └── utils/            # Session handling, password hashing, S3 client, mail
├── shared/               # Zod schemas & TypeScript types shared across client/server
└── tests/
    ├── unit/             # Pure unit tests (helpers, schemas, formatters)
    └── integration/      # HTTP + service-layer integration suites
```

### Why Layers?

Nuxt layers let the admin and customer UIs live in separate directories with their own pages, components, and layouts — while sharing the same server, auth system, and base components. This keeps the codebase organized without the overhead of a multi-repo or microfrontend setup.

### Key Design Decisions

- **Drizzle ORM** over Prisma — lighter weight, SQL-like query syntax, no binary engine dependency.
- **Server services layer** — API routes are thin handlers; business logic lives in `server/services/` for testability and reuse.
- **Zod schemas in `shared/`** — validation schemas are defined once and used on both the client (form validation) and server (request validation).
- **Session-based auth** — cookie + server-side session tokens with bcrypt password hashing, enforced via server middleware on every request.
- **Role-based access control** — granular permissions system with custom roles and a parent-role hierarchy, checked at both the route and API level.
- **MinIO for file storage** — S3-compatible object storage for document uploads (vaccination records, grooming agreements), runs locally via Docker and accessed through the AWS S3 SDK with presigned URLs.
- **Stripe for payments** — Setup Intents to save cards on file, Payment Intents to charge at booking and on no-show / late-cancel fees.
- **Pluggable report registry** — admin reports are individual definitions (`server/reports/definitions/*`) registered in one place and rendered with a shared chart component.
- **Nitro scheduled tasks** — cron-like background jobs for appointment reminders and vaccination-hold expiry, configured in `nuxt.config.ts`.

## Tech Stack

| Layer | Technology | Role |
|-------|-----------|------|
| Framework | **Nuxt 4** / Vue 3 | Full-stack framework with SSR, file-based routing, and API routes |
| Language | **TypeScript** | End-to-end type safety across client and server |
| UI | **Nuxt UI 4** + Tailwind CSS 4 | Component library and utility-first styling |
| Charts | **Chart.js** + vue-chartjs | Admin report visualizations |
| Database | **PostgreSQL 16** | Relational data store, run via Docker |
| ORM | **Drizzle ORM** | Type-safe SQL query builder with migration tooling |
| Validation | **Zod** | Schema validation shared between client and server |
| File Storage | **MinIO** (S3-compatible) + AWS S3 SDK | Object storage for document uploads, accessed via presigned URLs |
| Payments | **Stripe** | Saved cards, online payment, refunds, no-show / late-cancel fees |
| Email | **Nodemailer** + **Mailpit** | Transactional email; Mailpit captures dev mail at `localhost:8025` |
| Scheduled jobs | **Nitro tasks** | Cron-driven reminders and vaccination-hold expiry |
| Auth | **bcrypt** + sessions | Password hashing and cookie-based session management |
| Testing | **Vitest** | Unit and integration tests |

## Features

**Customer-facing:**
- Browse and book grooming services with date/time selection based on groomer availability
- Multi-pet bookings with per-pet service, add-on, and bundle selection
- Guest checkout — book without creating an account
- Manage pet profiles (breed, weight, size category, notes)
- Upload and manage documents (vaccination records, health forms) with signed URL viewing
- Respond to admin document requests (e.g. proof of vaccination before an appointment)
- Save and manage payment methods via Stripe (cards on file with default selection)
- Pay for appointments online and add tips
- View upcoming and past appointments, with cancellation subject to policy
- In-app and email notifications with per-category preferences (email / SMS / in-app toggles)

**Admin panel:**
- Dashboard with at-a-glance metrics
- Manage appointments end-to-end (status transitions, groomer assignment, notes, invoicing)
- Manage customers and their pets, including creating customer accounts on their behalf
- Configure services with per-size-category pricing, durations, and add-on associations
- Create discounted service bundles (percent or fixed-amount discounts)
- Manage pet size categories
- Set employee weekly schedules with date-specific overrides
- Assign groomable services per employee
- Request and approve / reject customer documents, with auto-hold on appointments awaiting required docs
- Role and permission management with granular access control and a custom-role builder
- Business reports (revenue by period, appointments by status, top services, groomer utilization) rendered as charts
- View and manage invoices and payments, including refunds and no-show / late-cancel fees

**Background jobs:**
- Hourly: send appointment reminders and remind customers of pending vaccination holds
- Every 15 minutes: release expired vaccination holds (cancels appointments whose required documents were never submitted)

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18+)
- [Docker](https://www.docker.com/) (Postgres, MinIO, and Mailpit run via `docker compose`)

### Setup

```bash
# Install dependencies
npm install

# Start PostgreSQL, MinIO, and Mailpit containers
docker compose up -d

# Copy environment config (then fill in real Stripe test keys if you want to exercise payments)
cp .env.example .env

# Generate and run database migrations, then seed with sample data
npm run db:generate
npm run db:migrate
npm run db:seed

# Start the dev server at http://localhost:3000
npm run dev
```

Local service URLs:

| Service | URL |
|---------|-----|
| App | http://localhost:3000 |
| MinIO console | http://localhost:9001 (`minioadmin` / `minioadmin`) |
| Mailpit (dev inbox) | http://localhost:8025 |
| Drizzle Studio | run `npm run db:studio` |

### Test Credentials

After seeding, you can log in with:

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@barkside.com` | `password123` |

Customer accounts can be created through the registration page or by an admin from the customer management screen.

### Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start the development server |
| `npm run build` | Build for production |
| `npm run preview` | Preview the production build |
| `npm run typecheck` | Run `nuxi typecheck` across the project |
| `npm run test` | Run the full Vitest suite once |
| `npm run test:watch` | Run Vitest in watch mode |
| `npm run db:generate` | Generate migrations from schema changes |
| `npm run db:migrate` | Apply pending migrations |
| `npm run db:seed` | Seed the database with sample data |
| `npm run db:seed-test` | Seed a minimal dataset used by integration tests |
| `npm run db:studio` | Open Drizzle Studio (database GUI) |

### Testing

The project ships with both fast unit tests and a broader integration suite that exercises HTTP handlers and the service layer against a real Postgres instance. Run the full suite with `npm run test`. The integration tests assume a database that has been migrated and seeded with `npm run db:seed-test`.
