import { pgTable, serial, integer, numeric, text, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const sectorControlsTable = pgTable("sector_controls", {
  id: serial("id").primaryKey(),
  controllingSectorId: integer("controlling_sector_id").notNull(),
  targetSectorId: integer("target_sector_id").notNull(),
  maxBudgetAmount: numeric("max_budget_amount", { precision: 18, scale: 2 }),
  maxOrderAmount: numeric("max_order_amount", { precision: 18, scale: 2 }),
  allowedCategories: jsonb("allowed_categories").$type<string[] | null>().default(null),
  restrictedProductIds: jsonb("restricted_product_ids").$type<number[] | null>().default(null),
  notes: text("notes"),
  createdBy: integer("created_by").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertSectorControlSchema = createInsertSchema(sectorControlsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertSectorControl = z.infer<typeof insertSectorControlSchema>;
export type SectorControl = typeof sectorControlsTable.$inferSelect;
