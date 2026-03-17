import {S3Client, PutObjectCommand} from '@aws-sdk/client-s3';
import path from 'path';

/**
 * Create an S3 client using config values. The AWS SDK default provider
 * chain will be used when explicit credentials are not provided.
 *
 * @param {object} config - configuration object with AWS_*/S3_* fields
 * @returns {S3Client}
 */
export function createS3Client(config) {
  const clientConfig = {
    region: config.AWS_REGION || config.region || 'ca-central-1',
  };

  if (config.AWS_ACCESS_KEY_ID && config.AWS_SECRET_ACCESS_KEY) {
    clientConfig.credentials = {
      accessKeyId: config.AWS_ACCESS_KEY_ID,
      secretAccessKey: config.AWS_SECRET_ACCESS_KEY,
    };
  }

  return new S3Client(clientConfig);
}

/**
 * Upload a buffer to S3 and return the object URL.
 *
 * @param {S3Client} s3Client
 * @param {string} bucket
 * @param {string} key
 * @param {Buffer} buffer
 * @param {string} contentType
 * @param {boolean} publicRead
 * @returns {Promise<{bucket:string,key:string,url:string}>}
 */
export async function uploadBufferToS3(s3Client, bucket, key, buffer, contentType = 'application/octet-stream', publicRead = false) {
  if (!bucket) {
    const err = new Error('Bucket name is required');
    err.code = 'MISSING_BUCKET';
    throw err;
  }

  const params = {
    Bucket: bucket,
    Key: key,
    Body: buffer,
    ContentType: contentType,
  };

  if (publicRead) {
    params.ACL = 'public-read';
  }

  const command = new PutObjectCommand(params);

  await s3Client.send(command);

  const region = s3Client.config && s3Client.config.region ? s3Client.config.region : 'us-east-1';
  const url = `https://${bucket}.s3.${region}.amazonaws.com/${encodeURIComponent(key)}`;

  return {bucket, key, url};
}

/**
 * Helper to create a safe object key. Uses an optional folder/prefix and
 * the original file name. Time-based prefix reduces collisions.
 */
export function makeObjectKey(originalName, prefix = '') {
  const timestamp = Date.now();
  const safeName = path.basename(originalName).replace(/[^a-zA-Z0-9._-]/g, '_');
  const key = prefix ? `${prefix.replace(/\/+$/g, '')}/${timestamp}_${safeName}` : `${timestamp}_${safeName}`;
  return key;
}
