import { pgTable, serial, integer, numeric, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const approvalLimitsTable = pgTable("approval_limits", {
  id: serial("id").primaryKey(),
  sectorId: integer("sector_id").notNull().unique(),
  maxApprovableAmount: numeric("max_approvable_amount", { precision: 18, scale: 2 }).notNull(),
  notes: text("notes"),
  createdBy: integer("created_by").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertApprovalLimitSchema = createInsertSchema(approvalLimitsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertApprovalLimit = z.infer<typeof insertApprovalLimitSchema>;
export type ApprovalLimit = typeof approvalLimitsTable.$inferSelect;
