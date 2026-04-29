import { createPet } from '~~/server/services/pet.service';
import { createAdminPetSchema } from '~~/shared/schemas/pet';

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'pet:manage:all');
  const body = await readBody(event);
  const { ownerId, ...input } = createAdminPetSchema.parse(body);

  const pet = await createPet(ownerId, input);

  return { pet };
});
