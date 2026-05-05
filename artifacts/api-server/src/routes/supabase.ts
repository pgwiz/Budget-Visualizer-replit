/**
 * Supabase Router - Health check and database connection status
 * Provides endpoints to verify Supabase connectivity
 */
import { Router } from "express";
import { logger } from "../lib/logger";

const router = Router();

/**
 * GET /api/supabase/health
 * Health check for Supabase connection
 */
router.get("/supabase/health", async (_req, res) => {
  try {
    const dbType = process.env.DB_TYPE || "prisma";
    const isSupabase = dbType === "supabase";

    res.json({
      status: "ok",
      database: {
        type: dbType,
        isSupabase,
        host: isSupabase
          ? process.env.SUPABASEDB_STRING?.split("@")[1]?.split(":")[0]
          : process.env.DATABASE_URL?.split("@")[1]?.split(":")[0],
        configured: !!process.env[dbType === "supabase" ? "SUPABASEDB_STRING" : "DATABASE_URL"],
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
  const dbType = process.env.DB_TYPE || "prisma";
  const isSupabase = dbType === "supabase";

  res.json({
    dbType,
    isSupabase,
    connections: {
      prisma: {
        configured: !!process.env.DATABASE_URL,
        host: process.env.DATABASE_URL?.split("@")[1]?.split(":")[0],
      },
      supabase: {
        configured: !!process.env.SUPABASEDB_STRING,
        host: process.env.SUPABASEDB_STRING?.split("@")[1]?.split(":")[0],
        port: process.env.SUPABASEDB_STRING?.split(":").pop()?.split("/")[0],
      },
    },
    active: dbType,
  });
});

export default router;
