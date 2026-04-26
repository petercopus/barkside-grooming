/**
 * AI assisted with this file
 *
 * Edges not covered by tests/integration/auth.test.ts.
 */

import { describe, expect, it } from 'vitest';

const BASE = 'http://localhost:3000';

/* ─────────────────────────────────── *
 * Helpers
 * ─────────────────────────────────── */

function getRawSetCookie(res: Response): string | null {
  return res.headers.get('set-cookie');
}

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

/* ─────────────────────────────────── *
 * Tests
 * ─────────────────────────────────── */

describe('Auth API — extras', () => {
  it('POST /api/auth/register: rejects short password', async () => {
    const { res } = await post('/api/auth/register', {
      email: `short-pw-${Date.now()}@test.com`,
      password: 'short', // <8 chars
      firstName: 'A',
      lastName: 'B',
    });
    expect(res.status).toBe(400);
  });

  it('POST /api/auth/register: rejects malformed email', async () => {
    const { res } = await post('/api/auth/register', {
      email: 'not-an-email',
      password: 'password123',
      firstName: 'A',
      lastName: 'B',
    });
    expect(res.status).toBe(400);
  });

  it('POST /api/auth/register: sets HttpOnly session cookie scoped to /', async () => {
    const { res } = await post('/api/auth/register', {
      email: `cookie-${Date.now()}@test.com`,
      password: 'password123',
      firstName: 'A',
      lastName: 'B',
    });
    expect(res.status).toBe(200);
    const setCookie = getRawSetCookie(res);
    expect(setCookie).toBeTruthy();
    expect(setCookie!).toMatch(/session=/);
    expect(setCookie!.toLowerCase()).toContain('httponly');
    expect(setCookie!).toMatch(/Path=\//);
    expect(setCookie!.toLowerCase()).toContain('samesite=lax');
  });

  it('POST /api/auth/login: 401 for a non-existent email', async () => {
    const { res } = await post('/api/auth/login', {
      email: `does-not-exist-${Date.now()}@test.com`,
      password: 'whatever123',
    });
    expect(res.status).toBe(401);
  });

  it('POST /api/auth/logout: succeeds (no-op) without a session cookie', async () => {
    const { res, data } = await post('/api/auth/logout', {});
    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
  });

  it('GET /api/auth/me: 401 on a garbage session cookie', async () => {
    const { res } = await get('/api/auth/me', 'this-is-not-a-real-token');
    expect(res.status).toBe(401);
  });

  it('GET /api/auth/me: response omits passwordHash and includes permissions array', async () => {
    const reg = await post('/api/auth/register', {
      email: `me-shape-${Date.now()}@test.com`,
      password: 'password123',
      firstName: 'Me',
      lastName: 'Shape',
    });
    const cookie = getSessionCookie(reg.res)!;

    const { res, data } = await get('/api/auth/me', cookie);
    expect(res.status).toBe(200);
    expect(data.user.email).toContain('me-shape-');
    expect(data.user.passwordHash).toBeUndefined();
    expect(Array.isArray(data.permissions)).toBe(true);
  });

  it('Two concurrent sessions for one user are independent — logging one out does not affect the other', async () => {
    const email = `multi-session-${Date.now()}@test.com`;
    await post('/api/auth/register', {
      email,
      password: 'password123',
      firstName: 'Multi',
      lastName: 'Session',
    });

    /* Two fresh logins → two independent session tokens */
    const a = await post('/api/auth/login', { email, password: 'password123' });
    const b = await post('/api/auth/login', { email, password: 'password123' });
    const tokenA = getSessionCookie(a.res)!;
    const tokenB = getSessionCookie(b.res)!;
    expect(tokenA).toBeTruthy();
    expect(tokenB).toBeTruthy();
    expect(tokenA).not.toBe(tokenB);

    /* Both sessions valid */
    const meA1 = await get('/api/auth/me', tokenA);
    const meB1 = await get('/api/auth/me', tokenB);
    expect(meA1.res.status).toBe(200);
    expect(meB1.res.status).toBe(200);

    /* Log out session A, session B should still be valid */
    const out = await fetch(`${BASE}/api/auth/logout`, {
      method: 'POST',
      headers: { Cookie: `session=${tokenA}` },
    });
    expect(out.status).toBe(200);

    const meA2 = await get('/api/auth/me', tokenA);
    const meB2 = await get('/api/auth/me', tokenB);
    expect(meA2.res.status).toBe(401);
    expect(meB2.res.status).toBe(200);
  });
});
