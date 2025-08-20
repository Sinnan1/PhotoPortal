"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateMultipleThumbnails = exports.batchDeleteFromS3 = exports.deleteFromS3 = exports.uploadToS3 = void 0;
const tslib_1 = require("tslib");
const client_s3_1 = require("@aws-sdk/client-s3");
const sharp_1 = tslib_1.__importDefault(require("sharp"));
const os_1 = tslib_1.__importDefault(require("os"));
const uuid_1 = require("uuid");
const path_1 = tslib_1.__importDefault(require("path"));
const s3Client = new client_s3_1.S3Client({
    region: 'us-east-005',
    endpoint: 'https://s3.us-east-005.backblazeb2.com',
    forcePathStyle: true,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
});
// Limit Sharp concurrency to avoid CPU contention on small VPS instances
sharp_1.default.concurrency(Math.min(3, Math.max(1, os_1.default.cpus().length)));
// RAW file extensions that Sharp can handle
const SHARP_SUPPORTED_RAW = ['.dng', '.tiff', '.tif'];
// Function to check if file is a RAW format
const isRawFile = (filename) => {
    const ext = path_1.default.extname(filename).toLowerCase();
    const rawExtensions = [
        '.cr2', '.cr3', '.crw', '.nef', '.nrw', '.arw', '.srf', '.sr2',
        '.dng', '.orf', '.rw2', '.pef', '.raf', '.3fr', '.fff', '.dcr',
        '.kdc', '.mdc', '.mos', '.mrw', '.x3f', '.tiff', '.tif'
    ];
    return rawExtensions.includes(ext);
};
// Enhanced upload function with RAW file support
const uploadToS3 = async (file, originalFilename, galleryId) => {
    try {
        const rawExtension = path_1.default.extname(originalFilename);
        const fileExtension = rawExtension.toLowerCase();
        const baseName = path_1.default.basename(originalFilename, rawExtension);
        const uniqueId = (0, uuid_1.v4)();
        const filename = `${galleryId}/${uniqueId}_${baseName}${fileExtension}`;
        const thumbnailFilename = `${galleryId}/thumbnails/${uniqueId}_${baseName}_thumb.jpg`;
        let thumbnailBuffer;
        // Handle thumbnail creation based on file type
        if (isRawFile(originalFilename)) {
            if (SHARP_SUPPORTED_RAW.includes(fileExtension)) {
                // Sharp can handle DNG, TIFF directly
                try {
                    thumbnailBuffer = await (0, sharp_1.default)(file)
                        .resize(400, 400, {
                        fit: 'inside',
                        withoutEnlargement: true
                    })
                        .jpeg({ quality: 80 })
                        .toBuffer();
                }
                catch (sharpError) {
                    console.warn(`Sharp failed for ${originalFilename}, creating placeholder:`, sharpError);
                    thumbnailBuffer = await createPlaceholderThumbnail(originalFilename);
                }
            }
            else {
                // For other RAW files, create a placeholder thumbnail
                console.log(`Creating placeholder thumbnail for RAW file: ${originalFilename}`);
                thumbnailBuffer = await createPlaceholderThumbnail(originalFilename);
            }
        }
        else {
            // Regular image files
            try {
                thumbnailBuffer = await (0, sharp_1.default)(file)
                    .resize(400, 400, {
                    fit: 'inside',
                    withoutEnlargement: true
                })
                    .jpeg({ quality: 80 })
                    .toBuffer();
            }
            catch (error) {
                console.error(`Failed to create thumbnail for ${originalFilename}:`, error);
                thumbnailBuffer = await createPlaceholderThumbnail(originalFilename);
            }
        }
        // Upload original file with appropriate content type
        const contentType = getContentType(fileExtension);
        const originalUploadCommand = new client_s3_1.PutObjectCommand({
            Bucket: process.env.S3_BUCKET_NAME,
            Key: filename,
            Body: file,
            ContentType: contentType,
            Metadata: {
                originalName: originalFilename,
                uploadedAt: new Date().toISOString(),
                fileType: isRawFile(originalFilename) ? 'raw' : 'image',
                fileSize: file.length.toString()
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
        // Generate URLs
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
        console.error('S3 upload error:', {
            message: error?.message,
            filename: originalFilename,
            fileSize: file.length
        });
        throw new Error(`Failed to upload ${originalFilename} to storage`);
    }
};
exports.uploadToS3 = uploadToS3;
// Create placeholder thumbnail for unsupported RAW files
async function createPlaceholderThumbnail(filename) {
    const extension = path_1.default.extname(filename).toUpperCase().replace('.', '');
    // Create a simple SVG placeholder
    const svgContent = `
		<svg width="400" height="400" xmlns="http://www.w3.org/2000/svg">
			<rect width="400" height="400" fill="#f3f4f6"/>
			<rect x="50" y="50" width="300" height="300" fill="#e5e7eb" stroke="#d1d5db" stroke-width="2"/>
			<text x="200" y="180" text-anchor="middle" font-family="Arial, sans-serif" font-size="24" fill="#6b7280">
				${extension} FILE
			</text>
			<text x="200" y="220" text-anchor="middle" font-family="Arial, sans-serif" font-size="14" fill="#9ca3af">
				${path_1.default.basename(filename)}
			</text>
			<circle cx="130" cy="120" r="20" fill="#d1d5db"/>
			<polygon points="100,140 160,140 130,110" fill="#d1d5db"/>
		</svg>
	`;
    // Convert SVG to JPEG using Sharp
    return await (0, sharp_1.default)(Buffer.from(svgContent))
        .jpeg({ quality: 80 })
        .toBuffer();
}
// Get appropriate content type for different file extensions
function getContentType(extension) {
    const contentTypes = {
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.webp': 'image/webp',
        '.tiff': 'image/tiff',
        '.tif': 'image/tiff',
        '.dng': 'image/x-adobe-dng',
        '.cr2': 'image/x-canon-cr2',
        '.cr3': 'image/x-canon-cr3',
        '.nef': 'image/x-nikon-nef',
        '.arw': 'image/x-sony-arw',
        '.orf': 'image/x-olympus-orf',
        '.rw2': 'image/x-panasonic-rw2',
        '.pef': 'image/x-pentax-pef',
        '.raf': 'image/x-fuji-raf'
    };
    return contentTypes[extension.toLowerCase()] || 'application/octet-stream';
}
// Enhanced delete function with better error handling
const deleteFromS3 = async (filename) => {
    try {
        const deleteCommand = new client_s3_1.DeleteObjectCommand({
            Bucket: process.env.S3_BUCKET_NAME,
            Key: filename
        });
        await s3Client.send(deleteCommand);
        console.log(`Successfully deleted: ${filename}`);
    }
    catch (error) {
        console.error('S3 delete error:', {
            message: error?.message,
            filename,
            code: error?.$metadata?.httpStatusCode
        });
        // Don't throw error if file doesn't exist (404)
        if (error?.$metadata?.httpStatusCode !== 404) {
            throw new Error(`Failed to delete ${filename} from storage`);
        }
    }
};
exports.deleteFromS3 = deleteFromS3;
// Batch delete function for better performance
const batchDeleteFromS3 = async (filenames) => {
    const deletePromises = filenames.map(filename => (0, exports.deleteFromS3)(filename).catch(error => {
        console.warn(`Failed to delete ${filename}:`, error.message);
        return null; // Don't fail the entire batch for one file
    }));
    await Promise.all(deletePromises);
};
exports.batchDeleteFromS3 = batchDeleteFromS3;
// Function to generate different thumbnail sizes
const generateMultipleThumbnails = async (file, originalFilename, galleryId) => {
    const thumbnailSizes = {
        small: { width: 150, height: 150 },
        medium: { width: 400, height: 400 },
        large: { width: 800, height: 800 }
    };
    const results = {};
    const uniqueId = (0, uuid_1.v4)();
    const baseName = path_1.default.basename(originalFilename, path_1.default.extname(originalFilename));
    for (const [sizeName, dimensions] of Object.entries(thumbnailSizes)) {
        try {
            let thumbnailBuffer;
            if (isRawFile(originalFilename) && !SHARP_SUPPORTED_RAW.includes(path_1.default.extname(originalFilename).toLowerCase())) {
                // Use placeholder for unsupported RAW files
                thumbnailBuffer = await createPlaceholderThumbnail(originalFilename);
                if (sizeName !== 'medium') {
                    // Resize placeholder to match requested size
                    thumbnailBuffer = await (0, sharp_1.default)(thumbnailBuffer)
                        .resize(dimensions.width, dimensions.height, { fit: 'inside' })
                        .jpeg({ quality: 80 })
                        .toBuffer();
                }
            }
            else {
                // Process with Sharp
                thumbnailBuffer = await (0, sharp_1.default)(file)
                    .resize(dimensions.width, dimensions.height, {
                    fit: 'inside',
                    withoutEnlargement: true
                })
                    .jpeg({ quality: 80 })
                    .toBuffer();
            }
            const thumbnailFilename = `${galleryId}/thumbnails/${uniqueId}_${baseName}_${sizeName}.jpg`;
            const uploadCommand = new client_s3_1.PutObjectCommand({
                Bucket: process.env.S3_BUCKET_NAME,
                Key: thumbnailFilename,
                Body: thumbnailBuffer,
                ContentType: 'image/jpeg',
                Metadata: {
                    type: 'thumbnail',
                    size: sizeName,
                    originalFile: originalFilename,
                    uploadedAt: new Date().toISOString()
                }
            });
            await s3Client.send(uploadCommand);
            const bucketName = process.env.S3_BUCKET_NAME;
            const endpoint = 'https://s3.us-east-005.backblazeb2.com';
            results[sizeName] = `${endpoint}/${bucketName}/${thumbnailFilename}`;
        }
        catch (error) {
            console.error(`Failed to generate ${sizeName} thumbnail:`, error);
            // Continue with other sizes even if one fails
        }
    }
    return results;
};
exports.generateMultipleThumbnails = generateMultipleThumbnails;
