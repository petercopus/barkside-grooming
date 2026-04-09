import { listDocumentRequests } from '~~/server/services/document-request.service';

export default defineEventHandler(async (event) => {
  const user = requireAuth(event);
  const requests = await listDocumentRequests(user.id);

  return { requests };
});
