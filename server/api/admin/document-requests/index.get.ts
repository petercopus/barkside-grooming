import { listAllDocumentRequests } from '~~/server/services/document-request.service';

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'document:request');
  const { status } = getQuery(event);
  const requests = await listAllDocumentRequests({ status: status as string });

  return { requests };
});
