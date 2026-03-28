import express from 'express';
import multer from 'multer';
import config from '../config.js';
import {
  createS3Client,
  uploadBufferToS3,
  makeObjectKey,
  createPresignedPutUrl,
  initiateMultipartUpload,
  createPresignedUploadPartUrl,
  completeMultipartUpload,
  abortMultipartUpload,
} from '../services/s3UploadService.js';
import {isAuthenticated} from '../middleware/authMiddleware.js';

const router = express.Router();

// Use memory storage for small uploads; this keeps the file in memory as a
// Buffer which we then pass to the S3 SDK. For large files consider using
// streaming or presigned URLs.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: config.S3_MAX_FILE_SIZE },
});

const s3Client = createS3Client(config);

function parsePositiveInteger(value) {
  const parsedValue = Number(value);
  if (Number.isNaN(parsedValue) || parsedValue <= 0) {
    return null;
  }
  return parsedValue;
}

function validateFileSizeWithinLimits(fileSizeBytes) {
  if (fileSizeBytes > config.S3_MAX_FILE_SIZE) {
    return `File exceeds maximum allowed size of ${config.S3_MAX_FILE_SIZE} bytes`;
  }
  return null;
}

router.post('/presign', isAuthenticated, async (request, response) => {
  try {
    const {fileName, contentType = 'application/octet-stream', fileSize} = request.body;

    if (!fileName) {
      return response.status(400).json({error: 'fileName is required'});
    }

    const fileSizeBytes = parsePositiveInteger(fileSize);
    if (!fileSizeBytes) {
      return response.status(400).json({error: 'fileSize must be a positive number of bytes'});
    }

    const sizeValidationMessage = validateFileSizeWithinLimits(fileSizeBytes);
    if (sizeValidationMessage) {
      return response.status(400).json({error: sizeValidationMessage});
    }

    if (fileSizeBytes > config.S3_MULTIPART_THRESHOLD_BYTES) {
      return response.status(400).json({error: 'File exceeds single-part upload threshold. Use multipart upload instead.'});
    }

    const objectKey = makeObjectKey(fileName);

    const presignResult = await createPresignedPutUrl(s3Client, {
      bucket: config.S3_BUCKET,
      key: objectKey,
      contentType,
      expiresInSeconds: config.S3_PRESIGN_EXPIRATION_SECONDS,
      publicRead: config.S3_PUBLIC_READ,
    });

    return response.status(200).json({
      success: true,
      bucket: presignResult.bucket,
      key: presignResult.key,
      url: presignResult.url,
      expiresInSeconds: presignResult.expiresInSeconds,
      objectUrl: presignResult.objectUrl,
    });
  } catch (error) {
    console.error('Error creating presigned PUT URL:', error);
    return response.status(500).json({error: 'Failed to create presigned URL', details: error.message});
  }
});

router.post('/multipart/initiate', isAuthenticated, async (request, response) => {
  try {
    const {fileName, contentType = 'application/octet-stream', fileSize} = request.body;

    if (!fileName) {
      return response.status(400).json({error: 'fileName is required'});
    }

    const fileSizeBytes = parsePositiveInteger(fileSize);
    if (!fileSizeBytes) {
      return response.status(400).json({error: 'fileSize must be a positive number of bytes'});
    }

    const sizeValidationMessage = validateFileSizeWithinLimits(fileSizeBytes);
    if (sizeValidationMessage) {
      return response.status(400).json({error: sizeValidationMessage});
    }

    const objectKey = makeObjectKey(fileName);

    const initiationResult = await initiateMultipartUpload(s3Client, {
      bucket: config.S3_BUCKET,
      key: objectKey,
      contentType,
      publicRead: config.S3_PUBLIC_READ,
    });

    return response.status(200).json({
      success: true,
      bucket: initiationResult.bucket,
      key: initiationResult.key,
      uploadId: initiationResult.uploadId,
      objectUrl: initiationResult.objectUrl,
      partSizeBytes: config.S3_MULTIPART_PART_SIZE_BYTES,
      multipartThresholdBytes: config.S3_MULTIPART_THRESHOLD_BYTES,
      presignedUrlExpirationSeconds: config.S3_PRESIGN_EXPIRATION_SECONDS,
    });
  } catch (error) {
    console.error('Error initiating multipart upload:', error);
    return response.status(500).json({error: 'Failed to initiate multipart upload', details: error.message});
  }
});

router.post('/multipart/part-url', isAuthenticated, async (request, response) => {
  try {
    const {uploadId, key, partNumber} = request.body;

    if (!uploadId) {
      return response.status(400).json({error: 'uploadId is required'});
    }

    if (!key) {
      return response.status(400).json({error: 'key is required'});
    }

    const parsedPartNumber = parsePositiveInteger(partNumber);
    if (!parsedPartNumber) {
      return response.status(400).json({error: 'partNumber must be a positive integer'});
    }

    const presignResult = await createPresignedUploadPartUrl(s3Client, {
      bucket: config.S3_BUCKET,
      key,
      uploadId,
      partNumber: parsedPartNumber,
      expiresInSeconds: config.S3_PRESIGN_EXPIRATION_SECONDS,
    });

    return response.status(200).json({
      success: true,
      bucket: presignResult.bucket,
      key: presignResult.key,
      uploadId: presignResult.uploadId,
      partNumber: presignResult.partNumber,
      url: presignResult.url,
      expiresInSeconds: presignResult.expiresInSeconds,
    });
  } catch (error) {
    console.error('Error creating presigned upload part URL:', error);
    return response.status(500).json({error: 'Failed to create presigned part URL', details: error.message});
  }
});

router.post('/multipart/complete', isAuthenticated, async (request, response) => {
  try {
    const {uploadId, key, parts} = request.body;

    if (!uploadId) {
      return response.status(400).json({error: 'uploadId is required'});
    }

    if (!key) {
      return response.status(400).json({error: 'key is required'});
    }

    if (!Array.isArray(parts) || parts.length === 0) {
      return response.status(400).json({error: 'parts array with at least one item is required'});
    }

    const normalizedParts = parts.map((part) => ({
      partNumber: Number(part.partNumber),
      eTag: part.eTag,
    })).filter((part) => !Number.isNaN(part.partNumber) && !!part.eTag);

    if (normalizedParts.length !== parts.length) {
      return response.status(400).json({error: 'Each part must include partNumber and eTag'});
    }

    const completionResult = await completeMultipartUpload(s3Client, {
      bucket: config.S3_BUCKET,
      key,
      uploadId,
      parts: normalizedParts,
    });

    return response.status(200).json({
      success: true,
      bucket: completionResult.bucket,
      key: completionResult.key,
      uploadId: completionResult.uploadId,
      location: completionResult.location,
      eTag: completionResult.eTag,
    });
  } catch (error) {
    console.error('Error completing multipart upload:', error);
    return response.status(500).json({error: 'Failed to complete multipart upload', details: error.message});
  }
});

router.post('/multipart/abort', isAuthenticated, async (request, response) => {
  try {
    const {uploadId, key} = request.body;

    if (!uploadId) {
      return response.status(400).json({error: 'uploadId is required'});
    }

    if (!key) {
      return response.status(400).json({error: 'key is required'});
    }

    const abortResult = await abortMultipartUpload(s3Client, {
      bucket: config.S3_BUCKET,
      key,
      uploadId,
    });

    return response.status(200).json({
      success: true,
      bucket: abortResult.bucket,
      key: abortResult.key,
      uploadId: abortResult.uploadId,
    });
  } catch (error) {
    console.error('Error aborting multipart upload:', error);
    return response.status(500).json({error: 'Failed to abort multipart upload', details: error.message});
  }
});

// POST /uploads - expects multipart/form-data with field 'file'
router.post('/', isAuthenticated, upload.single('file'), async (request, response) => {
  try {
    if (!request.file) {
      return response.status(400).json({error: 'No file provided under field "file"'});
    }

    const file = request.file;

    const key = makeObjectKey(file.originalname);

    const result = await uploadBufferToS3(s3Client, config.S3_BUCKET, key, file.buffer, file.mimetype, config.S3_PUBLIC_READ);

    return response.status(201).json({
      success: true,
      bucket: result.bucket,
      key: result.key,
      url: result.url,
    });
  } catch (error) {
    console.error('Error uploading file to S3:', error);
    if (error.code === 'MISSING_BUCKET') {
      return response.status(500).json({error: 'S3 bucket is not configured on the server'});
    }
    return response.status(500).json({error: 'Upload error', details: error.message});
  }
});

export default router;

