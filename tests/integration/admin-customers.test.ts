/**
 * AI assisted with this file
 *
 * Admin customer endpoints: list (with search), detail (incl. pets +
 * appointments), and patch.
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

/* ─────────────────────────────────── *
 * Tests
 * ─────────────────────────────────── */

describe('Admin Customers API', () => {
  let adminCookie: string;
  let customerCookie: string;
  let customerId: string;
  const customerLastName = `Sortable${Date.now()}`;
  const customerEmail = `cust-admin-${Date.now()}@test.com`;

  beforeAll(async () => {
    const login = await post('/api/auth/login', {
      email: 'admin@barkside.com',
      password: 'password123',
    });
    expect(login.res.status).toBe(200);
    adminCookie = getSessionCookie(login.res)!;

    /* Register a fresh customer + add a pet so the detail view has something to return */
    const reg = await post('/api/auth/register', {
      email: customerEmail,
      password: 'password123',
      firstName: 'TestCust',
      lastName: customerLastName,
    });
    expect(reg.res.status).toBe(200);
    customerCookie = getSessionCookie(reg.res)!;

    const me = await get('/api/auth/me', customerCookie);
    customerId = me.data.user.id;

    await post(
      '/api/pets',
      { name: 'CustPet', breed: 'Mix', weightLbs: 25, gender: 'male' },
      customerCookie,
    );
  });

  /* ─── GET list ─── */

  it('GET /api/admin/customers: returns array including the new customer', async () => {
    const { res, data } = await get('/api/admin/customers', adminCookie);
    expect(res.status).toBe(200);
    expect(Array.isArray(data.customers)).toBe(true);
    const found = data.customers.find((c: any) => c.id === customerId);
    expect(found).toBeTruthy();
    /* List rows include enrichment fields */
    expect(typeof found.petCount).toBe('number');
    expect(found.petCount).toBeGreaterThanOrEqual(1);
  });

  it('GET /api/admin/customers: never returns passwordHash', async () => {
    const { data } = await get('/api/admin/customers', adminCookie);
    for (const c of data.customers) {
      expect(c.passwordHash).toBeUndefined();
    }
  });

  it('GET /api/admin/customers?search=…: filters by last name', async () => {
    const { res, data } = await get(
      `/api/admin/customers?search=${encodeURIComponent(customerLastName)}`,
      adminCookie,
    );
    expect(res.status).toBe(200);
    expect(data.customers).toHaveLength(1);
    expect(data.customers[0].id).toBe(customerId);
  });

  it('GET /api/admin/customers?search=…: filters by email substring', async () => {
    const { res, data } = await get(
      `/api/admin/customers?search=${encodeURIComponent(customerEmail.split('@')[0]!)}`,
      adminCookie,
    );
    expect(res.status).toBe(200);
    expect(data.customers.some((c: any) => c.id === customerId)).toBe(true);
  });

  it('GET /api/admin/customers?search=…: returns empty for unknown query', async () => {
    const { res, data } = await get(
      '/api/admin/customers?search=zzzzznoooosuchcustomer',
      adminCookie,
    );
    expect(res.status).toBe(200);
    expect(data.customers).toEqual([]);
  });

  /* ─── GET detail ─── */

  it('GET /api/admin/customers/[id]: returns customer with pets + appointments', async () => {
    const { res, data } = await get(`/api/admin/customers/${customerId}`, adminCookie);
    expect(res.status).toBe(200);
    expect(data.customer.id).toBe(customerId);
    expect(data.customer.passwordHash).toBeUndefined();
    expect(Array.isArray(data.customer.pets)).toBe(true);
    expect(data.customer.pets.length).toBeGreaterThanOrEqual(1);
    expect(Array.isArray(data.customer.appointments)).toBe(true);
  });

  it('GET /api/admin/customers/[id]: 404 for unknown id', async () => {
    const { res } = await get(
      '/api/admin/customers/00000000-0000-0000-0000-000000000000',
      adminCookie,
    );
    expect(res.status).toBe(404);
  });

  /* ─── PATCH ─── */

  it('PATCH /api/admin/customers/[id]: updates name + phone', async () => {
    const { res, data } = await patch(
      `/api/admin/customers/${customerId}`,
      { firstName: 'Updated', phone: '555-7777' },
      adminCookie,
    );
    expect(res.status).toBe(200);
    expect(data.customer.firstName).toBe('Updated');
    expect(data.customer.phone).toBe('555-7777');
    expect(data.customer.passwordHash).toBeUndefined();
  });

  it('PATCH /api/admin/customers/[id]: 400 on invalid email', async () => {
    const { res } = await patch(
      `/api/admin/customers/${customerId}`,
      { email: 'not-an-email' },
      adminCookie,
    );
    expect(res.status).toBe(400);
  });

  it('PATCH /api/admin/customers/[id]: 404 for unknown id', async () => {
    const { res } = await patch(
      '/api/admin/customers/00000000-0000-0000-0000-000000000000',
      { firstName: 'X' },
      adminCookie,
    );
    expect(res.status).toBe(404);
  });
});
