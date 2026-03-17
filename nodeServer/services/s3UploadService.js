import {S3Client, PutObjectCommand} from '@aws-sdk/client-s3';
import path from 'path';
import config from "../config.js";

export function createS3Client(config) {
  const clientConfig = {
    region: config.AWS_REGION,
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
export async function uploadBufferToS3(s3Client, bucket, key, buffer, contentType = 'application/octet-stream', publicRead = true) {
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

  const url = `https://${bucket}.s3.${config.AWS_REGION}.amazonaws.com/${encodeURI(key)}`;

  return {bucket, key, url};
}

/**
 * Helper to create a safe object key. Uses an optional folder/prefix and
 * the original file name. Time-based prefix reduces collisions.
 */
export function makeObjectKey(originalName) {
  const pathInBucket = 'public/pdfs/';
  const timestamp = Date.now();
  const safeName = path.basename(String(originalName || '')).replace(/[^a-zA-Z0-9._-]/g, '_');
  const key = `${pathInBucket}${timestamp}_${safeName}`;
  return key;
}
