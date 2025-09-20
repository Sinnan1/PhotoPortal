"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const galleryController_1 = require("../controllers/galleryController");
const auth_1 = require("../middleware/auth");
const galleryController_2 = require("../controllers/galleryController");
const auditMiddleware_1 = require("../middleware/auditMiddleware");
const router = (0, express_1.Router)();
// Protected routes (require authentication) - Admin can access all
router.post('/', auth_1.authenticateToken, (0, auth_1.requireAnyRole)(['PHOTOGRAPHER', 'ADMIN']), (0, auditMiddleware_1.auditMiddleware)('CREATE_GALLERY', 'gallery'), galleryController_1.createGallery);
router.get('/', auth_1.authenticateToken, (0, auth_1.requireAnyRole)(['PHOTOGRAPHER', 'ADMIN']), galleryController_1.getGalleries);
router.put('/:id', auth_1.authenticateToken, auth_1.requireAdminOrOwner, (0, auditMiddleware_1.auditMiddleware)('UPDATE_GALLERY', 'gallery', {
    extractTargetId: (req) => req.params.id
}), galleryController_1.updateGallery);
router.delete('/:id', auth_1.authenticateToken, auth_1.requireAdminOrOwner, (0, auditMiddleware_1.auditMiddleware)('DELETE_GALLERY', 'gallery', {
    extractTargetId: (req) => req.params.id
}), galleryController_1.deleteGallery);
// Client routes
router.get('/client/accessible', auth_1.authenticateToken, (0, auth_1.requireRole)('CLIENT'), galleryController_1.getClientGalleries);
// Public routes (for clients to access galleries)
router.get('/:id', galleryController_1.getGallery);
router.post('/:id/verify-password', galleryController_1.verifyGalleryPassword);
// Routes for liking and favoriting galleries
router.post('/:id/like', auth_1.authenticateToken, galleryController_1.likeGallery);
router.delete('/:id/like', auth_1.authenticateToken, galleryController_1.unlikeGallery);
router.post('/:id/favorite', auth_1.authenticateToken, galleryController_1.favoriteGallery);
router.delete('/:id/favorite', auth_1.authenticateToken, galleryController_1.unfavoriteGallery);
// Routes for managing client access to galleries - Admin can manage any gallery
router.put('/:id/access', auth_1.authenticateToken, auth_1.requireAdminOrOwner, (0, auditMiddleware_1.auditMiddleware)('UPDATE_GALLERY_ACCESS', 'gallery', {
    extractTargetId: (req) => req.params.id
}), galleryController_2.updateGalleryAccess);
router.get('/:id/allowed-clients', auth_1.authenticateToken, auth_1.requireAdminOrOwner, galleryController_2.getAllowedClients);
exports.default = router;
