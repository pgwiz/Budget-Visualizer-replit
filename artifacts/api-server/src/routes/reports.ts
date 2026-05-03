import { Router } from "express";
import { db, auditLogsTable, usersTable, sectorsTable, allocationsTable, budgetCyclesTable } from "@workspace/db";
import { eq, and, sql, desc } from "drizzle-orm";
import { requireAuth } from "../lib/auth";
import { getTotalAllocated, getTotalRevoked, getAvailableBalance, getUtilizationPct } from "../lib/budget-calc";

const router = Router();

router.get("/reports/audit-log", requireAuth, async (req, res): Promise<void> => {
  const { cycleId, userId, action, limit = "50", offset = "0" } = req.query;
  const lim = parseInt(limit as string);
  const off = parseInt(offset as string);

  const logs = await db.select().from(auditLogsTable).orderBy(desc(auditLogsTable.createdAt)).limit(lim).offset(off);
  const total = (await db.select({ c: sql<number>`COUNT(*)` }).from(auditLogsTable))[0]?.c ?? 0;

  const enriched = await Promise.all(logs.map(async log => {
    const u = await db.select({ id: usersTable.id, name: usersTable.name }).from(usersTable).where(eq(usersTable.id, log.userId)).limit(1);
    return { ...log, userName: u[0]?.name ?? "Unknown", meta: log.meta };
  }));

  res.json({ items: enriched, total: Number(total), offset: off, limit: lim });
});

router.get("/reports/sector-breakdown", requireAuth, async (req, res): Promise<void> => {
  const cycleIdParam = req.query.cycleId ? parseInt(req.query.cycleId as string) : null;
  let cycleId = cycleIdParam;
  if (!cycleId) {
    const active = await db.select().from(budgetCyclesTable).where(eq(budgetCyclesTable.isActive, true)).limit(1);
    cycleId = active[0]?.id ?? null;
  }

  const sectors = await db.select().from(sectorsTable).orderBy(sectorsTable.depth, sectorsTable.name);
  const result = await Promise.all(sectors.map(async s => {
    let responsibleUser = null;
    if (s.responsibleUserId) {
      const u = await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, s.responsibleUserId)).limit(1);
      responsibleUser = u[0]?.name ?? null;
    }
    let parentName = null;
    if (s.parentId) {
      const p = await db.select({ name: sectorsTable.name }).from(sectorsTable).where(eq(sectorsTable.id, s.parentId)).limit(1);
      parentName = p[0]?.name ?? null;
    }
    const ta = cycleId ? await getTotalAllocated(s.id, cycleId) : 0;
    const tr = cycleId ? await getTotalRevoked(s.id, cycleId) : 0;
    const avail = cycleId ? await getAvailableBalance(s.id, cycleId) : 0;
    const pct = cycleId ? await getUtilizationPct(s.id, cycleId) : 0;
    const countResult = cycleId
      ? await db.select({ c: sql<number>`COUNT(*)` }).from(allocationsTable).where(and(eq(allocationsTable.toSectorId, s.id), eq(allocationsTable.budgetCycleId, cycleId)))
      : [{ c: 0 }];
    return {
      sectorId: s.id, sectorName: s.name, sectorCode: s.code, depth: s.depth,
      parentName, responsibleUser, totalAllocated: ta, totalRevoked: tr,
      netAllocated: ta - tr, availableBalance: avail, utilizationPct: pct,
      allocationCount: Number(countResult[0]?.c ?? 0),
    };
  }));
  res.json(result);
});

export default router;
