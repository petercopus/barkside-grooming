import { describe, expect, it } from 'vitest';
import { calcHoldExpiry, hashUploadToken } from '~~/server/services/vaccination-hold.service';

describe('hashUploadToken', () => {
  it('produces deterministic sha256 hex digest', () => {
    expect(hashUploadToken('hello')).toBe(
      '2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824',
    );
  });

  it('returns a 64-character hex string for any input', () => {
    const hash = hashUploadToken('a-random-token-value');
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('produces different hashes for different inputs', () => {
    expect(hashUploadToken('token-a')).not.toBe(hashUploadToken('token-b'));
  });

  it('hashes empty string consistently', () => {
    expect(hashUploadToken('')).toBe(
      'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    );
  });
});

describe('calcHoldExpiry', () => {
  const now = new Date('2026-04-26T12:00:00.000Z');

  it('guest gets a flat 24h hold', () => {
    const earliest = new Date('2026-05-10T09:00:00.000Z'); // far away
    const expiry = calcHoldExpiry({ isGuest: true, earliestApptStart: earliest, now });
    expect(expiry.getTime() - now.getTime()).toBe(24 * 3600_000);
  });

  it('guest 24h hold ignores earliest appointment cap (still 24h even if appt is closer)', () => {
    const earliest = new Date('2026-04-27T08:00:00.000Z'); // 20h after now
    const expiry = calcHoldExpiry({ isGuest: true, earliestApptStart: earliest, now });
    expect(expiry.getTime() - now.getTime()).toBe(24 * 3600_000);
  });

  it('logged-in user gets 72h when appointment is far enough away', () => {
    const earliest = new Date('2026-05-10T09:00:00.000Z'); // > 96h away
    const expiry = calcHoldExpiry({ isGuest: false, earliestApptStart: earliest, now });
    expect(expiry.getTime() - now.getTime()).toBe(72 * 3600_000);
  });

  it('logged-in user is capped at appt - 24h when appointment is close', () => {
    const earliest = new Date('2026-04-28T12:00:00.000Z'); // 48h after now
    const expiry = calcHoldExpiry({ isGuest: false, earliestApptStart: earliest, now });
    // cap = appt - 24h = 24h after now
    expect(expiry.getTime() - now.getTime()).toBe(24 * 3600_000);
  });

  it('logged-in user picks the smaller of 72h vs (appt - 24h)', () => {
    // appt 80h away → cap = 56h, baseline = 72h → expiry = 56h
    const earliest = new Date(now.getTime() + 80 * 3600_000);
    const expiry = calcHoldExpiry({ isGuest: false, earliestApptStart: earliest, now });
    expect(expiry.getTime() - now.getTime()).toBe(56 * 3600_000);
  });

  it('defaults `now` to current time when omitted', () => {
    const earliest = new Date(Date.now() + 7 * 24 * 3600_000);
    const before = Date.now();
    const expiry = calcHoldExpiry({ isGuest: true, earliestApptStart: earliest });
    const after = Date.now();
    expect(expiry.getTime()).toBeGreaterThanOrEqual(before + 24 * 3600_000);
    expect(expiry.getTime()).toBeLessThanOrEqual(after + 24 * 3600_000);
  });

  it('logged-in cap can be in the past if appointment is < 24h away (negative buffer)', () => {
    const earliest = new Date(now.getTime() + 12 * 3600_000); // 12h away
    const expiry = calcHoldExpiry({ isGuest: false, earliestApptStart: earliest, now });
    // cap = earliest - 24h = 12h before now (negative window — caller must validate)
    expect(expiry.getTime()).toBe(earliest.getTime() - 24 * 3600_000);
    expect(expiry.getTime()).toBeLessThan(now.getTime());
  });
});
