"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMostViewedGalleries = exports.getMostFavoritedPhotos = exports.getMostLikedPhotos = exports.getTotals = exports.removeClient = exports.getClients = exports.createClient = void 0;
const tslib_1 = require("tslib");
const bcryptjs_1 = tslib_1.__importDefault(require("bcryptjs"));
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const createClient = async (req, res) => {
    try {
        const { email, password, name } = req.body;
        const photographerId = req.user.id;
        // Validate input
        if (!email || !password || !name) {
            return res.status(400).json({
                success: false,
                error: 'Email, password, and name are required'
            });
        }
        // Check if client already exists
        const existingClient = await prisma.user.findUnique({
            where: { email }
        });
        if (existingClient) {
            return res.status(400).json({
                success: false,
                error: 'Client with this email already exists'
            });
        }
        // Hash password
        const hashedPassword = await bcryptjs_1.default.hash(password, 12);
        // Create client
        const client = await prisma.user.create({
            data: {
                email,
                password: hashedPassword,
                name,
                role: 'CLIENT',
                photographerId
            },
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                createdAt: true
            }
        });
        res.status(201).json({
            success: true,
            data: { client }
        });
    }
    catch (error) {
        console.error('Create client error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
};
exports.createClient = createClient;
const getClients = async (req, res) => {
    try {
        const photographerId = req.user.id;
        const clients = await prisma.user.findMany({
            where: { photographerId },
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                createdAt: true
            }
        });
        res.json({
            success: true,
            data: { clients }
        });
    }
    catch (error) {
        console.error('Get clients error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
};
exports.getClients = getClients;
const removeClient = async (req, res) => {
    try {
        const { id } = req.params;
        const photographerId = req.user.id;
        const client = await prisma.user.findFirst({
            where: { id, photographerId }
        });
        if (!client) {
            return res.status(404).json({
                success: false,
                error: 'Client not found or access denied'
            });
        }
        await prisma.user.delete({
            where: { id }
        });
        res.json({ success: true });
    }
    catch (error) {
        console.error('Remove client error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
};
exports.removeClient = removeClient;
const getTotals = async (req, res) => {
    try {
        const photographerId = req.user.id;
        const [photos, galleries, clients] = await Promise.all([
            prisma.photo.count({ where: { gallery: { photographerId } } }),
            prisma.gallery.count({ where: { photographerId } }),
            prisma.user.count({ where: { photographerId } })
        ]);
        res.json({ success: true, data: { photos, galleries, clients } });
    }
    catch (error) {
        console.error('Get totals error:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
};
exports.getTotals = getTotals;
const getMostLikedPhotos = async (req, res) => {
    try {
        const photographerId = req.user.id;
        const photos = await prisma.photo.findMany({
            where: { gallery: { photographerId } },
            orderBy: { likedBy: { _count: 'desc' } },
            take: 10,
            include: { _count: { select: { likedBy: true } } }
        });
        res.json({ success: true, data: photos });
    }
    catch (error) {
        console.error('Get most liked photos error:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
};
exports.getMostLikedPhotos = getMostLikedPhotos;
const getMostFavoritedPhotos = async (req, res) => {
    try {
        const photographerId = req.user.id;
        const photos = await prisma.photo.findMany({
            where: { gallery: { photographerId } },
            orderBy: { favoritedBy: { _count: 'desc' } },
            take: 10,
            include: { _count: { select: { favoritedBy: true } } }
        });
        res.json({ success: true, data: photos });
    }
    catch (error) {
        console.error('Get most favorited photos error:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
};
exports.getMostFavoritedPhotos = getMostFavoritedPhotos;
const getMostViewedGalleries = async (req, res) => {
    try {
        const photographerId = req.user.id;
        const galleries = await prisma.gallery.findMany({
            where: { photographerId },
            orderBy: { downloadCount: 'desc' },
            take: 10
        });
        res.json({ success: true, data: galleries });
    }
    catch (error) {
        console.error('Get most viewed galleries error:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
};
exports.getMostViewedGalleries = getMostViewedGalleries;
