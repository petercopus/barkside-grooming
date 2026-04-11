import { getDocument } from '~~/server/services/document.service';

export default defineEventHandler(async (event) => {
  const user = requireAuth(event);
  const id = getRouterParam(event, 'id')!;
  const document = await getDocument(id, user.id);

  return { document };
});
