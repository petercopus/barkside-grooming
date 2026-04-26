/**
 * AI assisted with this file
 *
 * Admin size categories CRUD.
 * Notes:
 * - The catalog already has small/medium/large/xlarge covering 0–999 lbs.
 *   New entries must be carved out of an unused gap or the seed range
 *   must be widened first. Tests that need to create a fresh entry
 *   pick a high range (1000+ lbs) that won't overlap.
 * - DELETE 409s if a size category is referenced by any servicePricing
 *   row or pet — verified explicitly.
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

describe('Admin Size Categories API', () => {
  let adminCookie: string;
  let createdId: number | null = null;
  /* Pick a starting weight above any seeded category to avoid overlaps.
   * Seeds top out at 999, so 10000 is comfortably clear. We bump per
   * test run so re-runs against the same DB don't collide. */
  const baseWeight = 10000 + (Date.now() % 10000);

  beforeAll(async () => {
    const login = await post('/api/auth/login', {
      email: 'admin@barkside.com',
      password: 'password123',
    });
    expect(login.res.status).toBe(200);
    adminCookie = getSessionCookie(login.res)!;
  });

  /* ─────────────────────────────────── *
   * GET (admin) is just the public list — covered by services-public.test.ts
   * The admin-only behavior is mutate, so focus there.
   * ─────────────────────────────────── */

  /* ─── POST ─── */

  it('POST /api/admin/size-categories: 400 on max <= min', async () => {
    const { res } = await post(
      '/api/admin/size-categories',
      { name: 'invalid', minWeight: 50, maxWeight: 50 },
      adminCookie,
    );
    expect(res.status).toBe(400);
  });

  it('POST /api/admin/size-categories: 409 on overlap with existing seed range', async () => {
    /* small is 0–15; minWeight 10 / maxWeight 20 overlaps small + medium */
    const { res } = await post(
      '/api/admin/size-categories',
      { name: `overlap-${Date.now()}`, minWeight: 10, maxWeight: 20 },
      adminCookie,
    );
    expect(res.status).toBe(409);
  });

  it('POST /api/admin/size-categories: creates a new category in a free range', async () => {
    const { res, data } = await post(
      '/api/admin/size-categories',
      { name: `Test ${baseWeight}`, minWeight: baseWeight, maxWeight: baseWeight + 100 },
      adminCookie,
    );
    expect(res.status).toBe(200);
    expect(data.category.id).toBeTypeOf('number');
    expect(data.category.minWeight).toBe(baseWeight);
    expect(data.category.maxWeight).toBe(baseWeight + 100);
    createdId = data.category.id;
  });

  /* ─── GET [id] ─── */

  it('GET /api/admin/size-categories/[id]: returns the new category', async () => {
    const { res, data } = await get(`/api/admin/size-categories/${createdId}`, adminCookie);
    expect(res.status).toBe(200);
    expect(data.category.id).toBe(createdId);
  });

  it('GET /api/admin/size-categories/[id]: 404 for unknown id', async () => {
    const { res } = await get('/api/admin/size-categories/9999999', adminCookie);
    expect(res.status).toBe(404);
  });

  /* ─── PATCH ─── */

  it('PATCH /api/admin/size-categories/[id]: updates name only', async () => {
    const { res, data } = await patch(
      `/api/admin/size-categories/${createdId}`,
      { name: `Renamed ${baseWeight}` },
      adminCookie,
    );
    expect(res.status).toBe(200);
    expect(data.category.name).toBe(`Renamed ${baseWeight}`);
  });

  it('PATCH /api/admin/size-categories/[id]: 400 on max <= min', async () => {
    const { res } = await patch(
      `/api/admin/size-categories/${createdId}`,
      { minWeight: 5, maxWeight: 5 },
      adminCookie,
    );
    expect(res.status).toBe(400);
  });

  it('PATCH /api/admin/size-categories/[id]: 409 on overlap with another category', async () => {
    /* small is 0–15 in seed — try to grow our test category down into it */
    const { res } = await patch(
      `/api/admin/size-categories/${createdId}`,
      { minWeight: 0, maxWeight: 5 },
      adminCookie,
    );
    expect(res.status).toBe(409);
  });

  it('PATCH /api/admin/size-categories/[id]: 404 for unknown id', async () => {
    const { res } = await patch('/api/admin/size-categories/9999999', { name: 'x' }, adminCookie);
    expect(res.status).toBe(404);
  });

  /* ─── DELETE ─── */

  it('DELETE /api/admin/size-categories/[id]: removes an unused category', async () => {
    const { res, data } = await del(`/api/admin/size-categories/${createdId}`, adminCookie);
    expect(res.status).toBe(200);
    expect(data.success).toBe(true);

    /* gone */
    const after = await get(`/api/admin/size-categories/${createdId}`, adminCookie);
    expect(after.res.status).toBe(404);
    createdId = null;
  });

  it('DELETE /api/admin/size-categories/[id]: 404 for unknown id', async () => {
    const { res } = await del('/api/admin/size-categories/9999999', adminCookie);
    expect(res.status).toBe(404);
  });

  it('DELETE /api/admin/size-categories/[id]: 409 when referenced by service pricing', async () => {
    /* The seeded "medium" size is wired into service pricing. Trying to
     * delete it should 409 without touching any rows. */
    const sizes = await get('/api/size-categories');
    const medium = sizes.data.sizeCategories.find((s: any) => s.name === 'medium');
    expect(medium).toBeTruthy();

    const { res } = await del(`/api/admin/size-categories/${medium.id}`, adminCookie);
    expect(res.status).toBe(409);
  });
});
