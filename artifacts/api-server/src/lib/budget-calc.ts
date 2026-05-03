import { db, allocationsTable, budgetCyclesTable, purchaseOrdersTable, sectorsTable } from "@workspace/db";
import { eq, and, inArray, sql } from "drizzle-orm";

/** Returns all descendant sector IDs (inclusive of the root) */
export async function getSubtreeIds(rootId: number): Promise<number[]> {
  const all = await db.select({ id: sectorsTable.id, parentId: sectorsTable.parentId }).from(sectorsTable);
  const ids: number[] = [rootId];
  const queue = [rootId];
  while (queue.length) {
    const cur = queue.shift()!;
    const children = all.filter(s => s.parentId === cur).map(s => s.id);
    ids.push(...children);
    queue.push(...children);
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

export async function getTotalAllocated(sectorId: number, cycleId: number): Promise<number> {
  const result = await db
    .select({ total: sql<string>`COALESCE(SUM(amount), 0)` })
    .from(allocationsTable)
    .where(
      and(
        eq(allocationsTable.toSectorId, sectorId),
        eq(allocationsTable.budgetCycleId, cycleId),
        inArray(allocationsTable.status, ["active", "pending", "exhausted"])
      )
    );
  return parseFloat(result[0]?.total ?? "0");
}

export async function getTotalRevoked(sectorId: number, cycleId: number): Promise<number> {
  const result = await db
    .select({ total: sql<string>`COALESCE(SUM(amount), 0)` })
    .from(allocationsTable)
    .where(
      and(
        eq(allocationsTable.toSectorId, sectorId),
        eq(allocationsTable.budgetCycleId, cycleId),
        eq(allocationsTable.status, "revoked")
      )
    );
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
    // "From root" = allocations originating from top-level sectors (parentId IS NULL)
    const roots = await db.select({ id: sectorsTable.id }).from(sectorsTable).where(sql`${sectorsTable.parentId} IS NULL`);
    const rootIds = roots.map(r => r.id);
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

/* Sum of approved purchase orders for a sector in a cycle */
export async function getTotalApprovedPurchases(sectorId: number, cycleId: number): Promise<number> {
  const result = await db
    .select({ total: sql<string>`COALESCE(SUM(total_amount), 0)` })
    .from(purchaseOrdersTable)
    .where(
      and(
        eq(purchaseOrdersTable.sectorId, sectorId),
        eq(purchaseOrdersTable.budgetCycleId, cycleId),
        eq(purchaseOrdersTable.status, "approved")
      )
    );
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
