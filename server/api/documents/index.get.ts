import { listDocuments } from '~~/server/services/document.service';

export default defineEventHandler(async (event) => {
  const user = requireAuth(event);
  const documents = await listDocuments(user.id);

  return { documents };
});
