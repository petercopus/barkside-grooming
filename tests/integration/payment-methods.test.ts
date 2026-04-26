/**
 * AI assisted with this file
 *
 * Surface tests for /api/payment-methods routes.
 * The end-to-end Stripe happy path (SetupIntent → save PM → use it for charge)
 * is already covered by tests/integration/payments.test.ts. This file focuses
 * on auth, list shape, schema rejection, and the Stripe-rejection paths.
 */

import 'dotenv/config';
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

describe('Payment Methods API', () => {
  let custCookie: string;

  beforeAll(async () => {
    const reg = await post('/api/auth/register', {
      email: `pm-cust-${Date.now()}@test.com`,
      password: 'password123',
      firstName: 'PM',
      lastName: 'Customer',
    });
    expect(reg.res.status).toBe(200);
    custCookie = getSessionCookie(reg.res)!;
  });

  /* ─── GET list ─── */

  it('GET /api/payment-methods: 401 without session', async () => {
    const { res } = await get('/api/payment-methods');
    expect(res.status).toBe(401);
  });

  it('GET /api/payment-methods: returns empty array for a fresh customer', async () => {
    const { res, data } = await get('/api/payment-methods', custCookie);
    expect(res.status).toBe(200);
    expect(Array.isArray(data.paymentMethods)).toBe(true);
    expect(data.paymentMethods).toHaveLength(0);
  });

  /* ─── POST save ─── */

  it('POST /api/payment-methods: 401 without session', async () => {
    const { res } = await post('/api/payment-methods', { stripePaymentMethodId: 'pm_test_xxx' });
    expect(res.status).toBe(401);
  });

  it('POST /api/payment-methods: rejects missing stripePaymentMethodId', async () => {
    const { res } = await post('/api/payment-methods', {}, custCookie);
    expect(res.status).toBe(400);
  });

  it('POST /api/payment-methods: 404 on an unknown Stripe payment method id', async () => {
    /* `pm_does_not_exist` is not a real PM in Stripe test mode → Stripe returns
     * "No such payment_method", which the service rethrows. */
    const { res } = await post(
      '/api/payment-methods',
      { stripePaymentMethodId: 'pm_does_not_exist' },
      custCookie,
    );
    expect(res.status).toBe(404);
  });

  /* ─── Setup intents ─── */

  it('POST /api/payment-methods/setup-intent: 401 without session', async () => {
    const { res } = await post('/api/payment-methods/setup-intent', {});
    expect(res.status).toBe(401);
  });

  it('POST /api/payment-methods/setup-intent: 200 returns a Stripe client secret for an auth customer', async () => {
    const { res, data } = await post('/api/payment-methods/setup-intent', {}, custCookie);
    expect(res.status).toBe(200);
    expect(typeof data.clientSecret).toBe('string');
    expect(data.clientSecret).toMatch(/^seti_.+_secret_.+/);
  });

  it('POST /api/payment-methods/guest-setup-intent: 200 (public) returns clientSecret + stripeCustomerId', async () => {
    const { res, data } = await post('/api/payment-methods/guest-setup-intent', {});
    expect(res.status).toBe(200);
    expect(typeof data.clientSecret).toBe('string');
    expect(data.clientSecret).toMatch(/^seti_.+_secret_.+/);
    expect(typeof data.stripeCustomerId).toBe('string');
    expect(data.stripeCustomerId).toMatch(/^cus_/);
  });

  /* ─── Mutating routes — auth checks only (Stripe happy path is in payments.test.ts) ─── */

  it('DELETE /api/payment-methods/[id]: 401 without session', async () => {
    const { res } = await del('/api/payment-methods/00000000-0000-0000-0000-000000000000');
    expect(res.status).toBe(401);
  });

  it('PATCH /api/payment-methods/[id]/default: 401 without session', async () => {
    const { res } = await patch(
      '/api/payment-methods/00000000-0000-0000-0000-000000000000/default',
      {},
    );
    expect(res.status).toBe(401);
  });
});
