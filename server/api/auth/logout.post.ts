import { logout } from '~~/server/services/auth.service';

export default defineEventHandler(async (event) => {
  const token = getCookie(event, 'session');
  if (token) await logout(token);
  deleteCookie(event, 'session', { path: '/' });
  return { success: true };
});
