import { uploadDocument } from '~~/server/services/document.service';
import {
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE,
  uploadDocumentSchema,
} from '~~/shared/schemas/document';

export default defineEventHandler(async (event) => {
  const user = requireAuth(event);
  const formData = await readMultipartFormData(event);

  if (!formData) {
    throw createError({ statusCode: 400, message: 'No form data provided' });
  }

  // file part has a file name, metadata part doesnt
  const filePart = formData.find((part) => part.filename);
  if (!filePart || !filePart.data || !filePart.filename) {
    throw createError({ statusCode: 400, message: 'No file provided' });
  }

  // validate file
  if (filePart.data.length > MAX_FILE_SIZE) {
    throw createError({ statusCode: 400, message: 'File exceeds size limit' });
  }

  if (!ALLOWED_MIME_TYPES.includes(filePart.type ?? '')) {
    throw createError({ statusCode: 400, message: 'File type not allowed' });
  }

  // build metadata object
  const metadata: Record<string, string> = {};
  for (const part of formData) {
    if (!part.filename && part.name) {
      metadata[part.name] = part.data.toString('utf-8');
    }
  }

  const input = uploadDocumentSchema.parse(metadata);

  // upload
  const document = await uploadDocument(user.id, input, {
    fileName: filePart.filename,
    data: filePart.data,
    mimeType: filePart.type ?? 'application/octet-stream',
  });

  return { document };
});
