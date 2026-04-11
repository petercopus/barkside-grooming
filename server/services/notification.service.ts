import { and, count, desc, eq } from 'drizzle-orm';
import { db } from '~~/server/db';
import {
  notificationPreferences,
  notifications,
  roles,
  userRoles,
  users,
} from '~~/server/db/schema';
import type { NotificationCategory, UpdatePreferencesInput } from '~~/shared/schemas/notification';

/* ─────────────────────────────────── *
 * Types
 * ─────────────────────────────────── */
interface SendNotificationParams {
  userId: string;
  category: NotificationCategory;
  title: string;
  body: string;
  html?: string;
}

/* ─────────────────────────────────── *
 * Core: send notification
 * ─────────────────────────────────── */
/**
 * Checks user preferences, fans out to enabled channels, and writes a DB row per channel
 */
export async function sendNotification({
  userId,
  category,
  title,
  body,
  html,
}: SendNotificationParams) {
  // 1. Look up user preferences for this category
  // defaults: email=true, sms=false, inapp=true
  const [prefs] = await db
    .select()
    .from(notificationPreferences)
    .where(
      and(
        eq(notificationPreferences.userId, userId),
        eq(notificationPreferences.category, category),
      ),
    );

  const emailEnabled = prefs?.emailEnabled ?? true;
  const smsEnabled = prefs?.smsEnabled ?? false;
  const inappEnabled = prefs?.inappEnabled ?? true;

  // 2. Fetch user
  const [user] = await db
    .select({ email: users.email, phone: users.phone })
    .from(users)
    .where(eq(users.id, userId));

  if (!user) return;

  const now = new Date();

  // 3. Inapp channel
  if (inappEnabled) {
    await db.insert(notifications).values({
      userId,
      type: 'in_app',
      category,
      title,
      body,
      sentAt: now,
    });
  }

  // 4. Email channel
  if (emailEnabled && user.email) {
    let emailSentAt: Date | null = now;
    try {
      await sendEmail(user.email, title, html ?? body);
    } catch {
      emailSentAt = null;
    }

    await db.insert(notifications).values({
      userId,
      type: 'email',
      category,
      title,
      body,
      sentAt: emailSentAt,
    });
  }

  // 5. SMS channel
  if (smsEnabled && user.phone) {
    await sendSms(user.phone, body);

    await db.insert(notifications).values({
      userId,
      type: 'sms',
      category,
      title,
      body,
      sentAt: now,
    });
  }
}

/* ─────────────────────────────────── *
 * User queries
 * ─────────────────────────────────── */
export async function listNotifications(userId: string) {
  return db
    .select()
    .from(notifications)
    .where(and(eq(notifications.userId, userId), eq(notifications.type, 'in_app')))
    .orderBy(desc(notifications.createdAt))
    .limit(50);
}

export async function getUnreadCount(userId: string): Promise<number> {
  const [result] = await db
    .select({ value: count() })
    .from(notifications)
    .where(
      and(
        eq(notifications.userId, userId),
        eq(notifications.type, 'in_app'),
        eq(notifications.isRead, false),
      ),
    );

  return result?.value ?? 0;
}

export async function markAsRead(notificationId: string, userId: string) {
  await db
    .update(notifications)
    .set({ isRead: true })
    .where(and(eq(notifications.id, notificationId), eq(notifications.userId, userId)));
}

export async function markAllAsRead(userId: string) {
  await db
    .update(notifications)
    .set({ isRead: true })
    .where(
      and(
        eq(notifications.userId, userId),
        eq(notifications.type, 'in_app'),
        eq(notifications.isRead, false),
      ),
    );
}

/* ─────────────────────────────────── *
 * Preferences
 * ─────────────────────────────────── */
export async function getPreferences(userId: string) {
  return db
    .select()
    .from(notificationPreferences)
    .where(eq(notificationPreferences.userId, userId));
}

export async function upsertPreferences(userId: string, input: UpdatePreferencesInput) {
  await db
    .insert(notificationPreferences)
    .values({
      userId,
      category: input.category,
      emailEnabled: input.emailEnabled,
      smsEnabled: input.smsEnabled,
      inappEnabled: input.inappEnabled,
    })
    .onConflictDoUpdate({
      target: [notificationPreferences.userId, notificationPreferences.category],
      set: {
        emailEnabled: input.emailEnabled,
        smsEnabled: input.smsEnabled,
        inappEnabled: input.inappEnabled,
      },
    });
}

/* ─────────────────────────────────── *
 * Admin helpers
 * ─────────────────────────────────── */
/**
 * Used to send admin_new_booking notifications.
 */
export async function getAdminUserIds(): Promise<string[]> {
  const rows = await db
    .select({ userId: userRoles.userId })
    .from(userRoles)
    .innerJoin(roles, eq(roles.id, userRoles.roleId))
    .where(eq(roles.hasAllPermissions, true));

  // deduplicate in case a user has multiple admin roles
  return [...new Set(rows.map((r) => r.userId))];
}
