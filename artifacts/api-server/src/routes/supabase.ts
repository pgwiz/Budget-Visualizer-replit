/**
 * Supabase Router - Health check and database connection status
 * Provides endpoints to verify Supabase connectivity
 */
import { Router } from "express";
import { logger } from "../lib/logger";

const router = Router();

function normalizeDbType(rawValue: string | undefined) {
  const raw = rawValue ?? "prisma";
  const normalized = raw.trim().toLowerCase();
  const isValid = normalized === "prisma" || normalized === "supabase";

  return { raw, normalized, isValid };
}

function getConnectionHost(connectionString: string | undefined) {
  if (!connectionString) return undefined;

  try {
    return new URL(connectionString.trim()).hostname;
  } catch {
    return undefined;
  }
}

function getConnectionPort(connectionString: string | undefined) {
  if (!connectionString) return undefined;

  try {
    const port = new URL(connectionString.trim()).port;
    return port || undefined;
  } catch {
    return undefined;
  }
}

/**
 * GET /api/supabase/health
 * Health check for Supabase connection
 */
router.get("/supabase/health", async (_req, res) => {
  try {
    const dbType = normalizeDbType(process.env.DB_TYPE);
    const isSupabase = dbType.normalized === "supabase";
    const activeConnectionString = isSupabase
      ? process.env.SUPABASEDB_STRING
      : process.env.DATABASE_URL;

    res.json({
      status: "ok",
      database: {
        type: dbType.raw,
        normalizedType: dbType.normalized,
        validType: dbType.isValid,
        isSupabase,
        host: getConnectionHost(activeConnectionString),
        configured: !!activeConnectionString,
      },
    });
  } catch (err) {
    logger.error({ err }, "Supabase health check failed");
    res.status(500).json({ status: "error", message: "Health check failed" });
  }
});

/**
 * GET /api/supabase/config
 * Get database configuration status (sanitized)
 */
router.get("/supabase/config", (_req, res) => {
  const dbType = normalizeDbType(process.env.DB_TYPE);
  const isSupabase = dbType.normalized === "supabase";
  const warnings: string[] = [];

  if (!dbType.isValid) {
    warnings.push(
      `Invalid DB_TYPE "${dbType.raw}". Expected "prisma" or "supabase".`,
    );
  }

  res.json({
    dbType: dbType.raw,
    normalizedDbType: dbType.normalized,
    validDbType: dbType.isValid,
    isSupabase,
    connections: {
      prisma: {
        configured: !!process.env.DATABASE_URL,
        host: getConnectionHost(process.env.DATABASE_URL),
      },
      supabase: {
        configured: !!process.env.SUPABASEDB_STRING,
        host: getConnectionHost(process.env.SUPABASEDB_STRING),
        port: getConnectionPort(process.env.SUPABASEDB_STRING),
      },
    },
    active: dbType.normalized,
    warnings,
  });
});

export default router;
