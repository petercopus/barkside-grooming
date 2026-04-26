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

async function del(path: string, cookie?: string) {
  const headers: Record<string, string> = {};
  if (cookie) headers['Cookie'] = `session=${cookie}`;
  const res = await fetch(`${BASE}${path}`, { method: 'DELETE', headers });
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

/* ─────────────────────────────────── *
 * Tests
 * ─────────────────────────────────── */

describe('Pets API', () => {
  let custACookie: string;
  let custBCookie: string;
  let petAId: string;
  let petBId: string; // belongs to A — used to test soft delete
  let custBPetId: string; // belongs to B — used to test cross-user 404s

  beforeAll(async () => {
    const a = await post('/api/auth/register', {
      email: `pets-cust-a-${Date.now()}@test.com`,
      password: 'password123',
      firstName: 'Pet',
      lastName: 'CustA',
    });
    expect(a.res.status).toBe(200);
    custACookie = getSessionCookie(a.res)!;

    const b = await post('/api/auth/register', {
      email: `pets-cust-b-${Date.now()}@test.com`,
      password: 'password123',
      firstName: 'Pet',
      lastName: 'CustB',
    });
    expect(b.res.status).toBe(200);
    custBCookie = getSessionCookie(b.res)!;

    /* B already has one pet so we can probe ownership 404s on PATCH/DELETE */
    const bPet = await post(
      '/api/pets',
      { name: 'BPet', breed: 'Beagle', weightLbs: 30, gender: 'female' },
      custBCookie,
    );
    expect(bPet.res.status).toBe(200);
    custBPetId = bPet.data.pet.id;
  });

  /* ─────────────────────────────────── *
   * POST /api/pets
   * ─────────────────────────────────── */

  it('POST /api/pets: 401 without session', async () => {
    const { res } = await post('/api/pets', { name: 'Ghost' });
    expect(res.status).toBe(401);
  });

  it('POST /api/pets: 200 happy path → returns pet with resolved size category', async () => {
    const { res, data } = await post(
      '/api/pets',
      { name: 'Rex', breed: 'Labrador', weightLbs: 50, gender: 'male' },
      custACookie,
    );
    expect(res.status).toBe(200);
    expect(data.pet.name).toBe('Rex');
    expect(data.pet.weightLbs).toBe(50);
    expect(data.pet.sizeCategoryId).not.toBeNull(); // resolveSizeCategory ran
    petAId = data.pet.id;
  });

  it('POST /api/pets: rejects missing required name', async () => {
    const { res } = await post('/api/pets', { breed: 'Husky' }, custACookie);
    expect(res.status).toBe(400);
  });

  /* ─────────────────────────────────── *
   * GET /api/pets
   * ─────────────────────────────────── */

  it('GET /api/pets: 401 without session', async () => {
    const { res } = await get('/api/pets');
    expect(res.status).toBe(401);
  });

  it('GET /api/pets: returns only the caller’s pets', async () => {
    const a = await get('/api/pets', custACookie);
    expect(a.res.status).toBe(200);
    expect(a.data.pets.some((p: any) => p.id === petAId)).toBe(true);
    expect(a.data.pets.some((p: any) => p.id === custBPetId)).toBe(false);

    const b = await get('/api/pets', custBCookie);
    expect(b.res.status).toBe(200);
    expect(b.data.pets.some((p: any) => p.id === custBPetId)).toBe(true);
    expect(b.data.pets.some((p: any) => p.id === petAId)).toBe(false);
  });

  /* ─────────────────────────────────── *
   * GET /api/pets/[id]
   * ─────────────────────────────────── */

  it('GET /api/pets/[id]: 401 without session', async () => {
    const { res } = await get(`/api/pets/${petAId}`);
    expect(res.status).toBe(401);
  });

  it('GET /api/pets/[id]: 200 for owned pet', async () => {
    const { res, data } = await get(`/api/pets/${petAId}`, custACookie);
    expect(res.status).toBe(200);
    expect(data.pet.id).toBe(petAId);
  });

  it('GET /api/pets/[id]: 404 for another user’s pet', async () => {
    const { res } = await get(`/api/pets/${custBPetId}`, custACookie);
    expect(res.status).toBe(404);
  });

  /* ─────────────────────────────────── *
   * PATCH /api/pets/[id]
   * ─────────────────────────────────── */

  it('PATCH /api/pets/[id]: 401 without session', async () => {
    const { res } = await patch(`/api/pets/${petAId}`, { name: 'NewName' });
    expect(res.status).toBe(401);
  });

  it('PATCH /api/pets/[id]: 200 updates fields and re-resolves size category on weight change', async () => {
    /* 50 lbs → likely sizeCategoryId 3; bump to 5 lbs → toy/small (different id) */
    const before = await get(`/api/pets/${petAId}`, custACookie);
    const beforeSize = before.data.pet.sizeCategoryId;

    const { res, data } = await patch(
      `/api/pets/${petAId}`,
      { weightLbs: 5, name: 'RexLite' },
      custACookie,
    );
    expect(res.status).toBe(200);
    expect(data.pet.name).toBe('RexLite');
    expect(data.pet.weightLbs).toBe(5);
    expect(data.pet.sizeCategoryId).not.toBe(beforeSize);
  });

  it('PATCH /api/pets/[id]: 404 for another user’s pet', async () => {
    const { res } = await patch(`/api/pets/${custBPetId}`, { name: 'Hijack' }, custACookie);
    expect(res.status).toBe(404);
  });

  /* ─────────────────────────────────── *
   * DELETE /api/pets/[id]
   * ─────────────────────────────────── */

  it('DELETE /api/pets/[id]: 401 without session', async () => {
    const { res } = await del(`/api/pets/${petAId}`);
    expect(res.status).toBe(401);
  });

  it('DELETE /api/pets/[id]: soft-deletes — pet disappears from list', async () => {
    /* Make a fresh pet for A so we don’t disturb the one used by other tests */
    const created = await post(
      '/api/pets',
      { name: 'Ghost', breed: 'Whippet', weightLbs: 20, gender: 'male' },
      custACookie,
    );
    expect(created.res.status).toBe(200);
    petBId = created.data.pet.id;

    const before = await get('/api/pets', custACookie);
    expect(before.data.pets.some((p: any) => p.id === petBId)).toBe(true);

    const { res } = await del(`/api/pets/${petBId}`, custACookie);
    expect(res.status).toBe(200);

    const after = await get('/api/pets', custACookie);
    expect(after.data.pets.some((p: any) => p.id === petBId)).toBe(false);
  });

  it('DELETE /api/pets/[id]: 404 for another user’s pet', async () => {
    const { res } = await del(`/api/pets/${custBPetId}`, custACookie);
    expect(res.status).toBe(404);
  });
});
