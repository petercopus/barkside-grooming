/**
 * AI assisted with this file
 *
 * Admin bundles CRUD.
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

describe('Admin Bundles API', () => {
  let adminCookie: string;
  let serviceA: number;
  let serviceB: number;
  let serviceC: number;
  let bundleId: number;

  beforeAll(async () => {
    const login = await post('/api/auth/login', {
      email: 'admin@barkside.com',
      password: 'password123',
    });
    expect(login.res.status).toBe(200);
    adminCookie = getSessionCookie(login.res)!;

    const services = await get('/api/services');
    /* Need three distinct base services so PATCH can swap the set */
    const bases = services.data.services.filter((s: any) => !s.isAddon);
    expect(bases.length).toBeGreaterThanOrEqual(3);
    serviceA = bases[0].id;
    serviceB = bases[1].id;
    serviceC = bases[2].id;
  });

  /* ─────────────────────────────────── *
   * GET /api/admin/bundles
   * ─────────────────────────────────── */

  it('GET /api/admin/bundles: returns array (includes inactive)', async () => {
    const { res, data } = await get('/api/admin/bundles', adminCookie);
    expect(res.status).toBe(200);
    expect(Array.isArray(data.bundles)).toBe(true);
  });

  /* ─────────────────────────────────── *
   * POST /api/admin/bundles
   * ─────────────────────────────────── */

  it('POST /api/admin/bundles: 400 when fewer than 2 services', async () => {
    const { res } = await post(
      '/api/admin/bundles',
      {
        name: `Tiny ${Date.now()}`,
        discountType: 'percent',
        discountValue: 10,
        serviceIds: [serviceA],
      },
      adminCookie,
    );
    expect(res.status).toBe(400);
  });

  it('POST /api/admin/bundles: 400 on invalid discountType', async () => {
    const { res } = await post(
      '/api/admin/bundles',
      {
        name: `Bad ${Date.now()}`,
        discountType: 'absurd',
        discountValue: 5,
        serviceIds: [serviceA, serviceB],
      },
      adminCookie,
    );
    expect(res.status).toBe(400);
  });

  it('POST /api/admin/bundles: creates bundle with serviceIds', async () => {
    const { res, data } = await post(
      '/api/admin/bundles',
      {
        name: `Test Bundle ${Date.now()}`,
        description: 'integration test',
        discountType: 'percent',
        discountValue: 15,
        serviceIds: [serviceA, serviceB],
      },
      adminCookie,
    );
    expect(res.status).toBe(200);
    expect(data.bundle.id).toBeTypeOf('number');
    expect(data.bundle.discountType).toBe('percent');
    expect(data.bundle.discountValue).toBe(15);
    expect(data.bundle.serviceIds).toEqual(expect.arrayContaining([serviceA, serviceB]));
    expect(data.bundle.isActive).toBe(true);
    bundleId = data.bundle.id;
  });

  /* ─────────────────────────────────── *
   * GET /api/admin/bundles/[id]
   * ─────────────────────────────────── */

  it('GET /api/admin/bundles/[id]: returns bundle with serviceIds array', async () => {
    const { res, data } = await get(`/api/admin/bundles/${bundleId}`, adminCookie);
    expect(res.status).toBe(200);
    expect(data.bundle.id).toBe(bundleId);
    expect(data.bundle.serviceIds).toEqual(expect.arrayContaining([serviceA, serviceB]));
  });

  it('GET /api/admin/bundles/[id]: 404 for unknown id', async () => {
    const { res } = await get('/api/admin/bundles/9999999', adminCookie);
    expect(res.status).toBe(404);
  });

  /* ─────────────────────────────────── *
   * PATCH /api/admin/bundles/[id]
   * ─────────────────────────────────── */

  it('PATCH /api/admin/bundles/[id]: updates discountValue', async () => {
    const { res, data } = await patch(
      `/api/admin/bundles/${bundleId}`,
      { discountValue: 25 },
      adminCookie,
    );
    expect(res.status).toBe(200);
    expect(data.bundle.discountValue).toBe(25);
  });

  it('PATCH /api/admin/bundles/[id]: replaces serviceIds when provided', async () => {
    const { res, data } = await patch(
      `/api/admin/bundles/${bundleId}`,
      { serviceIds: [serviceA, serviceC] },
      adminCookie,
    );
    expect(res.status).toBe(200);
    expect(data.bundle.serviceIds.sort()).toEqual([serviceA, serviceC].sort());
    expect(data.bundle.serviceIds).not.toContain(serviceB);
  });

  it('PATCH /api/admin/bundles/[id]: rejects serviceIds shorter than 2', async () => {
    const { res } = await patch(
      `/api/admin/bundles/${bundleId}`,
      { serviceIds: [serviceA] },
      adminCookie,
    );
    expect(res.status).toBe(400);
  });

  it('PATCH /api/admin/bundles/[id]: 404 for unknown id', async () => {
    const { res } = await patch('/api/admin/bundles/9999999', { discountValue: 5 }, adminCookie);
    expect(res.status).toBe(404);
  });

  /* ─────────────────────────────────── *
   * DELETE /api/admin/bundles/[id]
   * ─────────────────────────────────── */

  it('DELETE /api/admin/bundles/[id]: soft-deletes (sets isActive=false)', async () => {
    const { res, data } = await del(`/api/admin/bundles/${bundleId}`, adminCookie);
    expect(res.status).toBe(200);
    expect(data.success).toBe(true);

    const after = await get(`/api/admin/bundles/${bundleId}`, adminCookie);
    expect(after.data.bundle.isActive).toBe(false);

    /* Public catalog excludes inactive bundles */
    const pub = await get('/api/bundles');
    expect(pub.data.bundles.some((b: any) => b.id === bundleId)).toBe(false);
  });

  it('DELETE /api/admin/bundles/[id]: 404 for unknown id', async () => {
    const { res } = await del('/api/admin/bundles/9999999', adminCookie);
    expect(res.status).toBe(404);
  });
});
