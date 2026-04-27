/// <reference types="node" />

/**
 * AI HELPED WRITE THESE TESTS
 */

import 'dotenv/config';
import { beforeAll, describe, expect, it } from 'vitest';

const BASE = 'http://localhost:3000';

/* ─────────────────────────────────── *
 * HELPERS
 * ─────────────────────────────────── */
function getSessionCookie(res: Response): string | null {
  const setCookie = res.headers.get('set-cookie');
  if (!setCookie) return null;
  const match = setCookie.match(/session=([^;]+)/);
  return match?.[1] ?? null;
}

/** POST JSON and return { res, data } */
async function post(path: string, body: object, cookie?: string) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (cookie) headers['Cookie'] = `session=${cookie}`;
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  const data = await res.json();
  return { res, data };
}

async function patch(path: string, body: object, cookie: string) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Cookie': `session=${cookie}`,
  };
  const res = await fetch(`${BASE}${path}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify(body),
  });
  const data = await res.json();
  return { res, data };
}

async function put(path: string, body: object, cookie: string) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Cookie': `session=${cookie}`,
  };
  const res = await fetch(`${BASE}${path}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(body),
  });
  const data = await res.json();
  return { res, data };
}

async function get(path: string, cookie?: string) {
  const headers: Record<string, string> = {};
  if (cookie) headers['Cookie'] = `session=${cookie}`;
  const res = await fetch(`${BASE}${path}`, { headers });
  const data = await res.json();
  return { res, data };
}

describe('Payment Flows', () => {
  let adminCookie: string;
  let groomerId: string;
  let serviceId: number; // a single service ID for bookings

  // Future date that falls on a weekday (Monday)
  function getNextMonday(): string {
    const d = new Date();
    d.setDate(d.getDate() + ((8 - d.getDay()) % 7 || 7)); // next Monday
    return d.toISOString().split('T')[0]!; // YYYY-MM-DD
  }

  beforeAll(async () => {
    // 1. Login as admin (seeded: admin@barkside.com / password123)
    const loginRes = await post('/api/auth/login', {
      email: 'admin@barkside.com',
      password: 'password123',
    });
    expect(loginRes.res.status).toBe(200);
    adminCookie = getSessionCookie(loginRes.res)!;

    // 2. Fetch roles to get Groomer role ID
    const rolesRes = await get('/api/admin/roles', adminCookie);
    const groomerRole = rolesRes.data.roles.find((r: any) => r.name === 'Groomer');
    expect(groomerRole).toBeTruthy();

    // 3. Fetch services to get a service ID
    const servicesRes = await get('/api/services');
    const bathBrush = servicesRes.data.services?.find((s: any) => s.name === 'Bath & Brush');
    expect(bathBrush).toBeTruthy();
    serviceId = bathBrush.id;

    // 4. Create a groomer employee
    const groomerEmail = `groomer-${Date.now()}@test.com`;
    const empRes = await post(
      '/api/admin/employees',
      {
        email: groomerEmail,
        password: 'password123',
        firstName: 'Test',
        lastName: 'Groomer',
        roleIds: [groomerRole.id],
        serviceIds: [serviceId],
      },
      adminCookie,
    );
    expect(empRes.res.status).toBe(200);
    groomerId = empRes.data.employee.id;

    // 5. Set groomer schedule (Mon-Fri 09:00-17:00)
    const entries = [1, 2, 3, 4, 5].map((day) => ({
      dayOfWeek: day,
      startTime: '09:00',
      endTime: '17:00',
      isAvailable: true,
    }));
    const schedRes = await put(
      `/api/admin/employees/${groomerId}/schedule`,
      { entries },
      adminCookie,
    );
    expect(schedRes.res.status).toBe(200);
  });

  /* ─────────────────────────────────── *
   * GUEST CUSTOMER
   * ─────────────────────────────────── */
  describe('Guest Manual Payment', () => {
    let appointmentId: string;
    let invoiceId: string;

    it('creates a guest booking', async () => {
      const bookingDate = getNextMonday();
      const { res, data } = await post('/api/appointments/guest', {
        pet: {
          name: 'Buddy',
          breed: 'Golden Retriever',
          weightLbs: 50,
          serviceIds: [serviceId],
          addonIds: [],
          groomerId,
          scheduledDate: bookingDate,
          startTime: '10:00',
        },
        guestDetails: {
          firstName: 'Jane',
          lastName: 'Guest',
          email: `guest-${Date.now()}@test.com`,
          phone: '555-0000',
        },
      });

      expect(res.status).toBe(200);
      expect(data.appointment).toBeTruthy();
      appointmentId = data.appointment.id;
    });

    it('admin sets status to in_progress', async () => {
      const { res } = await patch(
        `/api/admin/appointments/${appointmentId}/status`,
        { status: 'in_progress' },
        adminCookie,
      );
      expect(res.status).toBe(200);
    });

    it('admin generates invoice', async () => {
      const { res, data } = await post(
        `/api/admin/appointments/${appointmentId}/invoice`,
        {},
        adminCookie,
      );
      expect(res.status).toBe(200);
      expect(data.invoice.status).toBe('draft');
      expect(data.invoice.lineItems.length).toBeGreaterThan(0);
      invoiceId = data.invoice.id;
    });

    it('admin can add adjustment line items', async () => {
      // Fetch current invoice to get existing line items
      const current = await get(`/api/admin/appointments/${appointmentId}/invoice`, adminCookie);
      const existingItems = current.data.invoice.lineItems.map((li: any) => ({
        description: li.description,
        amountCents: li.amountCents,
        type: li.type,
      }));

      // Add a $10 matting surcharge
      const { res, data } = await put(
        `/api/admin/invoices/${invoiceId}/line-items`,
        {
          lineItems: [
            ...existingItems,
            { description: 'Matting surcharge', amountCents: 1000, type: 'adjustment' },
          ],
        },
        adminCookie,
      );

      expect(res.status).toBe(200);
      expect(data.invoice.totalCents).toBe(
        existingItems.reduce((s: number, li: any) => s + li.amountCents, 0) + 1000,
      );
    });

    it('admin finalizes invoice', async () => {
      const { res, data } = await patch(
        `/api/admin/invoices/${invoiceId}/finalize`,
        {},
        adminCookie,
      );
      expect(res.status).toBe(200);
      expect(data.invoice.status).toBe('finalized');
    });

    it('cannot edit line items after finalization', async () => {
      const { res } = await put(
        `/api/admin/invoices/${invoiceId}/line-items`,
        {
          lineItems: [{ description: 'Hack', amountCents: 0, type: 'adjustment' }],
        },
        adminCookie,
      );
      expect(res.status).toBe(400);
    });

    it('admin records manual payment with tip', async () => {
      const tipCents = 500; // $5 tip
      const { res, data } = await post(
        `/api/admin/invoices/${invoiceId}/manual-payment`,
        { tipCents },
        adminCookie,
      );
      expect(res.status).toBe(200);
      expect(data.payment.provider).toBe('manual');
      expect(data.payment.tipCents).toBe(tipCents);
      expect(data.payment.status).toBe('captured');
    });

    it('invoice is now paid', async () => {
      const { data } = await get(`/api/admin/appointments/${appointmentId}/invoice`, adminCookie);
      expect(data.invoice.status).toBe('paid');
      expect(data.invoice.tipCents).toBe(500);
      expect(data.invoice.paidAt).toBeTruthy();
    });
  });

  /* ─────────────────────────────────── *
   * AUTH'D CUSTOMER
   * ─────────────────────────────────── */
  describe('Auth Customer Card Payment', () => {
    let customerCookie: string;
    let customerId: string;
    let petId: string;
    let paymentMethodId: string;
    let appointmentId: string;
    let invoiceId: string;

    // Read Stripe secret key for test-mode API calls
    const STRIPE_SK = process.env.STRIPE_SECRET_KEY!;

    it('registers a customer', async () => {
      const email = `pay-cust-${Date.now()}@test.com`;
      const { res, data } = await post('/api/auth/register', {
        email,
        password: 'password123',
        firstName: 'Pay',
        lastName: 'Customer',
      });
      expect(res.status).toBe(200);
      customerCookie = getSessionCookie(res)!;
      customerId = data.user.id;
    });

    it('creates a pet', async () => {
      const { res, data } = await post(
        '/api/pets',
        { name: 'Rex', breed: 'Labrador', weightLbs: 60, gender: 'male' },
        customerCookie,
      );
      expect(res.status).toBe(200);
      petId = data.pet.id;
    });

    it('sets up a payment method via Stripe test mode', async () => {
      // 1. Get a SetupIntent from our API
      const { res: siRes, data: siData } = await post(
        '/api/payment-methods/setup-intent',
        {},
        customerCookie,
      );
      expect(siRes.status).toBe(200);
      const clientSecret = siData.clientSecret as string;

      // 2. Extract SetupIntent ID from client secret (seti_xxx_secret_yyy → seti_xxx)
      const setupIntentId = clientSecret.split('_secret_')[0];

      // 3. Confirm the SetupIntent with Stripe test card via Stripe API
      const confirmRes = await fetch(
        `https://api.stripe.com/v1/setup_intents/${setupIntentId}/confirm`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${STRIPE_SK}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: 'payment_method=pm_card_visa',
        },
      );
      expect(confirmRes.status).toBe(200);
      const confirmedSI = await confirmRes.json();
      paymentMethodId = confirmedSI.payment_method;
      expect(paymentMethodId).toMatch(/^pm_/);

      // 4. Save the payment method via our API
      const { res: saveRes } = await post(
        '/api/payment-methods',
        { stripePaymentMethodId: paymentMethodId },
        customerCookie,
      );
      expect(saveRes.status).toBe(200);
    });

    it('lists saved payment methods', async () => {
      const { res, data } = await get('/api/payment-methods', customerCookie);
      expect(res.status).toBe(200);
      expect(data.paymentMethods.length).toBe(1);
      expect(data.paymentMethods[0].last4).toBe('4242');
      expect(data.paymentMethods[0].brand).toBe('visa');
    });

    it('creates booking with payment method', async () => {
      const bookingDate = getNextMonday();
      const { res, data } = await post(
        '/api/appointments',
        {
          pets: [
            {
              petId,
              serviceIds: [serviceId],
              addonIds: [],
              groomerId,
              scheduledDate: bookingDate,
              startTime: '14:00', // different slot than guest test
            },
          ],
          paymentMethodId,
        },
        customerCookie,
      );
      expect(res.status).toBe(200);
      appointmentId = data.appointment.id;
    });

    it('admin generates and finalizes invoice', async () => {
      // Set to in_progress
      await patch(
        `/api/admin/appointments/${appointmentId}/status`,
        { status: 'in_progress' },
        adminCookie,
      );

      // Generate invoice
      const { data: invData } = await post(
        `/api/admin/appointments/${appointmentId}/invoice`,
        {},
        adminCookie,
      );
      expect(invData.invoice.status).toBe('draft');
      invoiceId = invData.invoice.id;

      // Finalize
      const { data: finData } = await patch(
        `/api/admin/invoices/${invoiceId}/finalize`,
        {},
        adminCookie,
      );
      expect(finData.invoice.status).toBe('finalized');
    });

    it('charges the card with tip', async () => {
      const tipCents = 1000; // $10 tip
      const { res, data } = await post(
        `/api/admin/invoices/${invoiceId}/charge`,
        { tipCents },
        adminCookie,
      );
      expect(res.status).toBe(200);
      expect(data.payment.provider).toBe('stripe');
      expect(data.payment.tipCents).toBe(tipCents);
      expect(data.payment.status).toBe('captured');
      expect(data.payment.transactionId).toMatch(/^pi_/); // Stripe PaymentIntent ID
    });

    it('invoice is paid with correct amounts', async () => {
      const { data } = await get(`/api/admin/appointments/${appointmentId}/invoice`, adminCookie);
      expect(data.invoice.status).toBe('paid');
      expect(data.invoice.tipCents).toBe(1000);
      expect(data.invoice.paidAt).toBeTruthy();
    });

    it('cannot charge a paid invoice again', async () => {
      const { res } = await post(
        `/api/admin/invoices/${invoiceId}/charge`,
        { tipCents: 0 },
        adminCookie,
      );
      expect(res.status).toBe(400);
    });
  });
});
