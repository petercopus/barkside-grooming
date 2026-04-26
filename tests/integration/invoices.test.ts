/**
 * AI assisted with this file
 *
 * Invoice mutation routes — line-items, finalize, manual-payment.
 * (`POST /api/admin/invoices/[id]/charge` requires a payment method on
 * the appointment and a working Stripe path; that's already covered by
 * payments.test.ts. Here we cover the two flows that don't require a
 * Stripe customer: editing a draft, and manual payment after finalize.)
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

function getNextMonday(): string {
  const d = new Date();
  d.setDate(d.getDate() + ((8 - d.getDay()) % 7 || 7));
  return d.toISOString().split('T')[0]!;
}

function addDays(yyyymmdd: string, days: number): string {
  const d = new Date(`${yyyymmdd}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().split('T')[0]!;
}

/* ─────────────────────────────────── *
 * Tests
 * ─────────────────────────────────── */

describe('Admin Invoices API', () => {
  let adminCookie: string;
  let custCookie: string;
  let groomerId: string;
  let serviceId: number;
  let bookingDate: string;

  beforeAll(async () => {
    bookingDate = getNextMonday();

    const login = await post('/api/auth/login', {
      email: 'admin@barkside.com',
      password: 'password123',
    });
    expect(login.res.status).toBe(200);
    adminCookie = getSessionCookie(login.res)!;

    const roles = await get('/api/admin/roles', adminCookie);
    const groomerRole = roles.data.roles.find((r: any) => r.name === 'Groomer');

    const services = await get('/api/services');
    serviceId = services.data.services.find((s: any) => s.name === 'Bath & Brush').id;

    const emp = await post(
      '/api/admin/employees',
      {
        email: `inv-groomer-${Date.now()}@test.com`,
        password: 'password123',
        firstName: 'Inv',
        lastName: 'Groomer',
        roleIds: [groomerRole.id],
        serviceIds: [serviceId],
      },
      adminCookie,
    );
    expect(emp.res.status).toBe(200);
    groomerId = emp.data.employee.id;

    const entries = [1, 2, 3, 4, 5].map((dayOfWeek) => ({
      dayOfWeek,
      startTime: '09:00',
      endTime: '17:00',
      isAvailable: true,
    }));
    await put(`/api/admin/employees/${groomerId}/schedule`, { entries }, adminCookie);

    const reg = await post('/api/auth/register', {
      email: `inv-cust-${Date.now()}@test.com`,
      password: 'password123',
      firstName: 'Inv',
      lastName: 'Cust',
    });
    custCookie = getSessionCookie(reg.res)!;
  });

  /* Each call picks a unique Mon–Fri × 09:00/12:00/15:00 slot so back-to-back
   * draft invoices don't collide on groomer availability. */
  let slotIdx = 0;

  async function newDraftInvoice(): Promise<{
    apptId: string;
    invoiceId: string;
    initialTotal: number;
  }> {
    const slot = slotIdx++;
    const dayOffset = slot % 5; // Mon, Tue, Wed, Thu, Fri
    const timeIdx = Math.floor(slot / 5) % 3;
    const times = ['09:00', '12:00', '15:00'];
    const startTime = times[timeIdx]!;
    const scheduledDate = addDays(bookingDate, dayOffset);

    const pet = await post(
      '/api/pets',
      { name: `I${slot}`, breed: 'Mix', weightLbs: 30, gender: 'male' },
      custCookie,
    );
    const book = await post(
      '/api/appointments',
      {
        pets: [
          {
            petId: pet.data.pet.id,
            serviceIds: [serviceId],
            groomerId,
            scheduledDate,
            startTime,
          },
        ],
      },
      custCookie,
    );
    expect(book.res.status).toBe(200);
    const apptId = book.data.appointment.id;

    const gen = await post(`/api/admin/appointments/${apptId}/invoice`, {}, adminCookie);
    expect(gen.res.status).toBe(200);
    return {
      apptId,
      invoiceId: gen.data.invoice.id,
      initialTotal: gen.data.invoice.totalCents,
    };
  }

  /* ─── PUT line-items ─── */

  it('PUT /api/admin/invoices/[id]/line-items: replaces items + recomputes totals', async () => {
    const { invoiceId } = await newDraftInvoice();

    const lineItems = [
      { description: 'Custom service', amountCents: 5000, type: 'service' },
      { description: 'Custom addon', amountCents: 1500, type: 'addon' },
      { description: 'Discount', amountCents: -500, type: 'bundle_discount' },
    ];

    const { res, data } = await put(
      `/api/admin/invoices/${invoiceId}/line-items`,
      { lineItems },
      adminCookie,
    );
    expect(res.status).toBe(200);
    expect(data.invoice.lineItems).toHaveLength(3);
    /* Subtotal = sum of positive items (6500); discount = 500; total = 6000 */
    expect(data.invoice.subtotalCents).toBe(6500);
    expect(data.invoice.discountCents).toBe(500);
    expect(data.invoice.totalCents).toBe(6000);
  });

  it('PUT /api/admin/invoices/[id]/line-items: 400 on empty array', async () => {
    const { invoiceId } = await newDraftInvoice();
    const { res } = await put(
      `/api/admin/invoices/${invoiceId}/line-items`,
      { lineItems: [] },
      adminCookie,
    );
    expect(res.status).toBe(400);
  });

  it('PUT /api/admin/invoices/[id]/line-items: 400 on bad item type', async () => {
    const { invoiceId } = await newDraftInvoice();
    const { res } = await put(
      `/api/admin/invoices/${invoiceId}/line-items`,
      { lineItems: [{ description: 'X', amountCents: 100, type: 'mystery' }] },
      adminCookie,
    );
    expect(res.status).toBe(400);
  });

  it('PUT /api/admin/invoices/[id]/line-items: 404 for unknown invoice id', async () => {
    const { res } = await put(
      '/api/admin/invoices/00000000-0000-0000-0000-000000000000/line-items',
      { lineItems: [{ description: 'X', amountCents: 1, type: 'service' }] },
      adminCookie,
    );
    expect(res.status).toBe(404);
  });

  /* ─── PATCH finalize ─── */

  it('PATCH /api/admin/invoices/[id]/finalize: flips draft → finalized', async () => {
    const { invoiceId } = await newDraftInvoice();
    const { res, data } = await patch(`/api/admin/invoices/${invoiceId}/finalize`, {}, adminCookie);
    expect(res.status).toBe(200);
    expect(data.invoice.status).toBe('finalized');
  });

  it('PATCH /api/admin/invoices/[id]/finalize: 400 when invoice is already finalized', async () => {
    const { invoiceId } = await newDraftInvoice();
    const first = await patch(`/api/admin/invoices/${invoiceId}/finalize`, {}, adminCookie);
    expect(first.res.status).toBe(200);

    const second = await patch(`/api/admin/invoices/${invoiceId}/finalize`, {}, adminCookie);
    expect(second.res.status).toBe(400);
  });

  it('PUT /api/admin/invoices/[id]/line-items: 400 once invoice is finalized (locked editing)', async () => {
    const { invoiceId } = await newDraftInvoice();
    /* Need a different startTime per call — hit Tuesday slot via a 2nd path */
    /* (The helper schedules on bookingDate, so collisions on '09:00' force us
     * to use a different invoice; this assertion uses a freshly-finalized one.) */
    await patch(`/api/admin/invoices/${invoiceId}/finalize`, {}, adminCookie);
    const { res } = await put(
      `/api/admin/invoices/${invoiceId}/line-items`,
      { lineItems: [{ description: 'X', amountCents: 1, type: 'service' }] },
      adminCookie,
    );
    expect(res.status).toBe(400);
  });

  /* ─── POST manual-payment ─── */

  it('POST /api/admin/invoices/[id]/manual-payment: 400 when invoice is still in draft', async () => {
    const { invoiceId } = await newDraftInvoice();
    const { res } = await post(
      `/api/admin/invoices/${invoiceId}/manual-payment`,
      { tipCents: 0 },
      adminCookie,
    );
    expect(res.status).toBe(400);
  });

  it('POST /api/admin/invoices/[id]/manual-payment: records payment after finalize', async () => {
    const { invoiceId, initialTotal } = await newDraftInvoice();
    await patch(`/api/admin/invoices/${invoiceId}/finalize`, {}, adminCookie);

    const { res, data } = await post(
      `/api/admin/invoices/${invoiceId}/manual-payment`,
      { tipCents: 500 },
      adminCookie,
    );
    expect(res.status).toBe(200);
    expect(data.payment.id).toBeTypeOf('string');
    expect(data.payment.provider).toBe('manual');
    expect(data.payment.status).toBe('captured');
    expect(data.payment.tipCents).toBe(500);
    expect(data.payment.amountCents).toBe(initialTotal + 500);
  });

  it('POST /api/admin/invoices/[id]/manual-payment: 400 on negative tip', async () => {
    const { invoiceId } = await newDraftInvoice();
    await patch(`/api/admin/invoices/${invoiceId}/finalize`, {}, adminCookie);

    const { res } = await post(
      `/api/admin/invoices/${invoiceId}/manual-payment`,
      { tipCents: -1 },
      adminCookie,
    );
    expect(res.status).toBe(400);
  });

  it('POST /api/admin/invoices/[id]/manual-payment: 404 for unknown id', async () => {
    const { res } = await post(
      '/api/admin/invoices/00000000-0000-0000-0000-000000000000/manual-payment',
      { tipCents: 0 },
      adminCookie,
    );
    expect(res.status).toBe(404);
  });

  /* ─── POST charge — auth-only smoke; 400 because the appointment has no PM ─── */

  it('POST /api/admin/invoices/[id]/charge: 400 when appointment has no payment method', async () => {
    const { invoiceId } = await newDraftInvoice();
    await patch(`/api/admin/invoices/${invoiceId}/finalize`, {}, adminCookie);

    const { res } = await post(
      `/api/admin/invoices/${invoiceId}/charge`,
      { tipCents: 0 },
      adminCookie,
    );
    expect(res.status).toBe(400);
  });
});
