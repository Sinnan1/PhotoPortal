import express from 'express'
import { authenticateAdmin } from '../middleware/adminAuth'
import {
  getSystemStats,
  getUserAnalytics,
  getStorageAnalytics,
  getSystemHealth,
  getSecurityLogs,
  getSystemAlerts,
  exportAnalyticsData
} from '../controllers/adminAnalyticsController'

const router = express.Router()

// Apply admin authentication to all routes
router.use(authenticateAdmin)

/**
 * @route GET /api/admin/analytics/system-stats
 * @desc Get comprehensive system statistics
 * @access Admin only
 */
router.get('/system-stats', getSystemStats)

/**
 * @route GET /api/admin/analytics/user-analytics
 * @desc Get user analytics with time-based filtering
 * @access Admin only
 * @query timeRange - 7d, 30d, 90d, 1y
 */
router.get('/user-analytics', getUserAnalytics)

/**
 * @route GET /api/admin/analytics/storage-analytics
 * @desc Get storage usage tracking and reporting
 * @access Admin only
 * @query timeRange - 7d, 30d, 90d, 1y
 */
router.get('/storage-analytics', getStorageAnalytics)

/**
 * @route GET /api/admin/analytics/system-health
 * @desc Get system health monitoring and performance metrics
 * @access Admin only
 */
router.get('/system-health', getSystemHealth)

/**
 * @route GET /api/admin/analytics/security-logs
 * @desc Get security event logging and suspicious activity detection
 * @access Admin only
 * @query timeRange - 24h, 7d, 30d, 90d
 * @query severity - LOW, MEDIUM, HIGH, CRITICAL
 * @query eventType - LOGIN_FAILED, UNAUTHORIZED, etc.
 * @query page - pagination page number
 * @query limit - pagination limit
 */
router.get('/security-logs', getSecurityLogs)

/**
 * @route GET /api/admin/analytics/system-alerts
 * @desc Get automated alert system for system limits and security events
 * @access Admin only
 * @query severity - LOW, MEDIUM, HIGH, CRITICAL
 * @query type - STORAGE, USER_LIMIT, SECURITY, PERFORMANCE
 * @query page - pagination page number
 * @query limit - pagination limit
 */
router.get('/system-alerts', getSystemAlerts)

/**
 * @route GET /api/admin/analytics/export
 * @desc Export analytics data for reporting
 * @access Admin only
 * @query type - system_overview, user_analytics, storage_analytics, security_logs
 * @query format - json, csv
 * @query timeRange - 7d, 30d, 90d, 1y
 */
router.get('/export', exportAnalyticsData)

export default router