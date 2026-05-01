import { resetPassword } from '~~/server/services/auth.service';
import { resetPasswordSchema } from '~~/shared/schemas/auth';

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const input = resetPasswordSchema.parse(body);

  await resetPassword(input);

  return { ok: true };
});
