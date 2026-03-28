import {
  S3Client,
  PutObjectCommand,
  CreateMultipartUploadCommand,
  UploadPartCommand,
  CompleteMultipartUploadCommand,
  AbortMultipartUploadCommand,
} from '@aws-sdk/client-s3';
import {getSignedUrl} from '@aws-sdk/s3-request-presigner';
import path from 'path';
import config from '../config.js';

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

  const url = buildObjectUrl(bucket, key);

  return {bucket, key, url};
}

/**
 * Helper to create a safe object key. Uses an optional folder/prefix and
 * the original file name. Time-based prefix reduces collisions.
 */
export function makeObjectKey(originalName, keyPrefix = config.S3_KEY_PREFIX) {
  const sanitizedPrefix = String(keyPrefix || '').replace(/^\//, '');
  const normalizedPrefix = sanitizedPrefix.endsWith('/') ? sanitizedPrefix : `${sanitizedPrefix}/`;
  const timestamp = Date.now();
  const safeName = path.basename(String(originalName || '')).replace(/[^a-zA-Z0-9._-]/g, '_');
  return `${normalizedPrefix}${timestamp}_${safeName}`;
}

export async function createPresignedPutUrl(s3Client, options) {
  const {bucket, key, contentType = 'application/octet-stream', expiresInSeconds = config.S3_PRESIGN_EXPIRATION_SECONDS, publicRead = true} = options;

  if (!bucket) {
    throw new Error('Bucket name is required');
  }

  if (!key) {
    throw new Error('Object key is required');
  }

  const parameters = {
    Bucket: bucket,
    Key: key,
    ContentType: contentType,
  };

  if (publicRead) {
    parameters.ACL = 'public-read';
  }

  const command = new PutObjectCommand(parameters);
  const url = await getSignedUrl(s3Client, command, {expiresIn: expiresInSeconds});

  return {
    bucket,
    key,
    url,
    expiresInSeconds,
    objectUrl: buildObjectUrl(bucket, key),
  };
}

export async function initiateMultipartUpload(s3Client, options) {
  const {bucket, key, contentType = 'application/octet-stream', publicRead = true} = options;

  if (!bucket) {
    throw new Error('Bucket name is required');
  }

  if (!key) {
    throw new Error('Object key is required');
  }

  const parameters = {
    Bucket: bucket,
    Key: key,
    ContentType: contentType,
  };

  if (publicRead) {
    parameters.ACL = 'public-read';
  }

  const command = new CreateMultipartUploadCommand(parameters);
  const response = await s3Client.send(command);

  if (!response || !response.UploadId) {
    throw new Error('Failed to initiate multipart upload');
  }

  return {
    bucket,
    key,
    uploadId: response.UploadId,
    objectUrl: buildObjectUrl(bucket, key),
  };
}

export async function createPresignedUploadPartUrl(s3Client, options) {
  const {bucket, key, uploadId, partNumber, expiresInSeconds = config.S3_PRESIGN_EXPIRATION_SECONDS} = options;

  if (!bucket) {
    throw new Error('Bucket name is required');
  }

  if (!key) {
    throw new Error('Object key is required');
  }

  if (!uploadId) {
    throw new Error('Upload ID is required');
  }

  if (!partNumber || Number.isNaN(Number(partNumber)) || Number(partNumber) < 1) {
    throw new Error('Part number must be a positive integer');
  }

  const command = new UploadPartCommand({
    Bucket: bucket,
    Key: key,
    UploadId: uploadId,
    PartNumber: Number(partNumber),
  });

  const url = await getSignedUrl(s3Client, command, {expiresIn: expiresInSeconds});

  return {
    bucket,
    key,
    uploadId,
    partNumber: Number(partNumber),
    url,
    expiresInSeconds,
  };
}

export async function completeMultipartUpload(s3Client, options) {
  const {bucket, key, uploadId, parts} = options;

  if (!bucket) {
    throw new Error('Bucket name is required');
  }

  if (!key) {
    throw new Error('Object key is required');
  }

  if (!uploadId) {
    throw new Error('Upload ID is required');
  }

  if (!Array.isArray(parts) || parts.length === 0) {
    throw new Error('At least one uploaded part is required to complete the upload');
  }

  const sortedParts = [...parts].sort((firstPart, secondPart) => Number(firstPart.partNumber) - Number(secondPart.partNumber));

  const uploadParts = sortedParts.map((part) => ({
    ETag: part.eTag,
    PartNumber: Number(part.partNumber),
  }));

  const command = new CompleteMultipartUploadCommand({
    Bucket: bucket,
    Key: key,
    UploadId: uploadId,
    MultipartUpload: {
      Parts: uploadParts,
    },
  });

  const response = await s3Client.send(command);

  return {
    bucket,
    key,
    uploadId,
    location: response?.Location || buildObjectUrl(bucket, key),
    eTag: response?.ETag,
  };
}

export async function abortMultipartUpload(s3Client, options) {
  const {bucket, key, uploadId} = options;

  if (!bucket) {
    throw new Error('Bucket name is required');
  }

  if (!key) {
    throw new Error('Object key is required');
  }

  if (!uploadId) {
    throw new Error('Upload ID is required');
  }

  const command = new AbortMultipartUploadCommand({
    Bucket: bucket,
    Key: key,
    UploadId: uploadId,
  });

  await s3Client.send(command);

  return {bucket, key, uploadId};
}

function buildObjectUrl(bucket, key) {
  return `https://${bucket}.s3.${config.AWS_REGION}.amazonaws.com/${encodeURI(key)}`;
}
