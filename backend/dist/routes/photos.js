"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const photoController_1 = require("../controllers/photoController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// Protected routes (photographers only)
router.post('/upload/:galleryId', auth_1.authenticateToken, (0, auth_1.requireRole)('PHOTOGRAPHER'), photoController_1.uploadMiddleware, photoController_1.uploadPhotos);
router.delete('/:id', auth_1.authenticateToken, (0, auth_1.requireRole)('PHOTOGRAPHER'), photoController_1.deletePhoto);
// Like/Favorite routes (authenticated users)
router.post('/:photoId/like', auth_1.authenticateToken, photoController_1.likePhoto);
router.delete('/:photoId/like', auth_1.authenticateToken, photoController_1.unlikePhoto);
router.post('/:photoId/favorite', auth_1.authenticateToken, photoController_1.favoritePhoto);
router.delete('/:photoId/favorite', auth_1.authenticateToken, photoController_1.unfavoritePhoto);
router.get('/:photoId/status', auth_1.authenticateToken, photoController_1.getPhotoStatus);
router.get('/liked', auth_1.authenticateToken, photoController_1.getLikedPhotos);
router.get('/favorited', auth_1.authenticateToken, photoController_1.getFavoritedPhotos);
// Public routes (for clients)
router.get('/gallery/:galleryId', photoController_1.getPhotos);
router.get('/:id/download', photoController_1.downloadPhoto);
exports.default = router;
