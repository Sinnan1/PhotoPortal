"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const express_1 = tslib_1.__importDefault(require("express"));
const cors_1 = tslib_1.__importDefault(require("cors"));
const helmet_1 = tslib_1.__importDefault(require("helmet"));
const morgan_1 = tslib_1.__importDefault(require("morgan"));
const dotenv_1 = tslib_1.__importDefault(require("dotenv"));
const client_1 = require("@prisma/client");
// Import routes
const auth_1 = tslib_1.__importDefault(require("./routes/auth"));
const galleries_1 = tslib_1.__importDefault(require("./routes/galleries"));
const photos_1 = tslib_1.__importDefault(require("./routes/photos"));
// Load environment variables
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5000;
const prisma = new client_1.PrismaClient();
// Middleware
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)());
app.use((0, morgan_1.default)('combined'));
app.use(express_1.default.json({ limit: '50mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '50mb' }));
// Routes
app.use('/api/auth', auth_1.default);
app.use('/api/galleries', galleries_1.default);
app.use('/api/photos', photos_1.default);
// Basic route
app.get('/', (req, res) => {
    res.json({ message: 'Photo Gallery API is running!' });
});
// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});
// Test database connection
app.get('/test-db', async (req, res) => {
    try {
        const userCount = await prisma.user.count();
        res.json({
            message: 'Database connected!',
            userCount,
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        res.status(500).json({
            error: 'Database connection failed',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📍 Environment: ${process.env.NODE_ENV}`);
});
