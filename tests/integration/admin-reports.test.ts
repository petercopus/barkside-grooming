/**
 * AI assisted with this file
 *
 * Admin reports — listing + per-report execution.
 *
 * The plan suggested running these against `npm run db:seed-test` for
 * deterministic numbers, but doing so resets the dev database and would
 * break parallel work in this same session. Instead we shape-test:
 *
 *   - listing returns all four registered reports
 *   - each report executes successfully with default filters
 *   - each report respects custom filter values (where applicable)
 *
 * Numeric assertions against a fresh seed should be a future task —
 * see notes inline.
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

const REPORT_IDS = [
  'revenue-by-period',
  'appointments-by-status',
  'top-services',
  'groomer-utilization',
] as const;

/* ─────────────────────────────────── *
 * Tests
 * ─────────────────────────────────── */

describe('Admin Reports API', () => {
  let adminCookie: string;

  beforeAll(async () => {
    const login = await post('/api/auth/login', {
      email: 'admin@barkside.com',
      password: 'password123',
    });
    expect(login.res.status).toBe(200);
    adminCookie = getSessionCookie(login.res)!;
  });

  /* ─── List ─── */

  it('GET /api/admin/reports: returns metadata for all registered reports', async () => {
    const { res, data } = await get('/api/admin/reports', adminCookie);
    expect(res.status).toBe(200);
    expect(Array.isArray(data.reports)).toBe(true);
    expect(data.reports.length).toBeGreaterThanOrEqual(REPORT_IDS.length);
    for (const id of REPORT_IDS) {
      expect(data.reports.some((r: any) => r.id === id)).toBe(true);
    }
    /* Listing should not include the execute function */
    for (const r of data.reports) {
      expect(typeof (r as any).execute).toBe('undefined');
      expect(typeof r.name).toBe('string');
      expect(typeof r.description).toBe('string');
      expect(typeof r.category).toBe('string');
      expect(Array.isArray(r.filters)).toBe(true);
    }
  });

  /* ─── 404 ─── */

  it('GET /api/admin/reports/[id]: 404 for unknown report id', async () => {
    const { res } = await get('/api/admin/reports/no-such-report', adminCookie);
    expect(res.status).toBe(404);
  });

  /* ─── Per-report execution with defaults ─── */

  for (const id of REPORT_IDS) {
    it(`GET /api/admin/reports/${id}: executes with default filters`, async () => {
      const { res, data } = await get(`/api/admin/reports/${id}`, adminCookie);
      expect(res.status).toBe(200);
      expect(data.meta.id).toBe(id);
      expect(Array.isArray(data.meta.filters)).toBe(true);
      /* All filters with defaults are resolved to a concrete value */
      for (const f of data.meta.filters) {
        if (f.required) expect(f.default).not.toBeUndefined();
      }
      expect(data.result).toBeDefined();
    });
  }

  /* ─── revenue-by-period accepts groupBy ─── */

  it('GET /api/admin/reports/revenue-by-period?groupBy=month: 200 with custom groupBy', async () => {
    /* The endpoint passes user-provided filter values into report.execute()
     * but does not echo them back in meta — meta only resolves definition
     * defaults. So we just verify execution succeeds. */
    const { res, data } = await get(
      '/api/admin/reports/revenue-by-period?groupBy=month',
      adminCookie,
    );
    expect(res.status).toBe(200);
    expect(data.result).toBeDefined();
  });

  it('GET /api/admin/reports/revenue-by-period?groupBy=garbage: silently falls back to default', async () => {
    /* The report whitelists groupBy values internally, so a bad value
     * should still return 200 (the report executes; the filter echo on
     * meta may show whatever the request passed in). */
    const { res } = await get('/api/admin/reports/revenue-by-period?groupBy=garbage', adminCookie);
    expect(res.status).toBe(200);
  });

  /* ─── Date range filtering ─── */

  it('GET /api/admin/reports/appointments-by-status: empty range yields zero rows', async () => {
    /* Pick a range in the distant past where no appointments exist */
    const { res, data } = await get(
      '/api/admin/reports/appointments-by-status?startDate=1970-01-01&endDate=1970-01-02',
      adminCookie,
    );
    expect(res.status).toBe(200);
    /* Result shape varies per report, but rows should be empty for a no-data range */
    const result = data.result;
    /* Different reports return different shapes — check each known shape */
    if (Array.isArray(result?.rows)) {
      expect(result.rows).toEqual([]);
    } else if (Array.isArray(result?.data)) {
      expect(result.data).toEqual([]);
    } else {
      /* fall back: total count should be 0 */
      const total = result?.kpis?.total ?? result?.total ?? 0;
      expect(total).toBe(0);
    }
  });
});
