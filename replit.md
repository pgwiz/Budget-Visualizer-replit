# Budget Monitor — Kenya TVET National Budget Control Platform

Transparent allocation, real-time monitoring and hierarchical oversight for Kenya's government (TVET) institutions.

## Run & Operate

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (respects `DB_TYPE`)
- `pnpm --filter @workspace/scripts run seed:pos` — seed sample purchase orders (idempotent re-run safe)

**Required env vars:**
- `DATABASE_URL` — Replit-provisioned PostgreSQL (default)
- `SESSION_SECRET` — express-session secret
- `DB_TYPE` — optional; see DB section below

## Stack

- **Monorepo**: pnpm workspaces
- **Node.js**: 24 · **TypeScript**: 5.9
- **Frontend**: React 18 + Vite + Wouter + TanStack Query + Framer Motion
- **Backend**: Express 5 + Pino logger
- **ORM**: Drizzle ORM (`drizzle-orm/node-postgres`)
- **Database**: PostgreSQL (Replit-provisioned by default)
- **Validation**: Zod (`zod/v4`) + `drizzle-zod`
- **API codegen**: Orval (OpenAPI → React Query hooks + Zod schemas)
- **Build**: esbuild

## Where things live

```
artifacts/budget-monitor/   React+Vite frontend
artifacts/api-server/       Express 5 API (src/routes/)
artifacts/doc-studio/       Document generator app
lib/db/                     Drizzle schema + DB connection (src/index.ts)
lib/api-spec/               OpenAPI spec → codegen source
lib/api-client-react/       Generated React Query hooks
scripts/src/                Seed scripts (SQL + TS)
```

Key files: `lib/db/src/schema/` (DB schema), `lib/db/src/index.ts` (DB connection), `lib/api-spec/` (OpenAPI contract)

## Architecture decisions

- **Contract-first API**: OpenAPI spec in `lib/api-spec` drives all generated hooks and Zod validators. Edit spec → run codegen → types flow everywhere.
- **Multi-DB via `DB_TYPE`**: `lib/db/src/index.ts` supports `postgres` (default/Replit), `supabase`, `neon`, `railway`, `render`. Set `DB_TYPE` + appropriate connection string. `drizzle.config.ts` also respects `DB_TYPE` so `db push` works across providers.
- **N+1 prevention**: Sectors and allocations use batch queries + in-memory maps. Sectors route has a 2-min in-memory cache with `X-Cache: HIT/MISS` header.
- **Org chart modes**: OrgChart component has Focus mode (drill-down, default) and Full mode (full canvas), toggled via pill switch.
- **RBAC**: Product catalog is read-only for all roles except `super_admin`. Server enforces this; UI shows a visible notice and hides edit controls for lower roles.

## Product

- Dashboard with real-time budget utilization metrics
- Hierarchical sector/org chart (Focus drill-down + Full canvas modes)
- Allocation management (2,321 allocations seeded)
- Procurement / Purchase Orders (20 sample POs seeded: draft/submitted/approved/rejected)
- Product catalog (20 items, 8 categories; admin-only write access)
- User management, budget cycles, approval limits, revocations, audit log
- Sectors page (2,322 sectors, 5-level hierarchy)

## User preferences

- Demo login: `controller.goknat@budget.go.ke` / `password` (super_admin, id=1)
- Kenya TVET context; all amounts in KES

## Gotchas

- Do NOT run `pnpm dev` at workspace root — use `restart_workflow` instead.
- Sectors cache is invalidated on POST/PUT/DELETE via `invalidateSectorsCache()`.
- PgBouncer/Supabase Transaction Pooler: set `PGBOUNCER=true` alongside `DB_TYPE=supabase`.
- `drizzle.config.ts` reads `DB_TYPE` to pick the right connection string for `db push`.
- Supabase env var: prefer `SUPABASE_DATABASE_URL`; `SUPABASEDB_STRING` is the legacy alias.

## Pointers

- `.local/skills/pnpm-workspace/` — monorepo conventions, TypeScript setup
- `.local/skills/react-vite/` — frontend patterns
- `scripts/src/seed-purchase-orders.sql` — PO seed (run with psql or `pnpm --filter @workspace/scripts run seed:pos`)
