import { Router } from "express";
import { db, allocationsTable, revocationsTable, sectorsTable, usersTable, budgetCyclesTable, auditLogsTable } from "@workspace/db";
import { eq, and, inArray } from "drizzle-orm";
import { requireAuth } from "../lib/auth";
import { getAvailableBalance, getSubtreeIds, getImmediateChildIds, getUserScopeId } from "../lib/budget-calc";

const router = Router();

// ── Shared lookup builders ────────────────────────────────────────────────────
async function buildSectorMap(): Promise<Map<number, any>> {
  const rows = await db.select().from(sectorsTable);
  return new Map(rows.map(r => [r.id, r]));
}

async function buildUserMap(): Promise<Map<number, any>> {
  const rows = await db.select({
    id: usersTable.id, name: usersTable.name, email: usersTable.email, role: usersTable.role,
  }).from(usersTable);
  return new Map(rows.map(r => [r.id, r]));
}

// ── Batch enrichment: pre-load all lookups once, build in-memory ──────────────
async function enrichAllocations(allocs: any[]) {
  if (!allocs.length) return [];

  // Gather unique IDs we need
  const fromSectorIds  = [...new Set(allocs.filter(a => a.fromSectorId != null).map(a => a.fromSectorId as number))];
  const toSectorIds    = [...new Set(allocs.map(a => a.toSectorId as number))];
  const allSectorIds   = [...new Set([...fromSectorIds, ...toSectorIds])];
  const allocatorIds   = [...new Set(allocs.map(a => a.allocatedBy as number))];
  const revokedIds     = allocs.filter(a => a.status === 'revoked').map(a => a.id as number);

  // Load all lookups in parallel
  const [sectorsData, usersData, revocationsData] = await Promise.all([
    allSectorIds.length
      ? db.select().from(sectorsTable).where(inArray(sectorsTable.id, allSectorIds))
      : Promise.resolve([]),
    allocatorIds.length
      ? db.select({ id: usersTable.id, name: usersTable.name, email: usersTable.email, role: usersTable.role })
          .from(usersTable).where(inArray(usersTable.id, allocatorIds))
      : Promise.resolve([]),
    revokedIds.length
      ? db.select().from(revocationsTable).where(inArray(revocationsTable.allocationId, revokedIds))
      : Promise.resolve([]),
  ]);

  const sectorMap = new Map((sectorsData as any[]).map(s => [s.id, s]));
  const userMap   = new Map((usersData as any[]).map(u => [u.id, u]));

  // Load revocation users
  const revUserIds = [...new Set((revocationsData as any[]).map(r => r.revokedBy as number))];
  const revUsers = revUserIds.length
    ? await db.select({ id: usersTable.id, name: usersTable.name, email: usersTable.email, role: usersTable.role })
        .from(usersTable).where(inArray(usersTable.id, revUserIds))
    : [];
  const revUserMap = new Map(revUsers.map(u => [u.id, u]));

  // Map revocations by allocationId
  const revByAllocId = new Map((revocationsData as any[]).map(r => [
    r.allocationId,
    { ...r, revokedByUser: revUserMap.get(r.revokedBy) ?? null },
  ]));

  return allocs.map(a => ({
    ...a,
    amount:          parseFloat(a.amount),
    fromSector:      a.fromSectorId ? (sectorMap.get(a.fromSectorId) ?? null) : null,
    toSector:        sectorMap.get(a.toSectorId) ?? null,
    allocatedByUser: userMap.get(a.allocatedBy) ?? null,
    revocation:      revByAllocId.get(a.id) ?? null,
  }));
}

// ── Single enrichment (used after writes) ─────────────────────────────────────
async function enrichOne(alloc: any) {
  const [enriched] = await enrichAllocations([alloc]);
  return enriched;
}

// ── GET /allocations — O(3–4 queries regardless of count) ────────────────────
router.get("/allocations", requireAuth, async (req, res): Promise<void> => {
  const user = (req as any).user;
  const { cycleId, sectorId, status, advanced } = req.query;

  const conditions: any[] = [];
  if (cycleId)   conditions.push(eq(allocationsTable.budgetCycleId, parseInt(cycleId as string)));
  if (sectorId)  conditions.push(eq(allocationsTable.toSectorId,    parseInt(sectorId as string)));
  if (status)    conditions.push(eq(allocationsTable.status, status as any));

  let allocs = conditions.length > 0
    ? await db.select().from(allocationsTable).where(and(...conditions)).orderBy(allocationsTable.createdAt)
    : await db.select().from(allocationsTable).orderBy(allocationsTable.createdAt);

  const scopeSectorId = getUserScopeId(user);
  if (scopeSectorId !== null) {
    const useAdvanced = advanced === "true";
    if (useAdvanced) {
      const subtreeIds  = await getSubtreeIds(scopeSectorId);
      const subtreeSet  = new Set(subtreeIds);
      allocs = allocs.filter(a =>
        subtreeSet.has(a.toSectorId) || (a.fromSectorId != null && subtreeSet.has(a.fromSectorId))
      );
    } else {
      const immediateChildIds = await getImmediateChildIds(scopeSectorId);
      const visibleSet = new Set([scopeSectorId, ...immediateChildIds]);
      allocs = allocs.filter(a =>
        visibleSet.has(a.toSectorId) || (a.fromSectorId != null && visibleSet.has(a.fromSectorId))
      );
    }
  }

  res.json(await enrichAllocations(allocs));
});

// ── GET /allocations/targets ──────────────────────────────────────────────────
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

// ── POST /allocations ─────────────────────────────────────────────────────────
router.post("/allocations", requireAuth, async (req, res): Promise<void> => {
  const user = (req as any).user;
  const { budgetCycleId, fromSectorId, toSectorId, amount, comment } = req.body;
  if (!budgetCycleId || !toSectorId || !amount) {
    res.status(400).json({ error: "Bad Request", message: "Missing required fields" }); return;
  }
  if (amount <= 0) {
    res.status(400).json({ error: "Bad Request", message: "Amount must be positive" }); return;
  }

  const scopeSectorId = getUserScopeId(user);
  if (scopeSectorId !== null) {
    const immediateChildIds = await getImmediateChildIds(scopeSectorId);
    if (!immediateChildIds.includes(toSectorId)) {
      res.status(403).json({ error: "Forbidden", message: "You can only allocate funds to your immediate sub-sectors" }); return;
    }
  } else {
    if (fromSectorId) {
      const childIds = await getImmediateChildIds(fromSectorId);
      if (!childIds.includes(toSectorId)) {
        res.status(400).json({ error: "Bad Request", message: "Target sector must be an immediate child of the source sector" }); return;
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
  res.status(201).json(await enrichOne(created));
});

// ── GET /allocations/:allocationId ────────────────────────────────────────────
router.get("/allocations/:allocationId", requireAuth, async (req, res): Promise<void> => {
  const rows = await db.select().from(allocationsTable)
    .where(eq(allocationsTable.id, parseInt(req.params['allocationId'] as string))).limit(1);
  if (!rows[0]) { res.status(404).json({ error: "Not Found" }); return; }
  res.json(await enrichOne(rows[0]));
});

// ── POST /allocations/:allocationId/revoke ────────────────────────────────────
router.post("/allocations/:allocationId/revoke", requireAuth, async (req, res): Promise<void> => {
  const user = (req as any).user;
  const { reason } = req.body;
  if (!reason || reason.length < 5) {
    res.status(400).json({ error: "Bad Request", message: "Reason must be at least 5 characters" }); return;
  }
  const rows = await db.select().from(allocationsTable)
    .where(eq(allocationsTable.id, parseInt(req.params['allocationId'] as string))).limit(1);
  if (!rows[0]) { res.status(404).json({ error: "Not Found" }); return; }
  if (rows[0].status === "revoked") {
    res.status(400).json({ error: "Bad Request", message: "Allocation is already revoked" }); return;
  }
  await db.insert(revocationsTable).values({ allocationId: rows[0].id, revokedBy: user.id, reason });
  const [updated] = await db.update(allocationsTable).set({ status: "revoked" })
    .where(eq(allocationsTable.id, rows[0].id)).returning();
  await db.insert(auditLogsTable).values({
    userId: user.id, action: "revoked", subjectType: "allocation", subjectId: rows[0].id,
    meta: { reason, amount: rows[0].amount }, ipAddress: req.ip,
  });
  res.json(await enrichOne(updated));
});

export default router;
