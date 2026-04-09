import { updateDocumentStatus } from '~~/server/services/document.service';
import { updateDocumentStatusSchema } from '~~/shared/schemas/document';

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'document:approve');
  const id = getRouterParam(event, 'id')!;
  const body = await readBody(event);
  const input = updateDocumentStatusSchema.parse(body);
  const document = await updateDocumentStatus(id, input);

  return { document };
});
