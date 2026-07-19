import { prisma } from "../db/prisma";
import { NotFoundError } from "../errors";

export interface EffectiveAccess {
  isSuperAdmin: boolean;
  roles: string[];
  permissions: Set<string>;
}

interface CacheEntry {
  value: EffectiveAccess;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 60_000;

/**
 * Effective permissions = union of role permissions, then per-user overrides
 * applied (ALLOW adds, DENY removes). `isSuperAdmin` bypasses the matrix.
 * Cached in-process; bust on any role/permission/override change.
 */
export async function resolveEffectiveAccess(userId: string): Promise<EffectiveAccess> {
  const hit = cache.get(userId);
  if (hit && hit.expiresAt > Date.now()) return hit.value;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      roles: { include: { role: { include: { permissions: { include: { permission: true } } } } } },
      overrides: { include: { permission: true } },
    },
  });
  if (!user) throw new NotFoundError("User");

  const permissions = new Set<string>();
  const roles: string[] = [];

  for (const userRole of user.roles) {
    roles.push(userRole.role.key);
    for (const rp of userRole.role.permissions) permissions.add(rp.permission.key);
  }
  for (const override of user.overrides) {
    if (override.effect === "ALLOW") permissions.add(override.permission.key);
    else permissions.delete(override.permission.key);
  }

  const value: EffectiveAccess = { isSuperAdmin: user.isSuperAdmin, roles, permissions };
  cache.set(userId, { value, expiresAt: Date.now() + CACHE_TTL_MS });
  return value;
}

export function invalidateAccessCache(userId?: string): void {
  if (userId) cache.delete(userId);
  else cache.clear();
}

export async function can(userId: string, permission: string): Promise<boolean> {
  const access = await resolveEffectiveAccess(userId);
  return access.isSuperAdmin || access.permissions.has(permission);
}
