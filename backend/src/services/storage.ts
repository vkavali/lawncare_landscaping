import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID ?? ''
const R2_BUCKET = process.env.R2_BUCKET ?? ''
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID ?? ''
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY ?? ''

function getClient(): S3Client | null {
  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
    return null
  }
  return new S3Client({
    region: 'auto',
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: R2_ACCESS_KEY_ID,
      secretAccessKey: R2_SECRET_ACCESS_KEY,
    },
  })
}

// Returns a presigned PUT URL valid for 1 hour; mobile uploads directly to R2
export async function getUploadPresignedUrl(
  key: string,
  contentType: string,
): Promise<string | null> {
  const client = getClient()
  if (!client) {
    console.warn('[R2] Not configured — cannot generate presigned upload URL')
    return null
  }
  const command = new PutObjectCommand({
    Bucket: R2_BUCKET,
    Key: key,
    ContentType: contentType,
  })
  return getSignedUrl(client, command, { expiresIn: 3600 })
}

// Returns a presigned GET URL (default 7 days) for download / email attachment
export async function getDownloadPresignedUrl(
  key: string,
  expiresInSeconds = 7 * 24 * 3600,
): Promise<string | null> {
  const client = getClient()
  if (!client) return null
  const command = new GetObjectCommand({ Bucket: R2_BUCKET, Key: key })
  return getSignedUrl(client, command, { expiresIn: expiresInSeconds })
}

export async function deleteObject(key: string): Promise<void> {
  const client = getClient()
  if (!client) return
  await client.send(new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: key }))
}

export function isR2Configured(): boolean {
  return !!(R2_ACCOUNT_ID && R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY && R2_BUCKET)
}
