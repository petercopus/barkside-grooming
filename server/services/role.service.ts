import { eq, inArray } from 'drizzle-orm';
import { db } from '~~/server/db';
import { rolePermissions, roles, userRoles } from '~~/server/db/schema';
import { roleDefaultServices } from '~~/server/db/schema/scheduling';
import type { CreateRoleInput, UpdateRoleInput } from '~~/shared/schemas/role';

export async function listRoles() {
  const allRoles = await db.select().from(roles).orderBy(roles.name);
  const roleMap = new Map(allRoles.map((r) => [r.id, r]));

  return allRoles.map((role) => ({
    ...role,
    parentRoleName: role.parentRoleId ? (roleMap.get(role.parentRoleId)?.name ?? null) : null,
  }));
}

export async function getRole(id: number) {
  const [role] = await db.select().from(roles).where(eq(roles.id, id));
  if (!role) throw createError({ statusCode: 404, message: 'Role not found' });

  const permRows = await db
    .select({ permissionId: rolePermissions.permissionId })
    .from(rolePermissions)
    .where(eq(rolePermissions.roleId, id));

  const defaultServiceRows = await db
    .select({ serviceId: roleDefaultServices.serviceId })
    .from(roleDefaultServices)
    .where(eq(roleDefaultServices.roleId, id));

  // get inherited permissions by walking the parent chain
  const inheritedPermIds = new Set<number>();
  if (role.parentRoleId) {
    const allRoles = await db.select().from(roles);
    const roleMap = new Map(allRoles.map((r) => [r.id, r]));

    // get all ancestor role IDs
    const ancestorIds: number[] = [];
    let current = roleMap.get(role.parentRoleId);
    while (current) {
      ancestorIds.push(current.id);
      current = current.parentRoleId ? roleMap.get(current.parentRoleId) : undefined;
    }

    if (ancestorIds.length > 0) {
      const ancestorPerms = await db
        .select({ permissionId: rolePermissions.permissionId })
        .from(rolePermissions)
        .where(inArray(rolePermissions.roleId, ancestorIds));

      for (const row of ancestorPerms) {
        inheritedPermIds.add(row.permissionId);
      }
    }
  }

  return {
    ...role,
    permissionIds: permRows.map((r) => r.permissionId),
    inheritedPermissionIds: [...inheritedPermIds],
    defaultServiceIds: defaultServiceRows.map((r) => r.serviceId),
  };
}

export async function createRole(input: CreateRoleInput) {
  const [role] = await db
    .insert(roles)
    .values({
      name: input.name,
      description: input.description,
      parentRoleId: input.parentRoleId ?? null,
      hasAllPermissions: input.hasAllPermissions ?? false,
    })
    .returning();

  if (!role) throw createError({ statusCode: 500, message: 'Failed to create role' });

  if (input.permissionIds.length > 0) {
    await db
      .insert(rolePermissions)
      .values(input.permissionIds.map((permissionId) => ({ roleId: role.id, permissionId })));
  }

  if (input.defaultServiceIds.length > 0) {
    await db
      .insert(roleDefaultServices)
      .values(input.defaultServiceIds.map((serviceId) => ({ roleId: role.id, serviceId })));
  }

  return getRole(role.id);
}

export async function updateRole(id: number, input: UpdateRoleInput) {
  const existing = await getRole(id);

  // Check for circular inheritance
  if (input.parentRoleId !== undefined && input.parentRoleId !== null) {
    const allRoles = await db.select().from(roles);
    const roleMap = new Map(allRoles.map((r) => [r.id, r]));
    let current = roleMap.get(input.parentRoleId);
    while (current) {
      if (current.id === id) {
        throw createError({ statusCode: 400, message: 'Circular role inheritance detected' });
      }
      current = current.parentRoleId ? roleMap.get(current.parentRoleId) : undefined;
    }
  }

  // Update scalar fields
  const updates: Record<string, unknown> = {};
  if (input.name !== undefined) updates.name = input.name;
  if (input.description !== undefined) updates.description = input.description;
  if (input.parentRoleId !== undefined) updates.parentRoleId = input.parentRoleId;
  if (input.hasAllPermissions !== undefined) updates.hasAllPermissions = input.hasAllPermissions;

  if (Object.keys(updates).length > 0) {
    await db.update(roles).set(updates).where(eq(roles.id, id));
  }

  // Replace permissions if provided
  if (input.permissionIds !== undefined) {
    await db.delete(rolePermissions).where(eq(rolePermissions.roleId, id));
    if (input.permissionIds.length > 0) {
      await db
        .insert(rolePermissions)
        .values(input.permissionIds.map((permissionId) => ({ roleId: id, permissionId })));
    }
  }

  // Replace default services if provided
  if (input.defaultServiceIds !== undefined) {
    await db.delete(roleDefaultServices).where(eq(roleDefaultServices.roleId, id));
    if (input.defaultServiceIds.length > 0) {
      await db
        .insert(roleDefaultServices)
        .values(input.defaultServiceIds.map((serviceId) => ({ roleId: id, serviceId })));
    }
  }

  return getRole(id);
}

export async function deleteRole(id: number) {
  const role = await getRole(id);

  if (role.isSystem) {
    throw createError({ statusCode: 403, message: 'System roles cannot be deleted' });
  }

  // Check for users with this role
  const [userRef] = await db
    .select({ userId: userRoles.userId })
    .from(userRoles)
    .where(eq(userRoles.roleId, id))
    .limit(1);

  if (userRef) {
    throw createError({
      statusCode: 409,
      message: 'Cannot delete: this role is assigned to one or more users',
    });
  }

  await db.delete(roles).where(eq(roles.id, id));
}
