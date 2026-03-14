import { listPets } from '~~/server/services/pet.service';

export default defineEventHandler(async (event) => {
  const user = requireAuth(event);
  const userPets = await listPets(user.id);
  return { pets: userPets };
});
