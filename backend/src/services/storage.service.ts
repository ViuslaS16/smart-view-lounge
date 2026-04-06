import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';

const isMockStorage = !process.env.CF_R2_ACCOUNT_ID || process.env.CF_R2_ACCOUNT_ID === 'your_account_id';

const r2 = isMockStorage ? null : new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.CF_R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId:     process.env.CF_R2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.CF_R2_SECRET_ACCESS_KEY || '',
  },
});

const BUCKET = process.env.CF_R2_BUCKET_NAME || 'smartview-nics';

/** Upload a NIC image buffer to R2 — returns the object key */
export async function uploadNicImage(
  fileBuffer: Buffer,
  mimeType: string,
  userName: string,
  side: 'front' | 'back'
): Promise<string> {
  const ext = mimeType === 'image/png' ? 'png' : mimeType === 'image/webp' ? 'webp' : 'jpg';
  const cleanName = userName.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_');
  const key = `nic/${cleanName}/${side}_${uuidv4()}.${ext}`;

  if (isMockStorage) {
    console.log(`[Storage Mock] Saved NIC to local key: ${key}`);
    return key;
  }

  await r2!.send(new PutObjectCommand({
    Bucket:      BUCKET,
    Key:         key,
    Body:        fileBuffer,
    ContentType: mimeType,
  }));

  return key;
}

/** Generate a signed URL for a NIC image — expires in 60 seconds */
export async function getNicImageSignedUrl(key: string): Promise<string> {
  if (isMockStorage) {
    return `https://dummyimage.com/600x400/2a2a2a/ffffff.png&text=NIC+${key.split('/').pop()}`;
  }

  const command = new GetObjectCommand({ Bucket: BUCKET, Key: key });
  return getSignedUrl(r2!, command, { expiresIn: 60 });
}

/** Delete a NIC image (used when user re-uploads) */
export async function deleteNicImage(key: string): Promise<void> {
  if (isMockStorage) {
    console.log(`[Storage Mock] Deleted NIC from local key: ${key}`);
    return;
  }
  await r2!.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
}
