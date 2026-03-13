import { and, eq, gt } from 'drizzle-orm';
import { db } from '~~/server/db';
import {
  permissions,
  rolePermissions,
  roles,
  sessions,
  userPermissions,
  userRoles,
  users,
} from '~~/server/db/schema';
import { hashPassword, verifyPassword } from '~~/server/utils/password';
import {
  generateSessionToken,
  hashSessionToken,
  SESSION_MAX_AGE_MS,
} from '~~/server/utils/session';
import type { LoginInput, RegisterInput } from '~~/shared/schemas/auth';

//#region REGISTER
export async function register(input: RegisterInput) {
  // 1. Check if user exists
  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, input.email))
    .limit(1);

  // user existss
  if (existing.length > 0) {
    throw createError({ statusCode: 409, message: 'Email already registered' });
  }

  // 2. Hash password
  const passwordHash = await hashPassword(input.password);

  // 3. Insert user, return new row
  const [user] = await db
    .insert(users)
    .values({
      email: input.email,
      passwordHash,
      firstName: input.firstName,
      lastName: input.lastName,
      phone: input.phone ?? null,
    })
    .returning();

  if (!user) {
    throw createError({ statusCode: 500, message: 'Registration failed' });
  }

  // 4. Assign default customer role
  const [customerRole] = await db
    .select({ id: roles.id })
    .from(roles)
    .where(eq(roles.name, 'customer'))
    .limit(1);

  if (customerRole) {
    await db.insert(userRoles).values({
      userId: user.id,
      roleId: customerRole.id,
    });
  }

  // 5. Create session
  const token = generateSessionToken();
  const tokenHash = hashSessionToken(token);
  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE_MS);

  await db.insert(sessions).values({
    userId: user.id,
    tokenHash,
    expiresAt,
  });

  // 6. Return user and raw token
  // dont return hashed password/token
  const { passwordHash: _, ...cleanUser } = user;
  return { user: cleanUser, token };
}
//#endregion

//#region LOGIN
export async function login(input: LoginInput) {
  // 1. Find user by email
  const [user] = await db.select().from(users).where(eq(users.email, input.email)).limit(1);

  // user not found (need to also consider oauth accounts that have no password)
  if (!user || !user.passwordHash) {
    throw createError({ statusCode: 401, message: 'Invalid email or password' });
  }

  // 2. Validate password
  const valid = await verifyPassword(input.password, user.passwordHash);

  if (!valid) {
    throw createError({ statusCode: 401, message: 'Invalid email or password' });
  }

  // 3. Ensure active
  if (!user.isActive) {
    throw createError({ statusCode: 403, message: 'Account is deactivated' });
  }

  // 4. Create session
  const token = generateSessionToken();
  const tokenHash = hashSessionToken(token);
  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE_MS);

  await db.insert(sessions).values({
    userId: user.id,
    tokenHash,
    expiresAt,
  });

  // 5. Return user and raw token
  // dont return password hash
  const { passwordHash: _, ...cleanUser } = user;
  return { user: cleanUser, token };
}

export async function validateSession(token: string) {
  // 1. Hash raw token from cookie
  const tokenHash = hashSessionToken(token);

  // 2. Find existing session
  const [session] = await db
    .select()
    .from(sessions)
    .where(and(eq(sessions.tokenHash, tokenHash), gt(sessions.expiresAt, new Date())))
    .limit(1);

  if (!session) return null;

  // 3. Valid session exists, fetch user
  const [user] = await db.select().from(users).where(eq(users.id, session.userId)).limit(1);

  if (!user || !user.isActive) return null;

  // 4. User found, fetch permission from roles + direct grants
  const userPerms = await getUserPermissions(user.id);

  // 5. Return user and permissions
  // dont return password hash
  const { passwordHash: _, ...cleanUser } = user;
  return { user: cleanUser, permissions: userPerms };
}

async function getUserPermissions(userId: string): Promise<string[]> {
  // 1. Permissions from roles
  const rolePerms = await db
    .select({ key: permissions.key })
    .from(userRoles)
    .innerJoin(rolePermissions, eq(userRoles.roleId, rolePermissions.roleId))
    .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
    .where(eq(userRoles.userId, userId));

  const permSet = new Set(rolePerms.map((r) => r.key));

  // 2. Direct grants/denies
  const directPerms = await db
    .select({
      key: permissions.key,
      granted: userPermissions.granted,
    })
    .from(userPermissions)
    .innerJoin(permissions, eq(userPermissions.permissionId, permissions.id))
    .where(eq(userPermissions.userId, userId));

  // 3. Merge role perms and direct grants/denies
  for (const dp of directPerms) {
    if (dp.granted) permSet.add(dp.key);
    else permSet.delete(dp.key);
  }

  return Array.from(permSet);
}
//#endregion

//#region LOGOUT
export async function logout(token: string) {
  // hash token then delete db record
  const tokenHash = hashSessionToken(token);
  await db.delete(sessions).where(eq(sessions.tokenHash, tokenHash));
}
//#endregion
