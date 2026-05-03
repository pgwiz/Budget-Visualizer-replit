import { db, allocationsTable, budgetCyclesTable } from "@workspace/db";
import { eq, and, inArray, sql } from "drizzle-orm";

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
  const whereClause = sectorId === null
    ? and(eq(allocationsTable.budgetCycleId, cycleId), sql`${allocationsTable.fromSectorId} IS NULL`, inArray(allocationsTable.status, ["active", "pending", "exhausted"]))
    : and(eq(allocationsTable.fromSectorId, sectorId), eq(allocationsTable.budgetCycleId, cycleId), inArray(allocationsTable.status, ["active", "pending", "exhausted"]));
  const result = await db
    .select({ total: sql<string>`COALESCE(SUM(amount), 0)` })
    .from(allocationsTable)
    .where(whereClause);
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
  const netReceived = await getNetAllocated(sectorId, cycleId);
  const distributed = await getTotalAllocatedFrom(sectorId, cycleId);
  return netReceived - distributed;
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
  return Math.min(100, (distributed / netReceived) * 100);
}
