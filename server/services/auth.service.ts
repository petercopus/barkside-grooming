import { and, eq, gt, inArray, isNull, ne } from 'drizzle-orm';
import { db } from '~~/server/db';
import {
  passwordResetTokens,
  permissions,
  rolePermissions,
  roles,
  sessions,
  userPermissions,
  userRoles,
  users,
} from '~~/server/db/schema';
import { sendNotification } from '~~/server/services/notification.service';
import { renderPasswordResetEmail, renderWelcomeEmail } from '~~/server/utils/email-templates';
import type {
  ChangePasswordInput,
  LoginInput,
  RegisterInput,
  ResetPasswordInput,
} from '~~/shared/schemas/auth';

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
    .where(eq(roles.name, 'Customer'))
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

  // 6. Welcome email
  try {
    const { siteUrl } = useRuntimeConfig();
    const { subject, html } = renderWelcomeEmail({
      recipientName: user.firstName,
      bookingUrl: `${siteUrl}/book`,
    });
    await sendNotification({
      userId: user.id,
      category: 'welcome',
      title: subject,
      body: 'Thanks for creating an account with Barkside Grooming.',
      html,
    });
  } catch (err) {
    console.error('[auth] Welcome notification failed:', err);
  }

  // 7. Return user and raw token
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
  // 1. Get users assigned roles
  const userRoleRows = await db
    .select({ roleId: userRoles.roleId })
    .from(userRoles)
    .where(eq(userRoles.userId, userId));

  if (userRoleRows.length === 0) return [];

  // 2. Load all roles to walk inheritance chains
  const allRolesData = await db.select().from(roles);
  const roleMap = new Map(allRolesData.map((r) => [r.id, r]));
  const assignedRoleIds = userRoleRows.map((r) => r.roleId);

  // 3. Expand to include all ancestor roles via parentRoleId chain
  // Also check for hasAllPermissions (wildcard) along the way
  const effectiveRoleIds = new Set<number>();

  for (const roleId of assignedRoleIds) {
    let current = roleMap.get(roleId);
    while (current) {
      if (current.hasAllPermissions) return ['*'];
      effectiveRoleIds.add(current.id);
      current = current.parentRoleId ? roleMap.get(current.parentRoleId) : undefined;
    }
  }

  // 4. Permissions from all effective roles (assigned + inherited)
  const rolePerms = await db
    .select({ key: permissions.key })
    .from(rolePermissions)
    .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
    .where(inArray(rolePermissions.roleId, [...effectiveRoleIds]));

  const permSet = new Set(rolePerms.map((r) => r.key));

  // 5. Direct grants/denies
  const directPerms = await db
    .select({
      key: permissions.key,
      granted: userPermissions.granted,
    })
    .from(userPermissions)
    .innerJoin(permissions, eq(userPermissions.permissionId, permissions.id))
    .where(eq(userPermissions.userId, userId));

  // 6. Merge role perms and direct grants/denies
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

//#region PASSWORD CHANGE
export async function changePassword(
  userId: string,
  input: ChangePasswordInput,
  currentToken: string,
) {
  // 1. Look up user
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);

  if (!user || !user.passwordHash) {
    throw createError({ statusCode: 401, message: 'Invalid current password' });
  }

  // 2. Verify current password
  const valid = await verifyPassword(input.currentPassword, user.passwordHash);
  if (!valid) {
    throw createError({ statusCode: 401, message: 'Invalid current password' });
  }

  // 3. Reject same as current password
  if (input.currentPassword === input.newPassword) {
    throw createError({
      statusCode: 400,
      message: 'New password must be different from current password',
    });
  }

  // 4. Hash + update
  const newHash = await hashPassword(input.newPassword);
  await db
    .update(users)
    .set({ passwordHash: newHash, updatedAt: new Date() })
    .where(eq(users.id, userId));

  // 5. Invalidate every session except the one making the request
  const currentTokenHash = hashSessionToken(currentToken);
  await db
    .delete(sessions)
    .where(and(eq(sessions.userId, userId), ne(sessions.tokenHash, currentTokenHash)));
}
//#endregion

//#region PASSWORD RESET
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

export async function requestPasswordReset(email: string) {
  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);

  if (!user || !user.isActive) return;

  const token = generateSessionToken();
  const tokenHash = hashSessionToken(token);
  const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS);

  await db.insert(passwordResetTokens).values({
    userId: user.id,
    tokenHash,
    expiresAt,
  });

  const { siteUrl } = useRuntimeConfig();
  const resetUrl = `${siteUrl}/reset-password?token=${encodeURIComponent(token)}`;
  const { subject, html } = renderPasswordResetEmail({
    recipientName: user.firstName,
    resetUrl,
    expiresAt,
  });

  await sendEmail(user.email, subject, html);
}

export async function resetPassword(input: ResetPasswordInput) {
  // 1. Look up token by hash
  const tokenHash = hashSessionToken(input.token);
  const [record] = await db
    .select()
    .from(passwordResetTokens)
    .where(
      and(
        eq(passwordResetTokens.tokenHash, tokenHash),
        gt(passwordResetTokens.expiresAt, new Date()),
        isNull(passwordResetTokens.usedAt),
      ),
    )
    .limit(1);

  if (!record) {
    throw createError({
      statusCode: 400,
      message: 'This reset link is invalid or has expired. Please request a new one.',
    });
  }

  // 2. Update password
  const newHash = await hashPassword(input.newPassword);
  await db
    .update(users)
    .set({ passwordHash: newHash, updatedAt: new Date() })
    .where(eq(users.id, record.userId));

  // 3. Mark token used
  await db
    .update(passwordResetTokens)
    .set({ usedAt: new Date() })
    .where(eq(passwordResetTokens.id, record.id));

  // 4. Invalidate every session for the user
  await db.delete(sessions).where(eq(sessions.userId, record.userId));
}
//#endregion
