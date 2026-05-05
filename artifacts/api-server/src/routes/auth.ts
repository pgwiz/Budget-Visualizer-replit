import { Router } from "express";
import { db, usersTable, sectorsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { hashPassword, verifyPassword, requireAuth } from "../lib/auth";

const router = Router();

router.post("/auth/login", async (req, res): Promise<void> => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ error: "Bad Request", message: "Email and password required" });
      return;
    }
    const users = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
    const user = users[0];
    if (!user || !verifyPassword(password, user.passwordHash)) {
      res.status(401).json({ error: "Unauthorized", message: "Invalid email or password" });
      return;
    }
    if (!user.isActive) {
      res.status(401).json({ error: "Unauthorized", message: "Account is inactive" });
      return;
    }
    (req as any).session.userId = user.id;
    let sector = null;
    if (user.sectorId) {
      try {
        const sectors = await db.select().from(sectorsTable).where(eq(sectorsTable.id, user.sectorId)).limit(1);
        sector = sectors[0] || null;
      } catch (sectorErr) {
        console.error("Error fetching sector:", sectorErr);
        sector = null;
      }
    }
    const { passwordHash: _, ...safeUser } = user;
    res.json({ user: { ...safeUser, sector } });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Internal Server Error", message: "An error occurred during login" });
  }
});

// Public endpoint for the prototype login page — returns users grouped by sector hierarchy
router.get("/auth/demo-users", async (_req, res): Promise<void> => {
  try {
    const users = await db
      .select({
        id: usersTable.id,
        name: usersTable.name,
        email: usersTable.email,
        role: usersTable.role,
        sectorId: usersTable.sectorId,
      })
      .from(usersTable)
      .where(eq(usersTable.isActive, true))
      .orderBy(usersTable.name);

    const sectors = await db
      .select({ id: sectorsTable.id, name: sectorsTable.name, code: sectorsTable.code, parentId: sectorsTable.parentId, depth: sectorsTable.depth })
      .from(sectorsTable)
      .orderBy(sectorsTable.depth, sectorsTable.name);

    const logger = require('../lib/logger').logger;
    logger.info({ usersCount: users.length, sectorsCount: sectors.length }, '[DEBUG] demo-users loaded from database');

    res.set('Cache-Control', 'public, max-age=300'); // 5 minute cache for demo data
    res.json({ users, sectors });
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    res.status(500).json({ error: "Failed to load demo users", message: err.message });
  }
});

router.post("/auth/logout", (req, res): void => {
  (req as any).session.destroy(() => {
    res.json({ message: "Logged out" });
  });
});

router.get("/auth/me", requireAuth, async (req, res): Promise<void> => {
  const user = (req as any).user;
  let sector = null;
  if (user.sectorId) {
    const sectors = await db.select().from(sectorsTable).where(eq(sectorsTable.id, user.sectorId)).limit(1);
    sector = sectors[0] || null;
  }
  const { passwordHash: _, ...safeUser } = user;
  res.json({ ...safeUser, sector });
});

export default router;
