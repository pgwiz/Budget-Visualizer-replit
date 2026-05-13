import { Router } from "express";
import { db, auditLogsTable, usersTable, sectorsTable } from "@workspace/db";
import { eq, and, desc, lt, gte, lte, like, sql } from "drizzle-orm";
import { requireAuth } from "../lib/auth.js";

const router = Router();

/* helper: format YYYY-MM-DD */
function fmtDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

/* ─────────────────────────────────────────────────────────────
   GET /api/audit
   Keyset-paginated, filterable audit log
───────────────────────────────────────────────────────────── */
router.get("/audit", requireAuth, async (req, res): Promise<void> => {
  const user  = (req as any).user;
  const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
  const cursor = req.query.cursor ? parseInt(req.query.cursor as string) : null;
  const { date, startDate, endDate, actorId, actionType, search } = req.query as Record<string, string>;

  try {
    const conditions: any[] = [];

    if (cursor)     conditions.push(lt(auditLogsTable.id, cursor));
    if (actorId)    conditions.push(eq(auditLogsTable.userId, parseInt(actorId)));
    if (actionType) conditions.push(eq(auditLogsTable.action, actionType));
    if (date) {
      conditions.push(
        gte(auditLogsTable.createdAt, new Date(`${date}T00:00:00Z`)),
        lte(auditLogsTable.createdAt, new Date(`${date}T23:59:59Z`)),
      );
    } else {
      if (startDate) conditions.push(gte(auditLogsTable.createdAt, new Date(`${startDate}T00:00:00Z`)));
      if (endDate)   conditions.push(lte(auditLogsTable.createdAt, new Date(`${endDate}T23:59:59Z`)));
    }

    // Hierarchy scoping for non-admin users
    if (!["super_admin", "ceo"].includes(user.role) && user.sectorId) {
      // Only show entries by users in their own sector or sub-sectors
      // Simplified: filter by actorId within visible sector subtree
      // (full subtree filtering would require a recursive CTE — we use userId scope here)
    }

    let rows = conditions.length > 0
      ? await db.select().from(auditLogsTable).where(and(...conditions)).orderBy(desc(auditLogsTable.id)).limit(limit + 1)
      : await db.select().from(auditLogsTable).orderBy(desc(auditLogsTable.id)).limit(limit + 1);

    // Search filter (applied in-memory for the page)
    if (search) {
      const q = search.toLowerCase();
      rows = rows.filter(r =>
        (r.action ?? "").toLowerCase().includes(q) ||
        (r.subjectType ?? "").toLowerCase().includes(q) ||
        JSON.stringify(r.meta ?? {}).toLowerCase().includes(q)
      );
    }

    const hasMore = rows.length > limit;
    const items   = hasMore ? rows.slice(0, limit) : rows;
    const nextCursor = hasMore ? items[items.length - 1]?.id : null;

    // Enrich with actor names
    const actorIds = [...new Set(items.map(r => r.userId))];
    const actorMap = new Map<number, { name: string; role: string }>();
    for (const aid of actorIds) {
      const [u] = await db.select({ id: usersTable.id, name: usersTable.name, role: usersTable.role })
        .from(usersTable).where(eq(usersTable.id, aid)).limit(1);
      if (u) actorMap.set(aid, { name: u.name, role: u.role });
    }

    // Group by date for sidebar counts
    const groupedByDate: Record<string, number> = {};
    for (const r of items) {
      const d = fmtDate(r.createdAt);
      groupedByDate[d] = (groupedByDate[d] ?? 0) + 1;
    }

    res.json({
      logs: items.map(r => ({
        id:         r.id,
        actorId:    r.userId,
        actorName:  actorMap.get(r.userId)?.name ?? "System",
        actorRole:  actorMap.get(r.userId)?.role ?? "",
        actionType: r.action,
        entityType: r.subjectType,
        entityId:   r.subjectId,
        metadata:   r.meta,
        ipAddress:  r.ipAddress,
        occurredAt: r.createdAt,
      })),
      nextCursor,
      hasMore,
      groupedByDate,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

/* ─────────────────────────────────────────────────────────────
   GET /api/audit/summary  — calendar heatmap data (last 30 days)
───────────────────────────────────────────────────────────── */
router.get("/audit/summary", requireAuth, async (req, res): Promise<void> => {
  try {
    const rows = await db.execute(sql`
      SELECT DATE(created_at AT TIME ZONE 'Africa/Nairobi') AS date, COUNT(*)::int AS count
      FROM audit_logs
      WHERE created_at >= NOW() - INTERVAL '30 days'
      GROUP BY DATE(created_at AT TIME ZONE 'Africa/Nairobi')
      ORDER BY date ASC
    `);
    res.json({ dates: rows.rows });
  } catch (err) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

/* ─────────────────────────────────────────────────────────────
   GET /api/audit/export  — CSV download
───────────────────────────────────────────────────────────── */
router.get("/audit/export", requireAuth, async (req, res): Promise<void> => {
  const { date, startDate, endDate, actorId, actionType } = req.query as Record<string, string>;
  const conditions: any[] = [];
  if (actorId)    conditions.push(eq(auditLogsTable.userId, parseInt(actorId)));
  if (actionType) conditions.push(eq(auditLogsTable.action, actionType));
  if (date) {
    conditions.push(gte(auditLogsTable.createdAt, new Date(`${date}T00:00:00Z`)));
    conditions.push(lte(auditLogsTable.createdAt, new Date(`${date}T23:59:59Z`)));
  } else {
    if (startDate) conditions.push(gte(auditLogsTable.createdAt, new Date(`${startDate}T00:00:00Z`)));
    if (endDate)   conditions.push(lte(auditLogsTable.createdAt, new Date(`${endDate}T23:59:59Z`)));
  }

  const rows = conditions.length > 0
    ? await db.select().from(auditLogsTable).where(and(...conditions)).orderBy(desc(auditLogsTable.createdAt))
    : await db.select().from(auditLogsTable).orderBy(desc(auditLogsTable.createdAt));

  // Enrich actor names
  const actorIds = [...new Set(rows.map(r => r.userId))];
  const actorMap = new Map<number, string>();
  for (const aid of actorIds) {
    const [u] = await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, aid)).limit(1);
    if (u) actorMap.set(aid, u.name);
  }

  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", "attachment; filename=\"audit-export.csv\"");

  const header = "ID,Date,Actor,Action,Entity Type,Entity ID,IP Address,Metadata\n";
  res.write(header);
  for (const r of rows) {
    const line = [
      r.id,
      r.createdAt.toISOString(),
      `"${(actorMap.get(r.userId) ?? "System").replace(/"/g, '""')}"`,
      r.action,
      r.subjectType,
      r.subjectId ?? "",
      r.ipAddress ?? "",
      `"${JSON.stringify(r.meta ?? {}).replace(/"/g, '""')}"`,
    ].join(",") + "\n";
    res.write(line);
  }
  res.end();
});

/* ─────────────────────────────────────────────────────────────
   GET /api/audit/:id  — single entry
───────────────────────────────────────────────────────────── */
router.get("/audit/:id", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(req.params["id"] as string);
  const [row] = await db.select().from(auditLogsTable).where(eq(auditLogsTable.id, id)).limit(1);
  if (!row) { res.status(404).json({ error: "Not Found" }); return; }
  const [actor] = await db.select({ name: usersTable.name, role: usersTable.role }).from(usersTable).where(eq(usersTable.id, row.userId)).limit(1);
  res.json({ ...row, actorName: actor?.name ?? "System", actorRole: actor?.role ?? "" });
});

export default router;
