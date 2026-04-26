import type { H3Event } from 'h3';
import { describe, expect, it } from 'vitest';
import { requireAuth, requirePermission } from '~~/server/utils/auth';

function makeEvent(user: unknown, permissions?: string[]): H3Event {
  return { context: { user, permissions } } as unknown as H3Event;
}

describe('requireAuth', () => {
  it('returns the user when authenticated', () => {
    const user = { id: 'u1', email: 'a@b.com' };
    expect(requireAuth(makeEvent(user))).toBe(user);
  });

  it('throws 401 when no user is on the context', () => {
    expect(() => requireAuth(makeEvent(undefined))).toThrowError(
      expect.objectContaining({ statusCode: 401 }),
    );
  });

  it('throws 401 when context.user is null', () => {
    expect(() => requireAuth(makeEvent(null))).toThrowError(
      expect.objectContaining({ statusCode: 401 }),
    );
  });
});

describe('requirePermission', () => {
  const user = { id: 'u1' };

  it('returns the user when the exact permission is present', () => {
    const event = makeEvent(user, ['appointments.read']);
    expect(requirePermission(event, 'appointments.read')).toBe(user);
  });

  it('returns the user when the wildcard "*" admin permission is present', () => {
    const event = makeEvent(user, ['*']);
    expect(requirePermission(event, 'anything.you.want')).toBe(user);
  });

  it('throws 403 when the permission is missing', () => {
    const event = makeEvent(user, ['appointments.read']);
    expect(() => requirePermission(event, 'appointments.write')).toThrowError(
      expect.objectContaining({ statusCode: 403 }),
    );
  });

  it('throws 403 when the user has no permissions at all', () => {
    const event = makeEvent(user, []);
    expect(() => requirePermission(event, 'anything')).toThrowError(
      expect.objectContaining({ statusCode: 403 }),
    );
  });

  it('throws 403 when permissions is missing from context entirely', () => {
    const event = makeEvent(user, undefined);
    expect(() => requirePermission(event, 'anything')).toThrowError(
      expect.objectContaining({ statusCode: 403 }),
    );
  });

  it('throws 401 (not 403) when user is missing — auth check runs first', () => {
    const event = makeEvent(undefined, ['*']);
    expect(() => requirePermission(event, 'anything')).toThrowError(
      expect.objectContaining({ statusCode: 401 }),
    );
  });

  it('does not partial-match permissions (read != read.everything)', () => {
    const event = makeEvent(user, ['appointments']);
    expect(() => requirePermission(event, 'appointments.read')).toThrowError(
      expect.objectContaining({ statusCode: 403 }),
    );
  });
});
