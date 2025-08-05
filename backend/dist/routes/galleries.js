"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const galleryController_1 = require("../controllers/galleryController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// Protected routes (require authentication)
router.post('/', auth_1.authenticateToken, (0, auth_1.requireRole)('PHOTOGRAPHER'), galleryController_1.createGallery);
router.get('/', auth_1.authenticateToken, (0, auth_1.requireRole)('PHOTOGRAPHER'), galleryController_1.getGalleries);
router.put('/:id', auth_1.authenticateToken, (0, auth_1.requireRole)('PHOTOGRAPHER'), galleryController_1.updateGallery);
router.delete('/:id', auth_1.authenticateToken, (0, auth_1.requireRole)('PHOTOGRAPHER'), galleryController_1.deleteGallery);
// Public routes (for clients to access galleries)
router.get('/:id', galleryController_1.getGallery);
router.post('/:id/verify-password', galleryController_1.verifyGalleryPassword);
exports.default = router;
