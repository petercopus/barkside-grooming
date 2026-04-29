import { describe, expect, it } from 'vitest';
import { formatClockTime, formatDate, formatTimeRange } from '~~/shared/utils/date';
import { formatCurrency } from '~/utils/money';

describe('formatDate', () => {
  it('renders YYYY-MM-DD as a short, locale-stable label', () => {
    expect(formatDate('2026-04-23')).toBe('Apr 23, 2026');
  });

  it('does not shift the day across timezones for date-only strings', () => {
    expect(formatDate('2026-01-01')).toBe('Jan 1, 2026');
    expect(formatDate('2026-12-31')).toBe('Dec 31, 2026');
  });

  it('accepts a Date instance', () => {
    expect(formatDate(new Date(2026, 3, 23))).toBe('Apr 23, 2026');
  });

  it('renders the long variant with weekday + full month', () => {
    expect(formatDate('2026-04-23', 'long')).toBe('Thursday, April 23, 2026');
  });

  it('renders the iso variant as YYYY-MM-DD', () => {
    expect(formatDate(new Date(2026, 3, 23), 'iso')).toBe('2026-04-23');
  });

  it('returns an em-dash for null/undefined/empty input', () => {
    expect(formatDate(null)).toBe('—');
    expect(formatDate(undefined)).toBe('—');
    expect(formatDate('')).toBe('—');
  });

  it('returns an em-dash for unparseable input', () => {
    expect(formatDate('not-a-date')).toBe('—');
  });
});

describe('formatClockTime', () => {
  it('formats midnight as 12:00 AM', () => {
    expect(formatClockTime('00:00')).toBe('12:00 AM');
  });

  it('formats noon as 12:00 PM', () => {
    expect(formatClockTime('12:00')).toBe('12:00 PM');
  });

  it('formats morning hours', () => {
    expect(formatClockTime('09:00')).toBe('9:00 AM');
  });

  it('formats afternoon hours', () => {
    expect(formatClockTime('13:30')).toBe('1:30 PM');
  });

  it('ignores seconds in HH:MM:SS', () => {
    expect(formatClockTime('10:15:42')).toBe('10:15 AM');
  });

  it('returns em-dash for null/undefined/empty', () => {
    expect(formatClockTime(null)).toBe('—');
    expect(formatClockTime(undefined)).toBe('—');
    expect(formatClockTime('')).toBe('—');
  });
});

describe('formatTimeRange', () => {
  it('formats a normal start/end pair', () => {
    expect(formatTimeRange('09:00:00', '10:30:00')).toBe('9:00 AM — 10:30 AM');
  });

  it('crosses noon correctly', () => {
    expect(formatTimeRange('11:30', '13:15')).toBe('11:30 AM — 1:15 PM');
  });

  it('falls back to a single side when the other is missing', () => {
    expect(formatTimeRange('09:00', null)).toBe('9:00 AM');
    expect(formatTimeRange(null, '10:30')).toBe('10:30 AM');
  });

  it('returns em-dash when both are missing', () => {
    expect(formatTimeRange(null, null)).toBe('—');
  });
});

describe('formatCurrency', () => {
  it('formats positive cents as $X.XX', () => {
    expect(formatCurrency(5500)).toBe('$55.00');
    expect(formatCurrency(123)).toBe('$1.23');
    expect(formatCurrency(0)).toBe('$0.00');
  });

  it('formats negative cents with a leading minus', () => {
    expect(formatCurrency(-500)).toBe('-$5.00');
  });

  it('treats null/undefined as $0.00', () => {
    expect(formatCurrency(null)).toBe('$0.00');
    expect(formatCurrency(undefined)).toBe('$0.00');
  });

  it('treats NaN as $0.00', () => {
    expect(formatCurrency(Number.NaN)).toBe('$0.00');
  });
});
