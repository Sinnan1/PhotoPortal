"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const photoController_1 = require("../controllers/photoController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// Protected routes (photographers only)
router.post('/upload/:galleryId', auth_1.authenticateToken, (0, auth_1.requireRole)('PHOTOGRAPHER'), photoController_1.uploadMiddleware, photoController_1.uploadPhotos);
router.delete('/:id', auth_1.authenticateToken, (0, auth_1.requireRole)('PHOTOGRAPHER'), photoController_1.deletePhoto);
// Bulk operations
router.post('/bulk-delete', auth_1.authenticateToken, (0, auth_1.requireRole)('PHOTOGRAPHER'), photoController_1.bulkDeletePhotos);
// Like/Favorite routes
router.post('/:id/like', auth_1.authenticateToken, photoController_1.likePhoto);
router.delete('/:id/like', auth_1.authenticateToken, photoController_1.unlikePhoto);
router.post('/:id/favorite', auth_1.authenticateToken, photoController_1.favoritePhoto);
router.delete('/:id/favorite', auth_1.authenticateToken, photoController_1.unfavoritePhoto);
// Status and lists
router.get('/:id/status', auth_1.authenticateToken, photoController_1.getPhotoStatus);
router.get('/liked', auth_1.authenticateToken, photoController_1.getLikedPhotos);
router.get('/favorited', auth_1.authenticateToken, photoController_1.getFavoritedPhotos);
// Public routes (for clients)
router.get('/gallery/:galleryId', photoController_1.getPhotos);
router.get('/:id/download', photoController_1.downloadPhoto);
router.get('/:id/compressed', photoController_1.getCompressedPhoto);
exports.default = router;
