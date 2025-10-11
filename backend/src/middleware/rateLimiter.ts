/**
 * Rate Limiting Middleware
 * Provides per-endpoint rate limiting for admin operations
 */

import { Request, Response, NextFunction } from 'express'
import { AdminAuthRequest } from './adminAuth'

// Rate limit storage (in production, use Redis)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>()

// Clean up expired rate limit entries every 5 minutes
setInterval(() => {
  const now = Date.now()
  for (const [key, data] of rateLimitStore.entries()) {
    if (data.resetTime < now) {
      rateLimitStore.delete(key)
    }
  }
}, 5 * 60 * 1000)

interface RateLimitOptions {
  windowMs: number;        // Time window in milliseconds
  maxRequests: number;     // Maximum requests per window
  skipSuccessfulRequests?: boolean; // Don't count successful requests
  skipFailedRequests?: boolean;     // Don't count failed requests
  keyGenerator?: (req: Request) => string; // Custom key generator
  message?: string;        // Custom error message
  skip?: (req: Request) => boolean; // Skip rate limiting condition
}

/**
 * Create a rate limiter middleware
 */
export const createRateLimiter = (options: RateLimitOptions) => {
  const {
    windowMs,
    maxRequests,
    skipSuccessfulRequests = false,
    skipFailedRequests = false,
    keyGenerator = (req: Request) => {
      // Default: use IP + user agent for anonymous, user ID for authenticated
      const adminReq = req as AdminAuthRequest
      if (adminReq.admin?.id) {
        return `admin:${adminReq.admin.id}`
      }
      return `ip:${req.ip}:${req.get('User-Agent')?.slice(0, 50) || 'unknown'}`
    },
    message = 'Too many requests, please try again later',
    skip = () => false
  } = options

  return (req: Request, res: Response, next: NextFunction) => {
    try {
      // Skip rate limiting if condition is met
      if (skip(req)) {
        return next()
      }

      const key = keyGenerator(req)
      const now = Date.now()
      const windowStart = now - windowMs

      // Get current rate limit data
      let rateLimitData = rateLimitStore.get(key)

      // Initialize or reset if window has expired
      if (!rateLimitData || rateLimitData.resetTime < now) {
        rateLimitData = {
          count: 0,
          resetTime: now + windowMs
        }
      }

      // Check if limit is exceeded
      if (rateLimitData.count >= maxRequests) {
        const resetTime = new Date(rateLimitData.resetTime)
        
        // Set rate limit headers
        res.setHeader('X-RateLimit-Limit', maxRequests)
        res.setHeader('X-RateLimit-Remaining', 0)
        res.setHeader('X-RateLimit-Reset', resetTime.toISOString())
        res.setHeader('Retry-After', Math.ceil((rateLimitData.resetTime - now) / 1000))

        return res.status(429).json({
          success: false,
          error: message,
          retryAfter: Math.ceil((rateLimitData.resetTime - now) / 1000),
          resetTime: resetTime.toISOString()
        })
      }

      // Increment counter
      rateLimitData.count++
      rateLimitStore.set(key, rateLimitData)

      // Set rate limit headers
      res.setHeader('X-RateLimit-Limit', maxRequests)
      res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - rateLimitData.count))
      res.setHeader('X-RateLimit-Reset', new Date(rateLimitData.resetTime).toISOString())

      // Store rate limit data for post-processing
      req.rateLimitData = rateLimitData

      next()

    } catch (error) {
      console.error('Rate limiting error:', error)
      next() // Continue on error to avoid blocking requests
    }
  }
}

/**
 * Post-processing middleware to handle successful/failed requests
 */
export const rateLimitPostProcessor = (req: Request, res: Response, next: NextFunction) => {
  const originalSend = res.send
  const originalJson = res.json

  // Override res.send to track response status
  res.send = function(body: any) {
    if (req.rateLimitData) {
      const isSuccess = res.statusCode >= 200 && res.statusCode < 400
      const isFailure = res.statusCode >= 400

      // Adjust count based on response status
      if (isSuccess && req.rateLimitOptions?.skipSuccessfulRequests) {
        req.rateLimitData.count = Math.max(0, req.rateLimitData.count - 1)
      } else if (isFailure && req.rateLimitOptions?.skipFailedRequests) {
        req.rateLimitData.count = Math.max(0, req.rateLimitData.count - 1)
      }
    }

    return originalSend.call(this, body)
  }

  // Override res.json to track response status
  res.json = function(body: any) {
    if (req.rateLimitData) {
      const isSuccess = res.statusCode >= 200 && res.statusCode < 400
      const isFailure = res.statusCode >= 400

      // Adjust count based on response status
      if (isSuccess && req.rateLimitOptions?.skipSuccessfulRequests) {
        req.rateLimitData.count = Math.max(0, req.rateLimitData.count - 1)
      } else if (isFailure && req.rateLimitOptions?.skipFailedRequests) {
        req.rateLimitData.count = Math.max(0, req.rateLimitData.count - 1)
      }
    }

    return originalJson.call(this, body)
  }

  next()
}

// Extend Request interface for rate limiting
declare global {
  namespace Express {
    interface Request {
      rateLimitData?: {
        count: number;
        resetTime: number;
      };
      rateLimitOptions?: {
        skipSuccessfulRequests?: boolean;
        skipFailedRequests?: boolean;
      };
    }
  }
}

/**
 * Predefined rate limiters for common admin operations
 */

// General admin operations - 100 requests per 15 minutes
export const adminGeneralLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 100,
  message: 'Too many admin requests, please slow down'
})

// Admin login attempts - 5 attempts per 15 minutes per IP
export const adminLoginLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 5,
  keyGenerator: (req) => `login:${req.ip}`,
  message: 'Too many login attempts, please try again later'
})

// User creation/management - 20 operations per hour
export const userManagementLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 20,
  message: 'Too many user management operations, please slow down'
})

// Gallery management - 30 operations per hour
export const galleryManagementLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 30,
  message: 'Too many gallery management operations, please slow down'
})

// System configuration changes - 10 changes per hour
export const systemConfigLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 10,
  message: 'Too many system configuration changes, please slow down'
})

// Analytics requests - 60 requests per 5 minutes
export const analyticsLimiter = createRateLimiter({
  windowMs: 5 * 60 * 1000, // 5 minutes
  maxRequests: 60,
  skipSuccessfulRequests: true, // Don't count successful analytics requests
  message: 'Too many analytics requests, please slow down'
})

// Password changes - 3 attempts per hour per admin
export const passwordChangeLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 3,
  keyGenerator: (req) => {
    const adminReq = req as AdminAuthRequest
    return `password:${adminReq.admin?.id || req.ip}`
  },
  message: 'Too many password change attempts, please try again later'
})

// Bulk operations - 5 operations per hour
export const bulkOperationLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 5,
  message: 'Too many bulk operations, please slow down'
})

// File uploads - 10 uploads per 5 minutes
export const fileUploadLimiter = createRateLimiter({
  windowMs: 5 * 60 * 1000, // 5 minutes
  maxRequests: 10,
  message: 'Too many file uploads, please slow down'
})

// Export operations - 3 exports per hour
export const exportLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 3,
  message: 'Too many export requests, please slow down'
})

/**
 * Get rate limit status for debugging
 */
export const getRateLimitStatus = (req: AdminAuthRequest, res: Response) => {
  try {
    const key = `admin:${req.admin?.id || req.ip}`
    const data = rateLimitStore.get(key)
    
    if (!data) {
      return res.json({
        success: true,
        data: {
          hasRateLimit: false,
          message: 'No rate limit data found'
        }
      })
    }

    const now = Date.now()
    const isExpired = data.resetTime < now
    
    res.json({
      success: true,
      data: {
        hasRateLimit: true,
        currentCount: data.count,
        resetTime: new Date(data.resetTime).toISOString(),
        timeRemaining: isExpired ? 0 : data.resetTime - now,
        isExpired
      }
    })

  } catch (error) {
    console.error('Rate limit status error:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to get rate limit status'
    })
  }
}

