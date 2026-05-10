/**
 * Database connection layer — supports multiple PostgreSQL providers.
 *
 * Set DB_TYPE in your environment to switch between providers:
 *
 *   DB_TYPE=postgres   (default) — standard PostgreSQL, uses DATABASE_URL
 *   DB_TYPE=supabase   — Supabase PostgreSQL, uses SUPABASE_DATABASE_URL or DATABASE_URL,
 *                         automatically enables SSL. For the Transaction Pooler (port 6543)
 *                         also set PGBOUNCER=true.
 *   DB_TYPE=neon       — Neon serverless PostgreSQL, uses DATABASE_URL, enables SSL
 *   DB_TYPE=railway    — Railway managed Postgres, uses DATABASE_URL, enables SSL
 *   DB_TYPE=render     — Render managed Postgres, uses DATABASE_URL
 *   DB_TYPE=prisma     — alias for postgres (backward compat)
 *   DB_TYPE=replit     — alias for postgres (Replit-provisioned database)
 *
 * Supabase pooler modes (detected automatically from port in connection string):
 *   Port 5432  → Session Pooler  — supports prepared statements, persistent connections
 *   Port 6543  → Transaction Pooler — set PGBOUNCER=true; no prepared statements
 *
 * Latency note:
 *   The Replit runtime is in us-east1 (South Carolina). For minimum latency choose
 *   a Supabase region in the same geography (e.g. us-east-1 / us-east-2).
 *   Cross-continental connections (eu-north-1 ↔ us-east) add ~150 ms per query
 *   regardless of any code-level optimisation.
 */

import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

// ── Supported database provider types ────────────────────────────────────────
type DatabaseProvider =
  | "postgres"    // generic PostgreSQL (default)
  | "supabase"    // Supabase managed Postgres (SSL, optional pooler)
  | "neon"        // Neon serverless Postgres (SSL required)
  | "railway"     // Railway managed Postgres (SSL)
  | "render"      // Render managed Postgres
  | "prisma"      // alias → postgres (backward compat)
  | "replit";     // alias → postgres (Replit-provisioned)

const PROVIDER_ALIASES: Record<string, DatabaseProvider> = {
  superbase:  "supabase",  // common typo
  supabase:   "supabase",
  neon:       "neon",
  railway:    "railway",
  render:     "render",
  prisma:     "postgres",
  replit:     "postgres",
  postgres:   "postgres",
  postgresql: "postgres",
  pg:         "postgres",
  default:    "postgres",
};

function resolveProvider(): DatabaseProvider {
  const raw = (process.env.DB_TYPE ?? "postgres").trim().toLowerCase();
  const resolved = PROVIDER_ALIASES[raw];
  if (resolved) return resolved;

  const known = Object.keys(PROVIDER_ALIASES).filter(k => k !== "superbase").join(", ");
  const typoHint = raw === "superbase" ? ' Did you mean "supabase"?' : "";
  throw new Error(
    `Unknown DB_TYPE "${process.env.DB_TYPE}".${typoHint}\n` +
    `Supported values: ${known}\n` +
    `Leave unset to use the default Replit PostgreSQL database.`,
  );
}

// ── Pick the connection string based on provider ──────────────────────────────
function resolveConnectionString(provider: DatabaseProvider): string {
  if (provider === "supabase") {
    const cs =
      process.env.SUPABASE_DATABASE_URL ??   // preferred
      process.env.SUPABASEDB_STRING     ??   // legacy alias
      process.env.DATABASE_URL;
    if (!cs) {
      throw new Error(
        "Supabase requires SUPABASE_DATABASE_URL (or DATABASE_URL) to be set.\n" +
        "Supabase → Project Settings → Database → Connection string.\n" +
        "For the Transaction Pooler (port 6543), also set PGBOUNCER=true.",
      );
    }
    return cs;
  }

  const cs = process.env.DATABASE_URL;
  if (!cs) {
    const hints: Record<DatabaseProvider, string> = {
      neon:     "Neon console → Connection Details → Connection string.",
      railway:  "Railway → Your project → Variables → DATABASE_URL.",
      render:   "Render → Your database → Connection → External Database URL.",
      postgres: "Set DATABASE_URL to your PostgreSQL connection string.",
      supabase: "",
      prisma:   "Set DATABASE_URL to your PostgreSQL connection string.",
      replit:   "Provision a database in the Replit sidebar (Database tab).",
    };
    throw new Error(
      `DATABASE_URL must be set for DB_TYPE="${provider}".\n${hints[provider] ?? ""}`,
    );
  }
  return cs;
}

// ── Detect Supabase Transaction Pooler from port number ───────────────────────
function isTransactionPooler(connectionString: string): boolean {
  // Supabase Transaction Pooler always uses port 6543
  try {
    const url = new URL(connectionString);
    return url.port === "6543";
  } catch {
    return connectionString.includes(":6543/");
  }
}

// ── Build Pool options based on provider ─────────────────────────────────────
function buildPoolOptions(provider: DatabaseProvider, connectionString: string): pg.PoolConfig {
  const explicitPgBouncer = process.env.PGBOUNCER === "true";
  const autoPooler        = provider === "supabase" && isTransactionPooler(connectionString);
  const isPgBouncer       = explicitPgBouncer || autoPooler;

  const base: pg.PoolConfig = {
    connectionString,
    // TCP keepalive — prevents firewalls/NAT from silently dropping idle connections.
    // Critical for cloud databases where idle connections are killed after 30–300s.
    keepAlive:                    true,
    keepAliveInitialDelayMillis:  10000,  // start keepalive probes after 10s idle
    // Fail fast on connection problems rather than hanging forever
    connectionTimeoutMillis: 10000,
    // Statement timeout: kill queries that run longer than 30s
    statement_timeout: 30000,
  };

  // ── SSL ────────────────────────────────────────────────────────────────────
  const requireSsl: DatabaseProvider[] = ["supabase", "neon", "railway"];
  if (requireSsl.includes(provider)) {
    base.ssl = { rejectUnauthorized: false };
  }

  // ── Pool sizing ───────────────────────────────────────────────────────────
  if (isPgBouncer) {
    // Supabase Transaction Pooler (PgBouncer in transaction mode):
    // - Does NOT support prepared statements or advisory locks
    // - Supabase recommends a small pool per server instance
    // - keepAlive has no effect (pooler manages the physical connections)
    base.max                = 10;
    base.min                = 2;
    base.idleTimeoutMillis  = 20000;  // let the pooler handle keepalive
    base.keepAlive          = false;  // not useful through a transaction pooler
  } else if (provider === "supabase") {
    // Supabase Session Pooler (port 5432) or direct connection:
    // - Supports prepared statements
    // - Keep connections warm — each new connection costs ~150ms if DB is remote
    base.max               = 10;
    base.min               = 2;   // always keep 2 warm connections ready
    base.idleTimeoutMillis = 60000; // hold connections for 60s before closing
  } else if (provider === "neon") {
    // Neon scales to zero — small pool, shorter idle timeout
    base.max               = 5;
    base.min               = 0;
    base.idleTimeoutMillis = 10000;
  } else {
    // Default for Replit / Railway / Render / generic Postgres
    base.max               = 20;
    base.min               = 2;
    base.idleTimeoutMillis = 30000;
  }

  return base;
}

// ── Initialise ────────────────────────────────────────────────────────────────
const provider         = resolveProvider();
const connectionString = resolveConnectionString(provider);
const poolOptions      = buildPoolOptions(provider, connectionString);

export const pool = new Pool(poolOptions);
export const db   = drizzle(pool, { schema });

// Surface which provider is active (useful for startup logs)
export const dbProvider: DatabaseProvider = provider;

export * from "./schema";
