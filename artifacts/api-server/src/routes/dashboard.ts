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
} from "../lib/budget-calc";

const router = Router();

// Simple in-memory cache for dashboard summary (5 minute TTL)
const summaryCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getCacheKey(userId: number, cycleId: number | null): string {
  return `summary:${userId}:${cycleId}`;
}

function getFromCache(key: string): any | null {
  const entry = summaryCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL) {
    summaryCache.delete(key);
    return null;
  }
  return entry.data;
}

function setInCache(key: string, data: any): void {
  summaryCache.set(key, { data, timestamp: Date.now() });
}

/** Returns IDs of all top-level (root) sectors — these are the "national pool" sources */
async function getRootSectorIds(): Promise<number[]> {
  const roots = await db.select({ id: sectorsTable.id }).from(sectorsTable).where(sql`${sectorsTable.parentId} IS NULL`);
  return roots.map(r => r.id);
}

async function getActiveCycleId(): Promise<number | null> {
  const cycles = await db.select().from(budgetCyclesTable).where(eq(budgetCyclesTable.isActive, true)).limit(1);
  return cycles[0]?.id ?? null;
}

async function getActiveCycle() {
  const cycles = await db.select().from(budgetCyclesTable).where(eq(budgetCyclesTable.isActive, true)).limit(1);
  return cycles[0] ?? null;
}

// ── Summary ──────────────────────────────────────────────────────────────────

router.get("/dashboard/summary", requireAuth, async (req, res): Promise<void> => {
  const perf = new PerformanceTracker((req as any).id);
  const user = (req as any).user;
  const cycleIdParam = req.query.cycleId ? parseInt(req.query.cycleId as string) : null;
  
  logger.info({ userId: user.id, cycleIdParam }, "[PERF] /dashboard/summary request started");
  
  try {
    // Check cache first
    const cacheKey = getCacheKey(user.id, cycleIdParam ?? null);
    const cachedResult = getFromCache(cacheKey);
    if (cachedResult) {
      logger.info({ userId: user.id, cacheKey }, "[PERF] Cache hit for dashboard summary");
      res.set('X-Cache', 'HIT');
      res.json(cachedResult);
      return;
    }
    res.set('X-Cache', 'MISS');

    // Get active cycle
    const endCycleQuery = perf.recordQueryStart("getActiveCycle");
    const cycle = cycleIdParam
      ? (await db.select().from(budgetCyclesTable).where(eq(budgetCyclesTable.id, cycleIdParam)).limit(1))[0]
      : await getActiveCycle();
    endCycleQuery();

    const cycleId = cycle?.id ?? null;
    const scopeSectorId = getUserScopeId(user); // null = global

    // Get user sector info
    const endUserSectorQuery = perf.recordQueryStart("getUserSectorInfo");
    const userSectorRow = scopeSectorId
      ? (await db.select({ parentId: sectorsTable.parentId }).from(sectorsTable).where(eq(sectorsTable.id, scopeSectorId)).limit(1))[0]
      : null;
    endUserSectorQuery();
    const isRootSector = userSectorRow ? !userSectorRow.parentId : false;

    let totalBudget = 0, totalAllocated = 0, totalRevoked = 0, availableBalance = 0, utilizationPct = 0;

    if (cycleId) {
      if (scopeSectorId === null) {
        // Global (super_admin): cycle budget pool
        totalBudget = cycle ? parseFloat(cycle.totalBudget) : 0;
        
        const endRootIds = perf.recordQueryStart("getRootSectorIds");
        const rootIds = await getRootSectorIds();
        endRootIds();
        
        const endAllocQuery = perf.recordQueryStart("getTotalAllocated_global");
        const allocResult = await db
          .select({ total: sql<string>`COALESCE(SUM(amount), 0)` })
          .from(allocationsTable)
          .where(and(eq(allocationsTable.budgetCycleId, cycleId), rootIds.length ? inArray(allocationsTable.fromSectorId, rootIds) : sql`false`, inArray(allocationsTable.status, ["active", "pending", "exhausted"])));
        endAllocQuery();
        
        const endRevQuery = perf.recordQueryStart("getTotalRevoked_global");
        const revResult = await db
          .select({ total: sql<string>`COALESCE(SUM(amount), 0)` })
          .from(allocationsTable)
          .where(and(eq(allocationsTable.budgetCycleId, cycleId), rootIds.length ? inArray(allocationsTable.fromSectorId, rootIds) : sql`false`, eq(allocationsTable.status, "revoked")));
        endRevQuery();
        
        totalAllocated = parseFloat(allocResult[0]?.total ?? "0");
        totalRevoked   = parseFloat(revResult[0]?.total ?? "0");
        availableBalance = totalBudget - totalAllocated;
        utilizationPct   = totalBudget > 0 ? Math.min(100, (totalAllocated / totalBudget) * 100) : 0;
      } else if (isRootSector) {
        // Root sector
        totalBudget      = cycle ? parseFloat(cycle.totalBudget) : 0;
        
        const endAllocFromQuery = perf.recordQueryStart("getTotalAllocatedFrom_root");
        totalAllocated   = await getTotalAllocatedFrom(scopeSectorId, cycleId);
        endAllocFromQuery();
        
        availableBalance = totalBudget - totalAllocated;
        utilizationPct   = totalBudget > 0 ? Math.min(100, (totalAllocated / totalBudget) * 100) : 0;
      } else {
        // Scoped non-root: run all queries in parallel
        const endScopedQuery = perf.recordQueryStart("getScopedBudgetMetrics");
        const [netAlloc, totalAlloc, availBal, utilizPct] = await Promise.all([
          getNetAllocated(scopeSectorId, cycleId),
          getTotalAllocatedFrom(scopeSectorId, cycleId),
          getAvailableBalance(scopeSectorId, cycleId),
          getUtilizationPct(scopeSectorId, cycleId),
        ]);
        endScopedQuery();
        
        totalBudget      = netAlloc;
        totalAllocated   = totalAlloc;
        availableBalance = availBal;
        utilizationPct   = utilizPct;
      }
    }

    // Get sector counts and active allocations
    let sectorCount = 0, activeAllocations = 0;
    const endCountsQuery = perf.recordQueryStart("getSectorCounts");
    if (scopeSectorId === null) {
      sectorCount = Number((await db.select({ c: sql<number>`COUNT(*)` }).from(sectorsTable))[0]?.c ?? 0);
      activeAllocations = cycleId
        ? Number((await db.select({ c: sql<number>`COUNT(*)` }).from(allocationsTable)
            .where(and(eq(allocationsTable.budgetCycleId, cycleId), eq(allocationsTable.status, "active"))))[0]?.c ?? 0)
        : 0;
    } else {
      const endSubtreeQuery = perf.recordQueryStart("getSubtreeIds");
      const subtreeIds = await getSubtreeIds(scopeSectorId);
      endSubtreeQuery();
      
      sectorCount = subtreeIds.length;
      activeAllocations = cycleId
        ? Number((await db.select({ c: sql<number>`COUNT(*)` }).from(allocationsTable)
            .where(and(eq(allocationsTable.budgetCycleId, cycleId), eq(allocationsTable.status, "active"), inArray(allocationsTable.toSectorId, subtreeIds))))[0]?.c ?? 0)
        : 0;
    }
    endCountsQuery();

    // Get child sectors
    const endChildSectorsQuery = perf.recordQueryStart("getChildSectors");
    const childSectors = scopeSectorId === null
      ? await db.select().from(sectorsTable).where(eq(sectorsTable.depth, 1)).limit(10)
      : await db.select().from(sectorsTable).where(eq(sectorsTable.parentId, scopeSectorId));
    endChildSectorsQuery();

    // Process top sectors in parallel
    const endTopSectorsQuery = perf.recordQueryStart("processTopSectors");
    const topSectors = await Promise.all(childSectors.map(async s => {
      const [ta, tr, avail, pct, childrenResult] = await Promise.all([
        cycleId ? getTotalAllocated(s.id, cycleId) : Promise.resolve(0),
        cycleId ? getTotalRevoked(s.id, cycleId) : Promise.resolve(0),
        cycleId ? getAvailableBalance(s.id, cycleId) : Promise.resolve(0),
        cycleId ? getUtilizationPct(s.id, cycleId) : Promise.resolve(0),
        db.select({ id: sectorsTable.id }).from(sectorsTable).where(eq(sectorsTable.parentId, s.id)),
      ]);
      return { ...s, totalAllocated: ta, totalRevoked: tr, netAllocated: ta - tr, availableBalance: avail, utilizationPct: pct, childCount: childrenResult.length, responsibleUser: null, parent: null };
    }));
    endTopSectorsQuery();

    // Get personal sector stats
    let myAllocated = null, myDistributed = null, myAvailable = null;
    if (scopeSectorId && cycleId) {
      const endPersonalQuery = perf.recordQueryStart("getPersonalSectorStats");
      const allocPromise = isRootSector ? Promise.resolve(cycle ? parseFloat(cycle.totalBudget) : 0) : getNetAllocated(scopeSectorId, cycleId);
      const distributedPromise = getTotalAllocatedFrom(scopeSectorId, cycleId);
      
      myAllocated    = await allocPromise;
      myDistributed  = await distributedPromise;
      myAvailable    = isRootSector ? totalBudget - (myDistributed ?? 0) : await getAvailableBalance(scopeSectorId, cycleId);
      endPersonalQuery();
    }

    const enrichedCycle = cycle ? { ...cycle, totalBudget, totalAllocated, totalRevoked, availableBalance, utilizationPct } : null;

    const result = {
      role: user.role, cycle: enrichedCycle, totalBudget, totalAllocated, totalRevoked,
      availableBalance, utilizationPct, sectorCount, activeAllocations, topSectors,
      myAllocated, myDistributed, myAvailable,
    };

    // Cache result
    res.set('Cache-Control', 'private, max-age=300');
    res.set('Vary', 'Cookie');
    setInCache(cacheKey, result);
    
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

  let sectors: any[];
  if (sectorIdParam) {
    // Explicit drill-down: children of requested sector
    sectors = await db.select().from(sectorsTable).where(eq(sectorsTable.parentId, sectorIdParam));
  } else if (scopeSectorId !== null) {
    // Scoped user: show their direct children
    sectors = await db.select().from(sectorsTable).where(eq(sectorsTable.parentId, scopeSectorId));
  } else {
    // Global: ministry-level sectors (depth=1)
    sectors = await db.select().from(sectorsTable).where(eq(sectorsTable.depth, 1));
  }

  const result = await Promise.all(sectors.map(async s => {
    const allocated = cycleId ? await getTotalAllocated(s.id, cycleId) : 0;
    const revoked   = cycleId ? await getTotalRevoked(s.id, cycleId) : 0;
    const available = cycleId ? await getAvailableBalance(s.id, cycleId) : 0;
    const pct       = cycleId ? await getUtilizationPct(s.id, cycleId) : 0;
    return { sectorId: s.id, sectorName: s.name, allocated, revoked, netAllocated: allocated - revoked, available, utilizationPct: pct };
  }));

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

  // Global: top-level allocations (from root sectors) — no double-count
  // Scoped: allocations FROM the user's own sector (what they distributed)
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

// ── Recent Activity ───────────────────────────────────────────────────────────

router.get("/dashboard/recent-activity", requireAuth, async (req, res): Promise<void> => {
  const user = (req as any).user;
  const limit = parseInt(req.query.limit as string || "20");
  const scopeSectorId = getUserScopeId(user);

  const logs = await db.select().from(auditLogsTable).orderBy(desc(auditLogsTable.createdAt)).limit(scopeSectorId !== null ? 200 : limit);

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
    return { id: log.id, action: log.action, description, userId: log.userId, userName, amount: meta?.amount ? Number(meta.amount) : null, sectorName, createdAt: log.createdAt, _toSectorId: meta?.toSectorId ?? null, _sectorId: meta?.sectorId ?? null };
  }));

  let filtered = enriched;
  if (scopeSectorId !== null) {
    const subtreeIds = await getSubtreeIds(scopeSectorId);
    filtered = enriched.filter(e =>
      (e._toSectorId !== null && subtreeIds.includes(e._toSectorId)) ||
      (e._sectorId   !== null && subtreeIds.includes(e._sectorId))   ||
      e.userId === user.id
    );
  }

  // Strip internal fields and trim to limit
  const result = filtered.slice(0, limit).map(({ _toSectorId, _sectorId, ...rest }) => rest);
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
    // Global: cycle total budget, top-level allocations only
    totalBudget = parseFloat(cycle[0].totalBudget);
    const bbRootIds = await getRootSectorIds();
    const allocs = await db.select().from(allocationsTable)
      .where(and(eq(allocationsTable.budgetCycleId, cycleId), bbRootIds.length ? inArray(allocationsTable.fromSectorId, bbRootIds) : sql`false`));
    for (const a of allocs) {
      if (a.status === "revoked")  { totalRevoked   += parseFloat(a.amount); revokedCount++; }
      else if (a.status === "active")  { totalAllocated += parseFloat(a.amount); activeCount++; }
      else if (a.status === "pending") { totalAllocated += parseFloat(a.amount); pendingCount++; }
    }
  } else {
    // Scoped: their "budget" is what they received; their "allocated" is what they sent out
    totalBudget    = await getNetAllocated(scopeSectorId, cycleId);
    totalAllocated = await getTotalAllocatedFrom(scopeSectorId, cycleId);

    // Count statuses for allocations FROM this sector
    const allocs = await db.select().from(allocationsTable)
      .where(and(eq(allocationsTable.budgetCycleId, cycleId), eq(allocationsTable.fromSectorId, scopeSectorId)));
    for (const a of allocs) {
      if (a.status === "revoked")  revokedCount++;
      else if (a.status === "active")  activeCount++;
      else if (a.status === "pending") pendingCount++;
    }
  }

  const netAllocated   = totalAllocated - totalRevoked;
  const availableBalance = scopeSectorId === null
    ? totalBudget - totalAllocated
    : await getAvailableBalance(scopeSectorId, cycleId);
  const utilizationPct = totalBudget > 0 ? Math.min(100, (totalAllocated / totalBudget) * 100) : 0;

  res.json({ totalBudget, totalAllocated, totalRevoked, netAllocated, availableBalance, utilizationPct, pendingCount, activeCount, revokedCount });
});

export default router;
