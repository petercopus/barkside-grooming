import { getDocumentRequest } from '~~/server/services/document-request.service';

export default defineEventHandler(async (event) => {
  const user = requireAuth(event);
  const id = getRouterParam(event, 'id')!;
  const request = await getDocumentRequest(id, user.id);

  return { request };
});
