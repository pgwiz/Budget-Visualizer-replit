import { Router } from "express";
import { db, budgetCyclesTable, sectorsTable, allocationsTable, usersTable, auditLogsTable } from "@workspace/db";
import { eq, and, inArray, sql, desc, gte } from "drizzle-orm";
import { requireAuth } from "../lib/auth";
import {
  getTotalAllocated, getTotalRevoked, getNetAllocated,
  getTotalAllocatedFrom, getAvailableBalance, getUtilizationPct,
  getSubtreeIds, getUserScopeId,
} from "../lib/budget-calc";

const router = Router();

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
  const user = (req as any).user;
  const cycleIdParam = req.query.cycleId ? parseInt(req.query.cycleId as string) : null;
  const cycle = cycleIdParam
    ? (await db.select().from(budgetCyclesTable).where(eq(budgetCyclesTable.id, cycleIdParam)).limit(1))[0]
    : await getActiveCycle();

  const cycleId = cycle?.id ?? null;
  const scopeSectorId = getUserScopeId(user); // null = global

  // Detect if user's sector is a root sector (no parent → budget comes from cycle total)
  const userSectorRow = scopeSectorId
    ? (await db.select({ parentId: sectorsTable.parentId }).from(sectorsTable).where(eq(sectorsTable.id, scopeSectorId)).limit(1))[0]
    : null;
  const isRootSector = userSectorRow ? !userSectorRow.parentId : false;

  let totalBudget = 0, totalAllocated = 0, totalRevoked = 0, availableBalance = 0, utilizationPct = 0;

  if (cycleId) {
    if (scopeSectorId === null) {
      // Global (super_admin): cycle budget pool, allocations from root sectors only (no double-count)
      totalBudget = cycle ? parseFloat(cycle.totalBudget) : 0;
      const rootIds = await getRootSectorIds();
      const allocResult = await db
        .select({ total: sql<string>`COALESCE(SUM(amount), 0)` })
        .from(allocationsTable)
        .where(and(eq(allocationsTable.budgetCycleId, cycleId), rootIds.length ? inArray(allocationsTable.fromSectorId, rootIds) : sql`false`, inArray(allocationsTable.status, ["active", "pending", "exhausted"])));
      const revResult = await db
        .select({ total: sql<string>`COALESCE(SUM(amount), 0)` })
        .from(allocationsTable)
        .where(and(eq(allocationsTable.budgetCycleId, cycleId), rootIds.length ? inArray(allocationsTable.fromSectorId, rootIds) : sql`false`, eq(allocationsTable.status, "revoked")));
      totalAllocated = parseFloat(allocResult[0]?.total ?? "0");
      totalRevoked   = parseFloat(revResult[0]?.total ?? "0");
      availableBalance = totalBudget - totalAllocated;
      utilizationPct   = totalBudget > 0 ? Math.min(100, (totalAllocated / totalBudget) * 100) : 0;
    } else if (isRootSector) {
      // Root sector (e.g. National Government): budget = cycle total; no incoming allocations
      totalBudget      = cycle ? parseFloat(cycle.totalBudget) : 0;
      totalAllocated   = await getTotalAllocatedFrom(scopeSectorId, cycleId);
      availableBalance = totalBudget - totalAllocated;
      utilizationPct   = totalBudget > 0 ? Math.min(100, (totalAllocated / totalBudget) * 100) : 0;
    } else {
      // Scoped non-root: budget = what was net-allocated TO this sector
      totalBudget      = await getNetAllocated(scopeSectorId, cycleId);
      totalAllocated   = await getTotalAllocatedFrom(scopeSectorId, cycleId);
      availableBalance = await getAvailableBalance(scopeSectorId, cycleId);
      utilizationPct   = await getUtilizationPct(scopeSectorId, cycleId);
    }
  }

  // Sector count and active allocations — scoped to subtree
  let sectorCount = 0, activeAllocations = 0;
  if (scopeSectorId === null) {
    sectorCount = Number((await db.select({ c: sql<number>`COUNT(*)` }).from(sectorsTable))[0]?.c ?? 0);
    activeAllocations = cycleId
      ? Number((await db.select({ c: sql<number>`COUNT(*)` }).from(allocationsTable)
          .where(and(eq(allocationsTable.budgetCycleId, cycleId), eq(allocationsTable.status, "active"))))[0]?.c ?? 0)
      : 0;
  } else {
    const subtreeIds = await getSubtreeIds(scopeSectorId);
    sectorCount = subtreeIds.length;
    activeAllocations = cycleId
      ? Number((await db.select({ c: sql<number>`COUNT(*)` }).from(allocationsTable)
          .where(and(eq(allocationsTable.budgetCycleId, cycleId), eq(allocationsTable.status, "active"), inArray(allocationsTable.toSectorId, subtreeIds))))[0]?.c ?? 0)
      : 0;
  }

  // Top sectors: global → depth=1 children of root; scoped → direct children of user's sector
  const childSectors = scopeSectorId === null
    ? await db.select().from(sectorsTable).where(eq(sectorsTable.depth, 1)).limit(10)
    : await db.select().from(sectorsTable).where(eq(sectorsTable.parentId, scopeSectorId));

  const topSectors = await Promise.all(childSectors.map(async s => {
    const ta    = cycleId ? await getTotalAllocated(s.id, cycleId) : 0;
    const tr    = cycleId ? await getTotalRevoked(s.id, cycleId) : 0;
    const avail = cycleId ? await getAvailableBalance(s.id, cycleId) : 0;
    const pct   = cycleId ? await getUtilizationPct(s.id, cycleId) : 0;
    const children = await db.select({ id: sectorsTable.id }).from(sectorsTable).where(eq(sectorsTable.parentId, s.id));
    return { ...s, totalAllocated: ta, totalRevoked: tr, netAllocated: ta - tr, availableBalance: avail, utilizationPct: pct, childCount: children.length, responsibleUser: null, parent: null };
  }));

  // My personal sector stats (always shown when sector is set)
  const myAllocated    = scopeSectorId && cycleId
    ? (isRootSector ? (cycle ? parseFloat(cycle.totalBudget) : 0) : await getNetAllocated(scopeSectorId, cycleId))
    : null;
  const myDistributed  = scopeSectorId && cycleId ? await getTotalAllocatedFrom(scopeSectorId, cycleId) : null;
  const myAvailable    = scopeSectorId && cycleId
    ? (isRootSector ? totalBudget - (myDistributed ?? 0) : await getAvailableBalance(scopeSectorId, cycleId))
    : null;

  const enrichedCycle = cycle ? { ...cycle, totalBudget, totalAllocated, totalRevoked, availableBalance, utilizationPct } : null;

  res.json({
    role: user.role, cycle: enrichedCycle, totalBudget, totalAllocated, totalRevoked,
    availableBalance, utilizationPct, sectorCount, activeAllocations, topSectors,
    myAllocated, myDistributed, myAvailable,
  });
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
