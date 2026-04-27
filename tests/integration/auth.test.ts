import { describe, expect, it } from 'vitest';

const BASE = 'http://localhost:3000';

describe('Auth API', () => {
  // Helper to extract session cookie from response
  function getSessionCookie(res: Response): string | null {
    const setCookie = res.headers.get('set-cookie');
    if (!setCookie) return null;
    const match = setCookie.match(/session=([^;]+)/);
    return match?.[1] ?? null;
  }

  it('POST /api/auth/register: creates user and sets cookie', async () => {
    const res = await fetch(`${BASE}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: `test-${Date.now()}@example.com`, // unique per run
        password: 'password123',
        firstName: 'Test',
        lastName: 'User',
      }),
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.user.email).toContain('test-');
    expect(data.user.passwordHash).toBeUndefined(); // must not leak
    expect(getSessionCookie(res)).toBeTruthy();
  });

  it('POST /api/auth/register: 409 on duplicate email', async () => {
    const email = `dupe-${Date.now()}@example.com`;
    const body = { email, password: 'password123', firstName: 'A', lastName: 'B' };

    await fetch(`${BASE}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const res = await fetch(`${BASE}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    expect(res.status).toBe(409);
  });

  it('POST /api/auth/login: returns user + cookie', async () => {
    const email = `login-${Date.now()}@example.com`;
    await fetch(`${BASE}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: 'password123', firstName: 'A', lastName: 'B' }),
    });

    const res = await fetch(`${BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: 'password123' }),
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.user.email).toBe(email);
    expect(getSessionCookie(res)).toBeTruthy();
  });

  it('POST /api/auth/login: 401 on wrong password', async () => {
    const res = await fetch(`${BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'nonexistent@example.com', password: 'wrong' }),
    });

    expect(res.status).toBe(401);
  });

  it('GET /api/auth/me: returns user when authenticated', async () => {
    const email = `me-${Date.now()}@example.com`;
    const regRes = await fetch(`${BASE}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: 'password123', firstName: 'A', lastName: 'B' }),
    });
    const token = getSessionCookie(regRes);

    const res = await fetch(`${BASE}/api/auth/me`, {
      headers: { Cookie: `session=${token}` },
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.user.email).toBe(email);
    expect(Array.isArray(data.permissions)).toBe(true);
  });

  it('GET /api/auth/me: 401 without cookie', async () => {
    const res = await fetch(`${BASE}/api/auth/me`);
    expect(res.status).toBe(401);
  });

  it('POST /api/auth/logout: invalidates session', async () => {
    const email = `logout-${Date.now()}@example.com`;
    const regRes = await fetch(`${BASE}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: 'password123', firstName: 'A', lastName: 'B' }),
    });
    const token = getSessionCookie(regRes);

    await fetch(`${BASE}/api/auth/logout`, {
      method: 'POST',
      headers: { Cookie: `session=${token}` },
    });

    const meRes = await fetch(`${BASE}/api/auth/me`, {
      headers: { Cookie: `session=${token}` },
    });
    expect(meRes.status).toBe(401);
  });
});
