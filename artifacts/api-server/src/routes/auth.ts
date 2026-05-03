import { Router } from "express";
import { db, usersTable, sectorsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { hashPassword, verifyPassword, requireAuth } from "../lib/auth";

const router = Router();

router.post("/auth/login", async (req, res): Promise<void> => {
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
    const sectors = await db.select().from(sectorsTable).where(eq(sectorsTable.id, user.sectorId)).limit(1);
    sector = sectors[0] || null;
  }
  const { passwordHash: _, ...safeUser } = user;
  res.json({ user: { ...safeUser, sector } });
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
