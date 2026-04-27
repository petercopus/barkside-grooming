/**
 * AI assisted with this file
 *
 * Public catalog endpoints — services, bundles, size categories, addon map.
 * All routes are unauthenticated and should return shape-checked data.
 */

import { describe, expect, it } from 'vitest';

const BASE = 'http://localhost:3000';

async function get(path: string) {
  const res = await fetch(`${BASE}${path}`);
  const data = await res.json().catch(() => ({}));
  return { res, data };
}

/* ─────────────────────────────────── *
 * Tests
 * ─────────────────────────────────── */

describe('Public Catalog API', () => {
  /* ─── /api/services ─── */

  it('GET /api/services: 200 without a session and returns an array', async () => {
    const { res, data } = await get('/api/services');
    expect(res.status).toBe(200);
    expect(Array.isArray(data.services)).toBe(true);
    expect(data.services.length).toBeGreaterThan(0);
  });

  it('GET /api/services: every entry is active and carries pricing rows', async () => {
    const { data } = await get('/api/services');
    for (const s of data.services) {
      expect(s.isActive).toBe(true);
      expect(typeof s.id).toBe('number');
      expect(typeof s.name).toBe('string');
      expect(Array.isArray(s.pricing)).toBe(true);
      for (const p of s.pricing) {
        expect(p.serviceId).toBe(s.id);
        expect(typeof p.priceCents).toBe('number');
        expect(typeof p.durationMinutes).toBe('number');
      }
    }
  });

  it('GET /api/services: results are sorted by sortOrder ascending', async () => {
    const { data } = await get('/api/services');
    for (let i = 1; i < data.services.length; i++) {
      expect(data.services[i].sortOrder).toBeGreaterThanOrEqual(data.services[i - 1].sortOrder);
    }
  });

  /* ─── /api/services/addon-map ─── */

  it('GET /api/services/addon-map: 200 returns object keyed by base service id', async () => {
    const { res, data } = await get('/api/services/addon-map');
    expect(res.status).toBe(200);
    expect(typeof data.addonMap).toBe('object');
    expect(data.addonMap).not.toBeNull();
    /* Every value is an array of numbers */
    for (const [, addonIds] of Object.entries(data.addonMap)) {
      expect(Array.isArray(addonIds)).toBe(true);
      for (const id of addonIds as unknown[]) {
        expect(typeof id).toBe('number');
      }
    }
  });

  /* ─── /api/size-categories ─── */

  it('GET /api/size-categories: 200 returns ordered list', async () => {
    const { res, data } = await get('/api/size-categories');
    expect(res.status).toBe(200);
    expect(Array.isArray(data.sizeCategories)).toBe(true);
    expect(data.sizeCategories.length).toBeGreaterThan(0);

    /* Ordered by minWeight ascending */
    for (let i = 1; i < data.sizeCategories.length; i++) {
      expect(data.sizeCategories[i].minWeight).toBeGreaterThanOrEqual(
        data.sizeCategories[i - 1].minWeight,
      );
    }
  });

  /* ─── /api/bundles ─── */

  it('GET /api/bundles: 200 returns array of active bundles', async () => {
    const { res, data } = await get('/api/bundles');
    expect(res.status).toBe(200);
    expect(Array.isArray(data.bundles)).toBe(true);
    /* Active-only: every returned bundle has isActive === true */
    for (const b of data.bundles) {
      expect(b.isActive).toBe(true);
    }
  });
});
