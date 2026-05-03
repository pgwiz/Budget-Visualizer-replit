import { Router } from "express";
import { db, usersTable, sectorsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth, requireRole, hashPassword } from "../lib/auth";

const router = Router();

async function userWithSector(user: any) {
  const { passwordHash: _, ...safeUser } = user;
  let sector = null;
  if (user.sectorId) {
    const sectors = await db.select().from(sectorsTable).where(eq(sectorsTable.id, user.sectorId)).limit(1);
    sector = sectors[0] || null;
  }
  return { ...safeUser, sector };
}

router.get("/users", requireAuth, requireRole("super_admin", "ceo"), async (req, res): Promise<void> => {
  const users = await db.select().from(usersTable).orderBy(usersTable.name);
  const result = await Promise.all(users.map(userWithSector));
  res.json(result);
});

router.post("/users", requireAuth, requireRole("super_admin"), async (req, res): Promise<void> => {
  const { name, email, password, role, sectorId } = req.body;
  if (!name || !email || !password || !role) {
    res.status(400).json({ error: "Bad Request", message: "Missing required fields" });
    return;
  }
  const existing = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
  if (existing[0]) {
    res.status(400).json({ error: "Bad Request", message: "Email already exists" });
    return;
  }
  const [created] = await db.insert(usersTable).values({
    name, email, role, sectorId: sectorId || null,
    passwordHash: hashPassword(password),
    isActive: true,
  }).returning();
  res.status(201).json(await userWithSector(created));
});

router.get("/users/:userId", requireAuth, async (req, res): Promise<void> => {
  const userId = parseInt(req.params['userId'] as string);
  const users = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (!users[0]) { res.status(404).json({ error: "Not Found" }); return; }
  res.json(await userWithSector(users[0]));
});

router.put("/users/:userId", requireAuth, requireRole("super_admin"), async (req, res): Promise<void> => {
  const userId = parseInt(req.params['userId'] as string);
  const { name, email, role, sectorId, isActive, password } = req.body;
  const updates: any = { updatedAt: new Date() };
  if (name != null) updates.name = name;
  if (email != null) updates.email = email;
  if (role != null) updates.role = role;
  if (sectorId !== undefined) updates.sectorId = sectorId;
  if (isActive != null) updates.isActive = isActive;
  if (password) updates.passwordHash = hashPassword(password);
  const [updated] = await db.update(usersTable).set(updates).where(eq(usersTable.id, userId)).returning();
  if (!updated) { res.status(404).json({ error: "Not Found" }); return; }
  res.json(await userWithSector(updated));
});

router.delete("/users/:userId", requireAuth, requireRole("super_admin"), async (req, res): Promise<void> => {
  const userId = parseInt(req.params['userId'] as string);
  await db.delete(usersTable).where(eq(usersTable.id, userId));
  res.json({ message: "User deleted" });
});

export default router;
