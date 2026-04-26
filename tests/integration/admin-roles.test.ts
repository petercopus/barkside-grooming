/**
 * AI assisted with this file
 *
 * Admin roles CRUD + system-role protection + circular inheritance + delete-when-assigned.
 *
 * Note: GET /api/admin/roles requires only requireAuth, so any signed-in
 * user (incl. customers) can list roles. The mutate routes require
 * 'role:manage'. Permission gating itself is verified in
 * permissions.test.ts; here we focus on behavior.
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
const del = (path: string, cookie?: string) => req('DELETE', path, cookie);

/* ─────────────────────────────────── *
 * Tests
 * ─────────────────────────────────── */

describe('Admin Roles API', () => {
  let adminCookie: string;
  let customerRoleId: number;
  let employeeRoleId: number;
  let allPermIds: number[];
  let createdRoleId: number;
  let assignedRoleId: number; // assigned to an employee — used for 409 test

  beforeAll(async () => {
    const login = await post('/api/auth/login', {
      email: 'admin@barkside.com',
      password: 'password123',
    });
    expect(login.res.status).toBe(200);
    adminCookie = getSessionCookie(login.res)!;

    const list = await get('/api/admin/roles', adminCookie);
    customerRoleId = list.data.roles.find((r: any) => r.name === 'Customer').id;
    employeeRoleId = list.data.roles.find((r: any) => r.name === 'Employee').id;

    /* Pull a couple of permission ids by getting any existing role */
    const customerDetail = await get(`/api/admin/roles/${customerRoleId}`, adminCookie);
    allPermIds = customerDetail.data.role.permissionIds;
    expect(allPermIds.length).toBeGreaterThan(0);
  });

  /* ─── GET list ─── */

  it('GET /api/admin/roles: includes parentRoleName for inheritance', async () => {
    const { res, data } = await get('/api/admin/roles', adminCookie);
    expect(res.status).toBe(200);
    const employee = data.roles.find((r: any) => r.name === 'Employee');
    expect(employee.parentRoleName).toBe('Customer');
    const customer = data.roles.find((r: any) => r.name === 'Customer');
    expect(customer.parentRoleName).toBeNull();
  });

  /* ─── POST create ─── */

  it('POST /api/admin/roles: creates a custom role (no parent, empty perms)', async () => {
    const { res, data } = await post(
      '/api/admin/roles',
      { name: `TestRole-${Date.now()}` },
      adminCookie,
    );
    expect(res.status).toBe(200);
    expect(data.role.id).toBeTypeOf('number');
    expect(data.role.permissionIds).toEqual([]);
    expect(data.role.inheritedPermissionIds).toEqual([]);
    expect(data.role.parentRoleId).toBeNull();
    expect(data.role.isSystem).toBe(false);
    createdRoleId = data.role.id;
  });

  it('POST /api/admin/roles: 400 on missing name', async () => {
    const { res } = await post('/api/admin/roles', {}, adminCookie);
    expect(res.status).toBe(400);
  });

  it('POST /api/admin/roles: creates role with parent + custom perms (inherits from parent)', async () => {
    const { res, data } = await post(
      '/api/admin/roles',
      {
        name: `WithParent-${Date.now()}`,
        parentRoleId: employeeRoleId,
        permissionIds: allPermIds.slice(0, 1),
      },
      adminCookie,
    );
    expect(res.status).toBe(200);
    expect(data.role.parentRoleId).toBe(employeeRoleId);
    expect(data.role.permissionIds).toEqual(allPermIds.slice(0, 1));
    /* Inherits Employee's perms (which inherit Customer's), so the count
     * should at least match Customer's perm count */
    expect(data.role.inheritedPermissionIds.length).toBeGreaterThan(0);
  });

  /* ─── GET [id] ─── */

  it('GET /api/admin/roles/[id]: returns role detail', async () => {
    const { res, data } = await get(`/api/admin/roles/${createdRoleId}`, adminCookie);
    expect(res.status).toBe(200);
    expect(data.role.id).toBe(createdRoleId);
    expect(Array.isArray(data.role.permissionIds)).toBe(true);
  });

  it('GET /api/admin/roles/[id]: 404 for unknown id', async () => {
    const { res } = await get('/api/admin/roles/9999999', adminCookie);
    expect(res.status).toBe(404);
  });

  /* ─── PATCH ─── */

  it('PATCH /api/admin/roles/[id]: updates name + replaces permissionIds', async () => {
    const newPerms = allPermIds.slice(0, 2);
    const { res, data } = await patch(
      `/api/admin/roles/${createdRoleId}`,
      {
        name: `Renamed-${Date.now()}`,
        permissionIds: newPerms,
      },
      adminCookie,
    );
    expect(res.status).toBe(200);
    expect(data.role.name).toMatch(/^Renamed-/);
    expect(data.role.permissionIds.sort()).toEqual([...newPerms].sort());
  });

  it('PATCH /api/admin/roles/[id]: 400 on circular inheritance (self-parent)', async () => {
    const { res } = await patch(
      `/api/admin/roles/${createdRoleId}`,
      { parentRoleId: createdRoleId },
      adminCookie,
    );
    expect(res.status).toBe(400);
  });

  it('PATCH /api/admin/roles/[id]: 400 on circular inheritance (ancestor cycle)', async () => {
    /* Make role A — set its parent to createdRoleId. Then try to make
     * createdRoleId's parent be A. That closes a 2-step cycle. */
    const a = await post(
      '/api/admin/roles',
      { name: `Cycle-A-${Date.now()}`, parentRoleId: createdRoleId },
      adminCookie,
    );
    expect(a.res.status).toBe(200);
    const aId = a.data.role.id;

    const { res } = await patch(
      `/api/admin/roles/${createdRoleId}`,
      { parentRoleId: aId },
      adminCookie,
    );
    expect(res.status).toBe(400);

    /* clean up the helper role */
    await del(`/api/admin/roles/${aId}`, adminCookie);
  });

  it('PATCH /api/admin/roles/[id]: 404 for unknown id', async () => {
    const { res } = await patch('/api/admin/roles/9999999', { name: 'x' }, adminCookie);
    expect(res.status).toBe(404);
  });

  /* ─── DELETE ─── */

  it('DELETE /api/admin/roles/[id]: 403 on a system role (Customer)', async () => {
    const { res } = await del(`/api/admin/roles/${customerRoleId}`, adminCookie);
    expect(res.status).toBe(403);
  });

  it('DELETE /api/admin/roles/[id]: 409 when role is assigned to a user', async () => {
    /* Create a fresh custom role, assign it to a new employee, delete should 409 */
    const newRole = await post('/api/admin/roles', { name: `Assigned-${Date.now()}` }, adminCookie);
    expect(newRole.res.status).toBe(200);
    assignedRoleId = newRole.data.role.id;

    const emp = await post(
      '/api/admin/employees',
      {
        email: `roles-emp-${Date.now()}@test.com`,
        password: 'password123',
        firstName: 'Roles',
        lastName: 'Test',
        roleIds: [assignedRoleId],
        serviceIds: [],
      },
      adminCookie,
    );
    expect(emp.res.status).toBe(200);

    const { res } = await del(`/api/admin/roles/${assignedRoleId}`, adminCookie);
    expect(res.status).toBe(409);
  });

  it('DELETE /api/admin/roles/[id]: 200 on an unused custom role', async () => {
    const newRole = await post(
      '/api/admin/roles',
      { name: `Disposable-${Date.now()}` },
      adminCookie,
    );
    expect(newRole.res.status).toBe(200);
    const id = newRole.data.role.id;

    const { res } = await del(`/api/admin/roles/${id}`, adminCookie);
    expect(res.status).toBe(200);

    const after = await get(`/api/admin/roles/${id}`, adminCookie);
    expect(after.res.status).toBe(404);
  });

  it('DELETE /api/admin/roles/[id]: 404 for unknown id', async () => {
    const { res } = await del('/api/admin/roles/9999999', adminCookie);
    expect(res.status).toBe(404);
  });
});
