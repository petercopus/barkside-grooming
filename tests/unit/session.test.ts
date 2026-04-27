import { describe, expect, it } from 'vitest';
import {
  generateSessionToken,
  hashSessionToken,
  SESSION_MAX_AGE_MS,
} from '~~/server/utils/session';

describe('generateSessionToken', () => {
  it('produces a UUID-formatted string', () => {
    const token = generateSessionToken();
    expect(token).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
  });

  it('produces unique tokens across calls', () => {
    const tokens = new Set(Array.from({ length: 50 }, () => generateSessionToken()));
    expect(tokens.size).toBe(50);
  });
});

describe('hashSessionToken', () => {
  it('produces a deterministic sha256 hex digest', () => {
    expect(hashSessionToken('hello')).toBe(
      '2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824',
    );
  });

  it('returns a 64-character hex digest', () => {
    expect(hashSessionToken('any-token-value')).toMatch(/^[0-9a-f]{64}$/);
  });

  it('does not equal the input (never store raw tokens)', () => {
    const token = generateSessionToken();
    expect(hashSessionToken(token)).not.toBe(token);
  });

  it('produces different hashes for different inputs', () => {
    expect(hashSessionToken('a')).not.toBe(hashSessionToken('b'));
  });
});

describe('SESSION_MAX_AGE_MS', () => {
  it('is 7 days in milliseconds', () => {
    expect(SESSION_MAX_AGE_MS).toBe(7 * 24 * 60 * 60 * 1000);
  });
});
