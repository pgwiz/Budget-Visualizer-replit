import { Router } from "express";
import { db, productsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../lib/auth";

const router = Router();

function serialize(p: any) {
  return { ...p, unitPrice: parseFloat(p.unitPrice) };
}

/* List products (everyone) */
router.get("/products", requireAuth, async (req, res): Promise<void> => {
  const { category, activeOnly } = req.query;
  let rows = await db.select().from(productsTable).orderBy(productsTable.category, productsTable.sortOrder, productsTable.name);
  if (category) rows = rows.filter((r) => r.category === category);
  if (activeOnly === "true") rows = rows.filter((r) => r.isActive);
  res.json(rows.map(serialize));
});

/* Create product (admin only) */
router.post("/products", requireAuth, async (req, res): Promise<void> => {
  const user = (req as any).user;
  if (user.role !== "super_admin") {
    res.status(403).json({ error: "Forbidden", message: "System Administrator only" }); return;
  }
  const { name, category, unit, unitPrice, description, isActive, sortOrder } = req.body;
  if (!name || !category || !unit || unitPrice == null) {
    res.status(400).json({ error: "Bad Request", message: "name, category, unit, unitPrice required" }); return;
  }
  const [created] = await db.insert(productsTable).values({
    name, category, unit,
    unitPrice: String(unitPrice),
    description: description ?? null,
    isActive: isActive !== false,
    sortOrder: sortOrder ?? 0,
  }).returning();
  res.status(201).json(serialize(created));
});

/* Update product (admin only) */
router.put("/products/:productId", requireAuth, async (req, res): Promise<void> => {
  const user = (req as any).user;
  if (user.role !== "super_admin") {
    res.status(403).json({ error: "Forbidden", message: "System Administrator only" }); return;
  }
  const id = parseInt(req.params['productId'] as string);
  const { name, category, unit, unitPrice, description, isActive, sortOrder } = req.body;
  const existing = await db.select().from(productsTable).where(eq(productsTable.id, id)).limit(1);
  if (!existing[0]) { res.status(404).json({ error: "Not Found" }); return; }
  const [updated] = await db.update(productsTable).set({
    ...(name != null && { name }),
    ...(category != null && { category }),
    ...(unit != null && { unit }),
    ...(unitPrice != null && { unitPrice: String(unitPrice) }),
    ...(description !== undefined && { description }),
    ...(isActive !== undefined && { isActive }),
    ...(sortOrder != null && { sortOrder }),
    updatedAt: new Date(),
  }).where(eq(productsTable.id, id)).returning();
  res.json(serialize(updated));
});

/* Delete product (admin only) */
router.delete("/products/:productId", requireAuth, async (req, res): Promise<void> => {
  const user = (req as any).user;
  if (user.role !== "super_admin") {
    res.status(403).json({ error: "Forbidden", message: "System Administrator only" }); return;
  }
  const id = parseInt(req.params['productId'] as string);
  await db.delete(productsTable).where(eq(productsTable.id, id));
  res.json({ message: "Product deleted" });
});

export default router;
