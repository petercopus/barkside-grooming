import {
  CreateBucketCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';

import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const s3 = new S3Client({
  endpoint: process.env.S3_ENDPOINT,
  region: process.env.S3_REGION ?? 'us-east-1',
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY!,
    secretAccessKey: process.env.S3_SECRET_KEY!,
  },
  forcePathStyle: true,
});

const bucket = process.env.S3_BUCKET ?? 'barkside-uploads';

export async function uploadFile(key: string, body: Buffer, contentType: string): Promise<void> {
  try {
    await s3.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
      }),
    );
  } catch (e) {
    console.error('S3 upload failed:', e);
    throw createError({ statusCode: 500, message: 'Failed to upload file' });
  }
}

export async function getPresignedUrl(key: string, expiresIn = 900): Promise<string> {
  try {
    const url = await getSignedUrl(
      s3,
      new GetObjectCommand({
        Bucket: bucket,
        Key: key,
      }),
      { expiresIn },
    );

    return url;
  } catch (e) {
    console.error('S3 presign failed:', e);
    throw createError({ statusCode: 500, message: 'Failed to get URL' });
  }
}

export async function deleteFile(key: string): Promise<void> {
  try {
    await s3.send(
      new DeleteObjectCommand({
        Bucket: bucket,
        Key: key,
      }),
    );
  } catch (e) {
    console.error('S3 delete failed:', e);
    throw createError({ statusCode: 500, message: 'Failed to delete file' });
  }
}

export async function ensureBucket(): Promise<void> {
  try {
    // throws when bucket not found
    await s3.send(new HeadBucketCommand({ Bucket: bucket }));
  } catch (err) {
    // create bucket if thrown
    await s3.send(new CreateBucketCommand({ Bucket: bucket }));
    console.log('Created S3 bucket:', bucket);
  }
}
