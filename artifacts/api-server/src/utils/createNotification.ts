import { db, notificationsTable, notificationRecipientsTable } from "@workspace/db";
import { resolveRecipients } from "./resolveRecipients.js";

/** SSE connections: userId → Express Response */
export const sseClients = new Map<number, any>();

export interface NotificationPayload {
  actorId: number;
  actionType: string;
  entityType: string;
  entityId?: number | null;
  metadata?: Record<string, any>;
}

/**
 * Create a notification and push it to all relevant recipients via SSE if connected.
 * Does NOT require a transaction — it runs its own inserts.
 * (Call after the main DB operation succeeds.)
 */
export async function createNotification(payload: NotificationPayload): Promise<void> {
  const { actorId, actionType, entityType, entityId = null, metadata = {} } = payload;

  try {
    // Insert the notification row
    const [notif] = await db
      .insert(notificationsTable)
      .values({ actorId, actionType, entityType, entityId, metadata })
      .returning();

    // Resolve recipients
    const recipientIds = await resolveRecipients(actorId, actionType, entityType, entityId, metadata);

    if (recipientIds.length > 0) {
      await db.insert(notificationRecipientsTable).values(
        recipientIds.map(recipientId => ({
          notificationId: notif.id,
          recipientId,
          isRead: false,
        }))
      );
    }

    // Push SSE to connected clients
    const eventData = JSON.stringify({
      type: "NEW_NOTIFICATION",
      notification: {
        id: notif.id,
        actorId,
        actionType,
        entityType,
        entityId,
        metadata,
        createdAt: notif.createdAt,
      },
    });

    for (const recipientId of recipientIds) {
      const res = sseClients.get(recipientId);
      if (res) {
        try {
          res.write(`data: ${eventData}\n\n`);
        } catch {
          // Client disconnected
          sseClients.delete(recipientId);
        }
      }
    }
  } catch (err) {
    // Never let notification failure crash the main flow
    console.error("[createNotification] failed:", err);
  }
}
