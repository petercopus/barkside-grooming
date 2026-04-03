import { getAdminPet } from '~~/server/services/pet.service';

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'pet:read:all');
  const id = getRouterParam(event, 'id')!;
  const pet = await getAdminPet(id);

  return { pet };
});
