import { Router } from "express";
import {
  db, auditLogsTable, usersTable, sectorsTable,
  allocationsTable, budgetCyclesTable,
  purchaseOrdersTable, purchaseOrderItemsTable,
} from "@workspace/db";
import { eq, and, sql, desc, gte, lte, inArray } from "drizzle-orm";
import { requireAuth } from "../lib/auth";
import {
  getBatchAllocStats, getBatchDistributedStats, getBatchPurchaseStats, getBatchAllocCount,
  getSubtreeIds, getUserScopeId,
} from "../lib/budget-calc";

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

function prettifyMeta(meta: any, sectorMap: Map<number, string>, userMap: Map<number, string>): string {
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
  const user = (req as any).user;
  const { limit = "100", offset = "0", from, to } = req.query;
  const lim = Math.min(parseInt(limit as string), 500);
  const off = parseInt(offset as string);

  let query = db.select().from(auditLogsTable).orderBy(desc(auditLogsTable.createdAt)).$dynamic();
  if (from) query = query.where(gte(auditLogsTable.createdAt, new Date(from as string)));
  if (to)   query = query.where(lte(auditLogsTable.createdAt, new Date(to as string)));

  const scopeSectorId = getUserScopeId(user);
  const rawLogs = await query.limit(scopeSectorId !== null ? 500 : lim).offset(scopeSectorId !== null ? 0 : off);

  const total = Number((await db.select({ c: sql<number>`COUNT(*)` }).from(auditLogsTable))[0]?.c ?? 0);
  const [sectorMap, userMap] = await Promise.all([buildSectorMap(), buildUserMap()]);

  let enriched = rawLogs.map(log => ({
    ...log,
    userName:    userMap.get(log.userId) ?? 'Unknown',
    detailsText: prettifyMeta(log.meta, sectorMap, userMap),
    meta:        log.meta,
  }));

  if (scopeSectorId !== null) {
    const subtreeIds = await getSubtreeIds(scopeSectorId);
    const subtreeSet = new Set(subtreeIds);
    enriched = enriched.filter(log => {
      const m = log.meta as any;
      return (
        (m?.toSectorId   != null && subtreeSet.has(m.toSectorId))   ||
        (m?.sectorId     != null && subtreeSet.has(m.sectorId))      ||
        (m?.fromSectorId != null && subtreeSet.has(m.fromSectorId))  ||
        log.userId === user.id
      );
    });
  }

  const paged = enriched.slice(off, off + lim);
  res.json({ items: paged, total: scopeSectorId !== null ? enriched.length : total, offset: off, limit: lim });
});

/* ── Sector Breakdown — O(5 queries total regardless of sector count) ─ */

// In-memory cache: 2-minute TTL per user×cycle×root
const breakdownCache = new Map<string, { data: any[]; ts: number }>();
const BREAKDOWN_TTL = 2 * 60 * 1000;

router.get("/reports/sector-breakdown", requireAuth, async (req, res): Promise<void> => {
  const user = (req as any).user;
  const cycleIdParam      = req.query.cycleId  ? parseInt(req.query.cycleId  as string) : null;
  const rootSectorIdParam = req.query.sectorId ? parseInt(req.query.sectorId as string) : null;

  const scopeSectorId = getUserScopeId(user);
  const rootSectorId  = rootSectorIdParam ?? scopeSectorId;

  let cycleId = cycleIdParam;
  if (!cycleId) {
    const active = await db
      .select({ id: budgetCyclesTable.id })
      .from(budgetCyclesTable)
      .where(eq(budgetCyclesTable.isActive, true))
      .limit(1);
    cycleId = active[0]?.id ?? null;
  }

  const cacheKey = `bd:${user.id}:${cycleId}:${rootSectorId ?? 'all'}`;
  const cached = breakdownCache.get(cacheKey);
  if (cached && Date.now() - cached.ts < BREAKDOWN_TTL) {
    res.set('X-Cache', 'HIT');
    res.json(cached.data);
    return;
  }
  res.set('X-Cache', 'MISS');

  // 1. Fetch sector list
  let sectors = await db.select().from(sectorsTable).orderBy(sectorsTable.depth, sectorsTable.name);
  if (rootSectorId !== null) {
    const subtreeIds = await getSubtreeIds(rootSectorId);
    const subtreeSet = new Set(subtreeIds);
    sectors = sectors.filter(s => subtreeSet.has(s.id));
  }

  const sectorIds   = sectors.map(s => s.id);
  const sectorMap   = new Map(sectors.map(s => [s.id, s.name]));

  // 2. Four parallel batch queries — replaces N×5 individual DB calls
  const [userMap, allocStats, distributedStats, purchaseStats, allocCounts] = await Promise.all([
    buildUserMap(),
    cycleId ? getBatchAllocStats(sectorIds, cycleId)       : Promise.resolve(new Map()),
    cycleId ? getBatchDistributedStats(sectorIds, cycleId) : Promise.resolve(new Map()),
    cycleId ? getBatchPurchaseStats(sectorIds, cycleId)    : Promise.resolve(new Map()),
    cycleId ? getBatchAllocCount(sectorIds, cycleId)       : Promise.resolve(new Map()),
  ]);

  // 3. Build result in-memory — zero additional DB calls
  const result = sectors.map(s => {
    const alloc       = allocStats.get(s.id)       ?? { allocated: 0, revoked: 0 };
    const distributed = distributedStats.get(s.id) ?? 0;
    const purchases   = purchaseStats.get(s.id)    ?? 0;
    const netReceived      = alloc.allocated - alloc.revoked;
    const availableBalance = netReceived - distributed - purchases;
    const utilizationPct   = netReceived > 0
      ? Math.min(100, ((distributed + purchases) / netReceived) * 100)
      : 0;
    return {
      sectorId:        s.id,
      sectorName:      s.name,
      sectorCode:      s.code,
      depth:           s.depth,
      parentName:      s.parentId ? (sectorMap.get(s.parentId) ?? null) : null,
      responsibleUser: s.responsibleUserId ? (userMap.get(s.responsibleUserId) ?? null) : null,
      totalAllocated:  alloc.allocated,
      totalRevoked:    alloc.revoked,
      netAllocated:    netReceived,
      availableBalance,
      utilizationPct,
      allocationCount: allocCounts.get(s.id) ?? 0,
    };
  });

  breakdownCache.set(cacheKey, { data: result, ts: Date.now() });
  res.set('Cache-Control', 'private, max-age=120');
  res.json(result);
});

/* ── Allocation History ───────────────────────────────────────── */
router.get("/reports/allocations", requireAuth, async (req, res): Promise<void> => {
  const user = (req as any).user;
  const { cycleId, sectorId, status } = req.query;

  const scopeSectorId = getUserScopeId(user);
  const effectiveRootId = sectorId ? parseInt(sectorId as string) : scopeSectorId;

  let rows = await db.select().from(allocationsTable).orderBy(desc(allocationsTable.allocatedAt));

  if (cycleId) rows = rows.filter(r => r.budgetCycleId === parseInt(cycleId as string));
  if (status)  rows = rows.filter(r => r.status === status);

  if (effectiveRootId !== null) {
    const subtreeIds = await getSubtreeIds(effectiveRootId);
    const subtreeSet = new Set(subtreeIds);
    rows = rows.filter(r => subtreeSet.has(r.toSectorId));
  }

  const [sectorMap, userMap] = await Promise.all([buildSectorMap(), buildUserMap()]);
  const cycles = await db.select().from(budgetCyclesTable);
  const cycleMap = new Map(cycles.map(c => [c.id, c.name]));

  const enriched = rows.map(r => ({
    id:          r.id,
    date:        r.allocatedAt,
    cycle:       cycleMap.get(r.budgetCycleId) ?? `Cycle #${r.budgetCycleId}`,
    fromSector:  r.fromSectorId ? (sectorMap.get(r.fromSectorId) ?? `Sector #${r.fromSectorId}`) : 'National Pool',
    toSector:    sectorMap.get(r.toSectorId) ?? `Sector #${r.toSectorId}`,
    toSectorId:  r.toSectorId,
    allocatedBy: userMap.get(r.allocatedBy) ?? `User #${r.allocatedBy}`,
    amount:      parseFloat(r.amount),
    status:      r.status,
    comment:     r.comment ?? '',
  }));

  res.json(enriched);
});

/* ── Procurement Report ───────────────────────────────────────── */
router.get("/reports/procurement", requireAuth, async (req, res): Promise<void> => {
  const user = (req as any).user;
  const { sectorId, status, cycleId } = req.query;

  const scopeSectorId   = getUserScopeId(user);
  const effectiveRootId = sectorId ? parseInt(sectorId as string) : scopeSectorId;

  let rows = await db.select().from(purchaseOrdersTable).orderBy(desc(purchaseOrdersTable.createdAt));

  if (status)  rows = rows.filter(r => r.status === status);
  if (cycleId) rows = rows.filter(r => r.budgetCycleId === parseInt(cycleId as string));

  if (effectiveRootId !== null) {
    const subtreeIds = await getSubtreeIds(effectiveRootId);
    const subtreeSet = new Set(subtreeIds);
    rows = rows.filter(r => subtreeSet.has(r.sectorId));
  }

  const [sectorMap, userMap] = await Promise.all([buildSectorMap(), buildUserMap()]);

  // Batch item counts — one query for all orders instead of N
  const orderIds = rows.map(r => r.id);
  let itemCountMap = new Map<number, number>();
  if (orderIds.length > 0) {
    const itemRows = await db
      .select({ orderId: purchaseOrderItemsTable.orderId, count: sql<number>`COUNT(*)` })
      .from(purchaseOrderItemsTable)
      .where(inArray(purchaseOrderItemsTable.orderId, orderIds))
      .groupBy(purchaseOrderItemsTable.orderId);
    itemCountMap = new Map(itemRows.map(r => [r.orderId, Number(r.count)]));
  }

  const enriched = rows.map(r => ({
    id:              r.id,
    date:            r.createdAt,
    sector:          sectorMap.get(r.sectorId) ?? `Sector #${r.sectorId}`,
    sectorId:        r.sectorId,
    createdBy:       userMap.get(r.createdBy) ?? `User #${r.createdBy}`,
    status:          r.status,
    totalAmount:     parseFloat(r.totalAmount),
    itemCount:       itemCountMap.get(r.id) ?? 0,
    submittedAt:     r.submittedAt,
    reviewedBy:      r.reviewedBy ? (userMap.get(r.reviewedBy) ?? `User #${r.reviewedBy}`) : null,
    reviewedAt:      r.reviewedAt,
    rejectionReason: r.rejectionReason,
    notes:           r.notes,
  }));

  res.json(enriched);
});

export default router;
