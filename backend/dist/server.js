"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const express_1 = tslib_1.__importDefault(require("express"));
const cors_1 = tslib_1.__importDefault(require("cors"));
const helmet_1 = tslib_1.__importDefault(require("helmet"));
const morgan_1 = tslib_1.__importDefault(require("morgan"));
const dotenv_1 = tslib_1.__importDefault(require("dotenv"));
const client_1 = require("@prisma/client");
const uploadConfig_1 = require("./config/uploadConfig");
// Import routes
const auth_1 = tslib_1.__importDefault(require("./routes/auth"));
const adminAuth_1 = tslib_1.__importDefault(require("./routes/adminAuth"));
const adminUsers_1 = tslib_1.__importDefault(require("./routes/adminUsers"));
const adminGalleries_1 = tslib_1.__importDefault(require("./routes/adminGalleries"));
const adminAnalytics_1 = tslib_1.__importDefault(require("./routes/adminAnalytics"));
const adminSystemConfig_1 = tslib_1.__importDefault(require("./routes/adminSystemConfig"));
const adminInvitations_1 = tslib_1.__importDefault(require("./routes/adminInvitations"));
const audit_1 = tslib_1.__importDefault(require("./routes/audit"));
const galleries_1 = tslib_1.__importDefault(require("./routes/galleries"));
const photos_1 = tslib_1.__importDefault(require("./routes/photos"));
const photographers_1 = tslib_1.__importDefault(require("./routes/photographers"));
const uploads_1 = tslib_1.__importDefault(require("./routes/uploads"));
const folders_1 = tslib_1.__importDefault(require("./routes/folders"));
const selectionAnalytics_1 = tslib_1.__importDefault(require("./routes/selectionAnalytics"));
// Import admin session manager
const adminSessionManager_1 = require("./utils/adminSessionManager");
// Load environment variables
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5000;
const prisma = new client_1.PrismaClient();
// Enhanced middleware for photo uploads
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)({
    origin: process.env.NODE_ENV === 'production'
        ? ['https://your-production-domain.com']
        : ['http://localhost:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept']
}));
app.use((0, morgan_1.default)('combined'));
// Increased limits for batch photo uploads - using unified config
const EXPRESS_BODY_LIMIT = `${Math.ceil(uploadConfig_1.UPLOAD_CONFIG.MAX_FILE_SIZE / (1024 * 1024))}mb`;
app.use(express_1.default.json({ limit: EXPRESS_BODY_LIMIT }));
app.use(express_1.default.urlencoded({ extended: true, limit: EXPRESS_BODY_LIMIT }));
// Enhanced timeout middleware for upload and download operations
app.use((req, res, next) => {
    // Set longer timeouts for upload routes
    if (req.path.includes('/upload') || req.method === 'POST' && req.path.includes('/photos')) {
        req.setTimeout(uploadConfig_1.UPLOAD_CONFIG.UPLOAD_TIMEOUT);
        res.setTimeout(uploadConfig_1.UPLOAD_CONFIG.UPLOAD_TIMEOUT);
        console.log(`Extended timeout set for upload request: ${req.path}`);
    }
    // Set longer timeouts for download routes
    else if (req.path.includes('/download') || req.path.includes('/photos/gallery/')) {
        req.setTimeout(30 * 60 * 1000); // 30 minutes for downloads
        res.setTimeout(30 * 60 * 1000);
        console.log(`Extended timeout set for download request: ${req.path}`);
    }
    else {
        req.setTimeout(30 * 1000); // 30 seconds for other requests
        res.setTimeout(30 * 1000);
    }
    next();
});
// Request logging middleware for monitoring uploads
app.use((req, res, next) => {
    // Log upload requests with more detail
    if (req.path.includes('/upload')) {
        console.log(`📤 Upload request started: ${req.method} ${req.path}`);
        console.log(`� Contaent-Length: ${req.headers['content-length'] || 'unknown'}`);
        // Track request completion
        const startTime = Date.now();
        const originalSend = res.send;
        res.send = function (data) {
            const duration = Date.now() - startTime;
            console.log(`✅ Upload request completed in ${duration}ms`);
            return originalSend.call(this, data);
        };
    }
    next();
});
// Routes
app.use('/api/auth', auth_1.default);
app.use('/api/admin/auth', adminAuth_1.default);
app.use('/api/admin/users', adminUsers_1.default);
app.use('/api/admin/galleries', adminGalleries_1.default);
app.use('/api/admin/analytics', adminAnalytics_1.default);
app.use('/api/admin/system-config', adminSystemConfig_1.default);
app.use('/api/admin/invitations', adminInvitations_1.default);
app.use('/api/admin/audit', audit_1.default);
app.use('/api/galleries', galleries_1.default);
app.use('/api/photos', photos_1.default);
app.use('/api/photographers', photographers_1.default);
app.use('/api/uploads', uploads_1.default);
app.use('/api/folders', folders_1.default);
app.use('/api/analytics', selectionAnalytics_1.default);
// Upload configuration endpoint for frontend - using unified config
app.get('/api/upload-config', (req, res) => {
    res.json({
        success: true,
        data: (0, uploadConfig_1.getUploadConfigForClient)()
    });
});
// System health endpoint with more detailed info
app.get('/api/system-status', (req, res) => {
    const memoryUsage = process.memoryUsage();
    const uptime = process.uptime();
    res.json({
        success: true,
        data: {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            uptime: Math.floor(uptime),
            uptimeFormatted: `${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m`,
            memory: {
                used: Math.round(memoryUsage.heapUsed / 1024 / 1024),
                total: Math.round(memoryUsage.heapTotal / 1024 / 1024),
                external: Math.round(memoryUsage.external / 1024 / 1024),
                unit: 'MB'
            },
            environment: process.env.NODE_ENV || 'development'
        }
    });
});
// Basic route
app.get('/', (req, res) => {
    res.json({
        message: 'Photo Gallery API is running!',
        version: '2.0.0',
        features: ['high-volume uploads (2000 files)', 'raw file support', 'async thumbnails', 'upload sessions'],
        endpoints: {
            upload: '/api/uploads/multipart/*',
            config: '/api/upload-config',
            health: '/api/system-status'
        }
    });
});
// Health check endpoints (both paths for compatibility)
app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});
// Enhanced database test with more info
app.get('/test-db', async (req, res) => {
    try {
        const startTime = Date.now();
        const [userCount, galleryCount, photoCount] = await Promise.all([
            prisma.user.count(),
            prisma.gallery.count(),
            prisma.photo.count()
        ]);
        const queryTime = Date.now() - startTime;
        res.json({
            success: true,
            message: 'Database connected successfully!',
            data: {
                users: userCount,
                galleries: galleryCount,
                photos: photoCount,
                queryTime: `${queryTime}ms`
            },
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: 'Database connection failed',
            details: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString()
        });
    }
});
// Global error handler for upload errors
app.use((err, req, res, next) => {
    console.error('❌ Global error handler:', err);
    // Handle specific upload errors
    if (err.type === 'entity.too.large') {
        return res.status(413).json({
            success: false,
            error: 'Request too large. Please reduce file sizes or batch size.',
            maxSize: EXPRESS_BODY_LIMIT
        });
    }
    if (err.code === 'ECONNRESET' || err.code === 'ETIMEDOUT') {
        return res.status(408).json({
            success: false,
            error: 'Upload timeout. Please try with fewer files or check your connection.'
        });
    }
    // Generic error
    res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
    });
});
// Graceful shutdown handling
process.on('SIGTERM', async () => {
    console.log('🔄 Received SIGTERM, shutting down gracefully...');
    await prisma.$disconnect();
    process.exit(0);
});
process.on('SIGINT', async () => {
    console.log('🔄 Received SIGINT, shutting down gracefully...');
    await prisma.$disconnect();
    process.exit(0);
});
// Export app for testing
exports.default = app;
app.listen(PORT, async () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`📦 Features: High-volume uploads (2000 files), RAW support, Async thumbnails`);
    console.log(`⏰ Upload timeout: ${uploadConfig_1.UPLOAD_CONFIG.UPLOAD_TIMEOUT / 60000} minutes`);
    console.log(`💾 Max file size: ${uploadConfig_1.UPLOAD_CONFIG.MAX_FILE_SIZE / (1024 * 1024)}MB`);
    console.log(`📁 Max files per session: ${uploadConfig_1.UPLOAD_CONFIG.MAX_FILES_PER_SESSION}`);
    console.log(`🔗 Upload config: http://localhost:${PORT}/api/upload-config`);
    console.log(`�  Admin auth: http://localhost:${PORT}/api/admin/auth`);
    // Start admin session cleanup
    adminSessionManager_1.adminSessionManager.startAutomaticCleanup();
    console.log(`🧹 Admin session cleanup started`);
    // Start upload session cleanup
    const { uploadSessionService } = await Promise.resolve().then(() => tslib_1.__importStar(require('./services/uploadSessionService')));
    setInterval(() => {
        uploadSessionService.cleanupOldSessions(uploadConfig_1.UPLOAD_CONFIG.SESSION_RETENTION_DAYS);
    }, uploadConfig_1.UPLOAD_CONFIG.CLEANUP_OLD_SESSIONS_INTERVAL);
    console.log(`🧹 Upload session cleanup started (runs every ${uploadConfig_1.UPLOAD_CONFIG.CLEANUP_OLD_SESSIONS_INTERVAL / (24 * 60 * 60 * 1000)} days)`);
});
