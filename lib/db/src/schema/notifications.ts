import { pgTable, serial, text, integer, boolean, timestamp, jsonb, uniqueIndex, index } from "drizzle-orm/pg-core";

export const notificationsTable = pgTable("notifications", {
  id:          serial("id").primaryKey(),
  actorId:     integer("actor_id").notNull(),
  actionType:  text("action_type").notNull(),
  entityType:  text("entity_type").notNull(),
  entityId:    integer("entity_id"),
  metadata:    jsonb("metadata").default({}),
  createdAt:   timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const notificationRecipientsTable = pgTable("notification_recipients", {
  id:             serial("id").primaryKey(),
  notificationId: integer("notification_id").notNull().references(() => notificationsTable.id, { onDelete: "cascade" }),
  recipientId:    integer("recipient_id").notNull(),
  isRead:         boolean("is_read").notNull().default(false),
  readAt:         timestamp("read_at", { withTimezone: true }),
}, (table) => ({
  uniq: uniqueIndex("notification_recipients_uniq").on(table.notificationId, table.recipientId),
  recipientIdx: index("idx_notif_recipients_recipient").on(table.recipientId),
}));

export type Notification          = typeof notificationsTable.$inferSelect;
export type NotificationRecipient = typeof notificationRecipientsTable.$inferSelect;
