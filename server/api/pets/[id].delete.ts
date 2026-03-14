import { deletePet } from '~~/server/services/pet.service';

export default defineEventHandler(async (event) => {
  const user = requireAuth(event);
  const id = getRouterParam(event, 'id')!;
  await deletePet(id, user.id);
  return { success: true };
});
