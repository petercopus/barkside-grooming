/**
 * AI assisted with this file
 *
 * Permissions matrix — risk #4.
 * Verifies each protected endpoint enforces its required permission key.
 *
 * Roles under test:
 *   Customer            — booking/pet :own + booking:cancel
 *   Employee (default)  — admin:access, booking/pet read:all, document:*, employee:read
 *   Admin               — wildcard (hasAllPermissions)
 *
 * Hierarchy: Customer ← Employee ← {Groomer, Bather, Front Desk}, so
 * Employees inherit Customer perms; Groomer/Bather/Front Desk inherit
 * Employee. Admin-only perms (service:manage, size-category:manage,
 * employee:manage, role:manage, customer:*, reports:view) must remain
 * forbidden for Customer and Employee.
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

async function req(
  method: string,
  path: string,
  cookie?: string,
  body?: object,
): Promise<{ res: Response; data: any }> {
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
 * Setup
 * ─────────────────────────────────── */

describe('Permissions matrix', () => {
  let adminCookie: string;
  let employeeCookie: string;
  let customerCookie: string;

  beforeAll(async () => {
    /* Admin */
    const a = await post('/api/auth/login', {
      email: 'admin@barkside.com',
      password: 'password123',
    });
    expect(a.res.status).toBe(200);
    adminCookie = getSessionCookie(a.res)!;

    /* Plain Employee — no department roles, just the base Employee role */
    const rolesRes = await get('/api/admin/roles', adminCookie);
    const employeeRole = rolesRes.data.roles.find((r: any) => r.name === 'Employee');
    expect(employeeRole).toBeTruthy();

    const empEmail = `perms-emp-${Date.now()}@test.com`;
    const empRes = await post(
      '/api/admin/employees',
      {
        email: empEmail,
        password: 'password123',
        firstName: 'Perms',
        lastName: 'Employee',
        roleIds: [employeeRole.id],
        serviceIds: [],
      },
      adminCookie,
    );
    expect(empRes.res.status).toBe(200);

    const empLogin = await post('/api/auth/login', {
      email: empEmail,
      password: 'password123',
    });
    expect(empLogin.res.status).toBe(200);
    employeeCookie = getSessionCookie(empLogin.res)!;

    /* Customer */
    const c = await post('/api/auth/register', {
      email: `perms-cust-${Date.now()}@test.com`,
      password: 'password123',
      firstName: 'Perms',
      lastName: 'Customer',
    });
    expect(c.res.status).toBe(200);
    customerCookie = getSessionCookie(c.res)!;
  });

  /* ─────────────────────────────────── *
   * Sanity — /api/auth/me reports the right effective permissions
   * ─────────────────────────────────── */

  describe('/api/auth/me — effective permissions per role', () => {
    it('admin: has wildcard "*"', async () => {
      const { res, data } = await get('/api/auth/me', adminCookie);
      expect(res.status).toBe(200);
      expect(data.permissions).toContain('*');
    });

    it('employee: has admin:access, document:*, NOT service:manage / role:manage', async () => {
      const { res, data } = await get('/api/auth/me', employeeCookie);
      expect(res.status).toBe(200);
      expect(data.permissions).toContain('admin:access');
      expect(data.permissions).toContain('booking:read:all');
      expect(data.permissions).toContain('document:approve');
      expect(data.permissions).toContain('employee:read');
      expect(data.permissions).not.toContain('service:manage');
      expect(data.permissions).not.toContain('role:manage');
      expect(data.permissions).not.toContain('employee:manage');
      expect(data.permissions).not.toContain('customer:read');
      expect(data.permissions).not.toContain('reports:view');
      expect(data.permissions).not.toContain('size-category:manage');
    });

    it('customer: has booking:create + cancel, NOT admin:access or any read:all', async () => {
      const { res, data } = await get('/api/auth/me', customerCookie);
      expect(res.status).toBe(200);
      expect(data.permissions).toContain('booking:create');
      expect(data.permissions).toContain('booking:cancel');
      expect(data.permissions).not.toContain('admin:access');
      expect(data.permissions).not.toContain('booking:read:all');
      expect(data.permissions).not.toContain('document:approve');
    });
  });

  /* ─────────────────────────────────── *
   * Endpoint matrix — Customer vs Employee vs Admin
   *
   * One representative endpoint per permission key.
   * For each row: assert 403 for roles that lack the perm, and assert
   * !=403 (allowed past the perm gate) for roles that have it. We don't
   * assert exact 200 because some endpoints will 400/404 on dummy ids;
   * what matters is that requirePermission did not block the request.
   * ─────────────────────────────────── */

  /** Asserts that the response was not blocked by the perm gate. */
  function expectAllowed(res: Response) {
    expect(res.status).not.toBe(401);
    expect(res.status).not.toBe(403);
  }

  /** Asserts that the response was rejected by requirePermission. */
  function expectForbidden(res: Response) {
    expect(res.status).toBe(403);
  }

  describe('service:manage (admin-only)', () => {
    const path = '/api/admin/services';
    it('customer → 403', async () => {
      const { res } = await get(path, customerCookie);
      expectForbidden(res);
    });
    it('employee → 403', async () => {
      const { res } = await get(path, employeeCookie);
      expectForbidden(res);
    });
    it('admin → allowed', async () => {
      const { res } = await get(path, adminCookie);
      expectAllowed(res);
    });
  });

  describe('size-category:manage (admin-only)', () => {
    const path = '/api/admin/size-categories';
    it('customer → 403', async () => {
      const { res } = await post(path, { name: 'x', minWeight: 1, maxWeight: 2 }, customerCookie);
      expectForbidden(res);
    });
    it('employee → 403', async () => {
      const { res } = await post(path, { name: 'x', minWeight: 1, maxWeight: 2 }, employeeCookie);
      expectForbidden(res);
    });
    it('admin → allowed (gets past perm gate)', async () => {
      /* DELETE on a non-existent id avoids creating real data; we only care
       * that the perm gate didn't trip. */
      const { res } = await del(`${path}/999999`, adminCookie);
      expectAllowed(res);
    });
  });

  describe('employee:manage (admin-only)', () => {
    const path = '/api/admin/employees';
    it('customer → 403', async () => {
      const { res } = await get(path, customerCookie);
      expectForbidden(res);
    });
    it('employee (Employee role lacks manage) → 403', async () => {
      const { res } = await get(path, employeeCookie);
      expectForbidden(res);
    });
    it('admin → allowed', async () => {
      const { res } = await get(path, adminCookie);
      expectAllowed(res);
    });
  });

  describe('role:manage (admin-only)', () => {
    const path = '/api/admin/roles';
    it('customer → 403', async () => {
      const { res } = await post(path, { name: 'PermsTestRole' }, customerCookie);
      expectForbidden(res);
    });
    it('employee → 403', async () => {
      const { res } = await post(path, { name: 'PermsTestRole' }, employeeCookie);
      expectForbidden(res);
    });
    it('admin → allowed', async () => {
      /* GET is the read side of role:manage and is harmless */
      const { res } = await get(path, adminCookie);
      expectAllowed(res);
    });
  });

  describe('customer:read / customer:manage (admin-only)', () => {
    it('customer → 403 on GET /api/admin/customers', async () => {
      const { res } = await get('/api/admin/customers', customerCookie);
      expectForbidden(res);
    });
    it('employee → 403 on GET /api/admin/customers', async () => {
      const { res } = await get('/api/admin/customers', employeeCookie);
      expectForbidden(res);
    });
    it('admin → allowed on GET /api/admin/customers', async () => {
      const { res } = await get('/api/admin/customers', adminCookie);
      expectAllowed(res);
    });
    it('customer → 403 on PATCH /api/admin/customers/[id]', async () => {
      const { res } = await patch(
        '/api/admin/customers/00000000-0000-0000-0000-000000000000',
        { firstName: 'X' },
        customerCookie,
      );
      expectForbidden(res);
    });
    it('employee → 403 on PATCH /api/admin/customers/[id]', async () => {
      const { res } = await patch(
        '/api/admin/customers/00000000-0000-0000-0000-000000000000',
        { firstName: 'X' },
        employeeCookie,
      );
      expectForbidden(res);
    });
  });

  describe('reports:view (admin-only)', () => {
    const path = '/api/admin/reports';
    it('customer → 403', async () => {
      const { res } = await get(path, customerCookie);
      expectForbidden(res);
    });
    it('employee → 403', async () => {
      const { res } = await get(path, employeeCookie);
      expectForbidden(res);
    });
    it('admin → allowed', async () => {
      const { res } = await get(path, adminCookie);
      expectAllowed(res);
    });
  });

  describe('booking:read:all (employee+)', () => {
    const path = '/api/admin/appointments';
    it('customer → 403', async () => {
      const { res } = await get(path, customerCookie);
      expectForbidden(res);
    });
    it('employee → allowed', async () => {
      const { res } = await get(path, employeeCookie);
      expectAllowed(res);
    });
    it('admin → allowed', async () => {
      const { res } = await get(path, adminCookie);
      expectAllowed(res);
    });
  });

  describe('pet:read:all (employee+)', () => {
    const path = '/api/admin/pets';
    it('customer → 403', async () => {
      const { res } = await get(path, customerCookie);
      expectForbidden(res);
    });
    it('employee → allowed', async () => {
      const { res } = await get(path, employeeCookie);
      expectAllowed(res);
    });
  });

  describe('document:read:all (employee+)', () => {
    const path = '/api/admin/documents';
    it('customer → 403', async () => {
      const { res } = await get(path, customerCookie);
      expectForbidden(res);
    });
    it('employee → allowed', async () => {
      const { res } = await get(path, employeeCookie);
      expectAllowed(res);
    });
  });

  describe('document:request (employee+)', () => {
    const path = '/api/admin/document-requests';
    it('customer → 403 on GET', async () => {
      const { res } = await get(path, customerCookie);
      expectForbidden(res);
    });
    it('employee → allowed on GET', async () => {
      const { res } = await get(path, employeeCookie);
      expectAllowed(res);
    });
  });

  describe('document:approve (employee+)', () => {
    it('customer → 403 on PATCH /api/admin/documents/[id]/status', async () => {
      const { res } = await patch(
        '/api/admin/documents/00000000-0000-0000-0000-000000000000/status',
        { status: 'approved' },
        customerCookie,
      );
      expectForbidden(res);
    });
    it('employee → allowed past perm gate (will 4xx on bad id)', async () => {
      const { res } = await patch(
        '/api/admin/documents/00000000-0000-0000-0000-000000000000/status',
        { status: 'approved' },
        employeeCookie,
      );
      expectAllowed(res);
    });
  });

  describe('document:delete (employee+)', () => {
    it('customer → 403', async () => {
      const { res } = await del(
        '/api/admin/documents/00000000-0000-0000-0000-000000000000',
        customerCookie,
      );
      expectForbidden(res);
    });
    it('employee → allowed past perm gate', async () => {
      const { res } = await del(
        '/api/admin/documents/00000000-0000-0000-0000-000000000000',
        employeeCookie,
      );
      expectAllowed(res);
    });
  });

  describe('employee:read (employee+, view-only)', () => {
    /* Employees can view schedule, but cannot edit it */
    it('customer → 403 on GET schedule', async () => {
      const { res } = await get(
        '/api/admin/employees/00000000-0000-0000-0000-000000000000/schedule',
        customerCookie,
      );
      expectForbidden(res);
    });
    it('employee → allowed on GET schedule', async () => {
      const { res } = await get(
        '/api/admin/employees/00000000-0000-0000-0000-000000000000/schedule',
        employeeCookie,
      );
      expectAllowed(res);
    });
    it('employee → 403 on PUT schedule (employee:manage required)', async () => {
      const { res } = await put(
        '/api/admin/employees/00000000-0000-0000-0000-000000000000/schedule',
        { entries: [] },
        employeeCookie,
      );
      expectForbidden(res);
    });
  });

  describe('booking:create (customer)', () => {
    /* Customers (including Employees by inheritance) can create bookings.
     * We don't actually book — we just confirm the perm gate doesn't 401/403. */
    const path = '/api/appointments';
    it('customer → allowed past perm gate', async () => {
      const { res } = await post(path, { pets: [] }, customerCookie);
      expectAllowed(res);
    });
    it('employee → allowed past perm gate (inherits Customer)', async () => {
      const { res } = await post(path, { pets: [] }, employeeCookie);
      expectAllowed(res);
    });
    it('unauthenticated → 401', async () => {
      const { res } = await post(path, { pets: [] });
      expect(res.status).toBe(401);
    });
  });

  describe('booking:cancel (customer)', () => {
    /* Cancel uses booking:cancel, granted to Customer.
     * Service layer enforces ownership separately (404 for non-owned). */
    const path = '/api/appointments/00000000-0000-0000-0000-000000000000/cancel';
    it('customer → allowed past perm gate (404 because no such booking)', async () => {
      const { res } = await patch(path, {}, customerCookie);
      expectAllowed(res);
      expect(res.status).toBe(404);
    });
    it('unauthenticated → 401', async () => {
      const { res } = await patch(path, {});
      expect(res.status).toBe(401);
    });
  });
});
