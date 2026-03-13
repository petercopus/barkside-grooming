/**
 * Runs on EVERY server request.
 * Reads session cookie -> validates it -> attaches user to event ctx
 * TODO: Verify requests are NOT blocked. Routes that need auth should check event.context.user themselves
 */

import { validateSession } from '~~/server/services/auth.service';

const SESSION_COOKIE_NAME = 'session';

export default defineEventHandler(async (event) => {
  const url = getRequestURL(event);
  if (!url.pathname.startsWith('/api/')) return;

  const token = getCookie(event, SESSION_COOKIE_NAME);
  if (!token) return;

  const result = await validateSession(token);
  if (result) {
    event.context.user = result.user;
    event.context.permissions = result.permissions;
  }
});
