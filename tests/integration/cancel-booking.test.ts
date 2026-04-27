/**
 * AI assisted with this file
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

async function post(path: string, body: object, cookie?: string) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (cookie) headers['Cookie'] = `session=${cookie}`;
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  return { res, data };
}

async function patch(path: string, body: object, cookie?: string) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (cookie) headers['Cookie'] = `session=${cookie}`;
  const res = await fetch(`${BASE}${path}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  return { res, data };
}

async function get(path: string, cookie?: string) {
  const headers: Record<string, string> = {};
  if (cookie) headers['Cookie'] = `session=${cookie}`;
  const res = await fetch(`${BASE}${path}`, { headers });
  const data = await res.json().catch(() => ({}));
  return { res, data };
}

async function put(path: string, body: object, cookie: string) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Cookie': `session=${cookie}`,
  };
  const res = await fetch(`${BASE}${path}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  return { res, data };
}

function getNextMonday(): string {
  const d = new Date();
  d.setDate(d.getDate() + ((8 - d.getDay()) % 7 || 7));
  return d.toISOString().split('T')[0]!;
}

/* ─────────────────────────────────── *
 * Tests
 * ─────────────────────────────────── */

describe('Cancel Booking API', () => {
  let adminCookie: string;
  let groomerId: string;
  let serviceId: number;
  let bookingDate: string;

  let custACookie: string;
  let custAPetId: string;
  let custBCookie: string;
  let custBApptId: string; // a booking owned by B — used for cross-user 404

  beforeAll(async () => {
    bookingDate = getNextMonday();

    const loginRes = await post('/api/auth/login', {
      email: 'admin@barkside.com',
      password: 'password123',
    });
    expect(loginRes.res.status).toBe(200);
    adminCookie = getSessionCookie(loginRes.res)!;

    const rolesRes = await get('/api/admin/roles', adminCookie);
    const groomerRole = rolesRes.data.roles.find((r: any) => r.name === 'Groomer');

    const servicesRes = await get('/api/services');
    const service = servicesRes.data.services.find((s: any) => s.name === 'Bath & Brush');
    serviceId = service.id;

    const empRes = await post(
      '/api/admin/employees',
      {
        email: `cancel-groomer-${Date.now()}@test.com`,
        password: 'password123',
        firstName: 'Cancel',
        lastName: 'Groomer',
        roleIds: [groomerRole.id],
        serviceIds: [serviceId],
      },
      adminCookie,
    );
    expect(empRes.res.status).toBe(200);
    groomerId = empRes.data.employee.id;

    const entries = [1, 2, 3, 4, 5].map((day) => ({
      dayOfWeek: day,
      startTime: '09:00',
      endTime: '17:00',
      isAvailable: true,
    }));
    await put(`/api/admin/employees/${groomerId}/schedule`, { entries }, adminCookie);

    /* Customer A */
    const a = await post('/api/auth/register', {
      email: `cancel-cust-a-${Date.now()}@test.com`,
      password: 'password123',
      firstName: 'Cancel',
      lastName: 'CustA',
    });
    custACookie = getSessionCookie(a.res)!;

    const aPet = await post(
      '/api/pets',
      { name: 'Rex', breed: 'Lab', weightLbs: 50, gender: 'male' },
      custACookie,
    );
    custAPetId = aPet.data.pet.id;

    /* Customer B + a booking — used to verify cross-user 404 */
    const b = await post('/api/auth/register', {
      email: `cancel-cust-b-${Date.now()}@test.com`,
      password: 'password123',
      firstName: 'Cancel',
      lastName: 'CustB',
    });
    custBCookie = getSessionCookie(b.res)!;

    const bPet = await post(
      '/api/pets',
      { name: 'Buddy', breed: 'Beagle', weightLbs: 25, gender: 'male' },
      custBCookie,
    );
    const bBook = await post(
      '/api/appointments',
      {
        pets: [
          {
            petId: bPet.data.pet.id,
            serviceIds: [serviceId],
            groomerId,
            scheduledDate: bookingDate,
            startTime: '15:00',
          },
        ],
      },
      custBCookie,
    );
    expect(bBook.res.status).toBe(200);
    custBApptId = bBook.data.appointment.id;
  });

  /** Helper — create a fresh booking for customer A at the given startTime. */
  async function bookA(startTime: string): Promise<string> {
    const r = await post(
      '/api/appointments',
      {
        pets: [
          {
            petId: custAPetId,
            serviceIds: [serviceId],
            groomerId,
            scheduledDate: bookingDate,
            startTime,
          },
        ],
      },
      custACookie,
    );
    expect(r.res.status).toBe(200);
    return r.data.appointment.id;
  }

  /* ─────────────────────────────────── *
   * Tests
   * ─────────────────────────────────── */

  it('PATCH /api/appointments/[id]/cancel: 401 without session', async () => {
    const apptId = await bookA('09:00');
    const { res } = await patch(`/api/appointments/${apptId}/cancel`, {});
    expect(res.status).toBe(401);
  });

  it('PATCH /api/appointments/[id]/cancel: 404 for another user’s booking', async () => {
    const { res } = await patch(`/api/appointments/${custBApptId}/cancel`, {}, custACookie);
    expect(res.status).toBe(404);
  });

  it('PATCH /api/appointments/[id]/cancel: 404 for unknown id', async () => {
    const { res } = await patch(
      '/api/appointments/00000000-0000-0000-0000-000000000000/cancel',
      {},
      custACookie,
    );
    expect(res.status).toBe(404);
  });

  it('PATCH /api/appointments/[id]/cancel: 200 cancels a pending_documents booking', async () => {
    const apptId = await bookA('10:30');

    const { res, data } = await patch(`/api/appointments/${apptId}/cancel`, {}, custACookie);
    expect(res.status).toBe(200);
    expect(data.appointment.status).toBe('cancelled');

    /* Confirm via GET that the new status persisted, including on appointmentPets */
    const after = await get(`/api/appointments/${apptId}`, custACookie);
    expect(after.data.appointment.status).toBe('cancelled');
    expect(after.data.appointment.pets.every((p: any) => p.status === 'cancelled')).toBe(true);
  });

  it('PATCH /api/appointments/[id]/cancel: 400 when re-cancelling an already-cancelled booking', async () => {
    const apptId = await bookA('12:00');

    const first = await patch(`/api/appointments/${apptId}/cancel`, {}, custACookie);
    expect(first.res.status).toBe(200);

    const second = await patch(`/api/appointments/${apptId}/cancel`, {}, custACookie);
    expect(second.res.status).toBe(400);
  });

  it('PATCH /api/appointments/[id]/cancel: 400 for a completed booking', async () => {
    const apptId = await bookA('13:30');

    /* Walk through admin status transitions until the booking is completed */
    for (const status of ['confirmed', 'in_progress', 'completed']) {
      const { res } = await patch(
        `/api/admin/appointments/${apptId}/status`,
        { status },
        adminCookie,
      );
      expect(res.status).toBe(200);
    }

    const { res } = await patch(`/api/appointments/${apptId}/cancel`, {}, custACookie);
    expect(res.status).toBe(400);
  });
});
