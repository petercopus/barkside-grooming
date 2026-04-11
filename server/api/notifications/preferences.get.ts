import { getPreferences } from '~~/server/services/notification.service';

export default defineEventHandler(async (event) => {
  const user = requireAuth(event);
  const preferences = await getPreferences(user.id);

  return { preferences };
});
