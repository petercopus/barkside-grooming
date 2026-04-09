import { listAllDocuments } from '~~/server/services/document.service';

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'document:read:all');
  const { status, type } = getQuery(event);
  const documents = await listAllDocuments({ status: status as string, type: type as string });

  return { documents };
});
