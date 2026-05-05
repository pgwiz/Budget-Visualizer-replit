import { Router } from "express";
import { HealthCheckResponse } from "@workspace/api-zod";
import { db, usersTable, sectorsTable } from "@workspace/db";
import { logger } from "../lib/logger";

const router = Router();

router.get("/healthz", async (_req, res) => {
  try {
    // Check database connectivity
    const usersCount = await db.select({ count: db.count() }).from(usersTable);
    const sectorsCount = await db.select({ count: db.count() }).from(sectorsTable);
    
    const data = HealthCheckResponse.parse({ 
      status: "ok",
      database: {
        connected: true,
        usersCount: usersCount[0]?.count ?? 0,
        sectorsCount: sectorsCount[0]?.count ?? 0,
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
