import { Router } from "express";
import { db, budgetCyclesTable, sectorsTable, allocationsTable, usersTable, auditLogsTable } from "@workspace/db";
import { eq, and, inArray, sql, desc, gte } from "drizzle-orm";
import { requireAuth } from "../lib/auth";
import { logger } from "../lib/logger";
import { PerformanceTracker } from "../lib/performance";
import {
  getTotalAllocated, getTotalRevoked, getNetAllocated,
  getTotalAllocatedFrom, getAvailableBalance, getUtilizationPct,
  getSubtreeIds, getUserScopeId,
  getBatchAllocStats, getBatchDistributedStats, getBatchPurchaseStats, getBatchChildCounts,
} from "../lib/budget-calc";

const router = Router();

// ── In-memory caches ─────────────────────────────────────────────────────────

const summaryCache    = new Map<string, { data: any; ts: number }>();
const chartCache      = new Map<string, { data: any; ts: number }>();
const activityCache   = new Map<string, { data: any; ts: number }>();

const SUMMARY_TTL  = 5 * 60 * 1000;   // 5 min
const CHART_TTL    = 2 * 60 * 1000;   // 2 min
const ACTIVITY_TTL = 1 * 60 * 1000;   // 1 min

function fromCache<T>(map: Map<string, { data: T; ts: number }>, key: string, ttl: number): T | null {
  const e = map.get(key);
  if (!e) return null;
  if (Date.now() - e.ts > ttl) { map.delete(key); return null; }
  return e.data;
}
function toCache<T>(map: Map<string, { data: T; ts: number }>, key: string, data: T): void {
  map.set(key, { data, ts: Date.now() });
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function getRootSectorIds(): Promise<number[]> {
  const roots = await db.select({ id: sectorsTable.id }).from(sectorsTable).where(sql`${sectorsTable.parentId} IS NULL`);
  return roots.map(r => r.id);
}

async function getActiveCycleId(): Promise<number | null> {
  const cycles = await db.select({ id: budgetCyclesTable.id }).from(budgetCyclesTable).where(eq(budgetCyclesTable.isActive, true)).limit(1);
  return cycles[0]?.id ?? null;
}

async function getActiveCycle() {
  const cycles = await db.select().from(budgetCyclesTable).where(eq(budgetCyclesTable.isActive, true)).limit(1);
  return cycles[0] ?? null;
}

// ── Summary ───────────────────────────────────────────────────────────────────

router.get("/dashboard/summary", requireAuth, async (req, res): Promise<void> => {
  const perf = new PerformanceTracker((req as any).id);
  const user = (req as any).user;
  const cycleIdParam = req.query.cycleId ? parseInt(req.query.cycleId as string) : null;

  logger.info({ userId: user.id, cycleIdParam }, "[PERF] /dashboard/summary request started");

  try {
    const cacheKey = `summary:${user.id}:${cycleIdParam ?? 'active'}`;
    const hit = fromCache(summaryCache, cacheKey, SUMMARY_TTL);
    if (hit) {
      logger.info({ userId: user.id, cacheKey }, "[PERF] Cache hit for dashboard summary");
      res.set('X-Cache', 'HIT');
      res.json(hit);
      return;
    }
    res.set('X-Cache', 'MISS');

    const endCycleQuery = perf.recordQueryStart("getActiveCycle");
    const cycle = cycleIdParam
      ? (await db.select().from(budgetCyclesTable).where(eq(budgetCyclesTable.id, cycleIdParam)).limit(1))[0]
      : await getActiveCycle();
    endCycleQuery();

    const cycleId = cycle?.id ?? null;
    const scopeSectorId = getUserScopeId(user);

    const endUserSectorQuery = perf.recordQueryStart("getUserSectorInfo");
    const userSectorRow = scopeSectorId
      ? (await db.select({ parentId: sectorsTable.parentId }).from(sectorsTable).where(eq(sectorsTable.id, scopeSectorId)).limit(1))[0]
      : null;
    endUserSectorQuery();
    const isRootSector = userSectorRow ? !userSectorRow.parentId : false;

    let totalBudget = 0, totalAllocated = 0, totalRevoked = 0, availableBalance = 0, utilizationPct = 0;

    if (cycleId) {
      if (scopeSectorId === null) {
        totalBudget = cycle ? parseFloat(cycle.totalBudget) : 0;
        const endRootIds = perf.recordQueryStart("getRootSectorIds");
        const rootIds = await getRootSectorIds();
        endRootIds();
        const endAllocQuery = perf.recordQueryStart("getTotalAllocated_global");
        const [allocResult, revResult] = await Promise.all([
          db.select({ total: sql<string>`COALESCE(SUM(amount), 0)` }).from(allocationsTable)
            .where(and(eq(allocationsTable.budgetCycleId, cycleId), rootIds.length ? inArray(allocationsTable.fromSectorId, rootIds) : sql`false`, inArray(allocationsTable.status, ["active", "pending", "exhausted"]))),
          db.select({ total: sql<string>`COALESCE(SUM(amount), 0)` }).from(allocationsTable)
            .where(and(eq(allocationsTable.budgetCycleId, cycleId), rootIds.length ? inArray(allocationsTable.fromSectorId, rootIds) : sql`false`, eq(allocationsTable.status, "revoked"))),
        ]);
        endAllocQuery();
        totalAllocated   = parseFloat(allocResult[0]?.total ?? "0");
        totalRevoked     = parseFloat(revResult[0]?.total ?? "0");
        availableBalance = totalBudget - totalAllocated;
        utilizationPct   = totalBudget > 0 ? Math.min(100, (totalAllocated / totalBudget) * 100) : 0;
      } else if (isRootSector) {
        totalBudget    = cycle ? parseFloat(cycle.totalBudget) : 0;
        totalAllocated = await getTotalAllocatedFrom(scopeSectorId, cycleId);
        availableBalance = totalBudget - totalAllocated;
        utilizationPct   = totalBudget > 0 ? Math.min(100, (totalAllocated / totalBudget) * 100) : 0;
      } else {
        const [netAlloc, totalAlloc, availBal, utilizPct] = await Promise.all([
          getNetAllocated(scopeSectorId, cycleId),
          getTotalAllocatedFrom(scopeSectorId, cycleId),
          getAvailableBalance(scopeSectorId, cycleId),
          getUtilizationPct(scopeSectorId, cycleId),
        ]);
        totalBudget      = netAlloc;
        totalAllocated   = totalAlloc;
        availableBalance = availBal;
        utilizationPct   = utilizPct;
      }
    }

    // Sector counts + active allocations
    let sectorCount = 0, activeAllocations = 0;
    if (scopeSectorId === null) {
      const [scRes, acRes] = await Promise.all([
        db.select({ c: sql<number>`COUNT(*)` }).from(sectorsTable),
        cycleId
          ? db.select({ c: sql<number>`COUNT(*)` }).from(allocationsTable)
              .where(and(eq(allocationsTable.budgetCycleId, cycleId), eq(allocationsTable.status, "active")))
          : Promise.resolve([{ c: 0 }]),
      ]);
      sectorCount       = Number(scRes[0]?.c ?? 0);
      activeAllocations = Number((acRes as any)[0]?.c ?? 0);
    } else {
      const subtreeIds = await getSubtreeIds(scopeSectorId);
      sectorCount = subtreeIds.length;
      if (cycleId) {
        const acRes = await db.select({ c: sql<number>`COUNT(*)` }).from(allocationsTable)
          .where(and(eq(allocationsTable.budgetCycleId, cycleId), eq(allocationsTable.status, "active"), inArray(allocationsTable.toSectorId, subtreeIds)));
        activeAllocations = Number(acRes[0]?.c ?? 0);
      }
    }

    // Child sectors
    const childSectors = scopeSectorId === null
      ? await db.select().from(sectorsTable).where(eq(sectorsTable.depth, 1)).limit(10)
      : await db.select().from(sectorsTable).where(eq(sectorsTable.parentId, scopeSectorId));

    // ── Batch top-sectors: 4 queries instead of N×5 ──────────────
    const childIds = childSectors.map(s => s.id);
    const [batchAlloc, batchDist, batchPurch, batchChildren] = await Promise.all([
      cycleId ? getBatchAllocStats(childIds, cycleId)       : Promise.resolve(new Map()),
      cycleId ? getBatchDistributedStats(childIds, cycleId) : Promise.resolve(new Map()),
      cycleId ? getBatchPurchaseStats(childIds, cycleId)    : Promise.resolve(new Map()),
      getBatchChildCounts(childIds),
    ]);

    const topSectors = childSectors.map(s => {
      const alloc   = batchAlloc.get(s.id)    ?? { allocated: 0, revoked: 0 };
      const dist    = batchDist.get(s.id)     ?? 0;
      const purch   = batchPurch.get(s.id)    ?? 0;
      const ta      = alloc.allocated;
      const tr      = alloc.revoked;
      const net     = ta - tr;
      const avail   = net - dist - purch;
      const pct     = net > 0 ? Math.min(100, ((dist + purch) / net) * 100) : 0;
      return {
        ...s,
        totalAllocated:  ta,
        totalRevoked:    tr,
        netAllocated:    net,
        availableBalance: avail,
        utilizationPct:  pct,
        childCount:      batchChildren.get(s.id) ?? 0,
        responsibleUser: null,
        parent:          null,
      };
    });

    // Personal sector stats
    let myAllocated = null, myDistributed = null, myAvailable = null;
    if (scopeSectorId && cycleId) {
      const allocPromise      = isRootSector ? Promise.resolve(cycle ? parseFloat(cycle.totalBudget) : 0) : getNetAllocated(scopeSectorId, cycleId);
      const distributedPromise = getTotalAllocatedFrom(scopeSectorId, cycleId);
      [myAllocated, myDistributed] = await Promise.all([allocPromise, distributedPromise]);
      myAvailable = isRootSector ? totalBudget - (myDistributed ?? 0) : await getAvailableBalance(scopeSectorId, cycleId);
    }

    const enrichedCycle = cycle ? { ...cycle, totalBudget, totalAllocated, totalRevoked, availableBalance, utilizationPct } : null;
    const result = {
      role: user.role, cycle: enrichedCycle, totalBudget, totalAllocated, totalRevoked,
      availableBalance, utilizationPct, sectorCount, activeAllocations, topSectors,
      myAllocated, myDistributed, myAvailable,
    };

    res.set('Cache-Control', 'private, max-age=300');
    res.set('Vary', 'Cookie');
    toCache(summaryCache, cacheKey, result);
    perf.log("/dashboard/summary", 200);
    res.json(result);
  } catch (error) {
    perf.logError("/dashboard/summary", error as Error, 500);
    throw error;
  }
});

// ── Utilization Chart ─────────────────────────────────────────────────────────

router.get("/dashboard/utilization-chart", requireAuth, async (req, res): Promise<void> => {
  const user = (req as any).user;
  const cycleId = req.query.cycleId ? parseInt(req.query.cycleId as string) : await getActiveCycleId();
  const sectorIdParam = req.query.sectorId ? parseInt(req.query.sectorId as string) : null;
  const scopeSectorId = getUserScopeId(user);

  const cacheKey = `chart:${user.id}:${cycleId}:${sectorIdParam ?? 'root'}`;
  const hit = fromCache(chartCache, cacheKey, CHART_TTL);
  if (hit) { res.set('X-Cache', 'HIT'); res.json(hit); return; }

  let sectors: any[];
  if (sectorIdParam) {
    sectors = await db.select().from(sectorsTable).where(eq(sectorsTable.parentId, sectorIdParam));
  } else if (scopeSectorId !== null) {
    sectors = await db.select().from(sectorsTable).where(eq(sectorsTable.parentId, scopeSectorId));
  } else {
    sectors = await db.select().from(sectorsTable).where(eq(sectorsTable.depth, 1));
  }

  const sectorIds = sectors.map(s => s.id);

  // Batch instead of N×4 queries
  const [batchAlloc, batchDist, batchPurch] = await Promise.all([
    cycleId ? getBatchAllocStats(sectorIds, cycleId)       : Promise.resolve(new Map()),
    cycleId ? getBatchDistributedStats(sectorIds, cycleId) : Promise.resolve(new Map()),
    cycleId ? getBatchPurchaseStats(sectorIds, cycleId)    : Promise.resolve(new Map()),
  ]);

  const result = sectors.map(s => {
    const alloc   = batchAlloc.get(s.id)  ?? { allocated: 0, revoked: 0 };
    const dist    = batchDist.get(s.id)   ?? 0;
    const purch   = batchPurch.get(s.id)  ?? 0;
    const net     = alloc.allocated - alloc.revoked;
    const avail   = net - dist - purch;
    const pct     = net > 0 ? Math.min(100, ((dist + purch) / net) * 100) : 0;
    return {
      sectorId:       s.id,
      sectorName:     s.name,
      allocated:      alloc.allocated,
      revoked:        alloc.revoked,
      netAllocated:   net,
      available:      avail,
      utilizationPct: pct,
    };
  });

  toCache(chartCache, cacheKey, result);
  res.set('Cache-Control', 'private, max-age=120');
  res.json(result);
});

// ── Allocation Timeline ───────────────────────────────────────────────────────

router.get("/dashboard/allocation-timeline", requireAuth, async (req, res): Promise<void> => {
  const user = (req as any).user;
  const cycleId = req.query.cycleId ? parseInt(req.query.cycleId as string) : await getActiveCycleId();
  const days = parseInt(req.query.days as string || "30");
  if (!cycleId) { res.json([]); return; }

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const scopeSectorId = getUserScopeId(user);

  const timelineRootIds = scopeSectorId === null ? await getRootSectorIds() : [];
  const allocs = scopeSectorId === null
    ? await db.select().from(allocationsTable)
        .where(and(eq(allocationsTable.budgetCycleId, cycleId), gte(allocationsTable.allocatedAt, cutoff), timelineRootIds.length ? inArray(allocationsTable.fromSectorId, timelineRootIds) : sql`false`))
        .orderBy(allocationsTable.allocatedAt)
    : await db.select().from(allocationsTable)
        .where(and(eq(allocationsTable.budgetCycleId, cycleId), gte(allocationsTable.allocatedAt, cutoff), eq(allocationsTable.fromSectorId, scopeSectorId)))
        .orderBy(allocationsTable.allocatedAt);

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

// ── Recent Activity — fixed N+1: pre-fetch user+sector maps once ─────────────

router.get("/dashboard/recent-activity", requireAuth, async (req, res): Promise<void> => {
  const user = (req as any).user;
  const limit = parseInt(req.query.limit as string || "20");
  const scopeSectorId = getUserScopeId(user);

  const cacheKey = `activity:${user.id}`;
  const hit = fromCache(activityCache, cacheKey, ACTIVITY_TTL);
  if (hit) { res.set('X-Cache', 'HIT'); res.json(hit); return; }

  // Fetch logs + all lookup data in parallel — no per-row queries
  const [logs, allUsers, allSectors] = await Promise.all([
    db.select().from(auditLogsTable).orderBy(desc(auditLogsTable.createdAt)).limit(scopeSectorId !== null ? 200 : limit),
    db.select({ id: usersTable.id, name: usersTable.name }).from(usersTable),
    db.select({ id: sectorsTable.id, name: sectorsTable.name }).from(sectorsTable),
  ]);

  const userMap   = new Map(allUsers.map(u => [u.id, u.name]));
  const sectorMap = new Map(allSectors.map(s => [s.id, s.name]));

  const enriched = logs.map(log => {
    const userName = userMap.get(log.userId) ?? "Unknown";
    const meta = log.meta as any;
    let description = log.action;
    let sectorName: string | null = null;
    if (meta?.toSectorId) {
      sectorName = sectorMap.get(meta.toSectorId) ?? null;
      description = log.action === "allocated"
        ? `Allocated KES ${Number(meta.amount).toLocaleString()} to ${sectorName}`
        : `Revoked allocation of KES ${Number(meta.amount).toLocaleString()} from ${sectorName}`;
    }
    return {
      id:          log.id,
      action:      log.action,
      description,
      userId:      log.userId,
      userName,
      amount:      meta?.amount ? Number(meta.amount) : null,
      sectorName,
      createdAt:   log.createdAt,
      _toSectorId: meta?.toSectorId ?? null,
      _sectorId:   meta?.sectorId   ?? null,
    };
  });

  let filtered = enriched;
  if (scopeSectorId !== null) {
    const subtreeIds  = await getSubtreeIds(scopeSectorId);
    const subtreeSet  = new Set(subtreeIds);
    filtered = enriched.filter(e =>
      (e._toSectorId !== null && subtreeSet.has(e._toSectorId)) ||
      (e._sectorId   !== null && subtreeSet.has(e._sectorId))   ||
      e.userId === user.id
    );
  }

  const result = filtered.slice(0, limit).map(({ _toSectorId, _sectorId, ...rest }) => rest);
  toCache(activityCache, cacheKey, result);
  res.set('Cache-Control', 'private, max-age=60');
  res.json(result);
});

// ── Balance Breakdown ─────────────────────────────────────────────────────────

router.get("/dashboard/balance-breakdown", requireAuth, async (req, res): Promise<void> => {
  const user = (req as any).user;
  const cycleId = req.query.cycleId ? parseInt(req.query.cycleId as string) : await getActiveCycleId();
  if (!cycleId) {
    res.json({ totalBudget: 0, totalAllocated: 0, totalRevoked: 0, netAllocated: 0, availableBalance: 0, utilizationPct: 0, pendingCount: 0, activeCount: 0, revokedCount: 0 }); return;
  }
  const cycle = await db.select().from(budgetCyclesTable).where(eq(budgetCyclesTable.id, cycleId)).limit(1);
  if (!cycle[0]) { res.status(404).json({ error: "Not Found" }); return; }

  const scopeSectorId = getUserScopeId(user);
  let totalBudget = 0, totalAllocated = 0, totalRevoked = 0, pendingCount = 0, activeCount = 0, revokedCount = 0;

  if (scopeSectorId === null) {
    totalBudget = parseFloat(cycle[0].totalBudget);
    const bbRootIds = await getRootSectorIds();
    const allocs = await db.select().from(allocationsTable)
      .where(and(eq(allocationsTable.budgetCycleId, cycleId), bbRootIds.length ? inArray(allocationsTable.fromSectorId, bbRootIds) : sql`false`));
    for (const a of allocs) {
      if (a.status === "revoked")       { totalRevoked   += parseFloat(a.amount); revokedCount++; }
      else if (a.status === "active")   { totalAllocated += parseFloat(a.amount); activeCount++; }
      else if (a.status === "pending")  { totalAllocated += parseFloat(a.amount); pendingCount++; }
    }
  } else {
    totalBudget    = await getNetAllocated(scopeSectorId, cycleId);
    totalAllocated = await getTotalAllocatedFrom(scopeSectorId, cycleId);
    const allocs = await db.select().from(allocationsTable)
      .where(and(eq(allocationsTable.budgetCycleId, cycleId), eq(allocationsTable.fromSectorId, scopeSectorId)));
    for (const a of allocs) {
      if (a.status === "revoked")       revokedCount++;
      else if (a.status === "active")   activeCount++;
      else if (a.status === "pending")  pendingCount++;
    }
  }

  const netAllocated     = totalAllocated - totalRevoked;
  const availableBalance = scopeSectorId === null
    ? totalBudget - totalAllocated
    : await getAvailableBalance(scopeSectorId, cycleId);
  const utilizationPct = totalBudget > 0 ? Math.min(100, (totalAllocated / totalBudget) * 100) : 0;

  res.json({ totalBudget, totalAllocated, totalRevoked, netAllocated, availableBalance, utilizationPct, pendingCount, activeCount, revokedCount });
});

export default router;
