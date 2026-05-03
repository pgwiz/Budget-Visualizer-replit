import { Router } from "express";
import { db, sectorControlsTable, sectorsTable, usersTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../lib/auth";

const router = Router();

async function enrich(ctrl: any) {
  const [controlling] = await db.select({ id: sectorsTable.id, name: sectorsTable.name, code: sectorsTable.code })
    .from(sectorsTable).where(eq(sectorsTable.id, ctrl.controllingSectorId)).limit(1);
  const [target] = await db.select({ id: sectorsTable.id, name: sectorsTable.name, code: sectorsTable.code })
    .from(sectorsTable).where(eq(sectorsTable.id, ctrl.targetSectorId)).limit(1);
  const [creator] = await db.select({ id: usersTable.id, name: usersTable.name, role: usersTable.role })
    .from(usersTable).where(eq(usersTable.id, ctrl.createdBy)).limit(1);
  return {
    ...ctrl,
    maxBudgetAmount: ctrl.maxBudgetAmount ? parseFloat(ctrl.maxBudgetAmount) : null,
    maxOrderAmount: ctrl.maxOrderAmount ? parseFloat(ctrl.maxOrderAmount) : null,
    controllingSector: controlling ?? null,
    targetSector: target ?? null,
    createdByUser: creator ?? null,
  };
}

/* ── Can this user manage controls on controllingSectorId? ── */
function canManage(user: any, controllingSectorId: number) {
  if (["super_admin", "ceo"].includes(user.role)) return true;
  if (user.role === "ministry_head" && user.sectorId === controllingSectorId) return true;
  return false;
}

/* List controls — visible to those who control or are targets */
router.get("/sector-controls", requireAuth, async (req, res): Promise<void> => {
  const user = (req as any).user;
  const { controllingSectorId, targetSectorId } = req.query;

  let rows = await db.select().from(sectorControlsTable);

  if (!["super_admin", "ceo"].includes(user.role)) {
    if (user.role === "ministry_head" && user.sectorId) {
      // See controls where they are the controller or where their sector is a target
      rows = rows.filter(r =>
        r.controllingSectorId === user.sectorId || r.targetSectorId === user.sectorId
      );
    } else if (user.sectorId) {
      // dept_head: only see controls targeting their sector
      rows = rows.filter(r => r.targetSectorId === user.sectorId);
    } else {
      rows = [];
    }
  }

  if (controllingSectorId) rows = rows.filter(r => r.controllingSectorId === parseInt(controllingSectorId as string));
  if (targetSectorId) rows = rows.filter(r => r.targetSectorId === parseInt(targetSectorId as string));

  res.json(await Promise.all(rows.map(enrich)));
});

/* Create a control */
router.post("/sector-controls", requireAuth, async (req, res): Promise<void> => {
  const user = (req as any).user;
  const { controllingSectorId, targetSectorId, maxBudgetAmount, maxOrderAmount, allowedCategories, restrictedProductIds, notes } = req.body;

  if (!controllingSectorId || !targetSectorId) {
    res.status(400).json({ error: "Bad Request", message: "controllingSectorId and targetSectorId required" }); return;
  }
  if (!canManage(user, controllingSectorId)) {
    res.status(403).json({ error: "Forbidden", message: "You cannot manage controls for this sector" }); return;
  }

  // Verify target is a child of controlling
  const [target] = await db.select().from(sectorsTable).where(eq(sectorsTable.id, targetSectorId)).limit(1);
  if (!target || target.parentId !== controllingSectorId) {
    res.status(400).json({ error: "Bad Request", message: "Target sector must be a direct child of the controlling sector" }); return;
  }

  // Ensure controlling sector has moderationDown
  const [ctrl] = await db.select().from(sectorsTable).where(eq(sectorsTable.id, controllingSectorId)).limit(1);
  if (!ctrl?.moderationDown && !["super_admin", "ceo"].includes(user.role)) {
    res.status(400).json({ error: "Bad Request", message: "Controlling sector does not have moderation_down enabled" }); return;
  }

  const [created] = await db.insert(sectorControlsTable).values({
    controllingSectorId,
    targetSectorId,
    maxBudgetAmount: maxBudgetAmount ? String(maxBudgetAmount) : null,
    maxOrderAmount: maxOrderAmount ? String(maxOrderAmount) : null,
    allowedCategories: allowedCategories ?? null,
    restrictedProductIds: restrictedProductIds ?? null,
    notes: notes ?? null,
    createdBy: user.id,
    isActive: true,
  }).returning();

  res.status(201).json(await enrich(created));
});

/* Update a control */
router.put("/sector-controls/:id", requireAuth, async (req, res): Promise<void> => {
  const user = (req as any).user;
  const id = parseInt(req.params['id'] as string);

  const [existing] = await db.select().from(sectorControlsTable).where(eq(sectorControlsTable.id, id)).limit(1);
  if (!existing) { res.status(404).json({ error: "Not Found" }); return; }
  if (!canManage(user, existing.controllingSectorId)) {
    res.status(403).json({ error: "Forbidden" }); return;
  }

  const { maxBudgetAmount, maxOrderAmount, allowedCategories, restrictedProductIds, notes, isActive } = req.body;
  const updates: any = { updatedAt: new Date() };
  if (maxBudgetAmount !== undefined) updates.maxBudgetAmount = maxBudgetAmount ? String(maxBudgetAmount) : null;
  if (maxOrderAmount !== undefined) updates.maxOrderAmount = maxOrderAmount ? String(maxOrderAmount) : null;
  if (allowedCategories !== undefined) updates.allowedCategories = allowedCategories;
  if (restrictedProductIds !== undefined) updates.restrictedProductIds = restrictedProductIds;
  if (notes !== undefined) updates.notes = notes;
  if (isActive !== undefined) updates.isActive = isActive;

  const [updated] = await db.update(sectorControlsTable).set(updates).where(eq(sectorControlsTable.id, id)).returning();
  res.json(await enrich(updated));
});

/* Delete a control */
router.delete("/sector-controls/:id", requireAuth, async (req, res): Promise<void> => {
  const user = (req as any).user;
  const id = parseInt(req.params['id'] as string);

  const [existing] = await db.select().from(sectorControlsTable).where(eq(sectorControlsTable.id, id)).limit(1);
  if (!existing) { res.status(404).json({ error: "Not Found" }); return; }
  if (!canManage(user, existing.controllingSectorId)) {
    res.status(403).json({ error: "Forbidden" }); return;
  }

  await db.delete(sectorControlsTable).where(eq(sectorControlsTable.id, id));
  res.json({ message: "Control deleted" });
});

/* Toggle moderationDown on a sector */
router.post("/sectors/:sectorId/moderation-down", requireAuth, async (req, res): Promise<void> => {
  const user = (req as any).user;
  if (!["super_admin", "ceo", "ministry_head"].includes(user.role)) {
    res.status(403).json({ error: "Forbidden" }); return;
  }
  const sectorId = parseInt(req.params['sectorId'] as string);

  // ministry_head can only toggle their own sector
  if (user.role === "ministry_head" && user.sectorId !== sectorId) {
    res.status(403).json({ error: "Forbidden", message: "You can only manage your own sector's moderation setting" }); return;
  }

  const { enabled } = req.body;
  const [updated] = await db.update(sectorsTable)
    .set({ moderationDown: enabled, updatedAt: new Date() })
    .where(eq(sectorsTable.id, sectorId))
    .returning();

  if (!updated) { res.status(404).json({ error: "Not Found" }); return; }
  res.json(updated);
});

export default router;
