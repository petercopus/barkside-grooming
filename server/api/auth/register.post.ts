import { register } from '~~/server/services/auth.service';
import { SESSION_MAX_AGE_MS } from '~~/server/utils/session';
import { registerSchema } from '~~/shared/schemas/auth';

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const input = registerSchema.parse(body);

  const { user, token } = await register(input);

  setCookie(event, 'session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_MAX_AGE_MS / 1000,
    path: '/',
  });

  return { user };
});
