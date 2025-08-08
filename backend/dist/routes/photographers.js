"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const photographerController_1 = require("../controllers/photographerController");
const auth_1 = require("../middleware/auth");
const photographerController_2 = require("../controllers/photographerController");
const router = (0, express_1.Router)();
// Middleware to ensure the user is a photographer
router.use(auth_1.authenticateToken, (0, auth_1.requireRole)('PHOTOGRAPHER'));
// Routes for managing clients
router.post('/clients', photographerController_1.createClient);
router.get('/clients', photographerController_1.getClients);
router.delete('/clients/:id', photographerController_1.removeClient);
// Dashboard stats
router.get('/stats/totals', photographerController_2.getTotals);
router.get('/stats/most-liked-photos', photographerController_2.getMostLikedPhotos);
router.get('/stats/most-favorited-photos', photographerController_2.getMostFavoritedPhotos);
router.get('/stats/most-viewed-galleries', photographerController_2.getMostViewedGalleries);
exports.default = router;
