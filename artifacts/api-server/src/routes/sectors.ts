import { Router } from "express";
import { db, sectorsTable, usersTable, allocationsTable, budgetCyclesTable } from "@workspace/db";
import { eq, and, inArray, sql, isNull } from "drizzle-orm";
import { requireAuth, requireRole } from "../lib/auth";
import { getNetAllocated, getTotalAllocated, getTotalRevoked, getTotalAllocatedFrom, getAvailableBalance, getUtilizationPct, getSubtreeIds, getSubtreeIdsWithDepth, getUserScopeId } from "../lib/budget-calc";

const router = Router();

async function getActiveCycleId(): Promise<number | null> {
  const cycles = await db.select().from(budgetCyclesTable).where(eq(budgetCyclesTable.isActive, true)).limit(1);
  return cycles[0]?.id ?? null;
}

async function enrichSector(sector: any, cycleId: number | null) {
  let responsibleUser = null;
  if (sector.responsibleUserId) {
    const users = await db.select({ id: usersTable.id, name: usersTable.name, email: usersTable.email, role: usersTable.role }).from(usersTable).where(eq(usersTable.id, sector.responsibleUserId)).limit(1);
    responsibleUser = users[0] || null;
  }
  let parent = null;
  if (sector.parentId) {
    const parents = await db.select().from(sectorsTable).where(eq(sectorsTable.id, sector.parentId)).limit(1);
    parent = parents[0] || null;
  }
  let totalAllocated = 0, totalRevoked = 0, availableBalance = 0, utilizationPct = 0;
  if (cycleId) {
    totalAllocated = await getTotalAllocated(sector.id, cycleId);
    totalRevoked = await getTotalRevoked(sector.id, cycleId);
    availableBalance = await getAvailableBalance(sector.id, cycleId);
    utilizationPct = await getUtilizationPct(sector.id, cycleId);
  }
  const children = await db.select({ id: sectorsTable.id }).from(sectorsTable).where(eq(sectorsTable.parentId, sector.id));
  return {
    ...sector,
    responsibleUser,
    parent,
    totalAllocated,
    totalRevoked,
    netAllocated: totalAllocated - totalRevoked,
    availableBalance,
    utilizationPct,
    childCount: children.length,
  };
}

async function buildTreeNode(
  sector: any,
  cycleId: number | null,
  allSectors: any[],
  cycleTotalBudget?: number,
  maxDepth?: number,
  currentRelativeDepth?: number,
): Promise<any> {
  const relDepth = currentRelativeDepth ?? 0;
  const atDepthLimit = maxDepth !== undefined && relDepth >= maxDepth;
  const children = atDepthLimit ? [] : allSectors.filter((s: any) => s.parentId === sector.id);
  let responsibleUser = null;
  if (sector.responsibleUserId) {
    const users = await db.select({ id: usersTable.id, name: usersTable.name, email: usersTable.email, role: usersTable.role }).from(usersTable).where(eq(usersTable.id, sector.responsibleUserId)).limit(1);
    responsibleUser = users[0] || null;
  }
  const isRoot = !sector.parentId;
  let totalAllocated = 0, totalRevoked = 0, netAllocated = 0, availableBalance = 0, utilizationPct = 0;
  if (cycleId) {
    if (isRoot && cycleTotalBudget != null) {
      const distributed = await getTotalAllocatedFrom(sector.id, cycleId);
      totalAllocated = cycleTotalBudget;
      totalRevoked = 0;
      netAllocated = cycleTotalBudget;
      availableBalance = cycleTotalBudget - distributed;
      utilizationPct = cycleTotalBudget > 0 ? Math.min(100, (distributed / cycleTotalBudget) * 100) : 0;
    } else {
      totalAllocated = await getTotalAllocated(sector.id, cycleId);
      totalRevoked = await getTotalRevoked(sector.id, cycleId);
      netAllocated = totalAllocated - totalRevoked;
      availableBalance = await getAvailableBalance(sector.id, cycleId);
      utilizationPct = await getUtilizationPct(sector.id, cycleId);
    }
  }
  const allChildren = allSectors.filter((s: any) => s.parentId === sector.id);
  const childNodes = await Promise.all(children.map((c: any) =>
    buildTreeNode(c, cycleId, allSectors, cycleTotalBudget, maxDepth, relDepth + 1)
  ));
  return {
    id: sector.id, name: sector.name, code: sector.code, depth: sector.depth, parentId: sector.parentId,
    maxDepthVisible: sector.maxDepthVisible ?? 1,
    totalAllocated, totalRevoked, netAllocated,
    availableBalance, utilizationPct, responsibleUser,
    childCount: allChildren.length,
    children: childNodes.sort((a: any, b: any) => a.id - b.id),
  };
}

router.get("/sectors", requireAuth, async (req, res): Promise<void> => {
  const user = (req as any).user;
  const cycleId = await getActiveCycleId();
  let allSectors = await db.select().from(sectorsTable).orderBy(sectorsTable.sortOrder, sectorsTable.name);
  const scopeSectorId = getUserScopeId(user);
  if (scopeSectorId !== null) {
    const subtreeIds = await getSubtreeIds(scopeSectorId);
    allSectors = allSectors.filter((s: any) => subtreeIds.includes(s.id));
  }
  const enriched = await Promise.all(allSectors.map((s: any) => enrichSector(s, cycleId)));
  res.json(enriched);
});

/**
 * GET /sectors/tree
 * Supports ?maxDepth=N to limit visible hierarchy levels
 * Supports ?advanced=true to override depth limit and show all descendants
 */
router.get("/sectors/tree", requireAuth, async (req, res): Promise<void> => {
  const user = (req as any).user;
  const cycleIdParam = req.query.cycleId ? parseInt(req.query.cycleId as string) : null;
  const cycleId = cycleIdParam ?? await getActiveCycleId();
  const advanced = req.query.advanced === "true";
  const maxDepthParam = req.query.maxDepth ? parseInt(req.query.maxDepth as string) : undefined;
  const allSectors = await db.select().from(sectorsTable).orderBy(sectorsTable.sortOrder, sectorsTable.name);

  let cycleTotalBudget: number | undefined;
  if (cycleId) {
    const cycleRow = await db.select({ totalBudget: budgetCyclesTable.totalBudget }).from(budgetCyclesTable).where(eq(budgetCyclesTable.id, cycleId)).limit(1);
    cycleTotalBudget = cycleRow[0] ? parseFloat(cycleRow[0].totalBudget) : undefined;
  }

  const scopeSectorId = getUserScopeId(user);

  // Determine effective max depth
  let effectiveMaxDepth: number | undefined;
  if (!advanced) {
    if (maxDepthParam !== undefined) {
      effectiveMaxDepth = maxDepthParam;
    } else if (scopeSectorId !== null) {
      const userSector = allSectors.find((s: any) => s.id === scopeSectorId);
      effectiveMaxDepth = userSector?.maxDepthVisible ?? 1;
    }
  }

  if (scopeSectorId !== null) {
    const sectorRow = allSectors.find((s: any) => s.id === scopeSectorId) ?? allSectors[0];
    const node = await buildTreeNode(sectorRow, cycleId, allSectors, cycleTotalBudget, effectiveMaxDepth);
    res.json([node]);
    return;
  }

  const roots = allSectors.filter((s: any) => s.parentId === null);
  const tree = await Promise.all(roots.map((r: any) =>
    buildTreeNode(r, cycleId, allSectors, cycleTotalBudget, effectiveMaxDepth)
  ));
  res.json(tree);
});

router.get("/sectors/:sectorId/tree", requireAuth, async (req, res): Promise<void> => {
  const sectorId = parseInt(req.params['sectorId'] as string);
  const cycleIdParam = req.query.cycleId ? parseInt(req.query.cycleId as string) : null;
  const cycleId = cycleIdParam ?? await getActiveCycleId();
  const advanced = req.query.advanced === "true";
  const maxDepthParam = req.query.maxDepth ? parseInt(req.query.maxDepth as string) : undefined;
  const sector = await db.select().from(sectorsTable).where(eq(sectorsTable.id, sectorId)).limit(1);
  if (!sector[0]) { res.status(404).json({ error: "Not Found" }); return; }
  const allSectors = await db.select().from(sectorsTable).orderBy(sectorsTable.sortOrder, sectorsTable.name);

  let effectiveMaxDepth: number | undefined;
  if (!advanced) {
    effectiveMaxDepth = maxDepthParam ?? sector[0].maxDepthVisible ?? undefined;
  }

  const node = await buildTreeNode(sector[0], cycleId, allSectors, undefined, effectiveMaxDepth);
  res.json(node);
});

router.get("/sectors/:sectorId", requireAuth, async (req, res): Promise<void> => {
  const sectorId = parseInt(req.params['sectorId'] as string);
  const cycleId = await getActiveCycleId();
  const sectors = await db.select().from(sectorsTable).where(eq(sectorsTable.id, sectorId)).limit(1);
  if (!sectors[0]) { res.status(404).json({ error: "Not Found" }); return; }
  res.json(await enrichSector(sectors[0], cycleId));
});

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
  res.status(201).json(created);
});

router.put("/sectors/:sectorId", requireAuth, requireRole("super_admin"), async (req, res): Promise<void> => {
  const sectorId = parseInt(req.params['sectorId'] as string);
  const { name, code, parentId, responsibleUserId, isActive, sortOrder, maxDepthVisible } = req.body;
  const updates: any = { updatedAt: new Date() };
  if (name != null) updates.name = name;
  if (code != null) updates.code = code;
  if (parentId !== undefined) updates.parentId = parentId;
  if (responsibleUserId !== undefined) updates.responsibleUserId = responsibleUserId;
  if (isActive != null) updates.isActive = isActive;
  if (sortOrder != null) updates.sortOrder = sortOrder;
  if (maxDepthVisible != null) updates.maxDepthVisible = maxDepthVisible;
  const [updated] = await db.update(sectorsTable).set(updates).where(eq(sectorsTable.id, sectorId)).returning();
  if (!updated) { res.status(404).json({ error: "Not Found" }); return; }
  res.json(updated);
});

router.delete("/sectors/:sectorId", requireAuth, requireRole("super_admin"), async (req, res): Promise<void> => {
  await db.delete(sectorsTable).where(eq(sectorsTable.id, parseInt(req.params['sectorId'] as string)));
  res.json({ message: "Sector deleted" });
});

export default router;
