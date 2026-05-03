import { pgTable, serial, text, integer, timestamp, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const allocationsTable = pgTable("allocations", {
  id: serial("id").primaryKey(),
  budgetCycleId: integer("budget_cycle_id").notNull(),
  fromSectorId: integer("from_sector_id"),
  toSectorId: integer("to_sector_id").notNull(),
  allocatedBy: integer("allocated_by").notNull(),
  amount: numeric("amount", { precision: 18, scale: 2 }).notNull(),
  comment: text("comment"),
  status: text("status", { enum: ["pending", "active", "revoked", "exhausted"] }).notNull().default("active"),
  allocatedAt: timestamp("allocated_at").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertAllocationSchema = createInsertSchema(allocationsTable).omit({ id: true, createdAt: true, updatedAt: true, allocatedAt: true });
export type InsertAllocation = z.infer<typeof insertAllocationSchema>;
export type Allocation = typeof allocationsTable.$inferSelect;
