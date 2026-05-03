import { pgTable, serial, text, boolean, integer, timestamp, numeric, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const budgetCyclesTable = pgTable("budget_cycles", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  totalBudget: numeric("total_budget", { precision: 18, scale: 2 }).notNull(),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  isActive: boolean("is_active").notNull().default(false),
  createdBy: integer("created_by").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertBudgetCycleSchema = createInsertSchema(budgetCyclesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertBudgetCycle = z.infer<typeof insertBudgetCycleSchema>;
export type BudgetCycle = typeof budgetCyclesTable.$inferSelect;
