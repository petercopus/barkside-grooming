import { and, count, desc, eq, inArray, isNull, sql } from 'drizzle-orm';
import { db } from '~~/server/db';
import {
  appointmentPets,
  appointments,
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
 * Scheduled-task body
 * ─────────────────────────────────── */

/**
 * Send 24-hour reminder notifications for appointments scheduled tomorrow.
 * Returns the number of reminders sent.
 */
export async function sendAppointmentReminders(now: Date = new Date()): Promise<number> {
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0]!;

  const petRows = await db
    .select({ appointmentId: appointmentPets.appointmentId })
    .from(appointmentPets)
    .where(eq(appointmentPets.scheduledDate, tomorrowStr))
    .groupBy(appointmentPets.appointmentId);

  if (petRows.length === 0) return 0;

  const appointmentIds = petRows.map((r) => r.appointmentId);

  const eligible = await db
    .select()
    .from(appointments)
    .where(
      and(
        inArray(appointments.id, appointmentIds),
        inArray(appointments.status, ['pending', 'pending_documents', 'confirmed']),
        isNull(appointments.reminderSentAt),
        sql`${appointments.customerId} IS NOT NULL`,
      ),
    );

  let sentCount = 0;
  for (const appt of eligible) {
    try {
      await sendNotification({
        userId: appt.customerId!,
        category: 'appointment_reminder',
        title: 'Appointment Reminder',
        body: 'You have an appointment scheduled for tomorrow.',
      });

      await db
        .update(appointments)
        .set({ reminderSentAt: new Date() })
        .where(eq(appointments.id, appt.id));

      sentCount++;
    } catch (err) {
      console.error(`Reminder failed for appointment ${appt.id}:`, err);
    }
  }

  return sentCount;
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
