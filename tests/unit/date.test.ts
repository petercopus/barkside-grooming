import { describe, expect, it } from 'vitest';
import { minutesToTime, timeToMinutes, todayDateString } from '~~/server/utils/date';

describe('timeToMinutes', () => {
  it('parses HH:MM correctly at the start of day', () => {
    expect(timeToMinutes('00:00')).toBe(0);
  });

  it('parses HH:MM at the end of day', () => {
    expect(timeToMinutes('23:59')).toBe(23 * 60 + 59);
  });

  it('parses afternoon times', () => {
    expect(timeToMinutes('13:30')).toBe(13 * 60 + 30);
  });

  it('parses HH:MM:SS by ignoring seconds', () => {
    expect(timeToMinutes('09:15:42')).toBe(9 * 60 + 15);
  });

  it('produces the inverse of minutesToTime', () => {
    expect(timeToMinutes(minutesToTime(615))).toBe(615);
  });
});

describe('minutesToTime', () => {
  it('formats midnight as 00:00', () => {
    expect(minutesToTime(0)).toBe('00:00');
  });

  it('zero-pads single-digit hours and minutes', () => {
    expect(minutesToTime(9 * 60 + 5)).toBe('09:05');
  });

  it('formats 23:59 correctly', () => {
    expect(minutesToTime(23 * 60 + 59)).toBe('23:59');
  });

  it('produces the inverse of timeToMinutes', () => {
    expect(minutesToTime(timeToMinutes('14:25'))).toBe('14:25');
  });
});

describe('todayDateString', () => {
  it('returns a YYYY-MM-DD string', () => {
    expect(todayDateString()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('agrees with the local-timezone components of `new Date()`', () => {
    const now = new Date();
    const expected = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    expect(todayDateString()).toBe(expected);
  });
});
