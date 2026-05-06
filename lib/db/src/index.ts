/**
 * Database connection layer — supports multiple PostgreSQL providers.
 *
 * Set DB_TYPE in your environment to switch between providers:
 *
 *   DB_TYPE=postgres   (default) — standard PostgreSQL, uses DATABASE_URL
 *   DB_TYPE=supabase   — Supabase PostgreSQL, uses SUPABASE_DATABASE_URL or DATABASE_URL,
 *                         automatically enables SSL and disables rejectUnauthorized
 *   DB_TYPE=neon       — Neon serverless PostgreSQL, uses DATABASE_URL, enables SSL
 *   DB_TYPE=railway    — Railway PostgreSQL, uses DATABASE_URL, enables SSL
 *   DB_TYPE=render     — Render PostgreSQL, uses DATABASE_URL
 *   DB_TYPE=prisma     — (alias for postgres, kept for backward compatibility)
 *   DB_TYPE=replit     — (alias for postgres, Replit-provisioned database)
 *
 * Connection pooler / PgBouncer:
 *   Set PGBOUNCER=true to enable statement-mode compatible settings for
 *   Supabase Transaction Pooler or any PgBouncer instance.
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
  prisma:     "postgres",  // original default name — kept as alias
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

  const known = Object.keys(PROVIDER_ALIASES).filter(k => !["superbase"].includes(k)).join(", ");
  const typoHint = raw === "superbase" ? ' Did you mean "supabase"?' : "";
  throw new Error(
    `Unknown DB_TYPE "${process.env.DB_TYPE}".${typoHint}\n` +
    `Supported values: ${known}\n` +
    `Leave unset to use the default Replit PostgreSQL database.`,
  );
}

// ── Pick the connection string based on provider ──────────────────────────────
function resolveConnectionString(provider: DatabaseProvider): string {
  // Supabase can use its own env var; fall back to DATABASE_URL if not set
  if (provider === "supabase") {
    const cs =
      process.env.SUPABASE_DATABASE_URL ??   // preferred name
      process.env.SUPABASEDB_STRING     ??   // legacy name (backward compat)
      process.env.DATABASE_URL;
    if (!cs) {
      throw new Error(
        "Supabase requires SUPABASE_DATABASE_URL (or DATABASE_URL) to be set.\n" +
        "Find your connection string in: Supabase → Project Settings → Database → Connection string.\n" +
        "For the Transaction Pooler, also set PGBOUNCER=true.",
      );
    }
    return cs;
  }

  const cs = process.env.DATABASE_URL;
  if (!cs) {
    const hints: Record<DatabaseProvider, string> = {
      neon:     "Find it in: Neon console → Connection Details → Connection string.",
      railway:  "Find it in: Railway → Your project → Variables → DATABASE_URL.",
      render:   "Find it in: Render → Your database → Connection → External Database URL.",
      postgres: "Set DATABASE_URL to your PostgreSQL connection string.",
      supabase: "", // handled above
      prisma:   "Set DATABASE_URL to your PostgreSQL connection string.",
      replit:   "Provision a database in the Replit sidebar (Database tab).",
    };
    throw new Error(
      `DATABASE_URL must be set for provider "${provider}".\n${hints[provider] ?? ""}`,
    );
  }
  return cs;
}

// ── Build Pool options based on provider ─────────────────────────────────────
function buildPoolOptions(provider: DatabaseProvider, connectionString: string): pg.PoolConfig {
  const isPgBouncer = process.env.PGBOUNCER === "true";

  const base: pg.PoolConfig = { connectionString };

  // Providers that require SSL
  const requireSsl: DatabaseProvider[] = ["supabase", "neon", "railway"];
  if (requireSsl.includes(provider)) {
    base.ssl = { rejectUnauthorized: false };
  }

  // PgBouncer / Supabase Transaction Pooler compatibility
  // Transaction pooler doesn't support prepared statements
  if (isPgBouncer) {
    // pg driver doesn't have a direct "no prepared statements" flag,
    // but limiting pool size to 1 and disabling keepAlive helps
    base.max = 1;
    base.idleTimeoutMillis = 0;
    base.allowExitOnIdle   = true;
  }

  // Neon recommends smaller pools for serverless
  if (provider === "neon" && !isPgBouncer) {
    base.max = 5;
    base.idleTimeoutMillis = 10000;
  }

  return base;
}

// ── Initialise ────────────────────────────────────────────────────────────────
const provider         = resolveProvider();
const connectionString = resolveConnectionString(provider);
const poolOptions      = buildPoolOptions(provider, connectionString);

export const pool = new Pool(poolOptions);
export const db   = drizzle(pool, { schema });

// Surface which provider is active (useful for debugging startup logs)
export const dbProvider: DatabaseProvider = provider;

export * from "./schema";
