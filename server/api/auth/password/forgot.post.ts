import { requestPasswordReset } from '~~/server/services/auth.service';
import { forgotPasswordSchema } from '~~/shared/schemas/auth';

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const input = forgotPasswordSchema.parse(body);

  try {
    await requestPasswordReset(input.email);
  } catch (err) {
    console.error('[auth] requestPasswordReset failed:', err);
  }

  return { ok: true };
});
