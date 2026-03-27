import { eq, inArray } from 'drizzle-orm';
import { db } from '~~/server/db';
import { rolePermissions, roles, userRoles } from '~~/server/db/schema';
import { roleDefaultServices } from '~~/server/db/schema/scheduling';
import type { CreateRoleInput, UpdateRoleInput } from '~~/shared/schemas/role';

export async function listRoles() {
  return db.select().from(roles).orderBy(roles.name);
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

  return {
    ...role,
    permissionIds: permRows.map((r) => r.permissionId),
    defaultServiceIds: defaultServiceRows.map((r) => r.serviceId),
  };
}

export async function createRole(input: CreateRoleInput) {
  const [role] = await db
    .insert(roles)
    .values({
      name: input.name,
      description: input.description,
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

  // Update name/description
  const updates: Record<string, unknown> = {};
  if (input.name !== undefined) updates.name = input.name;
  if (input.description !== undefined) updates.description = input.description;

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
