import { Router } from "express";
import { db, sectorsTable, allocationsTable, budgetCyclesTable, purchaseOrdersTable, purchaseOrderItemsTable } from "@workspace/db";
import { eq, and, desc, sql } from "drizzle-orm";

const router = Router();

/* ── 5-minute in-memory cache ──────────────────────────────── */
let cachedSummary: any = null;
let cachedAt: number   = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/* ── Simple per-IP rate limiter (60/min) ────────────────────── */
const ipHits = new Map<string, { count: number; resetAt: number }>();
function rateLimit(req: any, res: any, next: any) {
  const ip = req.ip ?? "unknown";
  const now = Date.now();
  const entry = ipHits.get(ip);
  if (!entry || now > entry.resetAt) {
    ipHits.set(ip, { count: 1, resetAt: now + 60_000 });
    return next();
  }
  if (entry.count >= 60) {
    res.status(429).json({ error: "Too Many Requests", message: "Max 60 requests/minute" });
    return;
  }
  entry.count++;
  next();
}

/* ─────────────────────────────────────────────────────────────
   GET /api/public/summary
   No auth required. Cached 5 minutes. Rate-limited 60/min/IP.
   Zero PII exposed.
───────────────────────────────────────────────────────────── */
router.get("/public/summary", rateLimit, async (_req, res): Promise<void> => {
  try {
    // Serve cache if fresh
    if (cachedSummary && Date.now() - cachedAt < CACHE_TTL) {
      res.json(cachedSummary);
      return;
    }

    // Get active budget cycle
    const [cycle] = await db
      .select()
      .from(budgetCyclesTable)
      .where(eq(budgetCyclesTable.isActive, true))
      .limit(1);

    if (!cycle) {
      res.json({
        totalBudget: 0, totalAllocated: 0, totalUtilised: 0,
        remainingBalance: 0, allocationPercent: 0, utilisationPercent: 0,
        lastUpdated: new Date().toISOString(), financialYear: "N/A",
        topSectors: [], allSectors: [], recentProcurement: [], monthlyUtilisation: [],
      });
      return;
    }

    const totalBudget = parseFloat(cycle.totalBudget);
    const cycleId = cycle.id;

    // All active allocations for this cycle
    const allAllocs = await db
      .select()
      .from(allocationsTable)
      .where(and(
        eq(allocationsTable.budgetCycleId, cycleId),
        eq(allocationsTable.status, "active"),
      ));

    const totalAllocated = allAllocs.reduce((s, a) => s + parseFloat(a.amount), 0);

    // All approved POs for utilisation
    const approvedPOs = await db
      .select({ totalAmount: purchaseOrdersTable.totalAmount, sectorId: purchaseOrdersTable.sectorId })
      .from(purchaseOrdersTable)
      .where(and(
        eq(purchaseOrdersTable.budgetCycleId, cycleId),
        eq(purchaseOrdersTable.status, "approved"),
      ));

    const totalUtilised = approvedPOs.reduce((s, p) => s + parseFloat(p.totalAmount), 0);
    const remainingBalance = totalBudget - totalAllocated;

    // All sectors (no PII)
    const allSectors = await db.select({
      id:         sectorsTable.id,
      name:       sectorsTable.name,
      code:       sectorsTable.code,
      parentId:   sectorsTable.parentId,
      depth:      sectorsTable.depth,
    }).from(sectorsTable).where(eq(sectorsTable.isActive, true));

    // Build sector allocation map
    const sectorAllocMap = new Map<number, number>();
    for (const a of allAllocs) {
      sectorAllocMap.set(a.toSectorId, (sectorAllocMap.get(a.toSectorId) ?? 0) + parseFloat(a.amount));
    }

    // Build sector utilisation map
    const sectorUtilMap = new Map<number, number>();
    for (const p of approvedPOs) {
      sectorUtilMap.set(p.sectorId, (sectorUtilMap.get(p.sectorId) ?? 0) + parseFloat(p.totalAmount));
    }

    // Count children per sector
    const childCount = new Map<number, number>();
    for (const s of allSectors) {
      if (s.parentId) childCount.set(s.parentId, (childCount.get(s.parentId) ?? 0) + 1);
    }

    // Build enriched sector list (no PII)
    const enrichedSectors = allSectors.map(s => {
      const allocated = sectorAllocMap.get(s.id) ?? 0;
      const utilised  = sectorUtilMap.get(s.id) ?? 0;
      return {
        id:                s.id,
        name:              s.name,
        code:              s.code,
        parentId:          s.parentId,
        depth:             s.depth,
        allocated,
        utilised,
        balance:           allocated - utilised,
        utilisationPercent: allocated > 0 ? Math.min(100, (utilised / allocated) * 100) : 0,
        subSectorCount:    childCount.get(s.id) ?? 0,
      };
    });

    // Top 5 by allocation
    const topSectors = [...enrichedSectors]
      .sort((a, b) => b.allocated - a.allocated)
      .slice(0, 5);

    // Recent approved POs (no PII — only department name + amount + date)
    const recentPORows = await db
      .select({
        sectorId:   purchaseOrdersTable.sectorId,
        totalAmount: purchaseOrdersTable.totalAmount,
        reviewedAt: purchaseOrdersTable.reviewedAt,
        notes:      purchaseOrdersTable.notes,
      })
      .from(purchaseOrdersTable)
      .where(eq(purchaseOrdersTable.status, "approved"))
      .orderBy(desc(purchaseOrdersTable.reviewedAt))
      .limit(20);

    const sectorNameMap = new Map(allSectors.map(s => [s.id, s.name]));

    const recentProcurement = recentPORows.map(p => ({
      department:  sectorNameMap.get(p.sectorId) ?? `Sector ${p.sectorId}`,
      description: p.notes ?? "Purchase Order",
      amount:      parseFloat(p.totalAmount),
      approvedAt:  p.reviewedAt?.toISOString() ?? null,
    }));

    // Monthly utilisation (last 12 months)
    const monthlyResult = await db.execute(sql`
      SELECT
        TO_CHAR(reviewed_at AT TIME ZONE 'Africa/Nairobi', 'YYYY-MM') AS month,
        SUM(total_amount::numeric)::float AS total
      FROM purchase_orders
      WHERE status = 'approved' AND reviewed_at >= NOW() - INTERVAL '12 months'
      GROUP BY month
      ORDER BY month ASC
    `);

    const monthlyUtilisation = (monthlyResult.rows as any[]).map(r => ({
      month: r.month,
      rate:  totalBudget > 0 ? Math.min(100, (parseFloat(r.total) / totalBudget) * 100) : 0,
    }));

    const summary = {
      totalBudget,
      totalAllocated,
      totalUtilised,
      remainingBalance,
      allocationPercent:   totalBudget > 0 ? Math.min(100, (totalAllocated / totalBudget) * 100) : 0,
      utilisationPercent:  totalBudget > 0 ? Math.min(100, (totalUtilised / totalBudget) * 100) : 0,
      lastUpdated:         new Date().toISOString(),
      financialYear:       cycle.name ?? "2024/2025",
      topSectors,
      allSectors:          enrichedSectors,
      recentProcurement,
      monthlyUtilisation,
    };

    cachedSummary = summary;
    cachedAt = Date.now();

    res.json(summary);
  } catch (err) {
    console.error("[public/summary]", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
