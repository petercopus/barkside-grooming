import { deleteDocument } from '~~/server/services/document.service';

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'document:delete');
  const id = getRouterParam(event, 'id')!;
  await deleteDocument(id);

  return { success: true };
});
