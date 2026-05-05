import { Router } from "express";
import { HealthCheckResponse } from "@workspace/api-zod";
import { db, usersTable, sectorsTable } from "@workspace/db";
import { logger } from "../lib/logger";
import { count, sql } from "drizzle-orm";

const router = Router();

router.get("/healthz", async (_req, res) => {
  try {
    // Check database connectivity with simple queries
    const usersResult = await db.select({ count: count() }).from(usersTable);
    const sectorsResult = await db.select({ count: count() }).from(sectorsTable);
    
    const usersCount = usersResult[0]?.count ?? 0;
    const sectorsCount = sectorsResult[0]?.count ?? 0;
    
    const data = HealthCheckResponse.parse({ 
      status: "ok",
      database: {
        connected: true,
        usersCount,
        sectorsCount,
      }
    });
    res.json(data);
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error({ error: err.message }, "Health check failed");
    res.status(503).json({ 
      status: "unhealthy",
      database: { 
        connected: false,
        error: err.message 
      }
    });
  }
});

export default router;
