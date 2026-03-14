import { updatePet } from '~~/server/services/pet.service';
import { updatePetSchema } from '~~/shared/schemas/pet';

export default defineEventHandler(async (event) => {
  const user = requireAuth(event);
  const id = getRouterParam(event, 'id')!;
  const body = await readBody(event);
  const input = updatePetSchema.parse(body);
  const pet = await updatePet(id, user.id, input);
  return { pet };
});
