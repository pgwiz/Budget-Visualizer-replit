import { Router } from "express";
import { db, sectorsTable, usersTable, allocationsTable, budgetCyclesTable } from "@workspace/db";
import { eq, and, inArray, sql, isNull } from "drizzle-orm";
import { requireAuth, requireRole } from "../lib/auth";
import { getNetAllocated, getTotalAllocated, getTotalRevoked, getTotalAllocatedFrom, getAvailableBalance, getUtilizationPct } from "../lib/budget-calc";

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

async function buildTreeNode(sector: any, cycleId: number | null, allSectors: any[]): Promise<any> {
  const children = allSectors.filter(s => s.parentId === sector.id);
  let responsibleUser = null;
  if (sector.responsibleUserId) {
    const users = await db.select({ id: usersTable.id, name: usersTable.name, email: usersTable.email, role: usersTable.role }).from(usersTable).where(eq(usersTable.id, sector.responsibleUserId)).limit(1);
    responsibleUser = users[0] || null;
  }
  let totalAllocated = 0, totalRevoked = 0, availableBalance = 0, utilizationPct = 0;
  if (cycleId) {
    totalAllocated = await getTotalAllocated(sector.id, cycleId);
    totalRevoked = await getTotalRevoked(sector.id, cycleId);
    availableBalance = await getAvailableBalance(sector.id, cycleId);
    utilizationPct = await getUtilizationPct(sector.id, cycleId);
  }
  const childNodes = await Promise.all(children.map(c => buildTreeNode(c, cycleId, allSectors)));
  return {
    id: sector.id, name: sector.name, code: sector.code, depth: sector.depth, parentId: sector.parentId,
    totalAllocated, totalRevoked, netAllocated: totalAllocated - totalRevoked,
    availableBalance, utilizationPct, responsibleUser,
    children: childNodes.sort((a, b) => a.id - b.id),
  };
}

router.get("/sectors", requireAuth, async (req, res): Promise<void> => {
  const user = (req as any).user;
  const cycleId = await getActiveCycleId();
  const allSectors = await db.select().from(sectorsTable).orderBy(sectorsTable.sortOrder, sectorsTable.name);
  const enriched = await Promise.all(allSectors.map(s => enrichSector(s, cycleId)));
  res.json(enriched);
});

router.get("/sectors/tree", requireAuth, async (req, res): Promise<void> => {
  const cycleIdParam = req.query.cycleId ? parseInt(req.query.cycleId as string) : null;
  const cycleId = cycleIdParam ?? await getActiveCycleId();
  const allSectors = await db.select().from(sectorsTable).orderBy(sectorsTable.sortOrder, sectorsTable.name);
  const roots = allSectors.filter(s => s.parentId === null);
  const tree = await Promise.all(roots.map(r => buildTreeNode(r, cycleId, allSectors)));
  res.json(tree);
});

router.get("/sectors/:sectorId/tree", requireAuth, async (req, res): Promise<void> => {
  const sectorId = parseInt(req.params['sectorId'] as string);
  const cycleIdParam = req.query.cycleId ? parseInt(req.query.cycleId as string) : null;
  const cycleId = cycleIdParam ?? await getActiveCycleId();
  const sector = await db.select().from(sectorsTable).where(eq(sectorsTable.id, sectorId)).limit(1);
  if (!sector[0]) { res.status(404).json({ error: "Not Found" }); return; }
  const allSectors = await db.select().from(sectorsTable).orderBy(sectorsTable.sortOrder, sectorsTable.name);
  const node = await buildTreeNode(sector[0], cycleId, allSectors);
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
  const { name, code, parentId, responsibleUserId, sortOrder } = req.body;
  if (!name || !code) { res.status(400).json({ error: "Bad Request", message: "Name and code required" }); return; }
  let depth = 0;
  if (parentId) {
    const parent = await db.select().from(sectorsTable).where(eq(sectorsTable.id, parentId)).limit(1);
    depth = (parent[0]?.depth ?? 0) + 1;
  }
  const [created] = await db.insert(sectorsTable).values({ name, code, parentId: parentId || null, depth, responsibleUserId: responsibleUserId || null, sortOrder: sortOrder || 0, isActive: true }).returning();
  res.status(201).json(created);
});

router.put("/sectors/:sectorId", requireAuth, requireRole("super_admin"), async (req, res): Promise<void> => {
  const sectorId = parseInt(req.params['sectorId'] as string);
  const { name, code, parentId, responsibleUserId, isActive, sortOrder } = req.body;
  const updates: any = { updatedAt: new Date() };
  if (name != null) updates.name = name;
  if (code != null) updates.code = code;
  if (parentId !== undefined) updates.parentId = parentId;
  if (responsibleUserId !== undefined) updates.responsibleUserId = responsibleUserId;
  if (isActive != null) updates.isActive = isActive;
  if (sortOrder != null) updates.sortOrder = sortOrder;
  const [updated] = await db.update(sectorsTable).set(updates).where(eq(sectorsTable.id, sectorId)).returning();
  if (!updated) { res.status(404).json({ error: "Not Found" }); return; }
  res.json(updated);
});

router.delete("/sectors/:sectorId", requireAuth, requireRole("super_admin"), async (req, res): Promise<void> => {
  await db.delete(sectorsTable).where(eq(sectorsTable.id, parseInt(req.params['sectorId'] as string)));
  res.json({ message: "Sector deleted" });
});

export default router;
