/**
 * AI assisted with this file
 *
 * Admin appointments: list (with filters), detail, status patches,
 * and invoice generation.
 *
 * Setup mirrors bookings.test.ts: create a fresh groomer + customer
 * + booking each run so we have a known appointment to operate on.
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

describe('Admin Appointments API', () => {
  let adminCookie: string;
  let groomerId: string;
  let serviceId: number;
  let bookingDate: string;
  let custCookie: string;
  let apptId: string;
  let secondApptId: string;

  beforeAll(async () => {
    bookingDate = getNextMonday();

    const login = await post('/api/auth/login', {
      email: 'admin@barkside.com',
      password: 'password123',
    });
    expect(login.res.status).toBe(200);
    adminCookie = getSessionCookie(login.res)!;

    const roles = await get('/api/admin/roles', adminCookie);
    const groomerRole = roles.data.roles.find((r: any) => r.name === 'Groomer');

    const services = await get('/api/services');
    const svc = services.data.services.find((s: any) => s.name === 'Bath & Brush');
    serviceId = svc.id;

    /* Dedicated groomer */
    const emp = await post(
      '/api/admin/employees',
      {
        email: `admin-appt-groomer-${Date.now()}@test.com`,
        password: 'password123',
        firstName: 'Appt',
        lastName: 'Groomer',
        roleIds: [groomerRole.id],
        serviceIds: [serviceId],
      },
      adminCookie,
    );
    expect(emp.res.status).toBe(200);
    groomerId = emp.data.employee.id;

    const entries = [1, 2, 3, 4, 5].map((dayOfWeek) => ({
      dayOfWeek,
      startTime: '09:00',
      endTime: '17:00',
      isAvailable: true,
    }));
    await put(`/api/admin/employees/${groomerId}/schedule`, { entries }, adminCookie);

    /* Customer */
    const reg = await post('/api/auth/register', {
      email: `admin-appt-cust-${Date.now()}@test.com`,
      password: 'password123',
      firstName: 'Appt',
      lastName: 'Customer',
    });
    expect(reg.res.status).toBe(200);
    custCookie = getSessionCookie(reg.res)!;

    const pet = await post(
      '/api/pets',
      { name: 'Rex', breed: 'Lab', weightLbs: 50, gender: 'male' },
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
            scheduledDate: bookingDate,
            startTime: '09:00',
          },
        ],
      },
      custCookie,
    );
    expect(book.res.status).toBe(200);
    apptId = book.data.appointment.id;

    /* Second booking we can use for filter assertions */
    const book2 = await post(
      '/api/appointments',
      {
        pets: [
          {
            petId: pet.data.pet.id,
            serviceIds: [serviceId],
            groomerId,
            scheduledDate: bookingDate,
            startTime: '11:00',
          },
        ],
      },
      custCookie,
    );
    expect(book2.res.status).toBe(200);
    secondApptId = book2.data.appointment.id;
  });

  /* ─── GET list ─── */

  it('GET /api/admin/appointments: returns array including the new bookings', async () => {
    const { res, data } = await get('/api/admin/appointments', adminCookie);
    expect(res.status).toBe(200);
    expect(Array.isArray(data.appointments)).toBe(true);
    expect(data.appointments.some((a: any) => a.id === apptId)).toBe(true);
  });

  it('GET /api/admin/appointments?status=pending_documents: filters by status', async () => {
    const { res, data } = await get(
      '/api/admin/appointments?status=pending_documents',
      adminCookie,
    );
    expect(res.status).toBe(200);
    expect(data.appointments.every((a: any) => a.status === 'pending_documents')).toBe(true);
    /* Our brand-new bookings are pending_documents (no vax doc on file) */
    expect(data.appointments.some((a: any) => a.id === apptId)).toBe(true);
  });

  it('GET /api/admin/appointments?date=…: filters by scheduled date', async () => {
    const { res, data } = await get(`/api/admin/appointments?date=${bookingDate}`, adminCookie);
    expect(res.status).toBe(200);
    /* Both bookings landed on bookingDate */
    const ids = data.appointments.map((a: any) => a.id);
    expect(ids).toContain(apptId);
    expect(ids).toContain(secondApptId);
  });

  it('GET /api/admin/appointments?date=2099-01-01: empty array for an unused date', async () => {
    const { res, data } = await get('/api/admin/appointments?date=2099-01-01', adminCookie);
    expect(res.status).toBe(200);
    expect(data.appointments).toEqual([]);
  });

  /* ─── GET detail ─── */

  it('GET /api/admin/appointments/[id]: returns enriched appointment', async () => {
    const { res, data } = await get(`/api/admin/appointments/${apptId}`, adminCookie);
    expect(res.status).toBe(200);
    expect(data.appointment.id).toBe(apptId);
    expect(Array.isArray(data.appointment.pets)).toBe(true);
    expect(data.appointment.pets[0].services?.length ?? 0).toBeGreaterThan(0);
  });

  it('GET /api/admin/appointments/[id]: 404 for unknown id', async () => {
    const { res } = await get(
      '/api/admin/appointments/00000000-0000-0000-0000-000000000000',
      adminCookie,
    );
    expect(res.status).toBe(404);
  });

  /* ─── PATCH status ─── */

  it('PATCH /api/admin/appointments/[id]/status: 400 on invalid status enum', async () => {
    const { res } = await patch(
      `/api/admin/appointments/${apptId}/status`,
      { status: 'flarbo' },
      adminCookie,
    );
    expect(res.status).toBe(400);
  });

  it('PATCH /api/admin/appointments/[id]/status: walks confirmed → in_progress → completed', async () => {
    for (const status of ['confirmed', 'in_progress', 'completed']) {
      const { res, data } = await patch(
        `/api/admin/appointments/${apptId}/status`,
        { status },
        adminCookie,
      );
      expect(res.status).toBe(200);
      expect(data.appointment.status).toBe(status);
    }
  });

  it('PATCH /api/admin/appointments/[id]/status: cancel applies to appointment + child pets', async () => {
    const cancelRes = await patch(
      `/api/admin/appointments/${secondApptId}/status`,
      { status: 'cancelled' },
      adminCookie,
    );
    expect(cancelRes.res.status).toBe(200);

    const after = await get(`/api/admin/appointments/${secondApptId}`, adminCookie);
    expect(after.data.appointment.status).toBe('cancelled');
    expect(after.data.appointment.pets.every((p: any) => p.status === 'cancelled')).toBe(true);
  });

  it('PATCH /api/admin/appointments/[id]/status: 404 for unknown id', async () => {
    const { res } = await patch(
      '/api/admin/appointments/00000000-0000-0000-0000-000000000000/status',
      { status: 'confirmed' },
      adminCookie,
    );
    expect(res.status).toBe(404);
  });

  /* ─── Invoice ─── */

  it('GET /api/admin/appointments/[id]/invoice: returns null before one is generated', async () => {
    /* Use a brand-new booking that hasn't had an invoice generated */
    const pet = await post(
      '/api/pets',
      { name: 'Inv', breed: 'Mix', weightLbs: 30, gender: 'female' },
      custCookie,
    );
    const fresh = await post(
      '/api/appointments',
      {
        pets: [
          {
            petId: pet.data.pet.id,
            serviceIds: [serviceId],
            groomerId,
            scheduledDate: bookingDate,
            startTime: '13:00',
          },
        ],
      },
      custCookie,
    );
    expect(fresh.res.status).toBe(200);
    const freshId = fresh.data.appointment.id;

    const { res, data } = await get(`/api/admin/appointments/${freshId}/invoice`, adminCookie);
    expect(res.status).toBe(200);
    expect(data.invoice).toBeNull();

    /* Now generate one */
    const gen = await post(`/api/admin/appointments/${freshId}/invoice`, {}, adminCookie);
    expect(gen.res.status).toBe(200);
    expect(gen.data.invoice.id).toBeTypeOf('string');
    expect(gen.data.invoice.status).toBe('draft');
    expect(gen.data.invoice.subtotalCents).toBeGreaterThan(0);
    expect(gen.data.invoice.totalCents).toBeGreaterThan(0);
    expect(Array.isArray(gen.data.invoice.lineItems)).toBe(true);
    expect(gen.data.invoice.lineItems.length).toBeGreaterThan(0);

    /* Subsequent GET should now return the invoice */
    const after = await get(`/api/admin/appointments/${freshId}/invoice`, adminCookie);
    expect(after.data.invoice.id).toBe(gen.data.invoice.id);

    /* Re-generation is idempotent: returns the existing draft */
    const regen = await post(`/api/admin/appointments/${freshId}/invoice`, {}, adminCookie);
    expect(regen.data.invoice.id).toBe(gen.data.invoice.id);
  });

  it('POST /api/admin/appointments/[id]/invoice: 404 for unknown appointment id', async () => {
    const { res } = await post(
      '/api/admin/appointments/00000000-0000-0000-0000-000000000000/invoice',
      {},
      adminCookie,
    );
    expect(res.status).toBe(404);
  });
});
