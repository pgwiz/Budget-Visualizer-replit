import { Router } from "express";
import { db, allocationsTable, revocationsTable, sectorsTable, usersTable, budgetCyclesTable, auditLogsTable } from "@workspace/db";
import { eq, and, inArray } from "drizzle-orm";
import { requireAuth } from "../lib/auth";
import { getAvailableBalance } from "../lib/budget-calc";

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

router.get("/allocations", requireAuth, async (req, res): Promise<void> => {
  const { cycleId, sectorId, status } = req.query;
  const conditions: any[] = [];
  if (cycleId) conditions.push(eq(allocationsTable.budgetCycleId, parseInt(cycleId as string)));
  if (sectorId) conditions.push(eq(allocationsTable.toSectorId, parseInt(sectorId as string)));
  if (status) conditions.push(eq(allocationsTable.status, status as any));
  const allocs = conditions.length > 0
    ? await db.select().from(allocationsTable).where(and(...conditions)).orderBy(allocationsTable.createdAt)
    : await db.select().from(allocationsTable).orderBy(allocationsTable.createdAt);
  const enriched = await Promise.all(allocs.map(enrichAllocation));
  res.json(enriched);
});

router.post("/allocations", requireAuth, async (req, res): Promise<void> => {
  const user = (req as any).user;
  const { budgetCycleId, fromSectorId, toSectorId, amount, comment } = req.body;
  if (!budgetCycleId || !toSectorId || !amount) {
    res.status(400).json({ error: "Bad Request", message: "Missing required fields" }); return;
  }
  if (amount <= 0) {
    res.status(400).json({ error: "Bad Request", message: "Amount must be positive" }); return;
  }
  const cycle = await db.select().from(budgetCyclesTable).where(eq(budgetCyclesTable.id, budgetCycleId)).limit(1);
  if (!cycle[0] || !cycle[0].isActive) {
    res.status(400).json({ error: "Bad Request", message: "Budget cycle is not active" }); return;
  }
  const available = await getAvailableBalance(fromSectorId || null, budgetCycleId);
  if (amount > available) {
    res.status(400).json({ error: "Bad Request", message: `Amount exceeds available balance of KES ${available.toLocaleString()}` }); return;
  }
  const [created] = await db.insert(allocationsTable).values({
    budgetCycleId, fromSectorId: fromSectorId || null, toSectorId,
    allocatedBy: user.id, amount: String(amount), comment: comment || null, status: "active",
  }).returning();
  await db.insert(auditLogsTable).values({
    userId: user.id, action: "allocated", subjectType: "allocation", subjectId: created.id,
    meta: { amount, toSectorId, fromSectorId, cycleId: budgetCycleId },
    ipAddress: req.ip,
  });
  res.status(201).json(await enrichAllocation(created));
});

router.get("/allocations/:allocationId", requireAuth, async (req, res): Promise<void> => {
  const allocs = await db.select().from(allocationsTable).where(eq(allocationsTable.id, parseInt(req.params.allocationId))).limit(1);
  if (!allocs[0]) { res.status(404).json({ error: "Not Found" }); return; }
  res.json(await enrichAllocation(allocs[0]));
});

router.post("/allocations/:allocationId/revoke", requireAuth, async (req, res): Promise<void> => {
  const user = (req as any).user;
  const { reason } = req.body;
  if (!reason || reason.length < 5) {
    res.status(400).json({ error: "Bad Request", message: "Reason must be at least 5 characters" }); return;
  }
  const allocs = await db.select().from(allocationsTable).where(eq(allocationsTable.id, parseInt(req.params.allocationId))).limit(1);
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
  res.json(await enrichAllocation(updated));
});

export default router;
