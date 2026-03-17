import express from 'express';
import multer from 'multer';
import config from '../config.js';
import {createS3Client, uploadBufferToS3, makeObjectKey} from '../services/s3UploadService.js';
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

