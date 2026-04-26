import { describe, expect, it } from 'vitest';
import { calcInvoiceTotals } from '~~/server/services/invoice.service';

describe('calcInvoiceTotals', () => {
  it('returns zeros for an empty line item list', () => {
    expect(calcInvoiceTotals([])).toEqual({
      subtotalCents: 0,
      discountCents: 0,
      totalCents: 0,
    });
  });

  it('sums positive amounts into the subtotal', () => {
    expect(
      calcInvoiceTotals([{ amountCents: 5000 }, { amountCents: 2500 }, { amountCents: 1000 }]),
    ).toEqual({ subtotalCents: 8500, discountCents: 0, totalCents: 8500 });
  });

  it('treats negative amounts as discounts (absolute value)', () => {
    expect(calcInvoiceTotals([{ amountCents: 10000 }, { amountCents: -1500 }])).toEqual({
      subtotalCents: 10000,
      discountCents: 1500,
      totalCents: 8500,
    });
  });

  it('combines multiple positive and negative line items', () => {
    expect(
      calcInvoiceTotals([
        { amountCents: 5000 },
        { amountCents: 5000 },
        { amountCents: -2000 },
        { amountCents: -500 },
      ]),
    ).toEqual({ subtotalCents: 10000, discountCents: 2500, totalCents: 7500 });
  });

  it('ignores zero-amount line items', () => {
    expect(
      calcInvoiceTotals([{ amountCents: 0 }, { amountCents: 4000 }, { amountCents: 0 }]),
    ).toEqual({ subtotalCents: 4000, discountCents: 0, totalCents: 4000 });
  });

  it('produces a negative total when discounts exceed positives (callers must validate)', () => {
    expect(calcInvoiceTotals([{ amountCents: 1000 }, { amountCents: -2000 }])).toEqual({
      subtotalCents: 1000,
      discountCents: 2000,
      totalCents: -1000,
    });
  });

  it('does not mutate the input array', () => {
    const items = [{ amountCents: 1000 }, { amountCents: -200 }];
    const snapshot = JSON.parse(JSON.stringify(items));
    calcInvoiceTotals(items);
    expect(items).toEqual(snapshot);
  });
});
