/**
 * AI assisted with this file
 *
 * Admin employees CRUD + service assignments + weekly schedule + overrides.
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
const del = (path: string, cookie?: string) => req('DELETE', path, cookie);

/* ─────────────────────────────────── *
 * Tests
 * ─────────────────────────────────── */

describe('Admin Employees API', () => {
  let adminCookie: string;
  let groomerRoleId: number;
  let serviceA: number;
  let serviceB: number;
  let employeeId: string;

  beforeAll(async () => {
    const login = await post('/api/auth/login', {
      email: 'admin@barkside.com',
      password: 'password123',
    });
    expect(login.res.status).toBe(200);
    adminCookie = getSessionCookie(login.res)!;

    const roles = await get('/api/admin/roles', adminCookie);
    groomerRoleId = roles.data.roles.find((r: any) => r.name === 'Groomer').id;

    const services = await get('/api/services');
    const bases = services.data.services.filter((s: any) => !s.isAddon);
    serviceA = bases[0].id;
    serviceB = bases[1].id;
  });

  /* ─── POST create ─── */

  it('POST /api/admin/employees: 400 when roleIds is empty', async () => {
    const { res } = await post(
      '/api/admin/employees',
      {
        email: `emp-bad-${Date.now()}@test.com`,
        password: 'password123',
        firstName: 'Bad',
        lastName: 'Employee',
        roleIds: [],
        serviceIds: [],
      },
      adminCookie,
    );
    expect(res.status).toBe(400);
  });

  it('POST /api/admin/employees: 400 on short password', async () => {
    const { res } = await post(
      '/api/admin/employees',
      {
        email: `emp-shortpw-${Date.now()}@test.com`,
        password: 'short',
        firstName: 'Bad',
        lastName: 'Employee',
        roleIds: [groomerRoleId],
        serviceIds: [],
      },
      adminCookie,
    );
    expect(res.status).toBe(400);
  });

  it('POST /api/admin/employees: creates an employee with roles + services', async () => {
    const { res, data } = await post(
      '/api/admin/employees',
      {
        email: `emp-${Date.now()}@test.com`,
        password: 'password123',
        firstName: 'Test',
        lastName: 'Employee',
        phone: '555-0100',
        roleIds: [groomerRoleId],
        serviceIds: [serviceA],
      },
      adminCookie,
    );
    expect(res.status).toBe(200);
    expect(data.employee.id).toBeTypeOf('string');
    expect(data.employee.email).toMatch(/^emp-/);
    expect(data.employee.passwordHash).toBeUndefined();
    expect(data.employee.roles.some((r: any) => r.id === groomerRoleId)).toBe(true);
    expect(data.employee.serviceIds).toContain(serviceA);
    employeeId = data.employee.id;
  });

  /* ─── GET list / detail ─── */

  it('GET /api/admin/employees: lists employees including the new one', async () => {
    const { res, data } = await get('/api/admin/employees', adminCookie);
    expect(res.status).toBe(200);
    expect(data.employees.some((e: any) => e.id === employeeId)).toBe(true);
    /* Customer-only users should not appear */
    expect(data.employees.every((e: any) => e.roles.length > 0)).toBe(true);
  });

  it('GET /api/admin/employees/[id]: returns employee detail (no passwordHash)', async () => {
    const { res, data } = await get(`/api/admin/employees/${employeeId}`, adminCookie);
    expect(res.status).toBe(200);
    expect(data.employee.id).toBe(employeeId);
    expect(data.employee.passwordHash).toBeUndefined();
    expect(Array.isArray(data.employee.roles)).toBe(true);
    expect(Array.isArray(data.employee.serviceIds)).toBe(true);
  });

  it('GET /api/admin/employees/[id]: 404 for unknown id', async () => {
    const { res } = await get(
      '/api/admin/employees/00000000-0000-0000-0000-000000000000',
      adminCookie,
    );
    expect(res.status).toBe(404);
  });

  /* ─── PATCH ─── */

  it('PATCH /api/admin/employees/[id]: updates name + phone', async () => {
    const { res, data } = await patch(
      `/api/admin/employees/${employeeId}`,
      { firstName: 'Updated', phone: '555-9999' },
      adminCookie,
    );
    expect(res.status).toBe(200);
    expect(data.employee.firstName).toBe('Updated');
    expect(data.employee.phone).toBe('555-9999');
  });

  it('PATCH /api/admin/employees/[id]: deactivates', async () => {
    const { res, data } = await patch(
      `/api/admin/employees/${employeeId}`,
      { isActive: false },
      adminCookie,
    );
    expect(res.status).toBe(200);
    expect(data.employee.isActive).toBe(false);

    /* reactivate so subsequent tests can keep using the account */
    await patch(`/api/admin/employees/${employeeId}`, { isActive: true }, adminCookie);
  });

  /* ─── PUT services ─── */

  it('PUT /api/admin/employees/[id]/services: replaces qualified service list', async () => {
    const { res, data } = await put(
      `/api/admin/employees/${employeeId}/services`,
      { serviceIds: [serviceB] },
      adminCookie,
    );
    expect(res.status).toBe(200);
    expect(data.serviceIds).toEqual([serviceB]);

    const detail = await get(`/api/admin/employees/${employeeId}`, adminCookie);
    expect(detail.data.employee.serviceIds).toEqual([serviceB]);
  });

  it('PUT /api/admin/employees/[id]/services: empty array clears qualifications', async () => {
    const { res, data } = await put(
      `/api/admin/employees/${employeeId}/services`,
      { serviceIds: [] },
      adminCookie,
    );
    expect(res.status).toBe(200);
    expect(data.serviceIds).toEqual([]);
  });

  /* ─── PUT schedule ─── */

  it('PUT /api/admin/employees/[id]/schedule: 400 on bad time format', async () => {
    const { res } = await put(
      `/api/admin/employees/${employeeId}/schedule`,
      {
        entries: [{ dayOfWeek: 1, startTime: '9 AM', endTime: '5 PM', isAvailable: true }],
      },
      adminCookie,
    );
    expect(res.status).toBe(400);
  });

  it('PUT /api/admin/employees/[id]/schedule: 400 on dayOfWeek out of range', async () => {
    const { res } = await put(
      `/api/admin/employees/${employeeId}/schedule`,
      {
        entries: [{ dayOfWeek: 7, startTime: '09:00', endTime: '17:00', isAvailable: true }],
      },
      adminCookie,
    );
    expect(res.status).toBe(400);
  });

  it('PUT /api/admin/employees/[id]/schedule: writes Mon–Fri 9–5', async () => {
    const entries = [1, 2, 3, 4, 5].map((dayOfWeek) => ({
      dayOfWeek,
      startTime: '09:00',
      endTime: '17:00',
      isAvailable: true,
    }));
    const { res, data } = await put(
      `/api/admin/employees/${employeeId}/schedule`,
      { entries },
      adminCookie,
    );
    expect(res.status).toBe(200);
    expect(data.entries).toHaveLength(5);
  });

  /* ─── GET schedule ─── */

  it('GET /api/admin/employees/[id]/schedule: returns the entries that were written', async () => {
    const { res, data } = await get(`/api/admin/employees/${employeeId}/schedule`, adminCookie);
    expect(res.status).toBe(200);
    expect(data.entries).toHaveLength(5);
    const days = data.entries.map((e: any) => e.dayOfWeek).sort();
    expect(days).toEqual([1, 2, 3, 4, 5]);
  });

  /* ─── Overrides ─── */

  let overrideId: number;
  const overrideDate = '2099-12-25';

  it('POST /api/admin/employees/[id]/overrides: 400 on bad date', async () => {
    const { res } = await post(
      `/api/admin/employees/${employeeId}/overrides`,
      { date: 'tomorrow', isAvailable: false },
      adminCookie,
    );
    expect(res.status).toBe(400);
  });

  it('POST /api/admin/employees/[id]/overrides: creates a closed-day override', async () => {
    const { res, data } = await post(
      `/api/admin/employees/${employeeId}/overrides`,
      { date: overrideDate, isAvailable: false, reason: 'Holiday' },
      adminCookie,
    );
    expect(res.status).toBe(200);
    expect(data.override.id).toBeTypeOf('number');
    expect(data.override.date).toBe(overrideDate);
    expect(data.override.isAvailable).toBe(false);
    overrideId = data.override.id;
  });

  it('GET /api/admin/employees/[id]/overrides: returns the new override', async () => {
    const { res, data } = await get(`/api/admin/employees/${employeeId}/overrides`, adminCookie);
    expect(res.status).toBe(200);
    expect(data.overrides.some((o: any) => o.id === overrideId)).toBe(true);
  });

  it('PATCH /api/admin/employees/[id]/overrides/[overrideId]: updates reason', async () => {
    const { res, data } = await patch(
      `/api/admin/employees/${employeeId}/overrides/${overrideId}`,
      { reason: 'Updated reason' },
      adminCookie,
    );
    expect(res.status).toBe(200);
    expect(data.override.reason).toBe('Updated reason');
  });

  it('DELETE /api/admin/employees/[id]/overrides/[overrideId]: removes it', async () => {
    const { res, data } = await del(
      `/api/admin/employees/${employeeId}/overrides/${overrideId}`,
      adminCookie,
    );
    expect(res.status).toBe(200);
    expect(data.success).toBe(true);

    const after = await get(`/api/admin/employees/${employeeId}/overrides`, adminCookie);
    expect(after.data.overrides.some((o: any) => o.id === overrideId)).toBe(false);
  });
});
