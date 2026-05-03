import { Router } from "express";
import { db, budgetCyclesTable, sectorsTable, allocationsTable, usersTable, auditLogsTable, revocationsTable } from "@workspace/db";
import { eq, and, inArray, sql, desc, gte } from "drizzle-orm";
import { requireAuth } from "../lib/auth";
import { getTotalAllocated, getTotalRevoked, getNetAllocated, getTotalAllocatedFrom, getAvailableBalance, getUtilizationPct } from "../lib/budget-calc";

const router = Router();

async function getActiveCycleId(): Promise<number | null> {
  const cycles = await db.select().from(budgetCyclesTable).where(eq(budgetCyclesTable.isActive, true)).limit(1);
  return cycles[0]?.id ?? null;
}

async function getActiveCycle() {
  const cycles = await db.select().from(budgetCyclesTable).where(eq(budgetCyclesTable.isActive, true)).limit(1);
  return cycles[0] ?? null;
}

router.get("/dashboard/summary", requireAuth, async (req, res): Promise<void> => {
  const user = (req as any).user;
  const cycleIdParam = req.query.cycleId ? parseInt(req.query.cycleId as string) : null;
  const cycle = cycleIdParam
    ? (await db.select().from(budgetCyclesTable).where(eq(budgetCyclesTable.id, cycleIdParam)).limit(1))[0]
    : await getActiveCycle();

  const cycleId = cycle?.id ?? null;
  const totalBudget = cycle ? parseFloat(cycle.totalBudget) : 0;

  let totalAllocated = 0, totalRevoked = 0, availableBalance = 0, utilizationPct = 0;
  if (cycleId) {
    // Only count TOP-LEVEL allocations (from the National Budget Pool, fromSectorId IS NULL)
    // to avoid double-counting ministry→sub-sector→sub-sub flows.
    const allocResult = await db.select({ total: sql<string>`COALESCE(SUM(amount), 0)` }).from(allocationsTable).where(and(eq(allocationsTable.budgetCycleId, cycleId), sql`${allocationsTable.fromSectorId} IS NULL`, inArray(allocationsTable.status, ["active", "pending", "exhausted"])));
    const revResult = await db.select({ total: sql<string>`COALESCE(SUM(amount), 0)` }).from(allocationsTable).where(and(eq(allocationsTable.budgetCycleId, cycleId), sql`${allocationsTable.fromSectorId} IS NULL`, eq(allocationsTable.status, "revoked")));
    totalAllocated = parseFloat(allocResult[0]?.total ?? "0");
    totalRevoked = parseFloat(revResult[0]?.total ?? "0");
    availableBalance = totalBudget - totalAllocated;
    utilizationPct = totalBudget > 0 ? Math.min(100, (totalAllocated / totalBudget) * 100) : 0;
  }

  const sectorCount = (await db.select({ c: sql<number>`COUNT(*)` }).from(sectorsTable))[0]?.c ?? 0;
  const activeAllocations = cycleId ? (await db.select({ c: sql<number>`COUNT(*)` }).from(allocationsTable).where(and(eq(allocationsTable.budgetCycleId, cycleId), eq(allocationsTable.status, "active"))))[0]?.c ?? 0 : 0;

  // Ministry-level sectors (depth=1, children of ROOT) — NOT root itself
  const topSectors = await db.select().from(sectorsTable).where(eq(sectorsTable.depth, 1)).limit(10);
  const enrichedTop = await Promise.all(topSectors.map(async s => {
    const ta = cycleId ? await getTotalAllocated(s.id, cycleId) : 0;
    const tr = cycleId ? await getTotalRevoked(s.id, cycleId) : 0;
    const avail = cycleId ? await getAvailableBalance(s.id, cycleId) : 0;
    const pct = cycleId ? await getUtilizationPct(s.id, cycleId) : 0;
    const children = await db.select({ id: sectorsTable.id }).from(sectorsTable).where(eq(sectorsTable.parentId, s.id));
    return { ...s, totalAllocated: ta, totalRevoked: tr, netAllocated: ta - tr, availableBalance: avail, utilizationPct: pct, childCount: children.length, responsibleUser: null, parent: null };
  }));

  let myAllocated = null, myDistributed = null, myAvailable = null;
  if (user.sectorId && cycleId && !["super_admin", "ceo"].includes(user.role)) {
    myAllocated = await getNetAllocated(user.sectorId, cycleId);
    myDistributed = await getTotalAllocatedFrom(user.sectorId, cycleId);
    myAvailable = await getAvailableBalance(user.sectorId, cycleId);
  }

  const enrichedCycle = cycle ? {
    ...cycle, totalBudget, totalAllocated, totalRevoked,
    availableBalance, utilizationPct,
  } : null;

  res.json({
    role: user.role, cycle: enrichedCycle, totalBudget, totalAllocated, totalRevoked,
    availableBalance, utilizationPct, sectorCount: Number(sectorCount),
    activeAllocations: Number(activeAllocations), topSectors: enrichedTop,
    myAllocated, myDistributed, myAvailable,
  });
});

router.get("/dashboard/utilization-chart", requireAuth, async (req, res): Promise<void> => {
  const cycleIdParam = req.query.cycleId ? parseInt(req.query.cycleId as string) : null;
  const cycleId = cycleIdParam ?? await getActiveCycleId();
  const sectorIdParam = req.query.sectorId ? parseInt(req.query.sectorId as string) : null;

  let sectors: any[];
  if (sectorIdParam) {
    // Children of this sector
    sectors = await db.select().from(sectorsTable).where(eq(sectorsTable.parentId, sectorIdParam));
  } else {
    // Ministry-level sectors (depth=1) — excludes ROOT which has no receivable allocations
    sectors = await db.select().from(sectorsTable).where(eq(sectorsTable.depth, 1));
  }

  const result = await Promise.all(sectors.map(async s => {
    const allocated = cycleId ? await getTotalAllocated(s.id, cycleId) : 0;
    const revoked = cycleId ? await getTotalRevoked(s.id, cycleId) : 0;
    const available = cycleId ? await getAvailableBalance(s.id, cycleId) : 0;
    const pct = cycleId ? await getUtilizationPct(s.id, cycleId) : 0;
    return { sectorId: s.id, sectorName: s.name, allocated, revoked, netAllocated: allocated - revoked, available, utilizationPct: pct };
  }));
  res.json(result);
});

router.get("/dashboard/allocation-timeline", requireAuth, async (req, res): Promise<void> => {
  const cycleIdParam = req.query.cycleId ? parseInt(req.query.cycleId as string) : null;
  const days = parseInt(req.query.days as string || "30");
  const cycleId = cycleIdParam ?? await getActiveCycleId();
  if (!cycleId) { res.json([]); return; }

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);

  // Only top-level allocations (fromSectorId IS NULL) so cumulative stays within budget bounds
  const allocs = await db.select().from(allocationsTable)
    .where(and(eq(allocationsTable.budgetCycleId, cycleId), gte(allocationsTable.allocatedAt, cutoff), sql`${allocationsTable.fromSectorId} IS NULL`))
    .orderBy(allocationsTable.allocatedAt);

  // Group by date
  const byDate = new Map<string, { totalAllocated: number; totalRevoked: number; count: number }>();
  for (const a of allocs) {
    const dateKey = a.allocatedAt.toISOString().split("T")[0];
    const existing = byDate.get(dateKey) || { totalAllocated: 0, totalRevoked: 0, count: 0 };
    if (a.status === "revoked") {
      existing.totalRevoked += parseFloat(a.amount);
    } else {
      existing.totalAllocated += parseFloat(a.amount);
      existing.count++;
    }
    byDate.set(dateKey, existing);
  }

  let cumulative = 0;
  const result = Array.from(byDate.entries()).map(([date, d]) => {
    cumulative += d.totalAllocated - d.totalRevoked;
    return { date, totalAllocated: d.totalAllocated, totalRevoked: d.totalRevoked, cumulativeAllocated: cumulative, allocationCount: d.count };
  });
  res.json(result);
});

router.get("/dashboard/recent-activity", requireAuth, async (req, res): Promise<void> => {
  const limit = parseInt(req.query.limit as string || "20");
  const logs = await db.select().from(auditLogsTable).orderBy(desc(auditLogsTable.createdAt)).limit(limit);
  const enriched = await Promise.all(logs.map(async log => {
    const u = await db.select({ id: usersTable.id, name: usersTable.name }).from(usersTable).where(eq(usersTable.id, log.userId)).limit(1);
    const userName = u[0]?.name ?? "Unknown";
    const meta = log.meta as any;
    let description = log.action;
    let sectorName = null;
    if (meta?.toSectorId) {
      const s = await db.select({ name: sectorsTable.name }).from(sectorsTable).where(eq(sectorsTable.id, meta.toSectorId)).limit(1);
      sectorName = s[0]?.name ?? null;
      description = log.action === "allocated"
        ? `Allocated KES ${Number(meta.amount).toLocaleString()} to ${sectorName}`
        : `Revoked allocation of KES ${Number(meta.amount).toLocaleString()} from ${sectorName}`;
    }
    return { id: log.id, action: log.action, description, userId: log.userId, userName, amount: meta?.amount ? Number(meta.amount) : null, sectorName, createdAt: log.createdAt };
  }));
  res.json(enriched);
});

router.get("/dashboard/balance-breakdown", requireAuth, async (req, res): Promise<void> => {
  const cycleIdParam = req.query.cycleId ? parseInt(req.query.cycleId as string) : null;
  const cycleId = cycleIdParam ?? await getActiveCycleId();
  if (!cycleId) {
    res.json({ totalBudget: 0, totalAllocated: 0, totalRevoked: 0, netAllocated: 0, availableBalance: 0, utilizationPct: 0, pendingCount: 0, activeCount: 0, revokedCount: 0 }); return;
  }
  const cycle = await db.select().from(budgetCyclesTable).where(eq(budgetCyclesTable.id, cycleId)).limit(1);
  if (!cycle[0]) { res.status(404).json({ error: "Not Found" }); return; }
  const totalBudget = parseFloat(cycle[0].totalBudget);

  // Only count top-level allocations (fromSectorId IS NULL) to avoid double-counting sub-flows
  const allocs = await db.select().from(allocationsTable).where(and(eq(allocationsTable.budgetCycleId, cycleId), sql`${allocationsTable.fromSectorId} IS NULL`));
  let totalAllocated = 0, totalRevoked = 0, pendingCount = 0, activeCount = 0, revokedCount = 0;
  for (const a of allocs) {
    if (a.status === "revoked") { totalRevoked += parseFloat(a.amount); revokedCount++; }
    else if (a.status === "active") { totalAllocated += parseFloat(a.amount); activeCount++; }
    else if (a.status === "pending") { totalAllocated += parseFloat(a.amount); pendingCount++; }
  }
  const netAllocated = totalAllocated - totalRevoked;
  const availableBalance = totalBudget - totalAllocated;
  const utilizationPct = totalBudget > 0 ? Math.min(100, (totalAllocated / totalBudget) * 100) : 0;
  res.json({ totalBudget, totalAllocated, totalRevoked, netAllocated, availableBalance, utilizationPct, pendingCount, activeCount, revokedCount });
});

export default router;
