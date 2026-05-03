import { Router } from "express";
import {
  db, auditLogsTable, usersTable, sectorsTable,
  allocationsTable, budgetCyclesTable,
  purchaseOrdersTable, purchaseOrderItemsTable,
} from "@workspace/db";
import { eq, and, sql, desc, gte, lte } from "drizzle-orm";
import { requireAuth } from "../lib/auth";
import { getTotalAllocated, getTotalRevoked, getAvailableBalance, getUtilizationPct } from "../lib/budget-calc";

const router = Router();

/* ── Shared lookup builders ───────────────────────────────────── */
async function buildSectorMap(): Promise<Map<number, string>> {
  const rows = await db.select({ id: sectorsTable.id, name: sectorsTable.name }).from(sectorsTable);
  return new Map(rows.map(r => [r.id, r.name]));
}

async function buildUserMap(): Promise<Map<number, string>> {
  const rows = await db.select({ id: usersTable.id, name: usersTable.name }).from(usersTable);
  return new Map(rows.map(r => [r.id, r.name]));
}

/** Get all descendant sector IDs (inclusive) */
async function getSubtreeIds(rootId: number): Promise<number[]> {
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

/** Convert raw meta JSON to a human-readable string */
function prettifyMeta(
  meta: any,
  sectorMap: Map<number, string>,
  userMap: Map<number, string>,
): string {
  if (!meta) return '—';
  if (typeof meta === 'string') return meta;

  const labels: Record<string, string> = {
    toSectorId: 'To Sector', fromSectorId: 'From Sector', sectorId: 'Sector',
    userId: 'User', allocatedBy: 'Allocated By', reviewedBy: 'Reviewed By',
    amount: 'Amount', comment: 'Comment', status: 'Status',
    productId: 'Product', orderId: 'Order #', cycleId: 'Cycle',
    name: 'Name', email: 'Email', role: 'Role',
  };

  const parts: string[] = [];
  for (const [k, v] of Object.entries(meta as Record<string, any>)) {
    const label = labels[k] ?? k;
    let value: string;
    if (['toSectorId', 'fromSectorId', 'sectorId'].includes(k) && typeof v === 'number') {
      value = sectorMap.get(v) ?? `Sector #${v}`;
    } else if (['userId', 'allocatedBy', 'reviewedBy'].includes(k) && typeof v === 'number') {
      value = userMap.get(v) ?? `User #${v}`;
    } else if (k === 'amount' && typeof v === 'number') {
      value = `KSh ${v.toLocaleString('en-KE')}`;
    } else {
      value = String(v);
    }
    parts.push(`${label}: ${value}`);
  }
  return parts.join('  ·  ') || '—';
}

/* ── Audit Log ────────────────────────────────────────────────── */
router.get("/reports/audit-log", requireAuth, async (req, res): Promise<void> => {
  const { limit = "100", offset = "0", from, to } = req.query;
  const lim = Math.min(parseInt(limit as string), 500);
  const off = parseInt(offset as string);

  let query = db.select().from(auditLogsTable).orderBy(desc(auditLogsTable.createdAt)).$dynamic();
  if (from) query = query.where(gte(auditLogsTable.createdAt, new Date(from as string)));
  if (to)   query = query.where(lte(auditLogsTable.createdAt, new Date(to as string)));
  const logs = await query.limit(lim).offset(off);

  const total = Number((await db.select({ c: sql<number>`COUNT(*)` }).from(auditLogsTable))[0]?.c ?? 0);

  const [sectorMap, userMap] = await Promise.all([buildSectorMap(), buildUserMap()]);

  const enriched = logs.map(log => ({
    ...log,
    userName:      userMap.get(log.userId) ?? 'Unknown',
    detailsText:   prettifyMeta(log.meta, sectorMap, userMap),
    meta:          log.meta,
  }));

  res.json({ items: enriched, total, offset: off, limit: lim });
});

/* ── Sector Breakdown ─────────────────────────────────────────── */
router.get("/reports/sector-breakdown", requireAuth, async (req, res): Promise<void> => {
  const cycleIdParam = req.query.cycleId ? parseInt(req.query.cycleId as string) : null;
  const rootSectorId = req.query.sectorId ? parseInt(req.query.sectorId as string) : null;

  let cycleId = cycleIdParam;
  if (!cycleId) {
    const active = await db.select().from(budgetCyclesTable).where(eq(budgetCyclesTable.isActive, true)).limit(1);
    cycleId = active[0]?.id ?? null;
  }

  let sectors = await db.select().from(sectorsTable).orderBy(sectorsTable.depth, sectorsTable.name);
  if (rootSectorId) {
    const subtreeIds = await getSubtreeIds(rootSectorId);
    sectors = sectors.filter(s => subtreeIds.includes(s.id));
  }

  const userMap = await buildUserMap();
  const sectorMap = new Map(sectors.map(s => [s.id, s.name]));

  const result = await Promise.all(sectors.map(async s => {
    const ta    = cycleId ? await getTotalAllocated(s.id, cycleId) : 0;
    const tr    = cycleId ? await getTotalRevoked(s.id, cycleId) : 0;
    const avail = cycleId ? await getAvailableBalance(s.id, cycleId) : 0;
    const pct   = cycleId ? await getUtilizationPct(s.id, cycleId) : 0;
    const cnt   = cycleId
      ? Number((await db.select({ c: sql<number>`COUNT(*)` }).from(allocationsTable).where(
          and(eq(allocationsTable.toSectorId, s.id), eq(allocationsTable.budgetCycleId, cycleId!))
        ))[0]?.c ?? 0)
      : 0;

    return {
      sectorId: s.id, sectorName: s.name, sectorCode: s.code, depth: s.depth,
      parentName: s.parentId ? (sectorMap.get(s.parentId) ?? null) : null,
      responsibleUser: s.responsibleUserId ? (userMap.get(s.responsibleUserId) ?? null) : null,
      totalAllocated: ta, totalRevoked: tr, netAllocated: ta - tr,
      availableBalance: avail, utilizationPct: pct, allocationCount: cnt,
    };
  }));

  res.json(result);
});

/* ── Allocation History ───────────────────────────────────────── */
router.get("/reports/allocations", requireAuth, async (req, res): Promise<void> => {
  const { cycleId, sectorId, status } = req.query;

  let rows = await db.select().from(allocationsTable).orderBy(desc(allocationsTable.allocatedAt));

  if (cycleId)  rows = rows.filter(r => r.budgetCycleId === parseInt(cycleId as string));
  if (status)   rows = rows.filter(r => r.status === status);

  let subtreeIds: number[] | null = null;
  if (sectorId) {
    subtreeIds = await getSubtreeIds(parseInt(sectorId as string));
    rows = rows.filter(r => subtreeIds!.includes(r.toSectorId));
  }

  const [sectorMap, userMap] = await Promise.all([buildSectorMap(), buildUserMap()]);

  const cycles = await db.select().from(budgetCyclesTable);
  const cycleMap = new Map(cycles.map(c => [c.id, c.name]));

  const enriched = rows.map(r => ({
    id: r.id,
    date: r.allocatedAt,
    cycle: cycleMap.get(r.budgetCycleId) ?? `Cycle #${r.budgetCycleId}`,
    fromSector: r.fromSectorId ? (sectorMap.get(r.fromSectorId) ?? `Sector #${r.fromSectorId}`) : 'National Pool',
    toSector: sectorMap.get(r.toSectorId) ?? `Sector #${r.toSectorId}`,
    toSectorId: r.toSectorId,
    allocatedBy: userMap.get(r.allocatedBy) ?? `User #${r.allocatedBy}`,
    amount: parseFloat(r.amount),
    status: r.status,
    comment: r.comment ?? '',
  }));

  res.json(enriched);
});

/* ── Procurement Report ───────────────────────────────────────── */
router.get("/reports/procurement", requireAuth, async (req, res): Promise<void> => {
  const { sectorId, status, cycleId } = req.query;

  let rows = await db.select().from(purchaseOrdersTable).orderBy(desc(purchaseOrdersTable.createdAt));

  if (status)  rows = rows.filter(r => r.status === status);
  if (cycleId) rows = rows.filter(r => r.budgetCycleId === parseInt(cycleId as string));

  let subtreeIds: number[] | null = null;
  if (sectorId) {
    subtreeIds = await getSubtreeIds(parseInt(sectorId as string));
    rows = rows.filter(r => subtreeIds!.includes(r.sectorId));
  }

  const [sectorMap, userMap] = await Promise.all([buildSectorMap(), buildUserMap()]);

  const enriched = await Promise.all(rows.map(async r => {
    const items = await db.select({ c: sql<number>`COUNT(*)` })
      .from(purchaseOrderItemsTable).where(eq(purchaseOrderItemsTable.orderId, r.id));
    return {
      id: r.id,
      date: r.createdAt,
      sector: sectorMap.get(r.sectorId) ?? `Sector #${r.sectorId}`,
      sectorId: r.sectorId,
      createdBy: userMap.get(r.createdBy) ?? `User #${r.createdBy}`,
      status: r.status,
      totalAmount: parseFloat(r.totalAmount),
      itemCount: Number(items[0]?.c ?? 0),
      submittedAt: r.submittedAt,
      reviewedBy: r.reviewedBy ? (userMap.get(r.reviewedBy) ?? `User #${r.reviewedBy}`) : null,
      reviewedAt: r.reviewedAt,
      rejectionReason: r.rejectionReason,
      notes: r.notes,
    };
  }));

  res.json(enriched);
});

export default router;
