import { Router } from "express";
import { db, allocationsTable, revocationsTable, sectorsTable, usersTable, budgetCyclesTable, auditLogsTable } from "@workspace/db";
import { eq, and, inArray } from "drizzle-orm";
import { requireAuth } from "../lib/auth";
import { getAvailableBalance, getSubtreeIds, getImmediateChildIds, getUserScopeId } from "../lib/budget-calc";
import { createNotification } from "../utils/createNotification.js";

const router = Router();

async function enrichAllocation(alloc: any) {
  let fromSector = null, toSector = null, allocatedByUser = null, revocation = null;
  if (alloc.fromSectorId) {
    const s = await db.select().from(sectorsTable).where(eq(sectorsTable.id, alloc.fromSectorId)).limit(1);
    fromSector = s[0] || null;
  }
  const ts = await db.select().from(sectorsTable).where(eq(sectorsTable.id, alloc.toSectorId)).limit(1);
  toSector = ts[0] || null;
  const u = await db.select({ id: usersTable.id, name: usersTable.name, email: usersTable.email, role: usersTable.role }).from(usersTable).where(eq(usersTable.id, alloc.allocatedBy)).limit(1);
  allocatedByUser = u[0] || null;
  if (alloc.status === "revoked") {
    const r = await db.select().from(revocationsTable).where(eq(revocationsTable.allocationId, alloc.id)).limit(1);
    if (r[0]) {
      const ru = await db.select({ id: usersTable.id, name: usersTable.name, email: usersTable.email, role: usersTable.role }).from(usersTable).where(eq(usersTable.id, r[0].revokedBy)).limit(1);
      revocation = { ...r[0], revokedByUser: ru[0] || null };
    }
  }
  return { ...alloc, amount: parseFloat(alloc.amount), fromSector, toSector, allocatedByUser, revocation };
}

/**
 * GET /allocations
 * Scoped to show only allocations involving the user's immediate children
 * (or full subtree when ?advanced=true)
 */
router.get("/allocations", requireAuth, async (req, res): Promise<void> => {
  const user = (req as any).user;
  const { cycleId, sectorId, status, advanced } = req.query;
  const conditions: any[] = [];
  if (cycleId) conditions.push(eq(allocationsTable.budgetCycleId, parseInt(cycleId as string)));
  if (sectorId) conditions.push(eq(allocationsTable.toSectorId, parseInt(sectorId as string)));
  if (status) conditions.push(eq(allocationsTable.status, status as any));
  let allocs = conditions.length > 0
    ? await db.select().from(allocationsTable).where(and(...conditions)).orderBy(allocationsTable.createdAt)
    : await db.select().from(allocationsTable).orderBy(allocationsTable.createdAt);

  const scopeSectorId = getUserScopeId(user);
  if (scopeSectorId !== null) {
    const useAdvanced = advanced === "true";
    if (useAdvanced) {
      const subtreeIds = await getSubtreeIds(scopeSectorId);
      allocs = allocs.filter((a: typeof allocs[number]) =>
        subtreeIds.includes(a.toSectorId) ||
        (a.fromSectorId !== null && subtreeIds.includes(a.fromSectorId))
      );
    } else {
      const immediateChildIds = await getImmediateChildIds(scopeSectorId);
      const visibleIds = [scopeSectorId, ...immediateChildIds];
      allocs = allocs.filter((a: typeof allocs[number]) =>
        visibleIds.includes(a.toSectorId) ||
        (a.fromSectorId !== null && visibleIds.includes(a.fromSectorId))
      );
    }
  }

  const enriched = await Promise.all(allocs.map(enrichAllocation));
  res.json(enriched);
});

/**
 * GET /allocations/targets
 * Returns sectors the current user can allocate to (immediate children only)
 */
router.get("/allocations/targets", requireAuth, async (req, res): Promise<void> => {
  const user = (req as any).user;
  const scopeSectorId = getUserScopeId(user);

  if (scopeSectorId === null) {
    const roots = await db.select().from(sectorsTable).where(eq(sectorsTable.depth, 0)).orderBy(sectorsTable.sortOrder);
    res.json(roots);
    return;
  }

  const children = await db.select().from(sectorsTable)
    .where(eq(sectorsTable.parentId, scopeSectorId))
    .orderBy(sectorsTable.sortOrder, sectorsTable.name);
  res.json(children);
});

/**
 * POST /allocations
 * Enforces hierarchical constraint: can only allocate to immediate children
 */
router.post("/allocations", requireAuth, async (req, res): Promise<void> => {
  const user = (req as any).user;
  const { budgetCycleId, fromSectorId, toSectorId, amount, comment } = req.body;
  if (!budgetCycleId || !toSectorId || !amount) {
    res.status(400).json({ error: "Bad Request", message: "Missing required fields" }); return;
  }
  if (amount <= 0) {
    res.status(400).json({ error: "Bad Request", message: "Amount must be positive" }); return;
  }

  // Enforce hierarchical constraint: can only allocate to immediate children
  const scopeSectorId = getUserScopeId(user);
  if (scopeSectorId !== null) {
    const immediateChildIds = await getImmediateChildIds(scopeSectorId);
    if (!immediateChildIds.includes(toSectorId)) {
      res.status(403).json({
        error: "Forbidden",
        message: "You can only allocate funds to your immediate sub-sectors",
      });
      return;
    }
  } else {
    // Super admin: verify toSectorId is a child of fromSectorId (or root if no fromSectorId)
    if (fromSectorId) {
      const childIds = await getImmediateChildIds(fromSectorId);
      if (!childIds.includes(toSectorId)) {
        res.status(400).json({
          error: "Bad Request",
          message: "Target sector must be an immediate child of the source sector",
        });
        return;
      }
    }
  }

  const cycle = await db.select().from(budgetCyclesTable).where(eq(budgetCyclesTable.id, budgetCycleId)).limit(1);
  if (!cycle[0] || !cycle[0].isActive) {
    res.status(400).json({ error: "Bad Request", message: "Budget cycle is not active" }); return;
  }
  const effectiveFrom = fromSectorId || scopeSectorId || null;
  const available = await getAvailableBalance(effectiveFrom, budgetCycleId);
  if (amount > available) {
    res.status(400).json({ error: "Bad Request", message: `Amount exceeds available balance of KES ${available.toLocaleString()}` }); return;
  }
  const [created] = await db.insert(allocationsTable).values({
    budgetCycleId, fromSectorId: effectiveFrom, toSectorId,
    allocatedBy: user.id, amount: String(amount), comment: comment || null, status: "active",
  }).returning();
  await db.insert(auditLogsTable).values({
    userId: user.id, action: "allocated", subjectType: "allocation", subjectId: created.id,
    meta: { amount, toSectorId, fromSectorId: effectiveFrom, cycleId: budgetCycleId },
    ipAddress: req.ip,
  });
  // Fire-and-forget notification
  createNotification({
    actorId: user.id, actionType: "ALLOCATION_CREATED",
    entityType: "allocation", entityId: created.id,
    metadata: { amount, toSectorId, fromSectorId: effectiveFrom },
  });
  res.status(201).json(await enrichAllocation(created));
});

router.get("/allocations/:allocationId", requireAuth, async (req, res): Promise<void> => {
  const allocs = await db.select().from(allocationsTable).where(eq(allocationsTable.id, parseInt(req.params['allocationId'] as string))).limit(1);
  if (!allocs[0]) { res.status(404).json({ error: "Not Found" }); return; }
  res.json(await enrichAllocation(allocs[0]));
});

router.post("/allocations/:allocationId/revoke", requireAuth, async (req, res): Promise<void> => {
  const user = (req as any).user;
  const { reason } = req.body;
  if (!reason || reason.length < 5) {
    res.status(400).json({ error: "Bad Request", message: "Reason must be at least 5 characters" }); return;
  }
  const allocs = await db.select().from(allocationsTable).where(eq(allocationsTable.id, parseInt(req.params['allocationId'] as string))).limit(1);
  if (!allocs[0]) { res.status(404).json({ error: "Not Found" }); return; }
  if (allocs[0].status === "revoked") {
    res.status(400).json({ error: "Bad Request", message: "Allocation is already revoked" }); return;
  }
  await db.insert(revocationsTable).values({ allocationId: allocs[0].id, revokedBy: user.id, reason });
  const [updated] = await db.update(allocationsTable).set({ status: "revoked" }).where(eq(allocationsTable.id, allocs[0].id)).returning();
  await db.insert(auditLogsTable).values({
    userId: user.id, action: "revoked", subjectType: "allocation", subjectId: allocs[0].id,
    meta: { reason, amount: allocs[0].amount }, ipAddress: req.ip,
  });
  // Fire-and-forget notification
  createNotification({
    actorId: user.id, actionType: "ALLOCATION_REVOKED",
    entityType: "allocation", entityId: allocs[0].id,
    metadata: { reason, amount: allocs[0].amount, toSectorId: allocs[0].toSectorId },
  });
  res.json(await enrichAllocation(updated));
});

export default router;
