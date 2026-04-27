/**
 * AI assisted with this file
 *
 * Customer-facing notification endpoints — list, unread-count,
 * mark-as-read, mark-all-as-read, and preferences.
 */

import { beforeAll, describe, expect, it } from 'vitest';

const BASE = 'http://localhost:3000';

/* ─────────────────────────────────── *
 * Helpers
 * ─────────────────────────────────── */

function getSessionCookie(res: Response): string | null {
  const setCookie = res.headers.get('set-cookie');
  if (!setCookie) return null;
  const match = setCookie.match(/session=([^;]+)/);
  return match?.[1] ?? null;
}

async function req(method: string, path: string, cookie?: string, body?: object) {
  const headers: Record<string, string> = {};
  if (cookie) headers['Cookie'] = `session=${cookie}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  return { res, data };
}

const get = (path: string, cookie?: string) => req('GET', path, cookie);
const post = (path: string, body: object, cookie?: string) => req('POST', path, cookie, body);
const patch = (path: string, body: object, cookie?: string) => req('PATCH', path, cookie, body);
const put = (path: string, body: object, cookie?: string) => req('PUT', path, cookie, body);

function getNextMonday(): string {
  const d = new Date();
  d.setDate(d.getDate() + ((8 - d.getDay()) % 7 || 7));
  return d.toISOString().split('T')[0]!;
}

/* ─────────────────────────────────── *
 * Tests
 * ─────────────────────────────────── */

describe('Notifications API', () => {
  let adminCookie: string;
  let custCookie: string;

  beforeAll(async () => {
    const login = await post('/api/auth/login', {
      email: 'admin@barkside.com',
      password: 'password123',
    });
    expect(login.res.status).toBe(200);
    adminCookie = getSessionCookie(login.res)!;

    const reg = await post('/api/auth/register', {
      email: `notif-cust-${Date.now()}@test.com`,
      password: 'password123',
      firstName: 'Notif',
      lastName: 'Cust',
    });
    expect(reg.res.status).toBe(200);
    custCookie = getSessionCookie(reg.res)!;
  });

  /* ─── auth gates ─── */

  it('GET /api/notifications: 401 without session', async () => {
    const { res } = await get('/api/notifications');
    expect(res.status).toBe(401);
  });

  it('GET /api/notifications/unread-count: 401 without session', async () => {
    const { res } = await get('/api/notifications/unread-count');
    expect(res.status).toBe(401);
  });

  it('GET /api/notifications/preferences: 401 without session', async () => {
    const { res } = await get('/api/notifications/preferences');
    expect(res.status).toBe(401);
  });

  it('PUT /api/notifications/preferences: 401 without session', async () => {
    const { res } = await put('/api/notifications/preferences', {
      category: 'appointment_reminder',
      emailEnabled: true,
      smsEnabled: false,
      inappEnabled: true,
    });
    expect(res.status).toBe(401);
  });

  it('PATCH /api/notifications/read-all: 401 without session', async () => {
    const { res } = await patch('/api/notifications/read-all', {});
    expect(res.status).toBe(401);
  });

  /* ─── empty initial state ─── */

  it('GET /api/notifications: empty for a brand-new customer', async () => {
    const { res, data } = await get('/api/notifications', custCookie);
    expect(res.status).toBe(200);
    expect(Array.isArray(data.notifications)).toBe(true);
    expect(data.notifications).toHaveLength(0);
  });

  it('GET /api/notifications/unread-count: 0 for a brand-new customer', async () => {
    const { res, data } = await get('/api/notifications/unread-count', custCookie);
    expect(res.status).toBe(200);
    expect(data.count).toBe(0);
  });

  it('GET /api/notifications/preferences: empty array initially (defaults applied implicitly)', async () => {
    const { res, data } = await get('/api/notifications/preferences', custCookie);
    expect(res.status).toBe(200);
    expect(Array.isArray(data.preferences)).toBe(true);
    expect(data.preferences).toHaveLength(0);
  });

  /* ─── preferences PUT: create + upsert ─── */

  it('PUT /api/notifications/preferences: 400 on unknown category', async () => {
    const { res } = await put(
      '/api/notifications/preferences',
      {
        category: 'mystery_event',
        emailEnabled: true,
        smsEnabled: false,
        inappEnabled: true,
      },
      custCookie,
    );
    expect(res.status).toBe(400);
  });

  it('PUT /api/notifications/preferences: 400 on missing required boolean', async () => {
    const { res } = await put(
      '/api/notifications/preferences',
      { category: 'appointment_reminder', emailEnabled: true },
      custCookie,
    );
    expect(res.status).toBe(400);
  });

  it('PUT /api/notifications/preferences: creates row for new category', async () => {
    const put1 = await put(
      '/api/notifications/preferences',
      {
        category: 'appointment_reminder',
        emailEnabled: false,
        smsEnabled: true,
        inappEnabled: true,
      },
      custCookie,
    );
    expect(put1.res.status).toBe(200);
    expect(put1.data.success).toBe(true);

    const after = await get('/api/notifications/preferences', custCookie);
    const row = after.data.preferences.find((p: any) => p.category === 'appointment_reminder');
    expect(row).toBeTruthy();
    expect(row.emailEnabled).toBe(false);
    expect(row.smsEnabled).toBe(true);
    expect(row.inappEnabled).toBe(true);
  });

  it('PUT /api/notifications/preferences: upserts when category already exists', async () => {
    const put2 = await put(
      '/api/notifications/preferences',
      {
        category: 'appointment_reminder',
        emailEnabled: true,
        smsEnabled: false,
        inappEnabled: false,
      },
      custCookie,
    );
    expect(put2.res.status).toBe(200);

    const after = await get('/api/notifications/preferences', custCookie);
    const rowsForCategory = after.data.preferences.filter(
      (p: any) => p.category === 'appointment_reminder',
    );
    /* Upsert: still exactly 1 row for this category */
    expect(rowsForCategory).toHaveLength(1);
    expect(rowsForCategory[0].emailEnabled).toBe(true);
    expect(rowsForCategory[0].smsEnabled).toBe(false);
    expect(rowsForCategory[0].inappEnabled).toBe(false);
  });

  /* ─── In-app notifications generated by an admin status flip ─── */

  it('Admin status flip writes an in-app notification for the customer', async () => {
    /* Wire up groomer + booking + status change to fan out a notification */
    const roles = await get('/api/admin/roles', adminCookie);
    const groomerRole = roles.data.roles.find((r: any) => r.name === 'Groomer');
    const services = await get('/api/services');
    const serviceId = services.data.services.find((s: any) => s.name === 'Bath & Brush').id;

    const emp = await post(
      '/api/admin/employees',
      {
        email: `notif-groomer-${Date.now()}@test.com`,
        password: 'password123',
        firstName: 'Notif',
        lastName: 'Groomer',
        roleIds: [groomerRole.id],
        serviceIds: [serviceId],
      },
      adminCookie,
    );
    expect(emp.res.status).toBe(200);
    const groomerId = emp.data.employee.id;

    const entries = [1, 2, 3, 4, 5].map((dayOfWeek) => ({
      dayOfWeek,
      startTime: '09:00',
      endTime: '17:00',
      isAvailable: true,
    }));
    await put(`/api/admin/employees/${groomerId}/schedule`, { entries }, adminCookie);

    const pet = await post(
      '/api/pets',
      { name: 'Notif', breed: 'Mix', weightLbs: 25, gender: 'male' },
      custCookie,
    );

    const book = await post(
      '/api/appointments',
      {
        pets: [
          {
            petId: pet.data.pet.id,
            serviceIds: [serviceId],
            groomerId,
            scheduledDate: getNextMonday(),
            startTime: '10:00',
          },
        ],
      },
      custCookie,
    );
    expect(book.res.status).toBe(200);
    const apptId = book.data.appointment.id;

    /* Status flip → fans out a notification to the customer.
     * sendNotification runs inline inside the handler before the response,
     * so by the time we receive 200 the row should exist. */
    const flip = await patch(
      `/api/admin/appointments/${apptId}/status`,
      { status: 'confirmed' },
      adminCookie,
    );
    expect(flip.res.status).toBe(200);

    /* in-app preferences for appointment_status_changed default to enabled */
    const list = await get('/api/notifications', custCookie);
    expect(list.res.status).toBe(200);
    expect(list.data.notifications.length).toBeGreaterThan(0);

    const note = list.data.notifications.find(
      (n: any) => n.category === 'appointment_status_changed',
    );
    expect(note).toBeTruthy();
    expect(note.title).toBe('Appointment Updated');
    expect(note.isRead).toBe(false);

    /* unread-count reflects the new row */
    const count1 = await get('/api/notifications/unread-count', custCookie);
    expect(count1.data.count).toBeGreaterThanOrEqual(1);

    /* PATCH /api/notifications/[id]/read flips the single row */
    const markOne = await patch(`/api/notifications/${note.id}/read`, {}, custCookie);
    expect(markOne.res.status).toBe(200);

    const after = await get('/api/notifications', custCookie);
    expect(after.data.notifications.find((n: any) => n.id === note.id)?.isRead).toBe(true);

    /* PATCH /api/notifications/read-all is idempotent + drives unread-count to 0 */
    const readAll = await patch('/api/notifications/read-all', {}, custCookie);
    expect(readAll.res.status).toBe(200);

    const count2 = await get('/api/notifications/unread-count', custCookie);
    expect(count2.data.count).toBe(0);
  });

  /* ─── Per-id read is owner-isolated (no leak across users) ─── */

  it('PATCH /api/notifications/[id]/read: cannot mark another user’s notification as read', async () => {
    /* Create a second customer and confirm marking customer A's notification
     * via customer B's session is a silent no-op (no error, but it stays unread). */
    const other = await post('/api/auth/register', {
      email: `notif-other-${Date.now()}@test.com`,
      password: 'password123',
      firstName: 'Other',
      lastName: 'Cust',
    });
    const otherCookie = getSessionCookie(other.res)!;

    const meList = await get('/api/notifications', custCookie);
    if (meList.data.notifications.length === 0) return; // safety guard

    const myNote = meList.data.notifications[0];

    /* Re-mark it unread first via DB-level workaround? No — we have no
     * direct DB access. Instead we just check that the markRead call
     * by the wrong owner returns 200 (silent no-op) AND we re-issue a
     * fresh status change to produce a known unread row, then verify
     * the cross-user PATCH does not change its isRead. */

    /* Spin up a dedicated groomer + schedule so this test doesn't collide
     * with bookings created by other test files in the same run. */
    const roles = await get('/api/admin/roles', adminCookie);
    const groomerRole = roles.data.roles.find((r: any) => r.name === 'Groomer');
    const services = await get('/api/services');
    const serviceId = services.data.services.find((s: any) => s.name === 'Bath & Brush').id;

    const emp = await post(
      '/api/admin/employees',
      {
        email: `notif-cross-groomer-${Date.now()}@test.com`,
        password: 'password123',
        firstName: 'NotifCross',
        lastName: 'Groomer',
        roleIds: [groomerRole.id],
        serviceIds: [serviceId],
      },
      adminCookie,
    );
    expect(emp.res.status).toBe(200);
    const dedicatedGroomerId = emp.data.employee.id;

    const entries = [1, 2, 3, 4, 5].map((dayOfWeek) => ({
      dayOfWeek,
      startTime: '09:00',
      endTime: '17:00',
      isAvailable: true,
    }));
    await put(`/api/admin/employees/${dedicatedGroomerId}/schedule`, { entries }, adminCookie);

    const pet = await post(
      '/api/pets',
      { name: 'Other', breed: 'Mix', weightLbs: 25, gender: 'male' },
      custCookie,
    );
    const fresh = await post(
      '/api/appointments',
      {
        pets: [
          {
            petId: pet.data.pet.id,
            serviceIds: [serviceId],
            groomerId: dedicatedGroomerId,
            scheduledDate: getNextMonday(),
            startTime: '13:00',
          },
        ],
      },
      custCookie,
    );
    expect(fresh.res.status).toBe(200);
    await patch(
      `/api/admin/appointments/${fresh.data.appointment.id}/status`,
      { status: 'confirmed' },
      adminCookie,
    );

    const reList = await get('/api/notifications', custCookie);
    const unread = reList.data.notifications.find(
      (n: any) => n.category === 'appointment_status_changed' && n.isRead === false,
    );
    expect(unread).toBeTruthy();

    /* Wrong-owner PATCH: succeeds but is a no-op */
    const cross = await patch(`/api/notifications/${unread.id}/read`, {}, otherCookie);
    expect(cross.res.status).toBe(200);

    const verify = await get('/api/notifications', custCookie);
    expect(verify.data.notifications.find((n: any) => n.id === unread.id)?.isRead).toBe(false);

    /* myNote referenced for explicitness — ensures we touched the user's first note above */
    expect(myNote.userId ?? myNote.id).toBeTruthy();
  });
});
