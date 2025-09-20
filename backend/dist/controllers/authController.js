"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getClientProfile = exports.clientLogin = exports.login = exports.register = void 0;
const tslib_1 = require("tslib");
const bcryptjs_1 = tslib_1.__importDefault(require("bcryptjs"));
const jsonwebtoken_1 = tslib_1.__importDefault(require("jsonwebtoken"));
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const register = async (req, res) => {
    try {
        const { email, password, name, role = 'CLIENT' } = req.body;
        // Validate input
        if (!email || !password || !name) {
            return res.status(400).json({
                success: false,
                error: 'Email, password, and name are required'
            });
        }
        // Validate role
        const validRoles = ['CLIENT', 'PHOTOGRAPHER'];
        if (!validRoles.includes(role.toUpperCase())) {
            return res.status(400).json({
                success: false,
                error: 'Invalid role specified'
            });
        }
        // Check if registration is enabled
        const registrationConfig = await prisma.systemConfig.findUnique({
            where: { configKey: 'registration.enabled' }
        });
        if (registrationConfig && !registrationConfig.configValue) {
            return res.status(403).json({
                success: false,
                error: 'Registration is currently disabled'
            });
        }
        // Check if user already exists
        const existingUser = await prisma.user.findUnique({
            where: { email }
        });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                error: 'User with this email already exists'
            });
        }
        // Check if approval is required for this role
        const requireApprovalConfig = await prisma.systemConfig.findUnique({
            where: { configKey: 'registration.requireApproval' }
        });
        const requiresApproval = requireApprovalConfig?.configValue === true && role.toUpperCase() === 'PHOTOGRAPHER';
        // Hash password
        const hashedPassword = await bcryptjs_1.default.hash(password, 12);
        // Create user with pending status if approval required
        const userData = {
            email,
            password: hashedPassword,
            name,
            role: role.toUpperCase(),
            ...(requiresApproval && {
                suspendedAt: new Date(),
                suspensionReason: 'Pending admin approval for photographer account'
            })
        };
        const user = await prisma.user.create({
            data: userData,
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                createdAt: true,
                suspendedAt: true,
                suspensionReason: true
            }
        });
        // If approval is required, don't generate token
        if (requiresApproval) {
            return res.status(201).json({
                success: true,
                data: {
                    user,
                    message: 'Account created successfully. Your photographer account is pending admin approval.',
                    requiresApproval: true
                }
            });
        }
        // Generate JWT token for approved accounts
        const token = jsonwebtoken_1.default.sign({ userId: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
        res.status(201).json({
            success: true,
            data: {
                user,
                token
            }
        });
    }
    catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
};
exports.register = register;
const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        // Validate input
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                error: 'Email and password are required'
            });
        }
        // Find user
        const user = await prisma.user.findUnique({
            where: { email }
        });
        if (!user) {
            return res.status(401).json({
                success: false,
                error: 'Invalid credentials'
            });
        }
        // Check if account is suspended
        if (user.suspendedAt) {
            return res.status(403).json({
                success: false,
                error: user.suspensionReason || 'Account suspended. Please contact support.',
                suspended: true
            });
        }
        // Check password
        const isValidPassword = await bcryptjs_1.default.compare(password, user.password);
        if (!isValidPassword) {
            return res.status(401).json({
                success: false,
                error: 'Invalid credentials'
            });
        }
        // Generate JWT token
        const token = jsonwebtoken_1.default.sign({ userId: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
        res.json({
            success: true,
            data: {
                user: {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    role: user.role
                },
                token
            }
        });
    }
    catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
};
exports.login = login;
const clientLogin = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ success: false, error: 'Email and password are required' });
        }
        const user = await prisma.user.findUnique({
            where: { email, role: 'CLIENT' }
        });
        if (!user) {
            return res.status(401).json({ success: false, error: 'Invalid credentials' });
        }
        // Check if account is suspended
        if (user.suspendedAt) {
            return res.status(403).json({
                success: false,
                error: user.suspensionReason || 'Account suspended. Please contact support.',
                suspended: true
            });
        }
        const isValidPassword = await bcryptjs_1.default.compare(password, user.password);
        if (!isValidPassword) {
            return res.status(401).json({ success: false, error: 'Invalid credentials' });
        }
        const token = jsonwebtoken_1.default.sign({ userId: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
        res.json({
            success: true,
            data: {
                user: {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    role: user.role
                },
                token
            }
        });
    }
    catch (error) {
        console.error('Client login error:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
};
exports.clientLogin = clientLogin;
const getClientProfile = async (req, res) => {
    try {
        const userId = req.user.id;
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                createdAt: true
            }
        });
        if (!user) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }
        res.json({ success: true, data: { user } });
    }
    catch (error) {
        console.error('Get client profile error:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
};
exports.getClientProfile = getClientProfile;
