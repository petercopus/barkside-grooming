import { createPet } from '~~/server/services/pet.service';
import { createPetSchema } from '~~/shared/schemas/pet';

export default defineEventHandler(async (event) => {
  const user = requireAuth(event);
  const body = await readBody(event);
  const input = createPetSchema.parse(body);
  const pet = await createPet(user.id, input);
  return { pet };
});
