"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getFavoritedPhotos = exports.getLikedPhotos = exports.getPhotoStatus = exports.unfavoritePhoto = exports.favoritePhoto = exports.unlikePhoto = exports.likePhoto = exports.downloadPhoto = exports.deletePhoto = exports.getPhotos = exports.uploadPhotos = exports.uploadMiddleware = void 0;
const tslib_1 = require("tslib");
const client_1 = require("@prisma/client");
const multer_1 = tslib_1.__importDefault(require("multer"));
// Changed: Import from S3 storage utils instead of B2
const s3Storage_1 = require("../utils/s3Storage");
const prisma = new client_1.PrismaClient();
// Configure multer for memory storage
const upload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    },
    fileFilter: (req, file, cb) => {
        // Check file type
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        }
        else {
            cb(new Error('Invalid file type. Only JPEG, PNG, and WebP are allowed.'));
        }
    }
});
exports.uploadMiddleware = upload.array('photos', 20); // Allow up to 20 photos
const uploadPhotos = async (req, res) => {
    try {
        const { galleryId } = req.params;
        const photographerId = req.user.id;
        const files = req.files;
        if (!files || files.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'No files uploaded'
            });
        }
        // Verify gallery exists and belongs to photographer
        const gallery = await prisma.gallery.findFirst({
            where: { id: galleryId, photographerId }
        });
        if (!gallery) {
            return res.status(404).json({
                success: false,
                error: 'Gallery not found or access denied'
            });
        }
        const uploadPromises = files.map(async (file) => {
            try {
                // Changed: Upload to S3 instead of B2
                const { originalUrl, thumbnailUrl, fileSize } = await (0, s3Storage_1.uploadToS3)(file.buffer, file.originalname, galleryId);
                // Save to database
                const photo = await prisma.photo.create({
                    data: {
                        filename: file.originalname,
                        originalUrl,
                        thumbnailUrl,
                        fileSize,
                        galleryId
                    }
                });
                return {
                    success: true,
                    photo
                };
            }
            catch (error) {
                console.error(`Upload failed for ${file.originalname}:`, error);
                return {
                    success: false,
                    filename: file.originalname,
                    error: error instanceof Error ? error.message : 'Upload failed'
                };
            }
        });
        const results = await Promise.all(uploadPromises);
        const successful = results.filter(r => r.success);
        const failed = results.filter(r => !r.success);
        res.status(201).json({
            success: true,
            data: {
                uploaded: successful.length,
                failed: failed.length,
                results: successful.map(r => r.photo),
                errors: failed
            }
        });
    }
    catch (error) {
        console.error('Upload photos error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
};
exports.uploadPhotos = uploadPhotos;
const getPhotos = async (req, res) => {
    try {
        const { galleryId } = req.params;
        const photos = await prisma.photo.findMany({
            where: { galleryId },
            orderBy: { createdAt: 'desc' }
        });
        res.json({
            success: true,
            data: photos
        });
    }
    catch (error) {
        console.error('Get photos error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
};
exports.getPhotos = getPhotos;
const deletePhoto = async (req, res) => {
    try {
        const { id } = req.params;
        const photographerId = req.user.id;
        // Find photo and verify ownership through gallery
        const photo = await prisma.photo.findUnique({
            where: { id },
            include: {
                gallery: {
                    select: { photographerId: true }
                }
            }
        });
        if (!photo || photo.gallery.photographerId !== photographerId) {
            return res.status(404).json({
                success: false,
                error: 'Photo not found or access denied'
            });
        }
        // Delete from S3 storage
        try {
            const originalKey = new URL(photo.originalUrl).pathname.split('/').slice(2).join('/');
            const thumbnailKey = new URL(photo.thumbnailUrl).pathname.split('/').slice(2).join('/');
            console.log('Deleting keys:', { originalKey, thumbnailKey });
            await Promise.all([
                (0, s3Storage_1.deleteFromS3)(originalKey),
                (0, s3Storage_1.deleteFromS3)(thumbnailKey)
            ]);
        }
        catch (storageError) {
            console.error('Storage deletion error:', storageError);
            // Continue with database deletion even if storage fails
        }
        // Delete from database
        await prisma.photo.delete({
            where: { id }
        });
        res.json({
            success: true,
            message: 'Photo deleted successfully'
        });
    }
    catch (error) {
        console.error('Delete photo error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
};
exports.deletePhoto = deletePhoto;
const downloadPhoto = async (req, res) => {
    try {
        const { id } = req.params;
        const { galleryId } = req.query;
        // Verify gallery access if provided
        if (galleryId) {
            const gallery = await prisma.gallery.findUnique({
                where: { id: galleryId }
            });
            if (!gallery) {
                return res.status(404).json({
                    success: false,
                    error: 'Gallery not found'
                });
            }
            // Check expiry
            if (gallery.expiresAt && gallery.expiresAt < new Date()) {
                return res.status(410).json({
                    success: false,
                    error: 'Gallery has expired'
                });
            }
            // Check download limit
            if (gallery.downloadLimit && gallery.downloadCount >= gallery.downloadLimit) {
                return res.status(429).json({
                    success: false,
                    error: 'Download limit exceeded'
                });
            }
            // Increment download count
            await prisma.gallery.update({
                where: { id: galleryId },
                data: { downloadCount: { increment: 1 } }
            });
        }
        const photo = await prisma.photo.findUnique({
            where: { id }
        });
        if (!photo) {
            return res.status(404).json({
                success: false,
                error: 'Photo not found'
            });
        }
        // Increment photo download count
        await prisma.photo.update({
            where: { id },
            data: { downloadCount: { increment: 1 } }
        });
        // Return download URL (client will handle the actual download)
        res.json({
            success: true,
            data: {
                downloadUrl: photo.originalUrl,
                filename: photo.filename
            }
        });
    }
    catch (error) {
        console.error('Download photo error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
};
exports.downloadPhoto = downloadPhoto;
const likePhoto = async (req, res) => {
    try {
        const { photoId } = req.params;
        const userId = req.user.id;
        // Check if photo exists
        const photo = await prisma.photo.findUnique({
            where: { id: photoId }
        });
        if (!photo) {
            return res.status(404).json({
                success: false,
                error: 'Photo not found'
            });
        }
        // Check if already liked
        const existingLike = await prisma.likedPhoto.findUnique({
            where: {
                userId_photoId: {
                    userId,
                    photoId
                }
            }
        });
        if (existingLike) {
            return res.status(400).json({
                success: false,
                error: 'Photo already liked'
            });
        }
        await prisma.likedPhoto.create({
            data: {
                userId,
                photoId
            }
        });
        res.json({
            success: true,
            message: 'Photo liked'
        });
    }
    catch (error) {
        console.error('Like photo error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
};
exports.likePhoto = likePhoto;
const unlikePhoto = async (req, res) => {
    try {
        const { photoId } = req.params;
        const userId = req.user.id;
        await prisma.likedPhoto.delete({
            where: {
                userId_photoId: {
                    userId,
                    photoId
                }
            }
        });
        res.json({
            success: true,
            message: 'Photo unliked'
        });
    }
    catch (error) {
        console.error('Unlike photo error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
};
exports.unlikePhoto = unlikePhoto;
const favoritePhoto = async (req, res) => {
    try {
        const { photoId } = req.params;
        const userId = req.user.id;
        // Check if photo exists
        const photo = await prisma.photo.findUnique({
            where: { id: photoId }
        });
        if (!photo) {
            return res.status(404).json({
                success: false,
                error: 'Photo not found'
            });
        }
        // Check if already favorited
        const existingFavorite = await prisma.favoritedPhoto.findUnique({
            where: {
                userId_photoId: {
                    userId,
                    photoId
                }
            }
        });
        if (existingFavorite) {
            return res.status(400).json({
                success: false,
                error: 'Photo already favorited'
            });
        }
        await prisma.favoritedPhoto.create({
            data: {
                userId,
                photoId
            }
        });
        res.json({
            success: true,
            message: 'Photo favorited'
        });
    }
    catch (error) {
        console.error('Favorite photo error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
};
exports.favoritePhoto = favoritePhoto;
const unfavoritePhoto = async (req, res) => {
    try {
        const { photoId } = req.params;
        const userId = req.user.id;
        await prisma.favoritedPhoto.delete({
            where: {
                userId_photoId: {
                    userId,
                    photoId
                }
            }
        });
        res.json({
            success: true,
            message: 'Photo unfavorited'
        });
    }
    catch (error) {
        console.error('Unfavorite photo error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
};
exports.unfavoritePhoto = unfavoritePhoto;
const getPhotoStatus = async (req, res) => {
    try {
        const { photoId } = req.params;
        const userId = req.user.id;
        // Check if photo exists
        const photo = await prisma.photo.findUnique({
            where: { id: photoId }
        });
        if (!photo) {
            return res.status(404).json({
                success: false,
                error: 'Photo not found'
            });
        }
        // Check like and favorite status
        const [liked, favorited] = await Promise.all([
            prisma.likedPhoto.findUnique({
                where: {
                    userId_photoId: {
                        userId,
                        photoId
                    }
                }
            }),
            prisma.favoritedPhoto.findUnique({
                where: {
                    userId_photoId: {
                        userId,
                        photoId
                    }
                }
            })
        ]);
        res.json({
            success: true,
            data: {
                liked: !!liked,
                favorited: !!favorited
            }
        });
    }
    catch (error) {
        console.error('Get photo status error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
};
exports.getPhotoStatus = getPhotoStatus;
const getLikedPhotos = async (req, res) => {
    try {
        const userId = req.user.id;
        const likedPhotos = await prisma.likedPhoto.findMany({
            where: { userId },
            include: {
                photo: {
                    include: {
                        gallery: {
                            select: {
                                id: true,
                                title: true,
                                photographer: {
                                    select: {
                                        name: true
                                    }
                                }
                            }
                        }
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json({
            success: true,
            data: likedPhotos.map(lp => lp.photo)
        });
    }
    catch (error) {
        console.error('Get liked photos error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
};
exports.getLikedPhotos = getLikedPhotos;
const getFavoritedPhotos = async (req, res) => {
    try {
        const userId = req.user.id;
        const favoritedPhotos = await prisma.favoritedPhoto.findMany({
            where: { userId },
            include: {
                photo: {
                    include: {
                        gallery: {
                            select: {
                                id: true,
                                title: true,
                                photographer: {
                                    select: {
                                        name: true
                                    }
                                }
                            }
                        }
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json({
            success: true,
            data: favoritedPhotos.map(fp => fp.photo)
        });
    }
    catch (error) {
        console.error('Get favorited photos error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
};
exports.getFavoritedPhotos = getFavoritedPhotos;
