import { describe, expect, it } from 'vitest';
import { hashPassword, stripPassword, verifyPassword } from '~~/server/utils/password';

describe('hashPassword + verifyPassword', () => {
  it('hashes a password and verifies it round-trip', async () => {
    const hash = await hashPassword('correct horse battery staple');
    expect(hash).not.toBe('correct horse battery staple');
    expect(await verifyPassword('correct horse battery staple', hash)).toBe(true);
  });

  it('rejects an incorrect password', async () => {
    const hash = await hashPassword('s3cret');
    expect(await verifyPassword('wrong-pw', hash)).toBe(false);
  });

  it('produces different hashes for the same input (salted)', async () => {
    const a = await hashPassword('pw1234567');
    const b = await hashPassword('pw1234567');
    expect(a).not.toBe(b);
    // Both still verify
    expect(await verifyPassword('pw1234567', a)).toBe(true);
    expect(await verifyPassword('pw1234567', b)).toBe(true);
  });

  it('produces a bcrypt hash beginning with $2', async () => {
    const hash = await hashPassword('something');
    expect(hash.startsWith('$2')).toBe(true);
  });
}, 30_000);

describe('stripPassword', () => {
  it('removes passwordHash from a user object', () => {
    const user = {
      id: 'u1',
      email: 'a@b.com',
      passwordHash: 'secret-hash',
      firstName: 'A',
    };
    const safe = stripPassword(user);
    expect(safe).toEqual({ id: 'u1', email: 'a@b.com', firstName: 'A' });
    expect((safe as Record<string, unknown>).passwordHash).toBeUndefined();
  });

  it('handles a null passwordHash (e.g. OAuth-only accounts)', () => {
    const user = { id: 'u2', email: 'c@d.com', passwordHash: null };
    const safe = stripPassword(user);
    expect(safe).toEqual({ id: 'u2', email: 'c@d.com' });
    expect((safe as Record<string, unknown>).passwordHash).toBeUndefined();
  });

  it('does not mutate the original user object', () => {
    const user = { id: 'u3', passwordHash: 'h' };
    stripPassword(user);
    expect(user.passwordHash).toBe('h');
  });
});
