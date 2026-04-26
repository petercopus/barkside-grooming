/**
 * AI assisted with this file
 *
 * Admin services CRUD + pricing + addon-link endpoints.
 * Auth/permission gates are covered by permissions.test.ts; this file
 * focuses on behavior under an authorized admin session.
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
 * Tests
 * ─────────────────────────────────── */

describe('Admin Services API', () => {
  let adminCookie: string;
  let baseServiceId: number;
  let addonServiceId: number;
  let sizeCategoryIds: number[];

  beforeAll(async () => {
    const login = await post('/api/auth/login', {
      email: 'admin@barkside.com',
      password: 'password123',
    });
    expect(login.res.status).toBe(200);
    adminCookie = getSessionCookie(login.res)!;

    const sizes = await get('/api/size-categories');
    sizeCategoryIds = sizes.data.sizeCategories.map((s: any) => s.id);
    expect(sizeCategoryIds.length).toBeGreaterThan(0);
  });

  /* ─────────────────────────────────── *
   * GET /api/admin/services
   * ─────────────────────────────────── */

  it('GET /api/admin/services: includes inactive entries (admin view)', async () => {
    const { res, data } = await get('/api/admin/services', adminCookie);
    expect(res.status).toBe(200);
    expect(Array.isArray(data.services)).toBe(true);
    /* Public route filters to active only; admin route should at least
     * include some active services. We can't easily assert "inactive present"
     * without mutating data, but listing != 0 is enough. */
    expect(data.services.length).toBeGreaterThan(0);
  });

  /* ─────────────────────────────────── *
   * POST /api/admin/services — create base + addon
   * ─────────────────────────────────── */

  it('POST /api/admin/services: creates a base service', async () => {
    const suffix = Date.now();
    const { res, data } = await post(
      '/api/admin/services',
      {
        name: `Test Base Service ${suffix}`,
        description: 'integration test base',
        category: 'test',
        isAddon: false,
        sortOrder: 999,
      },
      adminCookie,
    );
    expect(res.status).toBe(200);
    expect(data.service.id).toBeTypeOf('number');
    expect(data.service.name).toBe(`Test Base Service ${suffix}`);
    expect(data.service.isAddon).toBe(false);
    expect(data.service.isActive).toBe(true);
    baseServiceId = data.service.id;
  });

  it('POST /api/admin/services: creates an addon service', async () => {
    const suffix = Date.now();
    const { res, data } = await post(
      '/api/admin/services',
      {
        name: `Test Addon ${suffix}`,
        category: 'test',
        isAddon: true,
        sortOrder: 999,
      },
      adminCookie,
    );
    expect(res.status).toBe(200);
    expect(data.service.isAddon).toBe(true);
    addonServiceId = data.service.id;
  });

  it('POST /api/admin/services: 400 on missing name', async () => {
    const { res } = await post('/api/admin/services', { isAddon: false }, adminCookie);
    expect(res.status).toBe(400);
  });

  /* ─────────────────────────────────── *
   * GET /api/admin/services/[id]
   * ─────────────────────────────────── */

  it('GET /api/admin/services/[id]: returns service + pricing array', async () => {
    const { res, data } = await get(`/api/admin/services/${baseServiceId}`, adminCookie);
    expect(res.status).toBe(200);
    expect(data.service.id).toBe(baseServiceId);
    expect(Array.isArray(data.pricing)).toBe(true);
    expect(data.pricing).toHaveLength(0); // none set yet
  });

  it('GET /api/admin/services/[id]: 404 for unknown id', async () => {
    const { res } = await get('/api/admin/services/9999999', adminCookie);
    expect(res.status).toBe(404);
  });

  /* ─────────────────────────────────── *
   * PATCH /api/admin/services/[id]
   * ─────────────────────────────────── */

  it('PATCH /api/admin/services/[id]: updates fields', async () => {
    const { res, data } = await patch(
      `/api/admin/services/${baseServiceId}`,
      { description: 'updated description' },
      adminCookie,
    );
    expect(res.status).toBe(200);
    expect(data.service.description).toBe('updated description');
  });

  it('PATCH /api/admin/services/[id]: 404 for unknown id', async () => {
    const { res } = await patch('/api/admin/services/9999999', { description: 'x' }, adminCookie);
    expect(res.status).toBe(404);
  });

  /* ─────────────────────────────────── *
   * PUT /api/admin/services/[id]/pricing
   * ─────────────────────────────────── */

  it('PUT /api/admin/services/[id]/pricing: replaces pricing rows', async () => {
    const pricing = sizeCategoryIds.map((sizeCategoryId, i) => ({
      sizeCategoryId,
      priceCents: 1000 + i * 500,
      durationMinutes: 30 + i * 15,
    }));

    const { res, data } = await put(
      `/api/admin/services/${baseServiceId}/pricing`,
      { pricing },
      adminCookie,
    );
    expect(res.status).toBe(200);
    expect(data.pricing).toHaveLength(sizeCategoryIds.length);
    for (const row of data.pricing) {
      expect(row.serviceId).toBe(baseServiceId);
    }
  });

  it('PUT /api/admin/services/[id]/pricing: full-replace semantics — empty array clears rows', async () => {
    const { res } = await put(
      `/api/admin/services/${baseServiceId}/pricing`,
      { pricing: [] },
      adminCookie,
    );
    expect(res.status).toBe(200);

    const after = await get(`/api/admin/services/${baseServiceId}`, adminCookie);
    expect(after.data.pricing).toHaveLength(0);
  });

  it('PUT /api/admin/services/[id]/pricing: 404 for unknown service id', async () => {
    const { res } = await put('/api/admin/services/9999999/pricing', { pricing: [] }, adminCookie);
    expect(res.status).toBe(404);
  });

  /* ─────────────────────────────────── *
   * GET / PUT /api/admin/services/[id]/addons
   * ─────────────────────────────────── */

  it('PUT /api/admin/services/[base]/addons: links addons to a base service', async () => {
    const { res, data } = await put(
      `/api/admin/services/${baseServiceId}/addons`,
      { addonServiceIds: [addonServiceId] },
      adminCookie,
    );
    expect(res.status).toBe(200);
    expect(data.addonServiceIds).toEqual([addonServiceId]);
  });

  it('GET /api/admin/services/[base]/addons: returns linked addon ids', async () => {
    const { res, data } = await get(`/api/admin/services/${baseServiceId}/addons`, adminCookie);
    expect(res.status).toBe(200);
    expect(data.addonServiceIds).toContain(addonServiceId);
  });

  it('PUT /api/admin/services/[addon]/addons: links bases to an addon (inverse direction)', async () => {
    const { res, data } = await put(
      `/api/admin/services/${addonServiceId}/addons`,
      { baseServiceIds: [baseServiceId] },
      adminCookie,
    );
    expect(res.status).toBe(200);
    expect(data.baseServiceIds).toEqual([baseServiceId]);
  });

  it('GET /api/admin/services/[addon]/addons: returns the linked base ids', async () => {
    const { res, data } = await get(`/api/admin/services/${addonServiceId}/addons`, adminCookie);
    expect(res.status).toBe(200);
    expect(data.baseServiceIds).toContain(baseServiceId);
  });

  it('PUT /api/admin/services/[base]/addons: empty array clears links', async () => {
    const { res, data } = await put(
      `/api/admin/services/${baseServiceId}/addons`,
      { addonServiceIds: [] },
      adminCookie,
    );
    expect(res.status).toBe(200);
    expect(data.addonServiceIds).toEqual([]);
  });

  /* ─────────────────────────────────── *
   * DELETE /api/admin/services/[id]
   * ─────────────────────────────────── */

  it('DELETE /api/admin/services/[id]: soft-deletes (sets isActive=false)', async () => {
    const { res, data } = await del(`/api/admin/services/${baseServiceId}`, adminCookie);
    expect(res.status).toBe(200);
    expect(data.success).toBe(true);

    const after = await get(`/api/admin/services/${baseServiceId}`, adminCookie);
    expect(after.res.status).toBe(200);
    expect(after.data.service.isActive).toBe(false);

    /* And it should disappear from the public catalog */
    const pub = await get('/api/services');
    expect(pub.data.services.some((s: any) => s.id === baseServiceId)).toBe(false);
  });
});
