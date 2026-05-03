import { Router } from "express";
import {
  db, purchaseOrdersTable, purchaseOrderItemsTable,
  productsTable, sectorsTable, usersTable, sectorControlsTable, approvalLimitsTable,
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

  let sectorControl = null;
  if (sector?.parentId) {
    const controls = await db.select().from(sectorControlsTable)
      .where(and(
        eq(sectorControlsTable.targetSectorId, order.sectorId),
        eq(sectorControlsTable.isActive, true)
      )).limit(1);
    if (controls[0]) {
      sectorControl = {
        ...controls[0],
        maxBudgetAmount: controls[0].maxBudgetAmount ? parseFloat(controls[0].maxBudgetAmount) : null,
        maxOrderAmount: controls[0].maxOrderAmount ? parseFloat(controls[0].maxOrderAmount) : null,
      };
    }
  }

  // Compute who is the required approver for this PO (based on amount + hierarchy limits)
  const requiredApprover = await computeRequiredApprover(order.sectorId, parseFloat(order.totalAmount));

  return {
    ...order,
    totalAmount: parseFloat(order.totalAmount),
    sector: sector ?? null,
    createdByUser: creator ?? null,
    reviewedByUser,
    sectorControl,
    requiredApprover,   // { sector, limit } | null  (null = ceo/super_admin)
    items,
  };
}

/**
 * Walk the ancestor chain (starting from poSectorId's parent) and find
 * the first sector whose approval limit covers the given amount.
 * Returns { sector, limit } or null if ceo/super_admin must approve.
 */
async function computeRequiredApprover(poSectorId: number, amount: number) {
  const allSectors = await db.select().from(sectorsTable);
  const allLimits  = await db.select().from(approvalLimitsTable);

  const sectorMap = new Map(allSectors.map(s => [s.id, s]));
  const limitMap  = new Map(allLimits.map(l => [l.sectorId, l]));

  const poSector = sectorMap.get(poSectorId);
  if (!poSector?.parentId) return null;

  let currentId: number | null = poSector.parentId;
  while (currentId) {
    const sector = sectorMap.get(currentId);
    if (!sector) break;
    const limit = limitMap.get(sector.id);
    if (limit && parseFloat(limit.maxApprovableAmount) >= amount) {
      // Find the responsible user for this sector
      let responsibleUser = null;
      if (sector.responsibleUserId) {
        const [u] = await db.select({ id: usersTable.id, name: usersTable.name, role: usersTable.role })
          .from(usersTable).where(eq(usersTable.id, sector.responsibleUserId)).limit(1);
        responsibleUser = u ?? null;
      }
      return {
        sector: { id: sector.id, name: sector.name, code: sector.code, depth: sector.depth },
        limit: parseFloat(limit.maxApprovableAmount),
        responsibleUser,
      };
    }
    currentId = sector.parentId ?? null;
  }
  return null; // ceo / super_admin must handle
}

async function recomputeTotal(orderId: number) {
  const items = await db.select().from(purchaseOrderItemsTable)
    .where(eq(purchaseOrderItemsTable.orderId, orderId));
  const total = items.reduce((s, i) => s + parseFloat(i.lineTotal), 0);
  await db.update(purchaseOrdersTable)
    .set({ totalAmount: String(total), updatedAt: new Date() })
    .where(eq(purchaseOrdersTable.id, orderId));
}

/** Get all ancestor sector IDs for a given sector (parent, grandparent, ...) */
async function getAncestorIds(sectorId: number): Promise<number[]> {
  const ancestors: number[] = [];
  let current = sectorId;
  for (let depth = 0; depth < 10; depth++) {
    const [sector] = await db.select({ parentId: sectorsTable.parentId }).from(sectorsTable).where(eq(sectorsTable.id, current)).limit(1);
    if (!sector?.parentId) break;
    ancestors.push(sector.parentId);
    current = sector.parentId;
  }
  return ancestors;
}

/** Get all descendant sector IDs (children, grandchildren, ...) */
async function getDescendantIds(sectorId: number): Promise<number[]> {
  const allSectors = await db.select({ id: sectorsTable.id, parentId: sectorsTable.parentId }).from(sectorsTable);
  const descendants: number[] = [];
  const queue = [sectorId];
  while (queue.length) {
    const cur = queue.shift()!;
    const children = allSectors.filter(s => s.parentId === cur).map(s => s.id);
    descendants.push(...children);
    queue.push(...children);
  }
  return descendants;
}

/* ── Routes ──────────────────────────────────────────────────── */

/* List orders */
router.get("/purchase-orders", requireAuth, async (req, res): Promise<void> => {
  const user = (req as any).user;
  const { sectorId, status, cycleId } = req.query;

  let rows = await db.select().from(purchaseOrdersTable).orderBy(purchaseOrdersTable.createdAt);

  if (!["super_admin", "ceo"].includes(user.role)) {
    if (!user.sectorId) { res.json([]); return; }

    if (["ministry_head", "department_head"].includes(user.role)) {
      const descendants = await getDescendantIds(user.sectorId);
      const visibleIds = [user.sectorId, ...descendants];
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

  const [control] = await db.select().from(sectorControlsTable)
    .where(and(eq(sectorControlsTable.targetSectorId, order.sectorId), eq(sectorControlsTable.isActive, true)))
    .limit(1);

  if (control) {
    const total = items.reduce((s, i) => s + parseFloat(i.lineTotal), 0);
    if (control.maxOrderAmount && total > parseFloat(control.maxOrderAmount)) {
      res.status(400).json({
        error: "Control Violation",
        message: `Order total KSh ${total.toLocaleString()} exceeds the maximum order limit of KSh ${parseFloat(control.maxOrderAmount).toLocaleString()} set by your parent sector.`,
      }); return;
    }
    if (control.allowedCategories && Array.isArray(control.allowedCategories)) {
      const allowed = control.allowedCategories as string[];
      for (const item of items) {
        const [product] = await db.select().from(productsTable).where(eq(productsTable.id, item.productId)).limit(1);
        if (product && !allowed.includes(product.category)) {
          res.status(400).json({
            error: "Control Violation",
            message: `Product "${product.name}" (category: ${product.category}) is not in your approved procurement categories: ${allowed.join(", ")}.`,
          }); return;
        }
      }
    }
  }

  const [updated] = await db.update(purchaseOrdersTable)
    .set({ status: "submitted", submittedAt: new Date(), updatedAt: new Date() })
    .where(eq(purchaseOrdersTable.id, id)).returning();
  res.json(await enrichOrder(updated));
});

/* ── Approve / Reject ─────────────────────────────────────────── */
router.post("/purchase-orders/:orderId/review", requireAuth, async (req, res): Promise<void> => {
  const user = (req as any).user;
  // Viewers can never review
  if (user.role === "viewer") {
    res.status(403).json({ error: "Forbidden", message: "Viewers cannot review orders" }); return;
  }

  const id = parseInt(req.params['orderId'] as string);
  const [order] = await db.select().from(purchaseOrdersTable).where(eq(purchaseOrdersTable.id, id)).limit(1);
  if (!order) { res.status(404).json({ error: "Not Found" }); return; }
  if (order.status !== "submitted") {
    res.status(400).json({ error: "Bad Request", message: "Only submitted orders can be reviewed" }); return;
  }

  const poAmount = parseFloat(order.totalAmount);

  // ── Hierarchy + limit enforcement ──
  if (!["super_admin", "ceo"].includes(user.role)) {
    if (!user.sectorId) {
      res.status(403).json({ error: "Forbidden", message: "Your account has no sector assigned" }); return;
    }

    // Cannot approve own sector's POs
    if (order.sectorId === user.sectorId) {
      res.status(403).json({
        error: "Forbidden",
        message: "You cannot approve your own sector's purchase orders. They must be reviewed by your superior.",
      }); return;
    }

    // PO sector must be a descendant of the approver's sector
    const ancestors = await getAncestorIds(order.sectorId);
    if (!ancestors.includes(user.sectorId)) {
      res.status(403).json({
        error: "Forbidden",
        message: "You can only approve purchase orders from sectors within your hierarchy.",
      }); return;
    }

    // Check approval limit for this user's sector
    const [limit] = await db.select().from(approvalLimitsTable)
      .where(eq(approvalLimitsTable.sectorId, user.sectorId)).limit(1);

    if (!limit) {
      res.status(403).json({
        error: "No Approval Authority",
        message: "No approval limit is configured for your sector. Contact an administrator.",
      }); return;
    }

    const maxAmount = parseFloat(limit.maxApprovableAmount);
    if (poAmount > maxAmount) {
      // Find who should actually approve this
      const required = await computeRequiredApprover(order.sectorId, poAmount);
      const escalateTo = required
        ? `Please escalate to ${required.sector.name}.`
        : "Please escalate to the Director General or above.";
      res.status(403).json({
        error: "Approval Limit Exceeded",
        message: `This order (KSh ${poAmount.toLocaleString()}) exceeds your approval authority of KSh ${maxAmount.toLocaleString()}. ${escalateTo}`,
      }); return;
    }
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

  const [control] = await db.select().from(sectorControlsTable)
    .where(and(eq(sectorControlsTable.targetSectorId, order.sectorId), eq(sectorControlsTable.isActive, true)))
    .limit(1);

  if (control?.allowedCategories && Array.isArray(control.allowedCategories)) {
    const allowed = control.allowedCategories as string[];
    if (!allowed.includes(product.category)) {
      res.status(400).json({
        error: "Control Violation",
        message: `Category "${product.category}" is not approved for this sector. Allowed: ${allowed.join(", ")}.`,
      }); return;
    }
  }
  if (control?.restrictedProductIds && Array.isArray(control.restrictedProductIds)) {
    if ((control.restrictedProductIds as number[]).includes(productId)) {
      res.status(400).json({
        error: "Control Violation",
        message: `Product "${product.name}" is restricted by your parent sector's procurement controls.`,
      }); return;
    }
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
