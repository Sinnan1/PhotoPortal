/**
 * CSRF Protection Middleware
 * Provides Cross-Site Request Forgery protection for admin operations
 */

import { Request, Response, NextFunction } from 'express'
import crypto from 'crypto'
import { AdminAuthRequest } from './adminAuth'

// Store CSRF tokens in memory (in production, use Redis or database)
const csrfTokens = new Map<string, { token: string; expiresAt: Date; adminId: string }>()

// Token expiration time (30 minutes)
const TOKEN_EXPIRATION = 30 * 60 * 1000

// Clean up expired tokens every 5 minutes
setInterval(() => {
  const now = new Date()
  for (const [key, tokenData] of csrfTokens.entries()) {
    if (tokenData.expiresAt < now) {
      csrfTokens.delete(key)
    }
  }
}, 5 * 60 * 1000)

/**
 * Generate a CSRF token for the current admin session
 */
export const generateCSRFToken = async (req: AdminAuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.admin?.id) {
      return res.status(401).json({
        success: false,
        error: 'Admin authentication required'
      })
    }

    // Generate a cryptographically secure random token
    const token = crypto.randomBytes(32).toString('hex')
    const sessionKey = req.admin.sessionId || req.admin.id
    
    // Store token with expiration
    csrfTokens.set(sessionKey, {
      token,
      expiresAt: new Date(Date.now() + TOKEN_EXPIRATION),
      adminId: req.admin.id
    })

    // Set token in response header for frontend to use
    res.setHeader('X-CSRF-Token', token)

    res.json({
      success: true,
      data: {
        csrfToken: token,
        expiresAt: new Date(Date.now() + TOKEN_EXPIRATION)
      }
    })

  } catch (error) {
    console.error('CSRF token generation error:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to generate CSRF token'
    })
  }
}

/**
 * Validate CSRF token for admin operations
 */
export const validateCSRFToken = (req: AdminAuthRequest, res: Response, next: NextFunction) => {
  try {
    // Skip CSRF validation for GET requests
    if (req.method === 'GET') {
      return next()
    }

    if (!req.admin?.id) {
      return res.status(401).json({
        success: false,
        error: 'Admin authentication required'
      })
    }

    // Get CSRF token from header or body
    const csrfToken = req.headers['x-csrf-token'] as string || req.body._csrf

    if (!csrfToken) {
      return res.status(403).json({
        success: false,
        error: 'CSRF token required',
        errorCode: 'CSRF_TOKEN_MISSING'
      })
    }

    const sessionKey = req.admin.sessionId || req.admin.id
    const storedToken = csrfTokens.get(sessionKey)

    if (!storedToken) {
      return res.status(403).json({
        success: false,
        error: 'CSRF token not found or expired',
        errorCode: 'CSRF_TOKEN_NOT_FOUND'
      })
    }

    // Check if token has expired
    if (storedToken.expiresAt < new Date()) {
      csrfTokens.delete(sessionKey)
      return res.status(403).json({
        success: false,
        error: 'CSRF token expired',
        errorCode: 'CSRF_TOKEN_EXPIRED'
      })
    }

    // Validate token
    if (storedToken.token !== csrfToken) {
      return res.status(403).json({
        success: false,
        error: 'Invalid CSRF token',
        errorCode: 'CSRF_TOKEN_INVALID'
      })
    }

    // Verify admin ID matches
    if (storedToken.adminId !== req.admin.id) {
      return res.status(403).json({
        success: false,
        error: 'CSRF token admin mismatch',
        errorCode: 'CSRF_TOKEN_ADMIN_MISMATCH'
      })
    }

    // Token is valid, proceed
    next()

  } catch (error) {
    console.error('CSRF validation error:', error)
    res.status(500).json({
      success: false,
      error: 'CSRF validation failed'
    })
  }
}

/**
 * Revoke CSRF token (for logout)
 */
export const revokeCSRFToken = (req: AdminAuthRequest, res: Response, next: NextFunction) => {
  try {
    if (req.admin?.id) {
      const sessionKey = req.admin.sessionId || req.admin.id
      csrfTokens.delete(sessionKey)
    }
    next()
  } catch (error) {
    console.error('CSRF token revocation error:', error)
    next() // Continue even if revocation fails
  }
}

/**
 * Middleware to add CSRF token to response headers and cookies for admin routes
 */
export const addCSRFTokenToResponse = (req: AdminAuthRequest, res: Response, next: NextFunction) => {
  try {
    if (req.admin?.id) {
      const sessionKey = req.admin.sessionId || req.admin.id
      let storedToken = csrfTokens.get(sessionKey)
      
      // Generate new token if none exists or expired
      if (!storedToken || storedToken.expiresAt < new Date()) {
        const token = crypto.randomBytes(32).toString('hex')
        storedToken = {
          token,
          expiresAt: new Date(Date.now() + TOKEN_EXPIRATION),
          adminId: req.admin.id
        }
        csrfTokens.set(sessionKey, storedToken)
      }
      
      // Set token in both header and cookie
      res.setHeader('X-CSRF-Token', storedToken.token)
      res.cookie('csrf-token', storedToken.token, {
        httpOnly: false, // Allow JavaScript to read it
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: TOKEN_EXPIRATION
      })
    }
    next()
  } catch (error) {
    console.error('Error adding CSRF token to response:', error)
    next() // Continue even if adding token fails
  }
}

/**
 * Get CSRF token status for debugging
 */
export const getCSRFTokenStatus = (req: AdminAuthRequest, res: Response) => {
  try {
    if (!req.admin?.id) {
      return res.status(401).json({
        success: false,
        error: 'Admin authentication required'
      })
    }

    const sessionKey = req.admin.sessionId || req.admin.id
    const storedToken = csrfTokens.get(sessionKey)

    if (!storedToken) {
      return res.json({
        success: true,
        data: {
          hasToken: false,
          message: 'No CSRF token found'
        }
      })
    }

    const isExpired = storedToken.expiresAt < new Date()
    
    res.json({
      success: true,
      data: {
        hasToken: true,
        isExpired,
        expiresAt: storedToken.expiresAt,
        timeRemaining: isExpired ? 0 : storedToken.expiresAt.getTime() - Date.now()
      }
    })

  } catch (error) {
    console.error('CSRF token status error:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to get CSRF token status'
    })
  }
}

