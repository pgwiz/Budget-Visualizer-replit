import { Router } from "express";
import { db, notificationsTable, notificationRecipientsTable, usersTable } from "@workspace/db";
import { eq, and, desc, lt } from "drizzle-orm";
import { requireAuth } from "../lib/auth.js";
import { sseClients } from "../utils/createNotification.js";

const router = Router();

/* ─────────────────────────────────────────────────────────────
   GET /api/notifications
   Paginated list of notifications for the logged-in user
───────────────────────────────────────────────────────────── */
router.get("/notifications", requireAuth, async (req, res): Promise<void> => {
  const user = (req as any).user;
  const limit  = Math.min(parseInt(req.query.limit as string) || 20, 100);
  const cursor = req.query.cursor ? parseInt(req.query.cursor as string) : null;
  const unreadOnly = req.query.unread === "true";

  try {
    // Get all notification_recipients for this user (keyset paginated)
    const rows = await db
      .select({
        recipientId:    notificationRecipientsTable.recipientId,
        isRead:         notificationRecipientsTable.isRead,
        readAt:         notificationRecipientsTable.readAt,
        notifId:        notificationsTable.id,
        actorId:        notificationsTable.actorId,
        actionType:     notificationsTable.actionType,
        entityType:     notificationsTable.entityType,
        entityId:       notificationsTable.entityId,
        metadata:       notificationsTable.metadata,
        createdAt:      notificationsTable.createdAt,
      })
      .from(notificationRecipientsTable)
      .innerJoin(notificationsTable, eq(notificationRecipientsTable.notificationId, notificationsTable.id))
      .where(
        and(
          eq(notificationRecipientsTable.recipientId, user.id),
          unreadOnly ? eq(notificationRecipientsTable.isRead, false) : undefined,
          cursor ? lt(notificationsTable.id, cursor) : undefined,
        )
      )
      .orderBy(desc(notificationsTable.createdAt))
      .limit(limit + 1);

    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;
    const nextCursor = hasMore ? items[items.length - 1]?.notifId : null;

    // Enrich with actor name
    const actorIds = [...new Set(items.map(r => r.actorId))];
    const actors = actorIds.length > 0
      ? await db.select({ id: usersTable.id, name: usersTable.name, role: usersTable.role })
          .from(usersTable)
          .where(eq(usersTable.id, actorIds[0])) // simplified; loop below handles all
      : [];

    // Build actor map
    const actorMap = new Map<number, { name: string; role: string }>();
    for (const actorId of actorIds) {
      const [u] = await db.select({ id: usersTable.id, name: usersTable.name, role: usersTable.role })
        .from(usersTable).where(eq(usersTable.id, actorId)).limit(1);
      if (u) actorMap.set(actorId, { name: u.name, role: u.role });
    }

    // Count total unread for badge
    const allUnread = await db
      .select({ notifId: notificationRecipientsTable.id })
      .from(notificationRecipientsTable)
      .where(and(
        eq(notificationRecipientsTable.recipientId, user.id),
        eq(notificationRecipientsTable.isRead, false),
      ));

    res.json({
      notifications: items.map(r => ({
        id:         r.notifId,
        actorId:    r.actorId,
        actorName:  actorMap.get(r.actorId)?.name ?? "Unknown",
        actorRole:  actorMap.get(r.actorId)?.role ?? "",
        actionType: r.actionType,
        entityType: r.entityType,
        entityId:   r.entityId,
        metadata:   r.metadata,
        createdAt:  r.createdAt,
        isRead:     r.isRead,
        readAt:     r.readAt,
      })),
      totalUnread: allUnread.length,
      nextCursor,
      hasMore,
    });
  } catch (err) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

/* ─────────────────────────────────────────────────────────────
   GET /api/notifications/unread-count
───────────────────────────────────────────────────────────── */
router.get("/notifications/unread-count", requireAuth, async (req, res): Promise<void> => {
  const user = (req as any).user;
  const rows = await db
    .select({ id: notificationRecipientsTable.id })
    .from(notificationRecipientsTable)
    .where(and(
      eq(notificationRecipientsTable.recipientId, user.id),
      eq(notificationRecipientsTable.isRead, false),
    ));
  res.json({ count: rows.length });
});

/* ─────────────────────────────────────────────────────────────
   POST /api/notifications/:id/read
───────────────────────────────────────────────────────────── */
router.post("/notifications/:id/read", requireAuth, async (req, res): Promise<void> => {
  const user   = (req as any).user;
  const notifId = parseInt(req.params["id"] as string);
  await db
    .update(notificationRecipientsTable)
    .set({ isRead: true, readAt: new Date() })
    .where(and(
      eq(notificationRecipientsTable.notificationId, notifId),
      eq(notificationRecipientsTable.recipientId, user.id),
    ));
  res.json({ success: true });
});

/* ─────────────────────────────────────────────────────────────
   POST /api/notifications/read-all
───────────────────────────────────────────────────────────── */
router.post("/notifications/read-all", requireAuth, async (req, res): Promise<void> => {
  const user = (req as any).user;
  await db
    .update(notificationRecipientsTable)
    .set({ isRead: true, readAt: new Date() })
    .where(and(
      eq(notificationRecipientsTable.recipientId, user.id),
      eq(notificationRecipientsTable.isRead, false),
    ));
  res.json({ success: true });
});

/* ─────────────────────────────────────────────────────────────
   GET /api/notifications/stream  — SSE
───────────────────────────────────────────────────────────── */
router.get("/notifications/stream", requireAuth, (req, res): void => {
  const user = (req as any).user;

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  // Register this client
  sseClients.set(user.id, res);

  // Heartbeat every 30 seconds
  const heartbeat = setInterval(() => {
    try {
      res.write(`data: ${JSON.stringify({ type: "PING" })}\n\n`);
    } catch {
      clearInterval(heartbeat);
    }
  }, 30000);

  // Send initial ping
  res.write(`data: ${JSON.stringify({ type: "CONNECTED", userId: user.id })}\n\n`);

  // Cleanup on disconnect
  req.on("close", () => {
    clearInterval(heartbeat);
    sseClients.delete(user.id);
  });
});

export default router;
