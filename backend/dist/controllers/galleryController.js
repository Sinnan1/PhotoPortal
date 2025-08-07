"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteGallery = exports.updateGallery = exports.verifyGalleryPassword = exports.getGallery = exports.getGalleries = exports.createGallery = void 0;
const tslib_1 = require("tslib");
const client_1 = require("@prisma/client");
const bcryptjs_1 = tslib_1.__importDefault(require("bcryptjs"));
const s3Storage_1 = require("../utils/s3Storage");
const prisma = new client_1.PrismaClient();
const createGallery = async (req, res) => {
    try {
        const { title, description, password, expiresAt, downloadLimit } = req.body;
        const photographerId = req.user.id;
        // Validate input
        if (!title) {
            return res.status(400).json({
                success: false,
                error: 'Gallery title is required'
            });
        }
        // Hash password if provided
        let hashedPassword = null;
        if (password) {
            hashedPassword = await bcryptjs_1.default.hash(password, 12);
        }
        // Parse expiry date if provided
        let expiryDate = null;
        if (expiresAt) {
            expiryDate = new Date(expiresAt);
            if (expiryDate < new Date()) {
                return res.status(400).json({
                    success: false,
                    error: 'Expiry date cannot be in the past'
                });
            }
        }
        const gallery = await prisma.gallery.create({
            data: {
                title,
                description,
                password: hashedPassword,
                expiresAt: expiryDate,
                downloadLimit: downloadLimit || 0,
                photographerId
            },
            include: {
                photographer: {
                    select: { id: true, name: true, email: true }
                },
                photos: true
            }
        });
        res.status(201).json({
            success: true,
            data: gallery
        });
    }
    catch (error) {
        console.error('Create gallery error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
};
exports.createGallery = createGallery;
const getGalleries = async (req, res) => {
    try {
        const photographerId = req.user.id;
        const galleries = await prisma.gallery.findMany({
            where: { photographerId },
            include: {
                photos: {
                    select: {
                        id: true,
                        filename: true,
                        thumbnailUrl: true,
                        createdAt: true
                    }
                },
                _count: {
                    select: { photos: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json({
            success: true,
            data: galleries
        });
    }
    catch (error) {
        console.error('Get galleries error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
};
exports.getGalleries = getGalleries;
const getGallery = async (req, res) => {
    try {
        const { id } = req.params;
        const gallery = await prisma.gallery.findUnique({
            where: { id },
            include: {
                photos: {
                    orderBy: { createdAt: 'desc' }
                },
                photographer: {
                    select: { name: true }
                }
            }
        });
        if (!gallery) {
            return res.status(404).json({
                success: false,
                error: 'Gallery not found'
            });
        }
        // Check if gallery has expired
        if (gallery.expiresAt && gallery.expiresAt < new Date()) {
            return res.status(410).json({
                success: false,
                error: 'Gallery has expired'
            });
        }
        res.json({
            success: true,
            data: gallery
        });
    }
    catch (error) {
        console.error('Get gallery error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
};
exports.getGallery = getGallery;
const verifyGalleryPassword = async (req, res) => {
    try {
        const { id } = req.params;
        const { password } = req.body;
        const gallery = await prisma.gallery.findUnique({
            where: { id },
            select: { password: true }
        });
        if (!gallery) {
            return res.status(404).json({
                success: false,
                error: 'Gallery not found'
            });
        }
        if (!gallery.password) {
            return res.json({
                success: true,
                message: 'Gallery is not password protected'
            });
        }
        if (!password) {
            return res.status(400).json({
                success: false,
                error: 'Password is required'
            });
        }
        const isValidPassword = await bcryptjs_1.default.compare(password, gallery.password);
        if (!isValidPassword) {
            return res.status(401).json({
                success: false,
                error: 'Invalid password'
            });
        }
        res.json({
            success: true,
            message: 'Password verified'
        });
    }
    catch (error) {
        console.error('Verify password error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
};
exports.verifyGalleryPassword = verifyGalleryPassword;
const updateGallery = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, description, password, expiresAt, downloadLimit } = req.body;
        const photographerId = req.user.id;
        // Check if gallery exists and belongs to photographer
        const existingGallery = await prisma.gallery.findFirst({
            where: { id, photographerId }
        });
        if (!existingGallery) {
            return res.status(404).json({
                success: false,
                error: 'Gallery not found or access denied'
            });
        }
        // Prepare update data
        const updateData = {};
        if (title !== undefined)
            updateData.title = title;
        if (description !== undefined)
            updateData.description = description;
        if (downloadLimit !== undefined)
            updateData.downloadLimit = downloadLimit;
        // Handle password update
        if (password !== undefined) {
            updateData.password = password ? await bcryptjs_1.default.hash(password, 12) : null;
        }
        // Handle expiry date
        if (expiresAt !== undefined) {
            if (expiresAt) {
                const expiryDate = new Date(expiresAt);
                if (expiryDate < new Date()) {
                    return res.status(400).json({
                        success: false,
                        error: 'Expiry date cannot be in the past'
                    });
                }
                updateData.expiresAt = expiryDate;
            }
            else {
                updateData.expiresAt = null;
            }
        }
        const gallery = await prisma.gallery.update({
            where: { id },
            data: updateData,
            include: {
                photos: true,
                photographer: {
                    select: { name: true }
                }
            }
        });
        res.json({
            success: true,
            data: gallery
        });
    }
    catch (error) {
        console.error('Update gallery error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
};
exports.updateGallery = updateGallery;
const deleteGallery = async (req, res) => {
    try {
        const { id } = req.params;
        const photographerId = req.user.id;
        // Check if gallery exists and belongs to photographer
        const existingGallery = await prisma.gallery.findFirst({
            where: { id, photographerId },
            include: {
                photos: true
            }
        });
        if (!existingGallery) {
            return res.status(404).json({
                success: false,
                error: 'Gallery not found or access denied'
            });
        }
        // Delete all photos from S3 storage
        if (existingGallery.photos.length > 0) {
            try {
                const deletePromises = existingGallery.photos.map(async (photo) => {
                    // Extract the S3 keys from the URLs
                    const originalUrl = new URL(photo.originalUrl);
                    const thumbnailUrl = new URL(photo.thumbnailUrl);
                    // Split pathname and remove bucket name to get just the filename
                    const originalPathParts = originalUrl.pathname.split('/');
                    const thumbnailPathParts = thumbnailUrl.pathname.split('/');
                    // Remove empty string and bucket name, keep the rest as the key
                    const originalKey = originalPathParts.slice(2).join('/');
                    const thumbnailKey = thumbnailPathParts.slice(2).join('/');
                    return Promise.all([
                        (0, s3Storage_1.deleteFromS3)(originalKey),
                        (0, s3Storage_1.deleteFromS3)(thumbnailKey)
                    ]);
                });
                await Promise.all(deletePromises);
                console.log(`Deleted ${existingGallery.photos.length} photos from S3 for gallery ${id}`);
            }
            catch (storageError) {
                console.error('Storage deletion error during gallery deletion:', storageError);
                // Continue with database deletion even if storage fails
            }
        }
        // Delete gallery from database (this will cascade delete photos due to foreign key)
        await prisma.gallery.delete({
            where: { id }
        });
        res.json({
            success: true,
            message: 'Gallery deleted successfully'
        });
    }
    catch (error) {
        console.error('Delete gallery error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
};
exports.deleteGallery = deleteGallery;
