import { Request, Response, NextFunction } from 'express';
import { AuditLogger } from '../utils/auditLogger';
import { AdminAuthRequest } from './adminAuth';

// Extend AdminAuthRequest interface to include audit logging context
declare module './adminAuth' {
  interface AdminAuthRequest {
    auditContext?: {
      adminId: string;
      action?: string;
      targetType?: 'user' | 'gallery' | 'photo' | 'system' | 'config';
      targetId?: string;
      details?: Record<string, any>;
    };
  }
}

/**
 * Middleware to automatically log admin actions
 */
export const auditMiddleware = (
  action: string,
  targetType: 'user' | 'gallery' | 'photo' | 'system' | 'config',
  options: {
    extractTargetId?: (req: AdminAuthRequest) => string | undefined;
    extractDetails?: (req: AdminAuthRequest, res: Response) => Record<string, any>;
    skipLogging?: (req: AdminAuthRequest, res: Response) => boolean;
  } = {}
) => {
  return async (req: AdminAuthRequest, res: Response, next: NextFunction) => {
    // Only set up audit context if we have a valid admin ID
    if (req.admin?.id) {
      req.auditContext = {
        adminId: req.admin.id,
        action,
        targetType,
        targetId: options.extractTargetId ? options.extractTargetId(req) : undefined,
      };
    }

    // Store original res.json to intercept response
    const originalJson = res.json;
    
    res.json = function (body: any) {
      // Log the action after successful response
      if (res.statusCode >= 200 && res.statusCode < 300) {
        // Don't block the response for logging
        setImmediate(async () => {
          try {
            // Only log if we have audit context (valid admin)
            if (!req.auditContext) {
              return;
            }

            if (options.skipLogging && options.skipLogging(req, res)) {
              return;
            }

            const details = options.extractDetails 
              ? options.extractDetails(req, res)
              : {
                  method: req.method,
                  url: req.originalUrl,
                  body: req.method !== 'GET' ? req.body : undefined,
                  query: req.query,
                  responseStatus: res.statusCode,
                };

            await AuditLogger.logAction({
              adminId: req.auditContext.adminId,
              action: req.auditContext.action!,
              targetType: req.auditContext.targetType!,
              targetId: req.auditContext.targetId,
              details,
              ipAddress: req.ip || req.connection.remoteAddress,
              userAgent: req.get('User-Agent'),
            });
          } catch (error) {
            console.error('Failed to log admin action:', error);
          }
        });
      }

      return originalJson.call(this, body);
    };

    next();
  };
};

/**
 * Manual audit logging helper for complex operations
 */
export const logAdminAction = async (
  req: AdminAuthRequest,
  action: string,
  targetType: 'user' | 'gallery' | 'photo' | 'system' | 'config',
  targetId?: string,
  details?: Record<string, any>
) => {
  if (!req.admin?.id) {
    console.warn('Attempted to log admin action without admin user context');
    return;
  }

  await AuditLogger.logAction({
    adminId: req.admin.id,
    action,
    targetType,
    targetId,
    details: {
      ...details,
      method: req.method,
      url: req.originalUrl,
    },
    ipAddress: req.ip || req.connection.remoteAddress,
    userAgent: req.get('User-Agent'),
  });
};

/**
 * Audit logging for bulk operations
 */
export const logBulkAdminAction = async (
  req: AdminAuthRequest,
  action: string,
  targetType: 'user' | 'gallery' | 'photo' | 'system' | 'config',
  targets: Array<{ id: string; details?: Record<string, any> }>,
  commonDetails?: Record<string, any>
) => {
  if (!req.admin?.id) {
    console.warn('Attempted to log bulk admin action without admin user context');
    return;
  }

  const baseEntry = {
    adminId: req.admin.id,
    action,
    targetType,
    ipAddress: req.ip || req.connection.remoteAddress,
    userAgent: req.get('User-Agent'),
  };

  // Log each target separately for better tracking
  const logPromises = targets.map(target => 
    AuditLogger.logAction({
      ...baseEntry,
      targetId: target.id,
      details: {
        ...commonDetails,
        ...target.details,
        method: req.method,
        url: req.originalUrl,
        bulkOperation: true,
        totalTargets: targets.length,
      },
    })
  );

  try {
    await Promise.all(logPromises);
  } catch (error) {
    console.error('Failed to log bulk admin action:', error);
  }
};

/**
 * Predefined audit middleware for common admin operations
 */
export const auditUserAction = (action: string) => 
  auditMiddleware(action, 'user', {
    extractTargetId: (req) => req.params.userId || req.params.id,
    extractDetails: (req) => ({
      method: req.method,
      url: req.originalUrl,
      userChanges: req.body,
      query: req.query,
    }),
  });

export const auditGalleryAction = (action: string) => 
  auditMiddleware(action, 'gallery', {
    extractTargetId: (req) => req.params.galleryId || req.params.id,
    extractDetails: (req) => ({
      method: req.method,
      url: req.originalUrl,
      galleryChanges: req.body,
      query: req.query,
    }),
  });

export const auditSystemAction = (action: string) => 
  auditMiddleware(action, 'system', {
    extractDetails: (req) => ({
      method: req.method,
      url: req.originalUrl,
      systemChanges: req.body,
      query: req.query,
    }),
  });

export const auditConfigAction = (action: string) => 
  auditMiddleware(action, 'config', {
    extractTargetId: (req) => req.params.configKey || req.body.configKey,
    extractDetails: (req) => ({
      method: req.method,
      url: req.originalUrl,
      configChanges: req.body,
      query: req.query,
    }),
  });