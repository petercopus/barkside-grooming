/**
 * AI assisted with this file
 */
import { and, eq, inArray } from 'drizzle-orm';
import { afterEach, describe, expect, it } from 'vitest';
import { db } from '~~/server/db';
import {
  notificationPreferences,
  notifications,
  rolePermissions,
  roles,
  userRoles,
  users,
} from '~~/server/db/schema';
import {
  getAdminUserIds,
  getPreferences,
  getUnreadCount,
  listNotifications,
  markAllAsRead,
  markAsRead,
  sendNotification,
  upsertPreferences,
} from '~~/server/services/notification.service';

/* ─────────────────────────────────── *
 * Fixtures
 * ─────────────────────────────────── */

async function insertUser(opts: { email?: string; phone?: string | null } = {}): Promise<string> {
  const [u] = await db
    .insert(users)
    .values({
      email: opts.email ?? `notif-${Date.now()}-${Math.random().toString(36).slice(2)}@test.local`,
      passwordHash: null,
      firstName: 'Notif',
      lastName: 'Test',
      phone: opts.phone ?? null,
    })
    .returning({ id: users.id });
  return u!.id;
}

/* ─────────────────────────────────── *
 * sendNotification — preferences + fan-out
 * ─────────────────────────────────── */

describe('sendNotification', () => {
  const createdUserIds: string[] = [];

  afterEach(async () => {
    if (createdUserIds.length) {
      await db.delete(notifications).where(inArray(notifications.userId, createdUserIds));
      await db
        .delete(notificationPreferences)
        .where(inArray(notificationPreferences.userId, createdUserIds));
      await db.delete(users).where(inArray(users.id, createdUserIds));
    }
    createdUserIds.length = 0;
  });

  it('with no preferences row: writes in_app + email, skips sms (defaults)', async () => {
    const userId = await insertUser({ phone: '+15551111' });
    createdUserIds.push(userId);

    await sendNotification({
      userId,
      category: 'appointment_reminder',
      title: 'T',
      body: 'B',
    });

    const rows = await db
      .select({ type: notifications.type })
      .from(notifications)
      .where(eq(notifications.userId, userId));
    const types = rows.map((r) => r.type).sort();
    expect(types).toEqual(['email', 'in_app']);
  });

  it('respects emailEnabled=false in stored preferences', async () => {
    const userId = await insertUser();
    createdUserIds.push(userId);

    await db.insert(notificationPreferences).values({
      userId,
      category: 'appointment_reminder',
      emailEnabled: false,
      smsEnabled: false,
      inappEnabled: true,
    });

    await sendNotification({
      userId,
      category: 'appointment_reminder',
      title: 'T',
      body: 'B',
    });

    const rows = await db
      .select({ type: notifications.type })
      .from(notifications)
      .where(eq(notifications.userId, userId));
    expect(rows.map((r) => r.type)).toEqual(['in_app']);
  });

  it('writes sms row when smsEnabled=true AND user has a phone', async () => {
    const userId = await insertUser({ phone: '+15552222' });
    createdUserIds.push(userId);

    await db.insert(notificationPreferences).values({
      userId,
      category: 'appointment_reminder',
      emailEnabled: false,
      smsEnabled: true,
      inappEnabled: false,
    });

    await sendNotification({
      userId,
      category: 'appointment_reminder',
      title: 'T',
      body: 'B',
    });

    const rows = await db
      .select({ type: notifications.type })
      .from(notifications)
      .where(eq(notifications.userId, userId));
    expect(rows.map((r) => r.type)).toEqual(['sms']);
  });

  it('skips sms when user.phone is null even if smsEnabled', async () => {
    const userId = await insertUser({ phone: null });
    createdUserIds.push(userId);

    await db.insert(notificationPreferences).values({
      userId,
      category: 'appointment_reminder',
      emailEnabled: false,
      smsEnabled: true,
      inappEnabled: false,
    });

    await sendNotification({
      userId,
      category: 'appointment_reminder',
      title: 'T',
      body: 'B',
    });

    const rows = await db
      .select({ type: notifications.type })
      .from(notifications)
      .where(eq(notifications.userId, userId));
    expect(rows).toHaveLength(0);
  });

  it('marks email sentAt = null when sendEmail throws', async () => {
    const userId = await insertUser();
    createdUserIds.push(userId);

    type GlobalWithSend = {
      sendEmail: (to: string, subject: string, html: string) => Promise<void>;
    };
    const g = globalThis as unknown as GlobalWithSend;
    const original = g.sendEmail;
    g.sendEmail = async () => {
      throw new Error('boom');
    };

    try {
      await sendNotification({
        userId,
        category: 'appointment_reminder',
        title: 'T',
        body: 'B',
      });
    } finally {
      g.sendEmail = original;
    }

    const [emailRow] = await db
      .select({ sentAt: notifications.sentAt })
      .from(notifications)
      .where(and(eq(notifications.userId, userId), eq(notifications.type, 'email')));
    expect(emailRow?.sentAt).toBeNull();
  });

  it('returns silently when the user does not exist', async () => {
    // Random but never-inserted UUID
    const fakeUserId = '00000000-0000-4000-8000-000000000000';

    await sendNotification({
      userId: fakeUserId,
      category: 'appointment_reminder',
      title: 'T',
      body: 'B',
    });

    const rows = await db
      .select({ id: notifications.id })
      .from(notifications)
      .where(eq(notifications.userId, fakeUserId));
    // No user → in_app insert would FK-fail. The function returns before inserts.
    expect(rows).toHaveLength(0);
  });
});

/* ─────────────────────────────────── *
 * In-app helpers
 * ─────────────────────────────────── */

describe('in-app helpers', () => {
  const createdUserIds: string[] = [];

  afterEach(async () => {
    if (createdUserIds.length) {
      await db.delete(notifications).where(inArray(notifications.userId, createdUserIds));
      await db.delete(users).where(inArray(users.id, createdUserIds));
    }
    createdUserIds.length = 0;
  });

  it('listNotifications returns only in_app rows for the given user, newest first', async () => {
    const userId = await insertUser();
    const otherUserId = await insertUser();
    createdUserIds.push(userId, otherUserId);

    await db.insert(notifications).values([
      {
        userId,
        type: 'in_app',
        category: 'appointment_reminder',
        title: 'older',
        body: 'b',
        createdAt: new Date('2099-01-01T00:00:00Z'),
      },
      {
        userId,
        type: 'in_app',
        category: 'appointment_reminder',
        title: 'newer',
        body: 'b',
        createdAt: new Date('2099-02-01T00:00:00Z'),
      },
      // email row should be excluded
      { userId, type: 'email', category: 'appointment_reminder', title: 'email', body: 'b' },
      // other user's in_app should be excluded
      {
        userId: otherUserId,
        type: 'in_app',
        category: 'appointment_reminder',
        title: 'x',
        body: 'b',
      },
    ]);

    const rows = await listNotifications(userId);
    expect(rows.map((r) => r.title)).toEqual(['newer', 'older']);
  });

  it('getUnreadCount counts only unread in_app rows', async () => {
    const userId = await insertUser();
    createdUserIds.push(userId);

    await db.insert(notifications).values([
      {
        userId,
        type: 'in_app',
        category: 'appointment_reminder',
        title: 'a',
        body: 'b',
        isRead: false,
      },
      {
        userId,
        type: 'in_app',
        category: 'appointment_reminder',
        title: 'b',
        body: 'b',
        isRead: false,
      },
      {
        userId,
        type: 'in_app',
        category: 'appointment_reminder',
        title: 'c',
        body: 'b',
        isRead: true,
      },
      {
        userId,
        type: 'email',
        category: 'appointment_reminder',
        title: 'd',
        body: 'b',
        isRead: false,
      },
    ]);

    expect(await getUnreadCount(userId)).toBe(2);
  });

  it('markAsRead only flips the matching notification for the right user', async () => {
    const userId = await insertUser();
    const otherUserId = await insertUser();
    createdUserIds.push(userId, otherUserId);

    const [n1, nOther] = await db
      .insert(notifications)
      .values([
        { userId, type: 'in_app', category: 'appointment_reminder', title: 'mine', body: 'b' },
        {
          userId: otherUserId,
          type: 'in_app',
          category: 'appointment_reminder',
          title: 'theirs',
          body: 'b',
        },
      ])
      .returning({ id: notifications.id });

    // Trying to mark another user's notification using my userId is a no-op
    await markAsRead(nOther!.id, userId);

    const [stillUnread] = await db
      .select({ isRead: notifications.isRead })
      .from(notifications)
      .where(eq(notifications.id, nOther!.id));
    expect(stillUnread?.isRead).toBe(false);

    await markAsRead(n1!.id, userId);
    const [updated] = await db
      .select({ isRead: notifications.isRead })
      .from(notifications)
      .where(eq(notifications.id, n1!.id));
    expect(updated?.isRead).toBe(true);
  });

  it('markAllAsRead flips every unread in_app for the user, leaves email rows alone', async () => {
    const userId = await insertUser();
    createdUserIds.push(userId);

    await db.insert(notifications).values([
      {
        userId,
        type: 'in_app',
        category: 'appointment_reminder',
        title: 'a',
        body: 'b',
        isRead: false,
      },
      {
        userId,
        type: 'in_app',
        category: 'appointment_reminder',
        title: 'b',
        body: 'b',
        isRead: false,
      },
      {
        userId,
        type: 'email',
        category: 'appointment_reminder',
        title: 'c',
        body: 'b',
        isRead: false,
      },
    ]);

    await markAllAsRead(userId);

    const rows = await db
      .select({ type: notifications.type, isRead: notifications.isRead })
      .from(notifications)
      .where(eq(notifications.userId, userId));
    const inApp = rows.filter((r) => r.type === 'in_app');
    const email = rows.filter((r) => r.type === 'email');
    expect(inApp.every((r) => r.isRead)).toBe(true);
    expect(email[0]?.isRead).toBe(false);
  });
});

/* ─────────────────────────────────── *
 * Preferences
 * ─────────────────────────────────── */

describe('preferences', () => {
  const createdUserIds: string[] = [];

  afterEach(async () => {
    if (createdUserIds.length) {
      await db
        .delete(notificationPreferences)
        .where(inArray(notificationPreferences.userId, createdUserIds));
      await db.delete(users).where(inArray(users.id, createdUserIds));
    }
    createdUserIds.length = 0;
  });

  it('upsertPreferences inserts on first call, updates on second (no duplicates)', async () => {
    const userId = await insertUser();
    createdUserIds.push(userId);

    await upsertPreferences(userId, {
      category: 'appointment_reminder',
      emailEnabled: true,
      smsEnabled: true,
      inappEnabled: false,
    });

    let rows = await getPreferences(userId);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.smsEnabled).toBe(true);
    expect(rows[0]?.inappEnabled).toBe(false);

    await upsertPreferences(userId, {
      category: 'appointment_reminder',
      emailEnabled: false,
      smsEnabled: false,
      inappEnabled: true,
    });

    rows = await getPreferences(userId);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.emailEnabled).toBe(false);
    expect(rows[0]?.smsEnabled).toBe(false);
    expect(rows[0]?.inappEnabled).toBe(true);
  });
});

/* ─────────────────────────────────── *
 * Admin discovery
 * ─────────────────────────────────── */

describe('getAdminUserIds', () => {
  const createdUserIds: string[] = [];
  const createdRoleIds: number[] = [];

  afterEach(async () => {
    if (createdRoleIds.length) {
      await db.delete(rolePermissions).where(inArray(rolePermissions.roleId, createdRoleIds));
      await db.delete(userRoles).where(inArray(userRoles.roleId, createdRoleIds));
      await db.delete(roles).where(inArray(roles.id, createdRoleIds));
    }
    if (createdUserIds.length) {
      await db.delete(users).where(inArray(users.id, createdUserIds));
    }
    createdUserIds.length = 0;
    createdRoleIds.length = 0;
  });

  it('returns user ids attached to roles with hasAllPermissions=true and dedupes them', async () => {
    const u1 = await insertUser();
    const u2 = await insertUser();
    createdUserIds.push(u1, u2);

    const [adminA] = await db
      .insert(roles)
      .values({
        name: `test-admin-A-${Date.now()}`,
        hasAllPermissions: true,
      })
      .returning({ id: roles.id });
    const [adminB] = await db
      .insert(roles)
      .values({
        name: `test-admin-B-${Date.now()}`,
        hasAllPermissions: true,
      })
      .returning({ id: roles.id });
    const [nonAdmin] = await db
      .insert(roles)
      .values({
        name: `test-nonadmin-${Date.now()}`,
        hasAllPermissions: false,
      })
      .returning({ id: roles.id });
    createdRoleIds.push(adminA!.id, adminB!.id, nonAdmin!.id);

    await db.insert(userRoles).values([
      { userId: u1, roleId: adminA!.id }, // admin
      { userId: u1, roleId: adminB!.id }, // also admin via second role — should dedupe
      { userId: u2, roleId: nonAdmin!.id }, // not an admin
    ]);

    const ids = await getAdminUserIds();
    // u1 must be present exactly once; u2 must be absent
    expect(ids.filter((id) => id === u1)).toHaveLength(1);
    expect(ids).not.toContain(u2);
  });
});
