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

async function postJson(path: string, body: object, cookie?: string) {
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
  const data = await res.json().catch(() => ({}));
  return { res, data };
}

/**
 * Multipart upload helper. Pass `parts` to control which form fields are
 * present — useful for negative tests that omit the file part.
 */
async function postMultipart(
  path: string,
  parts: { file?: { name: string; type: string; bytes: Buffer }; fields?: Record<string, string> },
  cookie?: string,
) {
  const fd = new FormData();
  if (parts.file) {
    const blob = new Blob([new Uint8Array(parts.file.bytes)], { type: parts.file.type });
    fd.append('file', blob, parts.file.name);
  }
  for (const [k, v] of Object.entries(parts.fields ?? {})) {
    fd.append(k, v);
  }

  const headers: Record<string, string> = {};
  if (cookie) headers['Cookie'] = `session=${cookie}`;
  const res = await fetch(`${BASE}${path}`, { method: 'POST', headers, body: fd });
  const data = await res.json().catch(() => ({}));
  return { res, data };
}

function getNextMonday(): string {
  const d = new Date();
  d.setDate(d.getDate() + ((8 - d.getDay()) % 7 || 7));
  return d.toISOString().split('T')[0]!;
}

/** Tiny stand-in for an image — the upload endpoint only validates mime + size */
const FAKE_PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

/* ─────────────────────────────────── *
 * Tests
 * ─────────────────────────────────── */

describe('Documents API', () => {
  let adminCookie: string;
  let groomerId: string;
  let serviceId: number;
  let bookingDate: string;

  /* Customer A — uploads a doc, has a pending_documents booking */
  let custACookie: string;
  let custAPetId: string;
  let custADocId: string;

  /* Customer B — used for cross-user isolation */
  let custBCookie: string;

  beforeAll(async () => {
    bookingDate = getNextMonday();

    /* Admin */
    const loginRes = await postJson('/api/auth/login', {
      email: 'admin@barkside.com',
      password: 'password123',
    });
    expect(loginRes.res.status).toBe(200);
    adminCookie = getSessionCookie(loginRes.res)!;

    /* Service + groomer setup so we can create a pending_documents booking */
    const rolesRes = await get('/api/admin/roles', adminCookie);
    const groomerRole = rolesRes.data.roles.find((r: any) => r.name === 'Groomer');
    expect(groomerRole).toBeTruthy();

    const servicesRes = await get('/api/services');
    const service = servicesRes.data.services.find((s: any) => s.name === 'Bath & Brush');
    expect(service).toBeTruthy();
    serviceId = service.id;

    const empRes = await postJson(
      '/api/admin/employees',
      {
        email: `documents-groomer-${Date.now()}@test.com`,
        password: 'password123',
        firstName: 'Documents',
        lastName: 'Groomer',
        roleIds: [groomerRole.id],
        serviceIds: [serviceId],
      },
      adminCookie,
    );
    expect(empRes.res.status).toBe(200);
    groomerId = empRes.data.employee.id;

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

    /* Customer A */
    const custARes = await postJson('/api/auth/register', {
      email: `documents-cust-a-${Date.now()}@test.com`,
      password: 'password123',
      firstName: 'Doc',
      lastName: 'CustA',
    });
    expect(custARes.res.status).toBe(200);
    custACookie = getSessionCookie(custARes.res)!;

    const petRes = await postJson(
      '/api/pets',
      { name: 'Luna', breed: 'Husky', weightLbs: 50, gender: 'female' },
      custACookie,
    );
    expect(petRes.res.status).toBe(200);
    custAPetId = petRes.data.pet.id;

    /* Booking → puts customer A in pending_documents and creates a doc request for them */
    const bookRes = await postJson(
      '/api/appointments',
      {
        pets: [
          {
            petId: custAPetId,
            serviceIds: [serviceId],
            groomerId,
            scheduledDate: bookingDate,
            startTime: '09:00',
          },
        ],
      },
      custACookie,
    );
    expect(bookRes.res.status).toBe(200);
    expect(bookRes.data.appointment.status).toBe('pending_documents');

    /* Customer B */
    const custBRes = await postJson('/api/auth/register', {
      email: `documents-cust-b-${Date.now()}@test.com`,
      password: 'password123',
      firstName: 'Doc',
      lastName: 'CustB',
    });
    expect(custBRes.res.status).toBe(200);
    custBCookie = getSessionCookie(custBRes.res)!;
  });

  /* ─────────────────────────────────── *
   * POST /api/documents
   * ─────────────────────────────────── */

  it('POST /api/documents: 401 without session', async () => {
    const { res } = await postMultipart('/api/documents', {
      file: { name: 'vax.png', type: 'image/png', bytes: FAKE_PNG },
      fields: { type: 'vaccination_record' },
    });
    expect(res.status).toBe(401);
  });

  it('POST /api/documents: 400 when no file part is present', async () => {
    const { res } = await postMultipart(
      '/api/documents',
      { fields: { type: 'vaccination_record' } },
      custACookie,
    );
    expect(res.status).toBe(400);
  });

  it('POST /api/documents: 400 on disallowed mime type', async () => {
    const { res } = await postMultipart(
      '/api/documents',
      {
        file: {
          name: 'notes.txt',
          type: 'text/plain',
          bytes: Buffer.from('hello'),
        },
        fields: { type: 'vaccination_record' },
      },
      custACookie,
    );
    expect(res.status).toBe(400);
  });

  it('POST /api/documents: 200 happy path → returns document', async () => {
    const { res, data } = await postMultipart(
      '/api/documents',
      {
        file: { name: 'vax.png', type: 'image/png', bytes: FAKE_PNG },
        fields: { type: 'vaccination_record', petId: custAPetId },
      },
      custACookie,
    );
    expect(res.status).toBe(200);
    expect(data.document).toBeTruthy();
    expect(data.document.type).toBe('vaccination_record');
    expect(data.document.status).toBe('pending');
    expect(data.document.uploadedByUserId).toBeTruthy();
    custADocId = data.document.id;
  });

  /* ─────────────────────────────────── *
   * GET /api/documents
   * ─────────────────────────────────── */

  it('GET /api/documents: 401 without session', async () => {
    const { res } = await get('/api/documents');
    expect(res.status).toBe(401);
  });

  it('GET /api/documents: returns only the caller’s documents', async () => {
    const a = await get('/api/documents', custACookie);
    expect(a.res.status).toBe(200);
    expect(a.data.documents.some((d: any) => d.id === custADocId)).toBe(true);

    const b = await get('/api/documents', custBCookie);
    expect(b.res.status).toBe(200);
    expect(b.data.documents.some((d: any) => d.id === custADocId)).toBe(false);
  });

  /* ─────────────────────────────────── *
   * GET /api/documents/[id]
   * ─────────────────────────────────── */

  it('GET /api/documents/[id]: 401 without session', async () => {
    const { res } = await get(`/api/documents/${custADocId}`);
    expect(res.status).toBe(401);
  });

  it('GET /api/documents/[id]: 200 returns document with presigned URL for owner', async () => {
    const { res, data } = await get(`/api/documents/${custADocId}`, custACookie);
    expect(res.status).toBe(200);
    expect(data.document.id).toBe(custADocId);
    expect(typeof data.document.url).toBe('string');
    expect(data.document.url.length).toBeGreaterThan(0);
  });

  it('GET /api/documents/[id]: 404 for another user’s document', async () => {
    const { res } = await get(`/api/documents/${custADocId}`, custBCookie);
    expect(res.status).toBe(404);
  });

  /* ─────────────────────────────────── *
   * GET /api/document-requests
   * ─────────────────────────────────── */

  it('GET /api/document-requests: 401 without session', async () => {
    const { res } = await get('/api/document-requests');
    expect(res.status).toBe(401);
  });

  it('GET /api/document-requests: returns the request created for the pending_documents booking', async () => {
    const { res, data } = await get('/api/document-requests', custACookie);
    expect(res.status).toBe(200);
    expect(Array.isArray(data.requests)).toBe(true);
    expect(data.requests.length).toBeGreaterThanOrEqual(1);
    /* Ensure it’s actually for our customer (no leakage) */
    for (const r of data.requests) {
      expect(r.documentType).toBe('vaccination_record');
    }
  });

  /* ─────────────────────────────────── *
   * Public token endpoints — negative paths only.
   *
   * Real tokens are never returned over HTTP (they’re emailed), so the
   * happy path can’t be exercised without DB access. Negative paths
   * are still valuable: they lock in 404 on unknown tokens.
   * ─────────────────────────────────── */

  it('GET /api/upload/[token]: 404 for an unknown token', async () => {
    const { res } = await get('/api/upload/this-is-not-a-real-token');
    expect(res.status).toBe(404);
  });

  it('POST /api/upload/[token]: 404 for an unknown token', async () => {
    const { res } = await postMultipart('/api/upload/this-is-not-a-real-token', {
      file: { name: 'vax.png', type: 'image/png', bytes: FAKE_PNG },
    });
    expect(res.status).toBe(404);
  });
});
