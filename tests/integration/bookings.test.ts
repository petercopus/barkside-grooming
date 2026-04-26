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

/* ─────────────────────────────────── *
 * Tests
 * ─────────────────────────────────── */

describe('Bookings API', () => {
  let adminCookie: string;
  let groomerId: string;
  let serviceId: number;
  let bookingDate: string;

  // Customer A: registered, has two pets — used for happy/conflict cases
  let custACookie: string;
  let custAPetA: string;
  let custAPetB: string;

  // Customer B: registered, no pets — used to attempt booking someone else's pet
  let custBCookie: string;

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

    /* Create dedicated groomer for this suite */
    const empRes = await post(
      '/api/admin/employees',
      {
        email: `bookings-groomer-${Date.now()}@test.com`,
        password: 'password123',
        firstName: 'Bookings',
        lastName: 'Groomer',
        roleIds: [groomerRole.id],
        serviceIds: [serviceId],
      },
      adminCookie,
    );
    expect(empRes.res.status).toBe(200);
    groomerId = empRes.data.employee.id;

    /* Mon–Fri 09:00–17:00 schedule */
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

    /* Customer A + two pets */
    const custARes = await post('/api/auth/register', {
      email: `bookings-cust-a-${Date.now()}@test.com`,
      password: 'password123',
      firstName: 'Cust',
      lastName: 'A',
    });
    expect(custARes.res.status).toBe(200);
    custACookie = getSessionCookie(custARes.res)!;

    const petARes = await post(
      '/api/pets',
      { name: 'Rex', breed: 'Labrador', weightLbs: 50, gender: 'male' },
      custACookie,
    );
    expect(petARes.res.status).toBe(200);
    custAPetA = petARes.data.pet.id;

    const petBRes = await post(
      '/api/pets',
      { name: 'Buddy', breed: 'Golden', weightLbs: 50, gender: 'male' },
      custACookie,
    );
    expect(petBRes.res.status).toBe(200);
    custAPetB = petBRes.data.pet.id;

    /* Customer B (no pets) */
    const custBRes = await post('/api/auth/register', {
      email: `bookings-cust-b-${Date.now()}@test.com`,
      password: 'password123',
      firstName: 'Cust',
      lastName: 'B',
    });
    expect(custBRes.res.status).toBe(200);
    custBCookie = getSessionCookie(custBRes.res)!;
  });

  /* ─────────────────────────────────── *
   * POST /api/appointments
   * ─────────────────────────────────── */

  it('POST /api/appointments: 401 without session', async () => {
    const { res } = await post('/api/appointments', {
      pets: [
        {
          petId: custAPetA,
          serviceIds: [serviceId],
          groomerId,
          scheduledDate: bookingDate,
          startTime: '09:00',
        },
      ],
    });
    expect(res.status).toBe(401);
  });

  it('POST /api/appointments: rejects schema violation (empty pets array)', async () => {
    const { res } = await post('/api/appointments', { pets: [] }, custACookie);
    expect(res.status).toBe(400);
  });

  it('POST /api/appointments: 200 → status pending_documents (no vax doc on file)', async () => {
    const { res, data } = await post(
      '/api/appointments',
      {
        pets: [
          {
            petId: custAPetA,
            serviceIds: [serviceId],
            groomerId,
            scheduledDate: bookingDate,
            startTime: '09:00',
          },
        ],
      },
      custACookie,
    );
    expect(res.status).toBe(200);
    expect(data.appointment.status).toBe('pending_documents');
    expect(data.appointment.documentsHoldExpiresAt).toBeTruthy();
    expect(data.appointment.pets).toHaveLength(1);
  });

  it('POST /api/appointments: 400 when pet does not belong to caller', async () => {
    const { res } = await post(
      '/api/appointments',
      {
        pets: [
          {
            petId: custAPetA, // belongs to A
            serviceIds: [serviceId],
            groomerId,
            scheduledDate: bookingDate,
            startTime: '10:00',
          },
        ],
      },
      custBCookie, // session = B
    );
    expect(res.status).toBe(400);
  });

  it('POST /api/appointments: 409 when groomer slot is already booked', async () => {
    /* First booking at 11:00 succeeds */
    const first = await post(
      '/api/appointments',
      {
        pets: [
          {
            petId: custAPetA,
            serviceIds: [serviceId],
            groomerId,
            scheduledDate: bookingDate,
            startTime: '11:00',
          },
        ],
      },
      custACookie,
    );
    expect(first.res.status).toBe(200);

    /* Second booking at the same time → 409 */
    const { res } = await post(
      '/api/appointments',
      {
        pets: [
          {
            petId: custAPetB,
            serviceIds: [serviceId],
            groomerId,
            scheduledDate: bookingDate,
            startTime: '11:00',
          },
        ],
      },
      custACookie,
    );
    expect(res.status).toBe(409);
  });

  it('POST /api/appointments: 409 on intra-request groomer conflict (two pets, overlapping)', async () => {
    const { res } = await post(
      '/api/appointments',
      {
        pets: [
          {
            petId: custAPetA,
            serviceIds: [serviceId],
            groomerId,
            scheduledDate: bookingDate,
            startTime: '13:00',
          },
          {
            petId: custAPetB,
            serviceIds: [serviceId],
            groomerId,
            scheduledDate: bookingDate,
            startTime: '13:00',
          },
        ],
      },
      custACookie,
    );
    expect(res.status).toBe(409);
  });

  /* ─────────────────────────────────── *
   * POST /api/appointments/guest
   * ─────────────────────────────────── */

  it('POST /api/appointments/guest: 200 creates guest booking with pending_documents', async () => {
    const { res, data } = await post('/api/appointments/guest', {
      pet: {
        name: 'Spot',
        breed: 'Pug',
        weightLbs: 25,
        serviceIds: [serviceId],
        groomerId,
        scheduledDate: bookingDate,
        startTime: '14:00',
      },
      guestDetails: {
        firstName: 'Guest',
        lastName: 'Customer',
        email: `guest-bookings-${Date.now()}@test.com`,
        phone: '555-0100',
      },
    });
    expect(res.status).toBe(200);
    expect(data.appointment.status).toBe('pending_documents');
    expect(data.appointment.documentsHoldExpiresAt).toBeTruthy();
  });

  it('POST /api/appointments/guest: 409 when slot is already taken', async () => {
    const { res } = await post('/api/appointments/guest', {
      pet: {
        name: 'Rex',
        breed: 'Pug',
        weightLbs: 25,
        serviceIds: [serviceId],
        groomerId,
        scheduledDate: bookingDate,
        startTime: '14:00', // same as previous test
      },
      guestDetails: {
        firstName: 'Other',
        lastName: 'Guest',
        email: `guest-conflict-${Date.now()}@test.com`,
        phone: '555-0101',
      },
    });
    expect(res.status).toBe(409);
  });

  it('POST /api/appointments/guest: rejects missing guestDetails', async () => {
    const { res } = await post('/api/appointments/guest', {
      pet: {
        name: 'Foo',
        weightLbs: 25,
        serviceIds: [serviceId],
        groomerId,
        scheduledDate: bookingDate,
        startTime: '15:00',
      },
    });
    expect(res.status).toBe(400);
  });

  /* ─────────────────────────────────── *
   * GET /api/appointments
   * ─────────────────────────────────── */

  it('GET /api/appointments: 401 without session', async () => {
    const { res } = await get('/api/appointments');
    expect(res.status).toBe(401);
  });

  it('GET /api/appointments: returns own bookings only', async () => {
    const { res: aRes, data: aData } = await get('/api/appointments', custACookie);
    expect(aRes.status).toBe(200);
    // We booked at 09:00 and 11:00 for A
    expect(aData.appointments.length).toBeGreaterThanOrEqual(2);

    const { res: bRes, data: bData } = await get('/api/appointments', custBCookie);
    expect(bRes.status).toBe(200);
    expect(bData.appointments).toHaveLength(0);
  });

  /* ─────────────────────────────────── *
   * GET /api/appointments/[id]
   * ─────────────────────────────────── */

  it('GET /api/appointments/[id]: 401 without session', async () => {
    const { data: listData } = await get('/api/appointments', custACookie);
    const apptId = listData.appointments[0].id;

    const { res } = await get(`/api/appointments/${apptId}`);
    expect(res.status).toBe(401);
  });

  it('GET /api/appointments/[id]: 200 for owned booking', async () => {
    const { data: listData } = await get('/api/appointments', custACookie);
    const apptId = listData.appointments[0].id;

    const { res, data } = await get(`/api/appointments/${apptId}`, custACookie);
    expect(res.status).toBe(200);
    expect(data.appointment.id).toBe(apptId);
  });

  it('GET /api/appointments/[id]: 404 for booking owned by another user', async () => {
    const { data: listData } = await get('/api/appointments', custACookie);
    const apptId = listData.appointments[0].id;

    const { res } = await get(`/api/appointments/${apptId}`, custBCookie);
    expect(res.status).toBe(404);
  });
});
