import { updatePetAsAdmin } from '~~/server/services/pet.service';
import { updatePetSchema } from '~~/shared/schemas/pet';

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'pet:manage:all');
  const id = getRouterParam(event, 'id')!;
  const body = await readBody(event);
  const input = updatePetSchema.parse(body);

  const pet = await updatePetAsAdmin(id, input);

  return { pet };
});
