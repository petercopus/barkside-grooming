import { getDocumentAdmin } from '~~/server/services/document.service';

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'document:read:all');
  const id = getRouterParam(event, 'id')!;
  const document = await getDocumentAdmin(id);

  return { document };
});
