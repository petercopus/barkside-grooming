import { createDocumentRequest } from '~~/server/services/document-request.service';
import { createDocumentRequestSchema } from '~~/shared/schemas/document';

export default defineEventHandler(async (event) => {
  const user = requirePermission(event, 'document:request');
  const body = await readBody(event);
  const input = createDocumentRequestSchema.parse(body);
  const request = await createDocumentRequest(user.id, input);

  return { request };
});
