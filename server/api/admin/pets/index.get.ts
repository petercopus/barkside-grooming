import { listAllPets } from '~~/server/services/pet.service';

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'pet:read:all');
  const { search } = getQuery(event);
  const pets = await listAllPets(search as string | undefined);

  return { pets };
});
