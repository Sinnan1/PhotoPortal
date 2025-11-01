"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const photoController_1 = require("../controllers/photoController");
const auth_1 = require("../middleware/auth");
const auditMiddleware_1 = require("../middleware/auditMiddleware");
const router = (0, express_1.Router)();
// Protected routes (photographers and admin)
router.post('/upload/:folderId', auth_1.authenticateToken, (0, auth_1.requireAnyRole)(['PHOTOGRAPHER', 'ADMIN']), (0, auditMiddleware_1.auditMiddleware)('UPLOAD_PHOTOS', 'photo', {
    extractTargetId: (req) => req.params.folderId
}), photoController_1.uploadMiddleware, photoController_1.uploadPhotos);
router.delete('/:id', auth_1.authenticateToken, auth_1.requireAdminOrOwner, (0, auditMiddleware_1.auditMiddleware)('DELETE_PHOTO', 'photo', {
    extractTargetId: (req) => req.params.id
}), photoController_1.deletePhoto);
// Bulk operations - Admin can delete any photos
router.post('/bulk-delete', auth_1.authenticateToken, auth_1.requireAdminOrOwner, (0, auditMiddleware_1.auditMiddleware)('BULK_DELETE_PHOTOS', 'photo'), photoController_1.bulkDeletePhotos);
// Like/Favorite routes
router.post('/:id/like', auth_1.authenticateToken, photoController_1.likePhoto);
router.delete('/:id/like', auth_1.authenticateToken, photoController_1.unlikePhoto);
router.post('/:id/favorite', auth_1.authenticateToken, photoController_1.favoritePhoto);
router.delete('/:id/favorite', auth_1.authenticateToken, photoController_1.unfavoritePhoto);
// Post routes (photographer and admin)
router.post('/:id/post', auth_1.authenticateToken, (0, auth_1.requireAnyRole)(['PHOTOGRAPHER', 'ADMIN']), (0, auditMiddleware_1.auditMiddleware)('POST_PHOTO', 'photo', {
    extractTargetId: (req) => req.params.id
}), photoController_1.postPhoto);
router.delete('/:id/post', auth_1.authenticateToken, (0, auth_1.requireAnyRole)(['PHOTOGRAPHER', 'ADMIN']), (0, auditMiddleware_1.auditMiddleware)('UNPOST_PHOTO', 'photo', {
    extractTargetId: (req) => req.params.id
}), photoController_1.unpostPhoto);
// Status and lists
router.get('/:id/status', auth_1.authenticateToken, photoController_1.getPhotoStatus);
router.get('/liked', auth_1.authenticateToken, photoController_1.getLikedPhotos);
router.get('/favorited', auth_1.authenticateToken, photoController_1.getFavoritedPhotos);
router.get('/posts', auth_1.authenticateToken, (0, auth_1.requireAnyRole)(['PHOTOGRAPHER', 'ADMIN']), photoController_1.getPosts);
// Public routes (for clients)
router.get('/gallery/:galleryId', photoController_1.getPhotos);
router.get('/:id/download', photoController_1.downloadPhoto);
router.post('/:id/download', photoController_1.downloadPhoto); // Support POST for secure credential passing
// Filtered download routes
router.get('/gallery/:galleryId/download/liked', auth_1.authenticateToken, photoController_1.downloadLikedPhotos);
router.get('/gallery/:galleryId/download/favorited', auth_1.authenticateToken, photoController_1.downloadFavoritedPhotos);
router.get('/gallery/:galleryId/download/all', auth_1.authenticateToken, photoController_1.downloadAllPhotos);
router.get('/gallery/:galleryId/download/folder/:folderId', auth_1.authenticateToken, photoController_1.downloadFolderPhotos);
// Excel export routes (photographer only)
router.get('/gallery/:galleryId/export/liked', auth_1.authenticateToken, (0, auth_1.requireAnyRole)(['PHOTOGRAPHER', 'ADMIN']), photoController_1.exportLikedPhotosToExcel);
router.get('/gallery/:galleryId/export/favorited', auth_1.authenticateToken, (0, auth_1.requireAnyRole)(['PHOTOGRAPHER', 'ADMIN']), photoController_1.exportFavoritedPhotosToExcel);
// Gallery photo stats (photographer only)
router.get('/gallery/:galleryId/stats', auth_1.authenticateToken, (0, auth_1.requireAnyRole)(['PHOTOGRAPHER', 'ADMIN']), photoController_1.getGalleryPhotoStats);
// Download progress tracking
router.get('/download/:downloadId/progress', auth_1.authenticateToken, photoController_1.getDownloadProgress);
// Download ticket creation
router.post('/download-ticket', auth_1.authenticateToken, photoController_1.createDownloadTicket);
// Ticket-based download
router.get('/download-zip', photoController_1.downloadWithTicket);
exports.default = router;
