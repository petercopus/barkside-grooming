import { eq, inArray, ne } from 'drizzle-orm';
import { db } from '~~/server/db';
import {
  employeeServices,
  roleDefaultServices,
  roles,
  userRoles,
  users,
} from '~~/server/db/schema';
import type { CreateEmployeeInput, UpdateEmployeeInput } from '~~/shared/schemas/employee';

/**
 * Expand a set of role IDs to include every ancestor in the parent chain
 */
async function collectRoleAndAncestorIds(roleIds: number[]): Promise<number[]> {
  if (roleIds.length === 0) return [];

  const allRoles = await db.select({ id: roles.id, parentRoleId: roles.parentRoleId }).from(roles);
  const roleMap = new Map(allRoles.map((r) => [r.id, r]));

  const expanded = new Set<number>();
  for (const roleId of roleIds) {
    let current = roleMap.get(roleId);
    while (current && !expanded.has(current.id)) {
      expanded.add(current.id);
      current = current.parentRoleId ? roleMap.get(current.parentRoleId) : undefined;
    }
  }

  return [...expanded];
}

/**
 * List all users who have >= 1 non customer role
 */
export async function listEmployees() {
  const employeeRoleRows = await db
    .select({ userId: userRoles.userId, roleId: userRoles.roleId })
    .from(userRoles)
    .innerJoin(roles, eq(roles.id, userRoles.roleId))
    .where(ne(roles.name, 'Customer'));

  // dedup
  const userIds = [...new Set(employeeRoleRows.map((r) => r.userId))];
  if (userIds.length === 0) return [];

  const employees = await db.select().from(users).where(inArray(users.id, userIds));

  // now attach role for each employee
  const allRoles = await db
    .select({ userId: userRoles.userId, roleId: userRoles.roleId, roleName: roles.name })
    .from(userRoles)
    .innerJoin(roles, eq(roles.id, userRoles.roleId))
    .where(inArray(userRoles.userId, userIds));

  return employees.map((emp) => {
    const { passwordHash, ...cleanUser } = emp;
    return {
      ...cleanUser,
      roles: allRoles
        .filter((r) => r.userId === emp.id)
        .map((r) => ({ id: r.roleId, name: r.roleName })),
    };
  });
}

export async function getEmployee(id: string) {
  const [user] = await db.select().from(users).where(eq(users.id, id));
  if (!user) {
    throw createError({ statusCode: 404, message: 'Employee not found' });
  }

  const userRoleRows = await db
    .select({ roleId: userRoles.roleId, roleName: roles.name })
    .from(userRoles)
    .innerJoin(roles, eq(roles.id, userRoles.roleId))
    .where(eq(userRoles.userId, id));

  const qualifiedServices = await db
    .select({ serviceId: employeeServices.serviceId })
    .from(employeeServices)
    .where(eq(employeeServices.userId, id));

  const { passwordHash, ...cleanUser } = user;

  return {
    ...cleanUser,
    roles: userRoleRows.map((r) => ({ id: r.roleId, name: r.roleName })),
    serviceIds: qualifiedServices.map((s) => s.serviceId),
  };
}

export async function createEmployee(input: CreateEmployeeInput) {
  const hashed = await hashPassword(input.password);

  const [user] = await db
    .insert(users)
    .values({
      email: input.email,
      passwordHash: hashed,
      firstName: input.firstName,
      lastName: input.lastName,
      phone: input.phone ?? null,
      isActive: input.isActive ?? true,
    })
    .returning();

  if (!user) {
    throw createError({ statusCode: 500, message: 'Failed to create employee' });
  }

  // assign roles
  if (input.roleIds.length > 0) {
    await db.insert(userRoles).values(
      input.roleIds.map((r) => ({
        userId: user.id,
        roleId: r,
      })),
    );
  }

  // assign service qualifications
  if (input.serviceIds && input.serviceIds.length > 0) {
    await db
      .insert(employeeServices)
      .values(input.serviceIds.map((serviceId) => ({ userId: user.id, serviceId })));
  }

  // merge default services from assigned roles
  await mergeDefaultServices(user.id, input.roleIds);

  return getEmployee(user.id);
}

export async function updateEmployee(id: string, input: UpdateEmployeeInput) {
  // ensure exists
  await getEmployee(id);

  const updates: Record<string, unknown> = {};
  if (input.firstName !== undefined) updates.firstName = input.firstName;
  if (input.lastName !== undefined) updates.lastName = input.lastName;
  if (input.phone !== undefined) updates.phone = input.phone;
  if (input.email !== undefined) updates.email = input.email;
  if (input.isActive !== undefined) updates.isActive = input.isActive;

  if (Object.keys(updates).length > 0) {
    await db.update(users).set(updates).where(eq(users.id, id));
  }

  // replace roles if provided
  if (input.roleIds !== undefined) {
    await db.delete(userRoles).where(eq(userRoles.userId, id));
    if (input.roleIds.length > 0) {
      await db.insert(userRoles).values(input.roleIds.map((roleId) => ({ userId: id, roleId })));
      // merge default services from newly assigned roles
      await mergeDefaultServices(id, input.roleIds);
    }
  }

  return getEmployee(id);
}

/**
 * Merge default service qualifications from roles into an employee's services.
 * Walks the parent chain so that defaults on ancestor roles are inherited.
 */
async function mergeDefaultServices(userId: string, roleIds: number[]) {
  if (roleIds.length === 0) return;

  const expandedRoleIds = await collectRoleAndAncestorIds(roleIds);
  if (expandedRoleIds.length === 0) return;

  const defaults = await db
    .select({ serviceId: roleDefaultServices.serviceId })
    .from(roleDefaultServices)
    .where(inArray(roleDefaultServices.roleId, expandedRoleIds));

  const defaultServiceIds = [...new Set(defaults.map((d) => d.serviceId))];
  if (defaultServiceIds.length === 0) return;

  const current = await db
    .select({ serviceId: employeeServices.serviceId })
    .from(employeeServices)
    .where(eq(employeeServices.userId, userId));

  const currentIds = new Set(current.map((c) => c.serviceId));
  const toAdd = defaultServiceIds.filter((id) => !currentIds.has(id));

  if (toAdd.length > 0) {
    await db.insert(employeeServices).values(toAdd.map((serviceId) => ({ userId, serviceId })));
  }
}

export async function setEmployeeServices(userId: string, serviceIds: number[]) {
  await getEmployee(userId);
  await db.delete(employeeServices).where(eq(employeeServices.userId, userId));

  if (serviceIds.length > 0) {
    await db
      .insert(employeeServices)
      .values(serviceIds.map((serviceId) => ({ userId, serviceId })));
  }

  return serviceIds;
}
