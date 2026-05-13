import { Router } from "express";
import { db, sectorsTable, usersTable, budgetCyclesTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { requireAuth, requireRole } from "../lib/auth";
import {
  getSubtreeIds, getUserScopeId,
  getBatchAllocStats, getBatchDistributedStats, getBatchPurchaseStats, getBatchChildCounts,
} from "../lib/budget-calc";

const router = Router();

// ── In-memory caches ──────────────────────────────────────────────────────────
// TTL is 10 minutes. Cache key is based on the user's *scope* (not their user ID)
// so all users with the same visibility share one warm entry rather than each
// paying a cold-start cost individually.
const listCache = new Map<string, { data: any[]; ts: number }>();
const treeCache = new Map<string, { data: any[]; ts: number }>();
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

function getFromCache<T>(map: Map<string, { data: T; ts: number }>, key: string): T | null {
  const e = map.get(key);
  if (!e) return null;
  if (Date.now() - e.ts > CACHE_TTL) { map.delete(key); return null; }
  return e.data;
}
/** Call this after any write to sectors/allocations to flush stale cache. */
export function invalidateSectorsCache() {
  listCache.clear();
  treeCache.clear();
}

async function getActiveCycleId(): Promise<number | null> {
  const rows = await db.select({ id: budgetCyclesTable.id }).from(budgetCyclesTable)
    .where(eq(budgetCyclesTable.isActive, true)).limit(1);
  return rows[0]?.id ?? null;
}

// ── Shared data loader ───────────────────────────────────────────────────────
async function loadBatchData(sectorIds: number[], cycleId: number | null) {
  const [allUsers, allocStats, distStats, purchStats, childCounts] = await Promise.all([
    db.select({ id: usersTable.id, name: usersTable.name, email: usersTable.email, role: usersTable.role })
      .from(usersTable),
    cycleId ? getBatchAllocStats(sectorIds, cycleId)       : Promise.resolve(new Map()),
    cycleId ? getBatchDistributedStats(sectorIds, cycleId) : Promise.resolve(new Map()),
    cycleId ? getBatchPurchaseStats(sectorIds, cycleId)    : Promise.resolve(new Map()),
    getBatchChildCounts(sectorIds),
  ]);
  return {
    userMap: new Map(allUsers.map(u => [u.id, u])),
    allocStats, distStats, purchStats, childCounts,
  };
}

function calcBudget(
  sectorId: number,
  isRoot: boolean,
  cycleTotalBudget: number | undefined,
  allocStats: Map<number, { allocated: number; revoked: number }>,
  distStats: Map<number, number>,
  purchStats: Map<number, number>,
  cycleId: number | null,
) {
  if (!cycleId) return { totalAllocated: 0, totalRevoked: 0, netAllocated: 0, availableBalance: 0, utilizationPct: 0 };

  if (isRoot && cycleTotalBudget != null) {
    const dist = distStats.get(sectorId) ?? 0;
    return {
      totalAllocated: cycleTotalBudget,
      totalRevoked: 0,
      netAllocated: cycleTotalBudget,
      availableBalance: cycleTotalBudget - dist,
      utilizationPct: cycleTotalBudget > 0 ? Math.min(100, (dist / cycleTotalBudget) * 100) : 0,
    };
  }

  const alloc = allocStats.get(sectorId) ?? { allocated: 0, revoked: 0 };
  const dist  = distStats.get(sectorId)  ?? 0;
  const purch = purchStats.get(sectorId) ?? 0;
  const net   = alloc.allocated - alloc.revoked;
  return {
    totalAllocated:  alloc.allocated,
    totalRevoked:    alloc.revoked,
    netAllocated:    net,
    availableBalance: net - dist - purch,
    utilizationPct:  net > 0 ? Math.min(100, ((dist + purch) / net) * 100) : 0,
  };
}

// ── GET /sectors — flat list enriched, O(6 queries) ─────────────────────────
router.get("/sectors", requireAuth, async (req, res): Promise<void> => {
  const user = (req as any).user;
  const cycleId = await getActiveCycleId();
  const scopeSectorId = getUserScopeId(user);

  // Key on scope (not user ID) — all users with the same view share one cache entry
  const cacheKey = `list:${scopeSectorId ?? 'root'}:${cycleId ?? 'none'}`;
  const hit = getFromCache(listCache, cacheKey);
  if (hit) { res.set('X-Cache', 'HIT'); res.json(hit); return; }
  res.set('X-Cache', 'MISS');

  let allSectors = await db.select().from(sectorsTable).orderBy(sectorsTable.sortOrder, sectorsTable.name);
  if (scopeSectorId !== null) {
    const subtreeIds = await getSubtreeIds(scopeSectorId);
    const subtreeSet = new Set(subtreeIds);
    allSectors = allSectors.filter(s => subtreeSet.has(s.id));
  }

  const sectorIds = allSectors.map(s => s.id);
  const sectorMap = new Map(allSectors.map(s => [s.id, s]));
  const { userMap, allocStats, distStats, purchStats, childCounts } = await loadBatchData(sectorIds, cycleId);

  const result = allSectors.map(s => {
    const budget = calcBudget(s.id, !s.parentId, undefined, allocStats, distStats, purchStats, cycleId);
    return {
      ...s,
      responsibleUser: s.responsibleUserId ? (userMap.get(s.responsibleUserId) ?? null) : null,
      parent:          s.parentId          ? (sectorMap.get(s.parentId)         ?? null) : null,
      ...budget,
      childCount: childCounts.get(s.id) ?? 0,
    };
  });

  listCache.set(cacheKey, { data: result, ts: Date.now() });
  res.set('Cache-Control', 'private, max-age=600');
  res.json(result);
});

// ── GET /sectors/tree — full hierarchy, O(5 queries + zero per-node) ─────────
router.get("/sectors/tree", requireAuth, async (req, res): Promise<void> => {
  const user = (req as any).user;
  const cycleIdParam  = req.query.cycleId  ? parseInt(req.query.cycleId  as string) : null;
  const advanced      = req.query.advanced === "true";
  const maxDepthParam = req.query.maxDepth ? parseInt(req.query.maxDepth as string) : undefined;
  const cycleId       = cycleIdParam ?? await getActiveCycleId();
  const scopeSectorId = getUserScopeId(user);

  // Key on scope, not user ID — users with identical visibility share one warm entry
  const cacheKey = `tree:${scopeSectorId ?? 'root'}:${cycleId}:${advanced}:${maxDepthParam ?? 'auto'}`;
  const hit = getFromCache(treeCache, cacheKey);
  if (hit) { res.set('X-Cache', 'HIT'); res.json(hit); return; }
  res.set('X-Cache', 'MISS');

  // Load all sectors + users + cycle in parallel
  const [allSectors, allUserRows, cycleRows] = await Promise.all([
    db.select().from(sectorsTable).orderBy(sectorsTable.sortOrder, sectorsTable.name),
    db.select({ id: usersTable.id, name: usersTable.name, email: usersTable.email, role: usersTable.role }).from(usersTable),
    cycleId
      ? db.select({ totalBudget: budgetCyclesTable.totalBudget }).from(budgetCyclesTable)
          .where(eq(budgetCyclesTable.id, cycleId)).limit(1)
      : Promise.resolve([]),
  ]);

  const userMap          = new Map(allUserRows.map(u => [u.id, u]));
  const cycleTotalBudget = (cycleRows as any[])[0] ? parseFloat((cycleRows as any[])[0].totalBudget) : undefined;
  const sectorIds        = allSectors.map(s => s.id);

  const [allocStats, distStats, purchStats] = await Promise.all([
    cycleId ? getBatchAllocStats(sectorIds, cycleId)       : Promise.resolve(new Map()),
    cycleId ? getBatchDistributedStats(sectorIds, cycleId) : Promise.resolve(new Map()),
    cycleId ? getBatchPurchaseStats(sectorIds, cycleId)    : Promise.resolve(new Map()),
  ]);

  // Effective max depth
  let effectiveMaxDepth: number | undefined;
  if (!advanced) {
    if (maxDepthParam !== undefined) {
      effectiveMaxDepth = maxDepthParam;
    } else if (scopeSectorId !== null) {
      const userSector = allSectors.find(s => s.id === scopeSectorId);
      effectiveMaxDepth = userSector?.maxDepthVisible ?? 1;
    }
  }

  // Pure in-memory recursive builder — zero DB calls
  function buildNode(sector: any, relDepth: number): any {
    const atLimit   = effectiveMaxDepth !== undefined && relDepth >= effectiveMaxDepth;
    const allKids   = allSectors.filter(s => s.parentId === sector.id);
    const visibleKids = atLimit ? [] : allKids;

    const budget = calcBudget(
      sector.id, !sector.parentId, cycleTotalBudget,
      allocStats, distStats, purchStats, cycleId,
    );

    return {
      id: sector.id, name: sector.name, code: sector.code,
      depth: sector.depth, parentId: sector.parentId,
      maxDepthVisible: sector.maxDepthVisible ?? 1,
      ...budget,
      responsibleUser: sector.responsibleUserId ? (userMap.get(sector.responsibleUserId) ?? null) : null,
      childCount: allKids.length,
      children: visibleKids.map(c => buildNode(c, relDepth + 1)).sort((a: any, b: any) => a.id - b.id),
    };
  }

  let result: any[];
  if (scopeSectorId !== null) {
    const sectorRow = allSectors.find(s => s.id === scopeSectorId) ?? allSectors[0];
    result = [buildNode(sectorRow, 0)];
  } else {
    result = allSectors.filter(s => s.parentId === null).map(r => buildNode(r, 0));
  }

  treeCache.set(cacheKey, { data: result, ts: Date.now() });
  res.set('Cache-Control', 'private, max-age=600');
  res.json(result);
});

// ── GET /sectors/:sectorId/tree ───────────────────────────────────────────────
router.get("/sectors/:sectorId/tree", requireAuth, async (req, res): Promise<void> => {
  const sectorId      = parseInt(req.params['sectorId'] as string);
  const cycleIdParam  = req.query.cycleId ? parseInt(req.query.cycleId as string) : null;
  const advanced      = req.query.advanced === "true";
  const maxDepthParam = req.query.maxDepth ? parseInt(req.query.maxDepth as string) : undefined;
  const cycleId       = cycleIdParam ?? await getActiveCycleId();

  const [allSectors, allUserRows, cycleRows] = await Promise.all([
    db.select().from(sectorsTable).orderBy(sectorsTable.sortOrder, sectorsTable.name),
    db.select({ id: usersTable.id, name: usersTable.name, email: usersTable.email, role: usersTable.role }).from(usersTable),
    cycleId
      ? db.select({ totalBudget: budgetCyclesTable.totalBudget }).from(budgetCyclesTable)
          .where(eq(budgetCyclesTable.id, cycleId)).limit(1)
      : Promise.resolve([]),
  ]);

  const sectorRow = allSectors.find(s => s.id === sectorId);
  if (!sectorRow) { res.status(404).json({ error: "Not Found" }); return; }

  const userMap = new Map(allUserRows.map(u => [u.id, u]));
  const sectorIds = allSectors.map(s => s.id);

  const [allocStats, distStats, purchStats] = await Promise.all([
    cycleId ? getBatchAllocStats(sectorIds, cycleId)       : Promise.resolve(new Map()),
    cycleId ? getBatchDistributedStats(sectorIds, cycleId) : Promise.resolve(new Map()),
    cycleId ? getBatchPurchaseStats(sectorIds, cycleId)    : Promise.resolve(new Map()),
  ]);

  const effectiveMaxDepth = advanced ? undefined : (maxDepthParam ?? sectorRow.maxDepthVisible ?? undefined);

  function buildNode(sector: any, relDepth: number): any {
    const atLimit = effectiveMaxDepth !== undefined && relDepth >= effectiveMaxDepth;
    const allKids = allSectors.filter(s => s.parentId === sector.id);
    const budget  = calcBudget(sector.id, false, undefined, allocStats, distStats, purchStats, cycleId);
    return {
      id: sector.id, name: sector.name, code: sector.code,
      depth: sector.depth, parentId: sector.parentId,
      maxDepthVisible: sector.maxDepthVisible ?? 1,
      ...budget,
      responsibleUser: sector.responsibleUserId ? (userMap.get(sector.responsibleUserId) ?? null) : null,
      childCount: allKids.length,
      children: atLimit ? [] : allKids.map(c => buildNode(c, relDepth + 1)).sort((a: any, b: any) => a.id - b.id),
    };
  }

  res.json(buildNode(sectorRow, 0));
});

// ── GET /sectors/:sectorId ────────────────────────────────────────────────────
router.get("/sectors/:sectorId", requireAuth, async (req, res): Promise<void> => {
  const sectorId = parseInt(req.params['sectorId'] as string);
  const cycleId  = await getActiveCycleId();

  const [sectors, allUserRows] = await Promise.all([
    db.select().from(sectorsTable).where(eq(sectorsTable.id, sectorId)).limit(1),
    db.select({ id: usersTable.id, name: usersTable.name, email: usersTable.email, role: usersTable.role }).from(usersTable),
  ]);
  if (!sectors[0]) { res.status(404).json({ error: "Not Found" }); return; }

  const s       = sectors[0];
  const userMap = new Map(allUserRows.map(u => [u.id, u]));

  const [parentRows, childRows, allocStats, distStats, purchStats] = await Promise.all([
    s.parentId ? db.select().from(sectorsTable).where(eq(sectorsTable.id, s.parentId)).limit(1) : Promise.resolve([]),
    db.select({ id: sectorsTable.id }).from(sectorsTable).where(eq(sectorsTable.parentId, s.id)),
    cycleId ? getBatchAllocStats([s.id], cycleId)       : Promise.resolve(new Map()),
    cycleId ? getBatchDistributedStats([s.id], cycleId) : Promise.resolve(new Map()),
    cycleId ? getBatchPurchaseStats([s.id], cycleId)    : Promise.resolve(new Map()),
  ]);

  const budget = calcBudget(s.id, !s.parentId, undefined, allocStats, distStats, purchStats, cycleId);
  res.json({
    ...s,
    responsibleUser: s.responsibleUserId ? (userMap.get(s.responsibleUserId) ?? null) : null,
    parent:          (parentRows as any[])[0] ?? null,
    ...budget,
    childCount: childRows.length,
  });
});

// ── POST /sectors ─────────────────────────────────────────────────────────────
router.post("/sectors", requireAuth, requireRole("super_admin"), async (req, res): Promise<void> => {
  const { name, code, parentId, responsibleUserId, sortOrder, maxDepthVisible } = req.body;
  if (!name || !code) { res.status(400).json({ error: "Bad Request", message: "Name and code required" }); return; }
  let depth = 0;
  if (parentId) {
    const parent = await db.select().from(sectorsTable).where(eq(sectorsTable.id, parentId)).limit(1);
    depth = (parent[0]?.depth ?? 0) + 1;
  }
  const [created] = await db.insert(sectorsTable).values({
    name, code, parentId: parentId || null, depth,
    responsibleUserId: responsibleUserId || null,
    sortOrder: sortOrder || 0, isActive: true,
    maxDepthVisible: maxDepthVisible ?? 1,
  }).returning();
  invalidateSectorsCache();
  res.status(201).json(created);
});

// ── PUT /sectors/:sectorId ────────────────────────────────────────────────────
router.put("/sectors/:sectorId", requireAuth, requireRole("super_admin"), async (req, res): Promise<void> => {
  const sectorId = parseInt(req.params['sectorId'] as string);
  const { name, code, parentId, responsibleUserId, isActive, sortOrder, maxDepthVisible } = req.body;
  const updates: any = { updatedAt: new Date() };
  if (name != null)                 updates.name               = name;
  if (code != null)                 updates.code               = code;
  if (parentId !== undefined)       updates.parentId           = parentId;
  if (responsibleUserId !== undefined) updates.responsibleUserId = responsibleUserId;
  if (isActive != null)             updates.isActive           = isActive;
  if (sortOrder != null)            updates.sortOrder          = sortOrder;
  if (maxDepthVisible != null)      updates.maxDepthVisible    = maxDepthVisible;
  const [updated] = await db.update(sectorsTable).set(updates).where(eq(sectorsTable.id, sectorId)).returning();
  if (!updated) { res.status(404).json({ error: "Not Found" }); return; }
  invalidateSectorsCache();
  res.json(updated);
});

// ── DELETE /sectors/:sectorId ─────────────────────────────────────────────────
router.delete("/sectors/:sectorId", requireAuth, requireRole("super_admin"), async (req, res): Promise<void> => {
  await db.delete(sectorsTable).where(eq(sectorsTable.id, parseInt(req.params['sectorId'] as string)));
  invalidateSectorsCache();
  res.json({ message: "Sector deleted" });
});

export default router;
