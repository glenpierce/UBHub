import {describe, it, expect, vi, beforeEach} from 'vitest';
import {
  createPresignedPutUrl,
  initiateMultipartUpload,
  createPresignedUploadPartUrl,
  completeMultipartUpload,
  abortMultipartUpload,
  makeObjectKey,
} from '../services/s3UploadService.js';
import config from '../config.js';
import {
  PutObjectCommand,
  CreateMultipartUploadCommand,
  UploadPartCommand,
  CompleteMultipartUploadCommand,
  AbortMultipartUploadCommand,
} from '@aws-sdk/client-s3';
import {getSignedUrl} from '@aws-sdk/s3-request-presigner';

vi.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: vi.fn(),
}));

function createMockS3Client(sendImplementation) {
  return {
    send: vi.fn(sendImplementation),
  };
}

describe('s3UploadService presign and multipart helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a presigned PUT URL with expected parameters', async () => {
    getSignedUrl.mockResolvedValue('https://example.com/presigned-put');
    const mockClient = createMockS3Client();

    const result = await createPresignedPutUrl(mockClient, {
      bucket: 'test-bucket',
      key: 'path/to/object.pdf',
      contentType: 'application/pdf',
      expiresInSeconds: 300,
      publicRead: true,
    });

    expect(result.url).toBe('https://example.com/presigned-put');
    expect(result.bucket).toBe('test-bucket');
    expect(result.key).toBe('path/to/object.pdf');
    expect(getSignedUrl).toHaveBeenCalledWith(expect.any(Object), expect.any(PutObjectCommand), {expiresIn: 300});
  });

  it('initiates multipart upload and returns upload id', async () => {
    const mockClient = createMockS3Client((command) => {
      if (command instanceof CreateMultipartUploadCommand) {
        return Promise.resolve({UploadId: 'upload-123'});
      }
      return Promise.resolve();
    });

    const result = await initiateMultipartUpload(mockClient, {
      bucket: 'bucket-name',
      key: 'object-key',
      contentType: 'application/pdf',
      publicRead: false,
    });

    expect(result.uploadId).toBe('upload-123');
    expect(mockClient.send).toHaveBeenCalledWith(expect.any(CreateMultipartUploadCommand));
  });

  it('creates presigned upload part URL for a given part number', async () => {
    getSignedUrl.mockResolvedValue('https://example.com/presigned-part');
    const mockClient = createMockS3Client();

    const result = await createPresignedUploadPartUrl(mockClient, {
      bucket: 'bucket-name',
      key: 'object-key',
      uploadId: 'upload-123',
      partNumber: 2,
      expiresInSeconds: 600,
    });

    expect(result.partNumber).toBe(2);
    expect(result.url).toBe('https://example.com/presigned-part');
    expect(getSignedUrl).toHaveBeenCalledWith(expect.any(Object), expect.any(UploadPartCommand), {expiresIn: 600});
  });

  it('completes multipart upload with sorted parts', async () => {
    const receivedCommands = [];
    const mockClient = createMockS3Client((command) => {
      receivedCommands.push(command);
      if (command instanceof CompleteMultipartUploadCommand) {
        return Promise.resolve({Location: 'https://bucket-name.s3.region.amazonaws.com/object-key', ETag: 'abc'});
      }
      return Promise.resolve();
    });

    const result = await completeMultipartUpload(mockClient, {
      bucket: 'bucket-name',
      key: 'object-key',
      uploadId: 'upload-123',
      parts: [
        {partNumber: 2, eTag: 'etag-2'},
        {partNumber: 1, eTag: 'etag-1'},
      ],
    });

    const completeCommand = receivedCommands.find((command) => command instanceof CompleteMultipartUploadCommand);
    expect(completeCommand.input.MultipartUpload.Parts).toEqual([
      {ETag: 'etag-1', PartNumber: 1},
      {ETag: 'etag-2', PartNumber: 2},
    ]);
    expect(result.location).toContain('bucket-name');
    expect(result.eTag).toBe('abc');
  });

  it('aborts multipart upload when requested', async () => {
    const mockClient = createMockS3Client((command) => {
      if (command instanceof AbortMultipartUploadCommand) {
        return Promise.resolve({});
      }
      return Promise.resolve();
    });

    const result = await abortMultipartUpload(mockClient, {
      bucket: 'bucket-name',
      key: 'object-key',
      uploadId: 'upload-123',
    });

    expect(result.uploadId).toBe('upload-123');
    expect(mockClient.send).toHaveBeenCalledWith(expect.any(AbortMultipartUploadCommand));
  });

  it('builds object keys with configured prefix and sanitized names', () => {
    const originalPrefix = config.S3_KEY_PREFIX;
    config.S3_KEY_PREFIX = 'custom/prefix/';
    const objectKey = makeObjectKey('unsafe name.pdf');
    expect(objectKey.startsWith('custom/prefix/')).toBe(true);
    expect(objectKey).toContain('_unsafe_name.pdf');
    config.S3_KEY_PREFIX = originalPrefix;
  });
});

