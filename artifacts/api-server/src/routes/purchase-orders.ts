import { Router } from "express";
import {
  db, purchaseOrdersTable, purchaseOrderItemsTable,
  productsTable, sectorsTable, usersTable,
} from "@workspace/db";
import { eq, and, inArray } from "drizzle-orm";
import { requireAuth } from "../lib/auth";

const router = Router();

/* ── Helpers ─────────────────────────────────────────────────── */
async function enrichOrder(order: any) {
  const [sector] = await db.select().from(sectorsTable).where(eq(sectorsTable.id, order.sectorId)).limit(1);
  const [creator] = await db.select({ id: usersTable.id, name: usersTable.name, email: usersTable.email, role: usersTable.role })
    .from(usersTable).where(eq(usersTable.id, order.createdBy)).limit(1);

  let reviewedByUser = null;
  if (order.reviewedBy) {
    const [r] = await db.select({ id: usersTable.id, name: usersTable.name, email: usersTable.email, role: usersTable.role })
      .from(usersTable).where(eq(usersTable.id, order.reviewedBy)).limit(1);
    reviewedByUser = r ?? null;
  }

  const rawItems = await db.select().from(purchaseOrderItemsTable)
    .where(eq(purchaseOrderItemsTable.orderId, order.id));
  const items = await Promise.all(rawItems.map(async (item) => {
    const [product] = await db.select().from(productsTable).where(eq(productsTable.id, item.productId)).limit(1);
    return {
      ...item,
      quantity: parseFloat(item.quantity),
      unitPriceSnapshot: parseFloat(item.unitPriceSnapshot),
      lineTotal: parseFloat(item.lineTotal),
      product: product ? { ...product, unitPrice: parseFloat(product.unitPrice) } : null,
    };
  }));

  return {
    ...order,
    totalAmount: parseFloat(order.totalAmount),
    sector: sector ?? null,
    createdByUser: creator ?? null,
    reviewedByUser,
    items,
  };
}

async function recomputeTotal(orderId: number) {
  const items = await db.select().from(purchaseOrderItemsTable)
    .where(eq(purchaseOrderItemsTable.orderId, orderId));
  const total = items.reduce((s, i) => s + parseFloat(i.lineTotal), 0);
  await db.update(purchaseOrdersTable)
    .set({ totalAmount: String(total), updatedAt: new Date() })
    .where(eq(purchaseOrdersTable.id, orderId));
}

/* ── Routes ──────────────────────────────────────────────────── */

/* List orders */
router.get("/purchase-orders", requireAuth, async (req, res): Promise<void> => {
  const user = (req as any).user;
  const { sectorId, status, cycleId } = req.query;

  let rows = await db.select().from(purchaseOrdersTable).orderBy(purchaseOrdersTable.createdAt);

  // Non-admins only see their own sector's orders
  if (!["super_admin", "ceo"].includes(user.role)) {
    if (!user.sectorId) { res.json([]); return; }
    // Ministry heads see their sector + all child-sector orders
    if (user.role === "ministry_head") {
      const children = await db.select().from(sectorsTable).where(eq(sectorsTable.parentId, user.sectorId));
      const visibleIds = [user.sectorId, ...children.map((c: any) => c.id)];
      rows = rows.filter((r) => visibleIds.includes(r.sectorId));
    } else {
      rows = rows.filter((r) => r.sectorId === user.sectorId);
    }
  }

  if (sectorId) rows = rows.filter((r) => r.sectorId === parseInt(sectorId as string));
  if (status)   rows = rows.filter((r) => r.status === status);
  if (cycleId)  rows = rows.filter((r) => r.budgetCycleId === parseInt(cycleId as string));

  const enriched = await Promise.all(rows.map(enrichOrder));
  res.json(enriched);
});

/* Create draft order */
router.post("/purchase-orders", requireAuth, async (req, res): Promise<void> => {
  const user = (req as any).user;
  if (user.role === "viewer") {
    res.status(403).json({ error: "Forbidden", message: "Viewers cannot create orders" }); return;
  }
  const { sectorId, budgetCycleId, notes } = req.body;
  if (!sectorId || !budgetCycleId) {
    res.status(400).json({ error: "Bad Request", message: "sectorId and budgetCycleId required" }); return;
  }
  const [created] = await db.insert(purchaseOrdersTable).values({
    sectorId, budgetCycleId, notes: notes ?? null,
    createdBy: user.id,
    status: "draft",
    totalAmount: "0",
  }).returning();
  res.status(201).json(await enrichOrder(created));
});

/* Get single order */
router.get("/purchase-orders/:orderId", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(req.params['orderId'] as string);
  const [order] = await db.select().from(purchaseOrdersTable).where(eq(purchaseOrdersTable.id, id)).limit(1);
  if (!order) { res.status(404).json({ error: "Not Found" }); return; }
  res.json(await enrichOrder(order));
});

/* Submit for approval */
router.post("/purchase-orders/:orderId/submit", requireAuth, async (req, res): Promise<void> => {
  const user = (req as any).user;
  const id = parseInt(req.params['orderId'] as string);
  const [order] = await db.select().from(purchaseOrdersTable).where(eq(purchaseOrdersTable.id, id)).limit(1);
  if (!order) { res.status(404).json({ error: "Not Found" }); return; }
  if (order.createdBy !== user.id && !["super_admin", "ceo"].includes(user.role)) {
    res.status(403).json({ error: "Forbidden" }); return;
  }
  if (order.status !== "draft") {
    res.status(400).json({ error: "Bad Request", message: "Only draft orders can be submitted" }); return;
  }
  const items = await db.select().from(purchaseOrderItemsTable).where(eq(purchaseOrderItemsTable.orderId, id));
  if (items.length === 0) {
    res.status(400).json({ error: "Bad Request", message: "Cannot submit an order with no items" }); return;
  }
  const [updated] = await db.update(purchaseOrdersTable)
    .set({ status: "submitted", submittedAt: new Date(), updatedAt: new Date() })
    .where(eq(purchaseOrdersTable.id, id)).returning();
  res.json(await enrichOrder(updated));
});

/* Approve / reject */
router.post("/purchase-orders/:orderId/review", requireAuth, async (req, res): Promise<void> => {
  const user = (req as any).user;
  if (!["super_admin", "ceo", "ministry_head"].includes(user.role)) {
    res.status(403).json({ error: "Forbidden", message: "Only controlling officers can review orders" }); return;
  }
  const id = parseInt(req.params['orderId'] as string);
  const [order] = await db.select().from(purchaseOrdersTable).where(eq(purchaseOrdersTable.id, id)).limit(1);
  if (!order) { res.status(404).json({ error: "Not Found" }); return; }
  if (order.status !== "submitted") {
    res.status(400).json({ error: "Bad Request", message: "Only submitted orders can be reviewed" }); return;
  }
  const { action, rejectionReason } = req.body;
  if (!["approve", "reject"].includes(action)) {
    res.status(400).json({ error: "Bad Request", message: "action must be approve or reject" }); return;
  }
  if (action === "reject" && !rejectionReason) {
    res.status(400).json({ error: "Bad Request", message: "rejectionReason required for rejection" }); return;
  }
  const [updated] = await db.update(purchaseOrdersTable).set({
    status: action === "approve" ? "approved" : "rejected",
    reviewedBy: user.id,
    reviewedAt: new Date(),
    rejectionReason: action === "reject" ? rejectionReason : null,
    updatedAt: new Date(),
  }).where(eq(purchaseOrdersTable.id, id)).returning();
  res.json(await enrichOrder(updated));
});

/* Add item to draft order */
router.post("/purchase-orders/:orderId/items", requireAuth, async (req, res): Promise<void> => {
  const user = (req as any).user;
  const id = parseInt(req.params['orderId'] as string);
  const [order] = await db.select().from(purchaseOrdersTable).where(eq(purchaseOrdersTable.id, id)).limit(1);
  if (!order) { res.status(404).json({ error: "Not Found" }); return; }
  if (order.status !== "draft") {
    res.status(400).json({ error: "Bad Request", message: "Can only edit draft orders" }); return;
  }
  if (order.createdBy !== user.id && !["super_admin", "ceo"].includes(user.role)) {
    res.status(403).json({ error: "Forbidden" }); return;
  }
  const { productId, quantity, notes } = req.body;
  if (!productId || !quantity || quantity <= 0) {
    res.status(400).json({ error: "Bad Request", message: "productId and positive quantity required" }); return;
  }
  const [product] = await db.select().from(productsTable).where(eq(productsTable.id, productId)).limit(1);
  if (!product || !product.isActive) {
    res.status(404).json({ error: "Not Found", message: "Product not found or inactive" }); return;
  }
  const unitPrice = parseFloat(product.unitPrice);
  const lineTotal = unitPrice * quantity;
  await db.insert(purchaseOrderItemsTable).values({
    orderId: id, productId,
    quantity: String(quantity),
    unitPriceSnapshot: String(unitPrice),
    lineTotal: String(lineTotal),
    notes: notes ?? null,
  });
  await recomputeTotal(id);
  const [refreshed] = await db.select().from(purchaseOrdersTable).where(eq(purchaseOrdersTable.id, id)).limit(1);
  res.status(201).json(await enrichOrder(refreshed));
});

/* Remove item from draft order */
router.delete("/purchase-orders/:orderId/items/:itemId", requireAuth, async (req, res): Promise<void> => {
  const user = (req as any).user;
  const orderId = parseInt(req.params['orderId'] as string);
  const itemId  = parseInt(req.params['itemId'] as string);
  const [order] = await db.select().from(purchaseOrdersTable).where(eq(purchaseOrdersTable.id, orderId)).limit(1);
  if (!order) { res.status(404).json({ error: "Not Found" }); return; }
  if (order.status !== "draft") {
    res.status(400).json({ error: "Bad Request", message: "Can only edit draft orders" }); return;
  }
  if (order.createdBy !== user.id && !["super_admin", "ceo"].includes(user.role)) {
    res.status(403).json({ error: "Forbidden" }); return;
  }
  await db.delete(purchaseOrderItemsTable)
    .where(and(eq(purchaseOrderItemsTable.id, itemId), eq(purchaseOrderItemsTable.orderId, orderId)));
  await recomputeTotal(orderId);
  const [refreshed] = await db.select().from(purchaseOrdersTable).where(eq(purchaseOrdersTable.id, orderId)).limit(1);
  res.json(await enrichOrder(refreshed));
});

export default router;
