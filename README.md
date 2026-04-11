# Barkside Grooming

A full-stack appointment booking and business management system for a dog grooming shop. Customers can browse services, manage their pets, and book appointments. Staff can manage scheduling, services, pricing, documents, and customers through a dedicated admin panel.

## Architecture

The app is a monolithic [Nuxt 4](https://nuxt.com/) application with a clear separation between frontend and backend, organized using Nuxt's **layer** system to split the UI by role:

```
barkside-grooming/
├── app/                  # Shared base layer (layouts, auth, common components)
├── layers/
│   ├── admin/            # Admin portal — dashboards, settings, management
│   └── customer/         # Customer portal — booking, pets, documents
├── server/
│   ├── api/              # ~70 REST API routes
│   ├── db/               # Drizzle ORM schema, migrations, seed
│   ├── services/         # Business logic layer
│   ├── middleware/        # Server-side auth middleware
│   └── utils/            # Session handling, password hashing
├── shared/               # Zod schemas & TypeScript types shared across client/server
└── tests/
```

### Why Layers?

Nuxt layers let the admin and customer UIs live in separate directories with their own pages, components, and layouts — while sharing the same server, auth system, and base components. This keeps the codebase organized without the overhead of a multi-repo or microfrontend setup.

### Key Design Decisions

- **Drizzle ORM** over Prisma — lighter weight, SQL-like query syntax, no binary engine dependency.
- **Server services layer** — API routes are thin handlers; business logic lives in `server/services/` for testability and reuse.
- **Zod schemas in `shared/`** — validation schemas are defined once and used on both the client (form validation) and server (request validation).
- **Session-based auth** — cookie + server-side session tokens with bcrypt password hashing, enforced via server middleware on every request.
- **Role-based access control** — granular permissions system with custom roles, checked at both the route and API level.
- **MinIO for file storage** — S3-compatible object storage for document uploads (vaccination records, grooming agreements), runs locally via Docker.

## Tech Stack

| Layer | Technology | Role |
|-------|-----------|------|
| Framework | **Nuxt 4** / Vue 3 | Full-stack framework with SSR, file-based routing, and API routes |
| Language | **TypeScript** | End-to-end type safety across client and server |
| UI | **Nuxt UI** + Tailwind CSS 4 | Component library and utility-first styling |
| Database | **PostgreSQL 16** | Relational data store, run via Docker |
| ORM | **Drizzle ORM** | Type-safe SQL query builder with migration tooling |
| Validation | **Zod** | Schema validation shared between client and server |
| File Storage | **MinIO** | S3-compatible object storage for document uploads |
| Auth | **bcrypt** + sessions | Password hashing and cookie-based session management |
| Testing | **Vitest** | Unit and integration tests |

## Features

**Customer-facing:**
- Browse and book grooming services with date/time selection based on groomer availability
- Guest checkout — book without creating an account
- Manage pet profiles (breed, weight, size category, notes)
- Upload and manage documents (vaccination records, health forms)
- View upcoming and past appointments

**Admin panel:**
- Manage appointments, customers, and pets
- Configure services with per-size-category pricing and add-ons
- Create discounted service bundles
- Set employee weekly schedules with date-specific overrides
- Assign groomable services per employee
- Request and manage customer documents
- Role and permission management with granular access control

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18+)
- [Docker](https://www.docker.com/)

### Setup

```bash
# Install dependencies
npm install

# Start PostgreSQL and MinIO containers
docker compose up -d

# Copy environment config
cp .env.example .env

# Generate and run database migrations, then seed with sample data
npm run db:generate
npm run db:migrate
npm run db:seed

# Start the dev server at http://localhost:3000
npm run dev
```

### Test Credentials

After seeding, you can log in with:

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@barkside.com` | `password123` |

### Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start the development server |
| `npm run build` | Build for production |
| `npm run test` | Run tests |
| `npm run db:generate` | Generate migrations from schema changes |
| `npm run db:migrate` | Apply pending migrations |
| `npm run db:seed` | Seed the database with sample data |
| `npm run db:studio` | Open Drizzle Studio (database GUI) |
