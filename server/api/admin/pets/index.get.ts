import { listAllPets } from '~~/server/services/pet.service';

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'pet:read:all');
  const pets = await listAllPets();

  return { pets };
});
