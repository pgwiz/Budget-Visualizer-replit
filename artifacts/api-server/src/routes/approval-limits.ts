import { Router } from "express";
import { db, approvalLimitsTable, sectorsTable, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth } from "../lib/auth";

const router = Router();

async function enrichLimit(row: any) {
  const [sector] = await db.select({ id: sectorsTable.id, name: sectorsTable.name, code: sectorsTable.code, depth: sectorsTable.depth, parentId: sectorsTable.parentId, responsibleUserId: sectorsTable.responsibleUserId })
    .from(sectorsTable).where(eq(sectorsTable.id, row.sectorId)).limit(1);

  let responsibleUser = null;
  if (sector?.responsibleUserId) {
    const [u] = await db.select({ id: usersTable.id, name: usersTable.name, role: usersTable.role, email: usersTable.email })
      .from(usersTable).where(eq(usersTable.id, sector.responsibleUserId)).limit(1);
    responsibleUser = u ?? null;
  }

  return {
    ...row,
    maxApprovableAmount: parseFloat(row.maxApprovableAmount),
    sector: sector ?? null,
    responsibleUser,
  };
}

/* ── GET /api/approval-limits ──────────────────────────────────── */
router.get("/approval-limits", requireAuth, async (req, res): Promise<void> => {
  const rows = await db.select().from(approvalLimitsTable).orderBy(approvalLimitsTable.sectorId);
  const enriched = await Promise.all(rows.map(enrichLimit));
  res.json(enriched);
});

/* ── POST /api/approval-limits ─────────────────────────────────── */
router.post("/approval-limits", requireAuth, async (req, res): Promise<void> => {
  const user = (req as any).user;
  if (!["super_admin", "ceo"].includes(user.role)) {
    res.status(403).json({ error: "Forbidden", message: "Only administrators can manage approval limits" }); return;
  }
  const { sectorId, maxApprovableAmount, notes } = req.body;
  if (!sectorId || maxApprovableAmount == null || maxApprovableAmount < 0) {
    res.status(400).json({ error: "Bad Request", message: "sectorId and maxApprovableAmount (≥0) required" }); return;
  }

  const existing = await db.select().from(approvalLimitsTable).where(eq(approvalLimitsTable.sectorId, sectorId)).limit(1);
  let row: any;
  if (existing[0]) {
    const [updated] = await db.update(approvalLimitsTable).set({
      maxApprovableAmount: String(maxApprovableAmount),
      notes: notes ?? existing[0].notes,
      updatedAt: new Date(),
    }).where(eq(approvalLimitsTable.sectorId, sectorId)).returning();
    row = updated;
  } else {
    const [created] = await db.insert(approvalLimitsTable).values({
      sectorId,
      maxApprovableAmount: String(maxApprovableAmount),
      notes: notes ?? null,
      createdBy: user.id,
    }).returning();
    row = created;
  }
  res.status(201).json(await enrichLimit(row));
});

/* ── PUT /api/approval-limits/:id ─────────────────────────────── */
router.put("/approval-limits/:id", requireAuth, async (req, res): Promise<void> => {
  const user = (req as any).user;
  if (!["super_admin", "ceo"].includes(user.role)) {
    res.status(403).json({ error: "Forbidden", message: "Only administrators can manage approval limits" }); return;
  }
  const id = parseInt(req.params['id'] as string);
  const { maxApprovableAmount, notes } = req.body;
  if (maxApprovableAmount == null || maxApprovableAmount < 0) {
    res.status(400).json({ error: "Bad Request", message: "maxApprovableAmount (≥0) required" }); return;
  }
  const [updated] = await db.update(approvalLimitsTable).set({
    maxApprovableAmount: String(maxApprovableAmount),
    notes: notes ?? null,
    updatedAt: new Date(),
  }).where(eq(approvalLimitsTable.id, id)).returning();
  if (!updated) { res.status(404).json({ error: "Not Found" }); return; }
  res.json(await enrichLimit(updated));
});

/* ── DELETE /api/approval-limits/:id ──────────────────────────── */
router.delete("/approval-limits/:id", requireAuth, async (req, res): Promise<void> => {
  const user = (req as any).user;
  if (!["super_admin", "ceo"].includes(user.role)) {
    res.status(403).json({ error: "Forbidden", message: "Only administrators can manage approval limits" }); return;
  }
  const id = parseInt(req.params['id'] as string);
  await db.delete(approvalLimitsTable).where(eq(approvalLimitsTable.id, id));
  res.json({ ok: true });
});

export default router;
