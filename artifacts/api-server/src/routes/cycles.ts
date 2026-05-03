import { Router } from "express";
import { db, budgetCyclesTable, allocationsTable } from "@workspace/db";
import { eq, sql, and, inArray } from "drizzle-orm";
import { requireAuth, requireRole } from "../lib/auth";

const router = Router();

async function enrichCycle(cycle: any) {
  const totalAllocResult = await db
    .select({ total: sql<string>`COALESCE(SUM(amount), 0)` })
    .from(allocationsTable)
    .where(and(eq(allocationsTable.budgetCycleId, cycle.id), inArray(allocationsTable.status, ["active", "pending", "exhausted"])));
  const totalRevokedResult = await db
    .select({ total: sql<string>`COALESCE(SUM(amount), 0)` })
    .from(allocationsTable)
    .where(and(eq(allocationsTable.budgetCycleId, cycle.id), eq(allocationsTable.status, "revoked")));
  const totalAllocated = parseFloat(totalAllocResult[0]?.total ?? "0");
  const totalRevoked = parseFloat(totalRevokedResult[0]?.total ?? "0");
  const totalBudget = parseFloat(cycle.totalBudget);
  const availableBalance = totalBudget - totalAllocated;
  const utilizationPct = totalBudget > 0 ? Math.min(100, (totalAllocated / totalBudget) * 100) : 0;
  return { ...cycle, totalBudget, totalAllocated, totalRevoked, availableBalance, utilizationPct };
}

router.get("/cycles", requireAuth, async (req, res): Promise<void> => {
  const cycles = await db.select().from(budgetCyclesTable).orderBy(budgetCyclesTable.startDate);
  const enriched = await Promise.all(cycles.map(enrichCycle));
  res.json(enriched);
});

router.get("/cycles/active", requireAuth, async (req, res): Promise<void> => {
  const cycles = await db.select().from(budgetCyclesTable).where(eq(budgetCyclesTable.isActive, true)).limit(1);
  if (!cycles[0]) { res.status(404).json({ error: "No active cycle" }); return; }
  res.json(await enrichCycle(cycles[0]));
});

router.post("/cycles", requireAuth, requireRole("super_admin"), async (req, res): Promise<void> => {
  const { name, totalBudget, startDate, endDate, isActive } = req.body;
  if (!name || !totalBudget || !startDate || !endDate) {
    res.status(400).json({ error: "Bad Request", message: "Missing required fields" }); return;
  }
  const user = (req as any).user;
  const [created] = await db.insert(budgetCyclesTable).values({
    name, totalBudget: String(totalBudget), startDate, endDate,
    isActive: isActive ?? false, createdBy: user.id,
  }).returning();
  res.status(201).json(await enrichCycle(created));
});

router.put("/cycles/:cycleId", requireAuth, requireRole("super_admin"), async (req, res): Promise<void> => {
  const cycleId = parseInt(req.params.cycleId);
  const { name, totalBudget, startDate, endDate, isActive } = req.body;
  const updates: any = { updatedAt: new Date() };
  if (name != null) updates.name = name;
  if (totalBudget != null) updates.totalBudget = String(totalBudget);
  if (startDate != null) updates.startDate = startDate;
  if (endDate != null) updates.endDate = endDate;
  if (isActive != null) updates.isActive = isActive;
  const [updated] = await db.update(budgetCyclesTable).set(updates).where(eq(budgetCyclesTable.id, cycleId)).returning();
  if (!updated) { res.status(404).json({ error: "Not Found" }); return; }
  res.json(await enrichCycle(updated));
});

router.post("/cycles/:cycleId/activate", requireAuth, requireRole("super_admin"), async (req, res): Promise<void> => {
  const cycleId = parseInt(req.params.cycleId);
  await db.update(budgetCyclesTable).set({ isActive: false });
  const [activated] = await db.update(budgetCyclesTable).set({ isActive: true }).where(eq(budgetCyclesTable.id, cycleId)).returning();
  if (!activated) { res.status(404).json({ error: "Not Found" }); return; }
  res.json(await enrichCycle(activated));
});

export default router;
