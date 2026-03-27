import type { H3Event } from 'h3';

export function requireAuth(event: H3Event) {
  const user = event.context.user;

  if (!user) {
    throw createError({ statusCode: 401, message: 'Authentication required' });
  }

  return user;
}

export function requirePermission(event: H3Event, permission: string) {
  const user = requireAuth(event);
  const perms: string[] = event.context.permissions ?? [];

  if (!perms.includes('*') && !perms.includes(permission)) {
    throw createError({ statusCode: 403, message: 'Forbidden' });
  }

  return user;
}
