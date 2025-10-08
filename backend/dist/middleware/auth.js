"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAdminOrOwner = exports.requireAnyRole = exports.requireRole = exports.authenticateToken = exports.AdminErrorType = void 0;
const tslib_1 = require("tslib");
const jsonwebtoken_1 = tslib_1.__importDefault(require("jsonwebtoken"));
const client_1 = require("@prisma/client");
const auditLogger_1 = require("../utils/auditLogger");
const prisma = new client_1.PrismaClient();
// Admin-specific error types
var AdminErrorType;
(function (AdminErrorType) {
    AdminErrorType["INSUFFICIENT_PERMISSIONS"] = "INSUFFICIENT_PERMISSIONS";
    AdminErrorType["ADMIN_SESSION_EXPIRED"] = "ADMIN_SESSION_EXPIRED";
    AdminErrorType["INVALID_ADMIN_ACTION"] = "INVALID_ADMIN_ACTION";
    AdminErrorType["SYSTEM_CONFIG_ERROR"] = "SYSTEM_CONFIG_ERROR";
    AdminErrorType["AUDIT_LOG_FAILURE"] = "AUDIT_LOG_FAILURE";
})(AdminErrorType || (exports.AdminErrorType = AdminErrorType = {}));
const authenticateToken = async (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
        if (!token) {
            res.status(401).json({
                success: false,
                error: 'Access token required'
            });
            return;
        }
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        // Get user from database to ensure they still exist
        const user = await prisma.user.findUnique({
            where: { id: decoded.userId },
            select: { id: true, email: true, role: true }
        });
        if (!user) {
            res.status(401).json({
                success: false,
                error: 'User not found'
            });
            return;
        }
        req.user = user;
        next();
    }
    catch (error) {
        res.status(403).json({
            success: false,
            error: 'Invalid or expired token'
        });
        return;
    }
};
exports.authenticateToken = authenticateToken;
const requireRole = (role) => {
    return (req, res, next) => {
        if (req.user?.role !== role) {
            // Log unauthorized access attempts for admin routes
            if (req.path.startsWith('/admin')) {
                auditLogger_1.AuditLogger.logAction({
                    adminId: req.user?.id || 'unknown',
                    action: 'UNAUTHORIZED_ADMIN_ACCESS_ATTEMPT',
                    targetType: 'system',
                    details: {
                        attemptedPath: req.path,
                        requiredRole: role,
                        userRole: req.user?.role
                    },
                    ipAddress: req.ip,
                    userAgent: req.get('User-Agent')
                });
            }
            res.status(403).json({
                success: false,
                error: 'Insufficient permissions',
                errorType: AdminErrorType.INSUFFICIENT_PERMISSIONS
            });
            return;
        }
        next();
    };
};
exports.requireRole = requireRole;
// Enhanced role checking that supports multiple roles
const requireAnyRole = (roles) => {
    return (req, res, next) => {
        if (!req.user?.role || !roles.includes(req.user.role)) {
            // Log unauthorized access attempts for admin routes
            if (req.path.startsWith('/admin')) {
                auditLogger_1.AuditLogger.logAction({
                    adminId: req.user?.id || 'unknown',
                    action: 'UNAUTHORIZED_ADMIN_ACCESS_ATTEMPT',
                    targetType: 'system',
                    details: {
                        attemptedPath: req.path,
                        requiredRoles: roles,
                        userRole: req.user?.role
                    },
                    ipAddress: req.ip,
                    userAgent: req.get('User-Agent')
                });
            }
            res.status(403).json({
                success: false,
                error: 'Insufficient permissions',
                errorType: AdminErrorType.INSUFFICIENT_PERMISSIONS
            });
            return;
        }
        next();
    };
};
exports.requireAnyRole = requireAnyRole;
// Admin-specific authentication that integrates with existing auth
const requireAdminOrOwner = (req, res, next) => {
    // Allow admin access to any resource
    if (req.user?.role === 'ADMIN') {
        return next();
    }
    // For non-admin users, check if they own the resource
    // This will be used in gallery and photo routes
    // const resourceUserId = req.params.userId || req.body.userId
    // if (resourceUserId && req.user?.id === resourceUserId) {
    // return next()
    //	}
    // Check if it's a photographer accessing their own galleries/photos
    if (req.user?.role === 'PHOTOGRAPHER') {
        return next(); // Let the specific controller handle ownership validation
    }
    res.status(403).json({
        success: false,
        error: 'Insufficient permissions - admin access or resource ownership required',
        errorType: AdminErrorType.INSUFFICIENT_PERMISSIONS
    });
    return;
};
exports.requireAdminOrOwner = requireAdminOrOwner;
