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

type Slot = { startTime: string; endTime: string };
type GroomerSlot = { groomerId: string; groomerName: string; slots: Slot[] };

/* ─────────────────────────────────── *
 * Tests
 * ─────────────────────────────────── */

describe('Availability API', () => {
  let adminCookie: string;
  let groomerId: string;
  let serviceId: number;
  let bookingDate: string;

  let custCookie: string;
  let petId: string;

  beforeAll(async () => {
    bookingDate = getNextMonday();

    /* Admin login */
    const loginRes = await post('/api/auth/login', {
      email: 'admin@barkside.com',
      password: 'password123',
    });
    expect(loginRes.res.status).toBe(200);
    adminCookie = getSessionCookie(loginRes.res)!;

    /* Lookup Groomer role + service */
    const rolesRes = await get('/api/admin/roles', adminCookie);
    const groomerRole = rolesRes.data.roles.find((r: any) => r.name === 'Groomer');
    expect(groomerRole).toBeTruthy();

    const servicesRes = await get('/api/services');
    const service = servicesRes.data.services.find((s: any) => s.name === 'Bath & Brush');
    expect(service).toBeTruthy();
    serviceId = service.id;

    /* Dedicated groomer for this suite */
    const empRes = await post(
      '/api/admin/employees',
      {
        email: `availability-groomer-${Date.now()}@test.com`,
        password: 'password123',
        firstName: 'Availability',
        lastName: 'Groomer',
        roleIds: [groomerRole.id],
        serviceIds: [serviceId],
      },
      adminCookie,
    );
    expect(empRes.res.status).toBe(200);
    groomerId = empRes.data.employee.id;

    /* Mon–Fri 09:00–17:00 */
    const entries = [1, 2, 3, 4, 5].map((day) => ({
      dayOfWeek: day,
      startTime: '09:00',
      endTime: '17:00',
      isAvailable: true,
    }));
    const schedRes = await put(
      `/api/admin/employees/${groomerId}/schedule`,
      { entries },
      adminCookie,
    );
    expect(schedRes.res.status).toBe(200);

    /* Customer + pet for the booking-impact test */
    const custRes = await post('/api/auth/register', {
      email: `availability-cust-${Date.now()}@test.com`,
      password: 'password123',
      firstName: 'Avail',
      lastName: 'Customer',
    });
    expect(custRes.res.status).toBe(200);
    custCookie = getSessionCookie(custRes.res)!;

    const petRes = await post(
      '/api/pets',
      { name: 'Rex', breed: 'Labrador', weightLbs: 50, gender: 'male' },
      custCookie,
    );
    expect(petRes.res.status).toBe(200);
    petId = petRes.data.pet.id;
  });

  /* ─────────────────────────────────── *
   * Validation
   * ─────────────────────────────────── */

  it('GET /api/availability: 400 when date is missing', async () => {
    const { res } = await get('/api/availability?duration=60');
    expect(res.status).toBe(400);
  });

  it('GET /api/availability: 400 on invalid date format', async () => {
    const { res } = await get('/api/availability?date=not-a-date&duration=60');
    expect(res.status).toBe(400);
  });

  it('GET /api/availability: 400 on past date', async () => {
    const { res } = await get('/api/availability?date=2020-01-01&duration=60');
    expect(res.status).toBe(400);
  });

  it('GET /api/availability: 400 when duration is missing', async () => {
    const { res } = await get(`/api/availability?date=${bookingDate}`);
    expect(res.status).toBe(400);
  });

  it('GET /api/availability: 400 when duration is non-positive', async () => {
    const { res } = await get(`/api/availability?date=${bookingDate}&duration=0`);
    expect(res.status).toBe(400);
  });

  /* ─────────────────────────────────── *
   * Public access + happy path
   * ─────────────────────────────────── */

  it('GET /api/availability: is publicly accessible (no session required)', async () => {
    const { res, data } = await get(`/api/availability?date=${bookingDate}&duration=60`);
    expect(res.status).toBe(200);
    expect(Array.isArray(data.slots)).toBe(true);
  });

  it('GET /api/availability: returns slots for our seeded groomer', async () => {
    const { res, data } = await get(
      `/api/availability?date=${bookingDate}&duration=60&serviceIds=${serviceId}`,
    );
    expect(res.status).toBe(200);

    const mine = (data.slots as GroomerSlot[]).find((g) => g.groomerId === groomerId);
    expect(mine).toBeTruthy();
    // Mon–Fri 09:00–17:00 with duration 60 and 30-min start cadence → 09:00, 09:30, …, 16:00
    expect(mine!.slots.length).toBeGreaterThan(0);
    expect(mine!.slots.some((s) => s.startTime === '10:00')).toBe(true);
  });

  it('GET /api/availability: subtracts a 10:00 booking from our groomer slots', async () => {
    /* Book at 10:00 — actual duration depends on pet size category */
    const bookRes = await post(
      '/api/appointments',
      {
        pets: [
          {
            petId,
            serviceIds: [serviceId],
            groomerId,
            scheduledDate: bookingDate,
            startTime: '10:00',
          },
        ],
      },
      custCookie,
    );
    expect(bookRes.res.status).toBe(200);
    const bookedEnd: string = bookRes.data.appointment.pets[0].endTime; // "HH:MM:SS"

    const { res, data } = await get(
      `/api/availability?date=${bookingDate}&duration=60&serviceIds=${serviceId}`,
    );
    expect(res.status).toBe(200);

    const mine = (data.slots as GroomerSlot[]).find((g) => g.groomerId === groomerId);
    expect(mine).toBeTruthy();

    /* No remaining slot should overlap the booking [10:00, bookedEnd) */
    const toMin = (t: string) => {
      const [h, m] = t.split(':');
      return parseInt(h!, 10) * 60 + parseInt(m!, 10);
    };
    const bookedStartM = toMin('10:00');
    const bookedEndM = toMin(bookedEnd);
    for (const s of mine!.slots) {
      const sStart = toMin(s.startTime);
      const sEnd = toMin(s.endTime);
      const overlaps = sStart < bookedEndM && sEnd > bookedStartM;
      expect(overlaps).toBe(false);
    }

    /* And a slot starting at or after bookedEnd should still exist */
    expect(mine!.slots.some((s) => toMin(s.startTime) >= bookedEndM)).toBe(true);
  });

  it('GET /api/availability: returns [] when no groomer is qualified for the requested service', async () => {
    /* 99999 is not a real service id → intersection is empty */
    const { res, data } = await get(
      `/api/availability?date=${bookingDate}&duration=60&serviceIds=99999`,
    );
    expect(res.status).toBe(200);
    expect(data.slots).toEqual([]);
  });
});
