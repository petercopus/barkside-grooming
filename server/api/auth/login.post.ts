import { login } from '~~/server/services/auth.service';
import { SESSION_MAX_AGE_MS } from '~~/server/utils/session';
import { loginSchema } from '~~/shared/schemas/auth';

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const input = loginSchema.parse(body);

  const { user, token } = await login(input);

  setCookie(event, 'session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_MAX_AGE_MS / 1000,
    path: '/',
  });

  return { user };
});
