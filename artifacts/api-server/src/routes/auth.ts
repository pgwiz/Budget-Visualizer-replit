import { Router } from "express";
import { db, usersTable, sectorsTable } from "@workspace/db";
import { and, eq } from "drizzle-orm";
import { hashPassword, verifyPassword, requireAuth } from "../lib/auth";
import { createNotification } from "../utils/createNotification.js";

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
  // Fire login notification
  createNotification({
    actorId: user.id, actionType: "USER_LOGIN",
    entityType: "login", entityId: null,
    metadata: { ip: req.ip },
  });
  const { passwordHash: _, ...safeUser } = user;
  res.json({ user: { ...safeUser, sector } });
});

// Public endpoint for the prototype login page — returns users grouped by sector hierarchy
router.get("/auth/demo-users", async (_req, res): Promise<void> => {
  const roles = ["super_admin", "ceo", "ministry_head", "department_head", "viewer"] as const;
  const result = [];

  for (const role of roles) {
    const [user] = await db
      .select({
        id: usersTable.id,
        name: usersTable.name,
        email: usersTable.email,
        role: usersTable.role,
        sectorId: usersTable.sectorId,
        sectorName: sectorsTable.name,
        sectorCode: sectorsTable.code,
      })
      .from(usersTable)
      .leftJoin(sectorsTable, eq(usersTable.sectorId, sectorsTable.id))
      .where(and(eq(usersTable.role, role), eq(usersTable.isActive, true)))
      .orderBy(usersTable.id)
      .limit(1);

    if (user) result.push({ ...user, password: "password" });
  }

  res.json(result);
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
