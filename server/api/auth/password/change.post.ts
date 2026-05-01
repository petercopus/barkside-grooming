import { changePassword } from '~~/server/services/auth.service';
import { changePasswordSchema } from '~~/shared/schemas/auth';

export default defineEventHandler(async (event) => {
  const user = requireAuth(event);
  const body = await readBody(event);
  const input = changePasswordSchema.parse(body);

  const currentToken = getCookie(event, 'session');
  if (!currentToken) {
    throw createError({ statusCode: 401, message: 'Authentication required' });
  }

  await changePassword(user.id, input, currentToken);

  return { ok: true };
});
