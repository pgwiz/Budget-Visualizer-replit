import { db, allocationsTable, budgetCyclesTable, purchaseOrdersTable, sectorsTable } from "@workspace/db";
import { eq, and, inArray, sql } from "drizzle-orm";

/** Returns all descendant sector IDs (inclusive of the root) */
export async function getSubtreeIds(rootId: number): Promise<number[]> {
  const all = await db.select({ id: sectorsTable.id, parentId: sectorsTable.parentId }).from(sectorsTable);
  const ids: number[] = [rootId];
  const queue = [rootId];
  while (queue.length) {
    const cur = queue.shift()!;
    const children = all.filter((s: { id: number; parentId: number | null }) => s.parentId === cur).map((s: { id: number }) => s.id);
    ids.push(...children);
    queue.push(...children);
  }
  return ids;
}

/** Returns IDs of immediate children of a sector */
export async function getImmediateChildIds(sectorId: number): Promise<number[]> {
  const children = await db.select({ id: sectorsTable.id }).from(sectorsTable).where(eq(sectorsTable.parentId, sectorId));
  return children.map((c: { id: number }) => c.id);
}

/** Returns descendant IDs limited to a max depth from the root */
export async function getSubtreeIdsWithDepth(rootId: number, maxDepth: number): Promise<number[]> {
  const all = await db.select({ id: sectorsTable.id, parentId: sectorsTable.parentId }).from(sectorsTable);
  const ids: number[] = [rootId];
  const queue: Array<{ id: number; depth: number }> = [{ id: rootId, depth: 0 }];
  while (queue.length) {
    const cur = queue.shift()!;
    if (cur.depth >= maxDepth) continue;
    const children = all.filter((s: { id: number; parentId: number | null }) => s.parentId === cur.id);
    for (const child of children) {
      ids.push(child.id);
      queue.push({ id: child.id, depth: cur.depth + 1 });
    }
  }
  return ids;
}

/**
 * Returns the effective scope sector ID for a user.
 * Only super_admin gets the true global scope (null = entire national pool).
 * All other roles (including ceo) are scoped to their own sector subtree.
 * Users without a sectorId assigned fall back to global gracefully.
 */
export function getUserScopeId(user: { role: string; sectorId: number | null }): number | null {
  if (user.role === 'super_admin') return null;
  return user.sectorId;
}

// ─── BATCH FUNCTIONS (replace N×individual queries with 4 total) ──────────────

export interface BatchAllocStats {
  allocated: number;
  revoked: number;
}

/**
 * Batch: one query returns allocated + revoked totals keyed by toSectorId.
 * Replaces N calls to getTotalAllocated() + getTotalRevoked().
 */
export async function getBatchAllocStats(
  sectorIds: number[],
  cycleId: number,
): Promise<Map<number, BatchAllocStats>> {
  if (!sectorIds.length) return new Map();
  const rows = await db
    .select({
      sectorId: allocationsTable.toSectorId,
      allocated: sql<string>`COALESCE(SUM(CASE WHEN ${allocationsTable.status} IN ('active','pending','exhausted') THEN ${allocationsTable.amount}::numeric ELSE 0 END), 0)`,
      revoked:   sql<string>`COALESCE(SUM(CASE WHEN ${allocationsTable.status} = 'revoked'                          THEN ${allocationsTable.amount}::numeric ELSE 0 END), 0)`,
    })
    .from(allocationsTable)
    .where(and(
      eq(allocationsTable.budgetCycleId, cycleId),
      inArray(allocationsTable.toSectorId, sectorIds),
    ))
    .groupBy(allocationsTable.toSectorId);

  const map = new Map<number, BatchAllocStats>();
  for (const r of rows) {
    map.set(r.sectorId, { allocated: parseFloat(r.allocated), revoked: parseFloat(r.revoked) });
  }
  return map;
}

/**
 * Batch: one query returns total distributed FROM each sector keyed by fromSectorId.
 * Replaces N calls to getTotalAllocatedFrom().
 */
export async function getBatchDistributedStats(
  sectorIds: number[],
  cycleId: number,
): Promise<Map<number, number>> {
  if (!sectorIds.length) return new Map();
  const rows = await db
    .select({
      sectorId:    allocationsTable.fromSectorId,
      distributed: sql<string>`COALESCE(SUM(CASE WHEN ${allocationsTable.status} IN ('active','pending','exhausted') THEN ${allocationsTable.amount}::numeric ELSE 0 END), 0)`,
    })
    .from(allocationsTable)
    .where(and(
      eq(allocationsTable.budgetCycleId, cycleId),
      inArray(allocationsTable.fromSectorId, sectorIds),
    ))
    .groupBy(allocationsTable.fromSectorId);

  const map = new Map<number, number>();
  for (const r of rows) {
    if (r.sectorId !== null) map.set(r.sectorId, parseFloat(r.distributed));
  }
  return map;
}

/**
 * Batch: one query returns approved purchase order totals keyed by sectorId.
 * Replaces N calls to getTotalApprovedPurchases().
 */
export async function getBatchPurchaseStats(
  sectorIds: number[],
  cycleId: number,
): Promise<Map<number, number>> {
  if (!sectorIds.length) return new Map();
  const rows = await db
    .select({
      sectorId: purchaseOrdersTable.sectorId,
      approved: sql<string>`COALESCE(SUM(${purchaseOrdersTable.totalAmount}::numeric), 0)`,
    })
    .from(purchaseOrdersTable)
    .where(and(
      eq(purchaseOrdersTable.budgetCycleId, cycleId),
      eq(purchaseOrdersTable.status, 'approved'),
      inArray(purchaseOrdersTable.sectorId, sectorIds),
    ))
    .groupBy(purchaseOrdersTable.sectorId);

  const map = new Map<number, number>();
  for (const r of rows) {
    map.set(r.sectorId, parseFloat(r.approved));
  }
  return map;
}

/**
 * Batch: one query returns allocation counts keyed by toSectorId.
 */
export async function getBatchAllocCount(
  sectorIds: number[],
  cycleId: number,
): Promise<Map<number, number>> {
  if (!sectorIds.length) return new Map();
  const rows = await db
    .select({
      sectorId: allocationsTable.toSectorId,
      count:    sql<number>`COUNT(*)`,
    })
    .from(allocationsTable)
    .where(and(
      eq(allocationsTable.budgetCycleId, cycleId),
      inArray(allocationsTable.toSectorId, sectorIds),
    ))
    .groupBy(allocationsTable.toSectorId);

  const map = new Map<number, number>();
  for (const r of rows) {
    map.set(r.sectorId, Number(r.count));
  }
  return map;
}

/**
 * Batch: child counts keyed by parentId — one query.
 */
export async function getBatchChildCounts(parentIds: number[]): Promise<Map<number, number>> {
  if (!parentIds.length) return new Map();
  const rows = await db
    .select({
      parentId: sectorsTable.parentId,
      count:    sql<number>`COUNT(*)`,
    })
    .from(sectorsTable)
    .where(inArray(sectorsTable.parentId, parentIds))
    .groupBy(sectorsTable.parentId);

  const map = new Map<number, number>();
  for (const r of rows) {
    if (r.parentId !== null) map.set(r.parentId, Number(r.count));
  }
  return map;
}

// ─── SINGLE-SECTOR HELPERS (kept for backward compat where one sector is fine) ─

export async function getTotalAllocated(sectorId: number, cycleId: number): Promise<number> {
  const result = await db
    .select({ total: sql<string>`COALESCE(SUM(amount), 0)` })
    .from(allocationsTable)
    .where(and(
      eq(allocationsTable.toSectorId, sectorId),
      eq(allocationsTable.budgetCycleId, cycleId),
      inArray(allocationsTable.status, ["active", "pending", "exhausted"]),
    ));
  return parseFloat(result[0]?.total ?? "0");
}

export async function getTotalRevoked(sectorId: number, cycleId: number): Promise<number> {
  const result = await db
    .select({ total: sql<string>`COALESCE(SUM(amount), 0)` })
    .from(allocationsTable)
    .where(and(
      eq(allocationsTable.toSectorId, sectorId),
      eq(allocationsTable.budgetCycleId, cycleId),
      eq(allocationsTable.status, "revoked"),
    ));
  return parseFloat(result[0]?.total ?? "0");
}

export async function getNetAllocated(sectorId: number, cycleId: number): Promise<number> {
  const allocated = await getTotalAllocated(sectorId, cycleId);
  const revoked = await getTotalRevoked(sectorId, cycleId);
  return allocated - revoked;
}

export async function getTotalAllocatedFrom(sectorId: number | null, cycleId: number): Promise<number> {
  let whereClause;
  if (sectorId === null) {
    const roots = await db.select({ id: sectorsTable.id }).from(sectorsTable).where(sql`${sectorsTable.parentId} IS NULL`);
    const rootIds = roots.map((r: { id: number }) => r.id);
    if (rootIds.length === 0) return 0;
    whereClause = and(eq(allocationsTable.budgetCycleId, cycleId), inArray(allocationsTable.fromSectorId, rootIds), inArray(allocationsTable.status, ["active", "pending", "exhausted"]));
  } else {
    whereClause = and(eq(allocationsTable.fromSectorId, sectorId), eq(allocationsTable.budgetCycleId, cycleId), inArray(allocationsTable.status, ["active", "pending", "exhausted"]));
  }
  const result = await db
    .select({ total: sql<string>`COALESCE(SUM(amount), 0)` })
    .from(allocationsTable)
    .where(whereClause);
  return parseFloat(result[0]?.total ?? "0");
}

export async function getTotalApprovedPurchases(sectorId: number, cycleId: number): Promise<number> {
  const result = await db
    .select({ total: sql<string>`COALESCE(SUM(total_amount), 0)` })
    .from(purchaseOrdersTable)
    .where(and(
      eq(purchaseOrdersTable.sectorId, sectorId),
      eq(purchaseOrdersTable.budgetCycleId, cycleId),
      eq(purchaseOrdersTable.status, "approved"),
    ));
  return parseFloat(result[0]?.total ?? "0");
}

export async function getAvailableBalance(sectorId: number | null, cycleId: number): Promise<number> {
  if (sectorId === null) {
    const cycle = await db.select().from(budgetCyclesTable).where(eq(budgetCyclesTable.id, cycleId)).limit(1);
    if (!cycle[0]) return 0;
    const totalBudget = parseFloat(cycle[0].totalBudget);
    const allocated = await getTotalAllocatedFrom(null, cycleId);
    return totalBudget - allocated;
  }
  const netReceived   = await getNetAllocated(sectorId, cycleId);
  const distributed   = await getTotalAllocatedFrom(sectorId, cycleId);
  const purchases     = await getTotalApprovedPurchases(sectorId, cycleId);
  return netReceived - distributed - purchases;
}

export async function getUtilizationPct(sectorId: number | null, cycleId: number): Promise<number> {
  if (sectorId === null) {
    const cycle = await db.select().from(budgetCyclesTable).where(eq(budgetCyclesTable.id, cycleId)).limit(1);
    if (!cycle[0]) return 0;
    const totalBudget = parseFloat(cycle[0].totalBudget);
    if (totalBudget === 0) return 0;
    const allocated = await getTotalAllocatedFrom(null, cycleId);
    return Math.min(100, (allocated / totalBudget) * 100);
  }
  const netReceived = await getNetAllocated(sectorId, cycleId);
  if (netReceived === 0) return 0;
  const distributed = await getTotalAllocatedFrom(sectorId, cycleId);
  const purchases   = await getTotalApprovedPurchases(sectorId, cycleId);
  return Math.min(100, ((distributed + purchases) / netReceived) * 100);
}
