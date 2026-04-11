import { upsertPreferences } from '~~/server/services/notification.service';
import { updatePreferencesSchema } from '~~/shared/schemas/notification';

export default defineEventHandler(async (event) => {
  const user = requireAuth(event);
  const body = await readBody(event);
  const input = updatePreferencesSchema.parse(body);
  await upsertPreferences(user.id, input);

  return { success: true };
});
