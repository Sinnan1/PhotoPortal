"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteFromS3 = exports.uploadToS3 = void 0;
const tslib_1 = require("tslib");
// Changed: Import AWS SDK v3 instead of Backblaze B2
const client_s3_1 = require("@aws-sdk/client-s3");
const sharp_1 = tslib_1.__importDefault(require("sharp"));
const uuid_1 = require("uuid");
// Changed: Initialize S3 client instead of B2 client
// Uses environment variables for AWS credentials and region
const s3Client = new client_s3_1.S3Client({
    region: 'us-east-005',
    endpoint: 'https://s3.us-east-005.backblazeb2.com',
    forcePathStyle: true, // REQUIRED for B2
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
});
// Removed: No need for authorization with S3 (handled automatically by SDK)
const uploadToS3 = async (file, originalFilename, galleryId) => {
    try {
        const fileExtension = originalFilename.split('.').pop()?.toLowerCase();
        const uniqueId = (0, uuid_1.v4)();
        const filename = `${galleryId}/${uniqueId}.${fileExtension}`;
        const thumbnailFilename = `${galleryId}/thumbnails/${uniqueId}_thumb.jpg`;
        // Create thumbnail (max 400px width, maintain aspect ratio)
        const thumbnailBuffer = await (0, sharp_1.default)(file)
            .resize(400, 400, {
            fit: 'inside',
            withoutEnlargement: true
        })
            .jpeg({ quality: 80 })
            .toBuffer();
        // Upload original image
        const originalUploadCommand = new client_s3_1.PutObjectCommand({
            Bucket: process.env.S3_BUCKET_NAME,
            Key: filename,
            Body: file,
            ContentType: `image/${fileExtension}`,
            Metadata: {
                originalName: originalFilename,
                uploadedAt: new Date().toISOString()
            }
        });
        await s3Client.send(originalUploadCommand);
        // Upload thumbnail
        const thumbnailUploadCommand = new client_s3_1.PutObjectCommand({
            Bucket: process.env.S3_BUCKET_NAME,
            Key: thumbnailFilename,
            Body: thumbnailBuffer,
            ContentType: 'image/jpeg',
            Metadata: {
                type: 'thumbnail',
                originalFile: filename,
                uploadedAt: new Date().toISOString()
            }
        });
        await s3Client.send(thumbnailUploadCommand);
        // Correct Path-Style URL format for Backblaze B2
        const bucketName = process.env.S3_BUCKET_NAME;
        const endpoint = 'https://s3.us-east-005.backblazeb2.com';
        const originalUrl = `${endpoint}/${bucketName}/${filename}`;
        const thumbnailUrl = `${endpoint}/${bucketName}/${thumbnailFilename}`;
        return {
            originalUrl,
            thumbnailUrl,
            fileSize: file.length
        };
    }
    catch (error) {
        console.error('B2 upload error:', {
            message: error?.message,
            stack: error?.stack,
            code: error?.$metadata,
            name: error?.name
        });
        throw new Error('Failed to upload file to storage');
    }
};
exports.uploadToS3 = uploadToS3;
const deleteFromS3 = async (filename) => {
    try {
        // Removed: No authorization needed for S3
        // Changed: Use S3 DeleteObjectCommand instead of B2's delete process
        // No need to list files first - S3 can delete directly by key
        const deleteCommand = new client_s3_1.DeleteObjectCommand({
            Bucket: process.env.S3_BUCKET_NAME,
            Key: filename
        });
        await s3Client.send(deleteCommand);
    }
    catch (error) {
        // Changed: Updated error message to reflect S3
        console.error('S3 delete error:', error);
        throw new Error('Failed to delete file from storage');
    }
};
exports.deleteFromS3 = deleteFromS3;
