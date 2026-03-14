import { getPet } from '~~/server/services/pet.service';

export default defineEventHandler(async (event) => {
  const user = requireAuth(event);
  const id = getRouterParam(event, 'id')!;
  const pet = await getPet(id, user.id);
  return { pet };
});
