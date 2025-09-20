import express from 'express'
import { authenticateAdmin, requireAdmin } from '../middleware/adminAuth'
import {
    getAllConfigurations,
    getConfiguration,
    updateConfiguration,
    updateMultipleConfigurations,
    resetConfiguration,
    getConfigurationHistory,
    exportConfiguration,
    importConfiguration,
    getConfigurationSchema
} from '../controllers/adminSystemConfigController'

const router = express.Router()

// Apply admin authentication to all routes
router.use(authenticateAdmin)
router.use(requireAdmin)

/**
 * @route GET /api/admin/system-config
 * @desc Get all system configurations
 * @access Admin only
 */
router.get('/', getAllConfigurations)

/**
 * @route GET /api/admin/system-config/schema
 * @desc Get configuration schema and validation rules
 * @access Admin only
 */
router.get('/schema', getConfigurationSchema)

/**
 * @route GET /api/admin/system-config/export
 * @desc Export system configuration as backup
 * @access Admin only
 */
router.get('/export', exportConfiguration)

/**
 * @route POST /api/admin/system-config/import
 * @desc Import system configuration from backup
 * @access Admin only
 */
router.post('/import', importConfiguration)

/**
 * @route POST /api/admin/system-config/bulk
 * @desc Update multiple configurations at once
 * @access Admin only
 */
router.post('/bulk', updateMultipleConfigurations)

/**
 * @route GET /api/admin/system-config/:configKey
 * @desc Get a specific configuration value
 * @access Admin only
 */
router.get('/:configKey', getConfiguration)

/**
 * @route PUT /api/admin/system-config/:configKey
 * @desc Update a specific configuration value
 * @access Admin only
 */
router.put('/:configKey', updateConfiguration)

/**
 * @route DELETE /api/admin/system-config/:configKey
 * @desc Reset configuration to default value
 * @access Admin only
 */
router.delete('/:configKey', resetConfiguration)

/**
 * @route GET /api/admin/system-config/:configKey/history
 * @desc Get configuration change history
 * @access Admin only
 */
router.get('/:configKey/history', getConfigurationHistory)

/**
 * @route GET /api/admin/system-config/history/all
 * @desc Get all configuration change history
 * @access Admin only
 */
router.get('/history/all', getConfigurationHistory)

export default router