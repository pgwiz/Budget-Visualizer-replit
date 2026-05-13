import { db, sectorsTable, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

/**
 * ACTION_TYPES that trigger downward notifications (to the sector receiving/losing funds)
 */
const DOWNWARD_TYPES = new Set(["ALLOCATION_CREATED", "ALLOCATION_REVOKED"]);

/**
 * Walk up the sector tree from a given sectorId and return all ancestor sector IDs.
 */
async function getSectorAncestorIds(sectorId: number): Promise<number[]> {
  const ancestors: number[] = [];
  let current: number | null = sectorId;
  for (let i = 0; i < 10; i++) {
    const [sector] = await db
      .select({ parentId: sectorsTable.parentId })
      .from(sectorsTable)
      .where(eq(sectorsTable.id, current!))
      .limit(1);
    if (!sector?.parentId) break;
    ancestors.push(sector.parentId);
    current = sector.parentId;
  }
  return ancestors;
}

/**
 * Find all users whose sectorId is in the given sectorIds list.
 */
async function getUsersBySectorIds(sectorIds: number[]): Promise<number[]> {
  if (sectorIds.length === 0) return [];
  const rows = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.isActive, true));
  return rows.filter(r => {
    // We need sectorId on user — use a raw query approach
    return true; // placeholder, see below
  }).map(r => r.id);
}

/**
 * Resolve the full recipient list for a notification.
 *
 * Logic:
 *  1. Actor is always a recipient.
 *  2. All users whose sectorId is an ancestor of the actor's sectorId (upward chain).
 *  3. For ALLOCATION_CREATED / ALLOCATION_REVOKED: also add users whose sectorId is
 *     the target sector (entityId = toSectorId in metadata).
 */
export async function resolveRecipients(
  actorId: number,
  actionType: string,
  entityType: string,
  entityId: number | null,
  metadata: Record<string, any>,
): Promise<number[]> {
  const recipientSet = new Set<number>();

  // Always include actor
  recipientSet.add(actorId);

  // Get actor's sectorId
  const [actor] = await db
    .select({ sectorId: usersTable.sectorId })
    .from(usersTable)
    .where(eq(usersTable.id, actorId))
    .limit(1);

  const actorSectorId = actor?.sectorId;

  if (actorSectorId) {
    // Walk up the tree to get ancestor sector IDs
    const ancestorSectorIds = await getSectorAncestorIds(actorSectorId);

    if (ancestorSectorIds.length > 0) {
      // Get all active users in those ancestor sectors
      const allUsers = await db
        .select({ id: usersTable.id, sectorId: usersTable.sectorId })
        .from(usersTable)
        .where(eq(usersTable.isActive, true));

      for (const u of allUsers) {
        if (u.sectorId && ancestorSectorIds.includes(u.sectorId)) {
          recipientSet.add(u.id);
        }
      }
    }
  }

  // Downward: add users in the target sector (for allocation types)
  if (DOWNWARD_TYPES.has(actionType)) {
    const targetSectorId = metadata?.toSectorId ?? entityId;
    if (targetSectorId) {
      const allUsers = await db
        .select({ id: usersTable.id, sectorId: usersTable.sectorId })
        .from(usersTable)
        .where(eq(usersTable.isActive, true));
      for (const u of allUsers) {
        if (u.sectorId === targetSectorId) {
          recipientSet.add(u.id);
        }
      }
    }
  }

  return Array.from(recipientSet);
}
