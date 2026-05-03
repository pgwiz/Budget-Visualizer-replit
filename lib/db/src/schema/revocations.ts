import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const revocationsTable = pgTable("revocations", {
  id: serial("id").primaryKey(),
  allocationId: integer("allocation_id").notNull(),
  revokedBy: integer("revoked_by").notNull(),
  reason: text("reason").notNull(),
  revokedAt: timestamp("revoked_at").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertRevocationSchema = createInsertSchema(revocationsTable).omit({ id: true, createdAt: true, revokedAt: true });
export type InsertRevocation = z.infer<typeof insertRevocationSchema>;
export type Revocation = typeof revocationsTable.$inferSelect;
