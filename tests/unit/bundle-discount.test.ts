import { describe, expect, it } from 'vitest';
import { calcBundleDiscount } from '~~/server/services/bundle.service';

describe('calcBundleDiscount', () => {
  it('returns the fixed value verbatim for fixed discounts', () => {
    expect(calcBundleDiscount('fixed', 1500, 10000)).toBe(1500);
  });

  it('returns 0 for a 0% percent discount', () => {
    expect(calcBundleDiscount('percent', 0, 10000)).toBe(0);
  });

  it('applies a 10% discount to a clean subtotal', () => {
    expect(calcBundleDiscount('percent', 10, 10000)).toBe(1000);
  });

  it('rounds half-cent results to the nearest cent (banker-agnostic round-half-up)', () => {
    // 12345 * 0.15 = 1851.75 → rounds to 1852
    expect(calcBundleDiscount('percent', 15, 12345)).toBe(1852);
  });

  it('handles a 100% percent discount (whole subtotal)', () => {
    expect(calcBundleDiscount('percent', 100, 7777)).toBe(7777);
  });

  it('handles fractional percent values', () => {
    // 5000 * 0.075 = 375
    expect(calcBundleDiscount('percent', 7.5, 5000)).toBe(375);
  });

  it('returns 0 when subtotal is 0 (percent path)', () => {
    expect(calcBundleDiscount('percent', 25, 0)).toBe(0);
  });

  it('returns 0 when subtotal is 0 (fixed path returns the fixed value regardless)', () => {
    expect(calcBundleDiscount('fixed', 500, 0)).toBe(500);
  });

  it('treats unknown discount type as fixed (current behaviour)', () => {
    // Defensive: any non-"percent" value returns the value verbatim
    expect(calcBundleDiscount('unknown' as never, 250, 10000)).toBe(250);
  });
});
