# Connect Affairs

Enterprise Employee Management Portal for **Ashcon Engineering** — civil engineering, steel structures, PEB, construction & infrastructure.

> Production-grade ERP/HRMS. Modular plugin architecture, secure by default, built to scale from 20 to 50 employees without redesign.

## Documentation

| Doc | Contents |
|---|---|
| [01 — Architecture](docs/01-ARCHITECTURE.md) | System design, principles, deployment (QNAP), roadmap |
| [02 — Database](docs/02-DATABASE.md) | Core Prisma schema, ER diagrams, seed plan |
| [03 — Folder Structure](docs/03-FOLDER-STRUCTURE.md) | Monorepo layout, plugin module system |
| [04 — Authentication](docs/04-AUTHENTICATION.md) | JWT + refresh rotation, 2FA, RBAC, sessions |

## Tech stack

React · TypeScript · Tailwind · ShadCN UI · Redux Toolkit / RTK Query · Node · Express · PostgreSQL · Prisma · pg-boss · Docker · Nginx.

## Monorepo

```
apps/api        Express modular monolith (backend)
apps/web        React + Vite SPA (frontend)
packages/contracts   Shared Zod schemas + types (FE/BE contract)
packages/ui          Component library (ShadCN-based)
packages/config      Shared Tailwind / TS / ESLint / Prettier config
infra/          Docker, Nginx, Compose, backup
```

## Getting started (dev)

```bash
corepack enable                 # provides pnpm (ships with Node ≥ 20)
pnpm install
cp .env.example .env            # then fill in secrets
pnpm db:migrate && pnpm db:seed # once Postgres is running
pnpm dev                        # web on :5173, api on :4000
```

Requires Node ≥ 20 and a PostgreSQL 16 instance (local or container).

---

© Ashcon Engineering · Powered by Connect Affairs
# ASHCON-
