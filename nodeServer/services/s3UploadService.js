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

  if (config.S3_ENDPOINT) {
    clientConfig.endpoint = config.S3_ENDPOINT;
    // For S3-compatible endpoints, use path style if necessary
    clientConfig.forcePathStyle = config.S3_FORCE_PATH_STYLE === true;
  }

  // If explicit credentials are provided via config, use them. Otherwise
  // the SDK will fall back to the default provider chain (env, shared
  // credentials file, EC2/ECS/EKS role, etc.).
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

  // Construct a URL. If a custom endpoint is provided the SDK may not
  // provide a convenient helper, so build a best-effort URL using
  // standard S3 URL patterns.
  let url;
  if (s3Client.config && s3Client.config.endpoint) {
    const endpoint = s3Client.config.endpoint;
    const endpointStr = typeof endpoint === 'string' ? endpoint : (endpoint && endpoint.href) ? endpoint.href : String(endpoint);
    url = `${endpointStr.replace(/\/+$/,'')}/${bucket}/${encodeURIComponent(key)}`;
  } else {
    const region = s3Client.config && s3Client.config.region ? s3Client.config.region : 'us-east-1';
    // For us-east-1 the URL is slightly different, but using the generic
    // pattern is sufficient for most cases here.
    url = `https://${bucket}.s3.${region}.amazonaws.com/${encodeURIComponent(key)}`;
  }

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
