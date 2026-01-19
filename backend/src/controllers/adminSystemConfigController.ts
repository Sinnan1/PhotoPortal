import { Response } from 'express'
import { PrismaClient } from '@prisma/client'
import { AdminAuthRequest } from '../middleware/adminAuth'
import { logAdminAction } from '../middleware/auditMiddleware'

// Allow dependency injection for testing
let prisma: PrismaClient

// Initialize Prisma client
if (process.env.NODE_ENV === 'test') {
    // In test environment, prisma will be injected
    prisma = {} as PrismaClient
} else {
    prisma = new PrismaClient()
}

// Function to set prisma instance (for testing)
export const setPrismaInstance = (instance: PrismaClient) => {
    prisma = instance
}

/**
 * Interface for system configuration
 */
interface SystemConfigValue {
    [key: string]: any
}

/**
 * Interface for configuration validation rules
 */
interface ConfigValidationRule {
    type: 'string' | 'number' | 'boolean' | 'object' | 'array'
    required?: boolean
    min?: number
    max?: number
    enum?: string[]
    pattern?: string
    description?: string
}

/**
 * Configuration schema definitions
 */
const CONFIG_SCHEMA: Record<string, ConfigValidationRule> = {
    // Storage settings
    'storage.maxFileSize': {
        type: 'number',
        required: true,
        min: 1,
        max: 1000,
        description: 'Maximum file size in MB'
    },
    'storage.maxStoragePerUser': {
        type: 'number',
        required: true,
        min: 100,
        max: 100000,
        description: 'Maximum storage per user in MB'
    },
    'storage.allowedFileTypes': {
        type: 'array',
        required: true,
        description: 'Allowed file types for uploads'
    },

    // Security settings
    'security.sessionTimeout': {
        type: 'number',
        required: true,
        min: 15,
        max: 1440,
        description: 'Session timeout in minutes'
    },
    'security.adminSessionTimeout': {
        type: 'number',
        required: true,
        min: 15,
        max: 480,
        description: 'Admin session timeout in minutes'
    },
    'security.maxLoginAttempts': {
        type: 'number',
        required: true,
        min: 3,
        max: 10,
        description: 'Maximum login attempts before lockout'
    },
    'security.lockoutDuration': {
        type: 'number',
        required: true,
        min: 5,
        max: 60,
        description: 'Account lockout duration in minutes'
    },

    // User registration settings
    'registration.enabled': {
        type: 'boolean',
        required: true,
        description: 'Enable public user registration'
    },
    'registration.requireApproval': {
        type: 'boolean',
        required: true,
        description: 'Require admin approval for new registrations'
    },
    'registration.defaultRole': {
        type: 'string',
        required: true,
        enum: ['CLIENT', 'PHOTOGRAPHER'],
        description: 'Default role for new registrations'
    },

    // Gallery settings
    'gallery.defaultExpirationDays': {
        type: 'number',
        required: false,
        min: 1,
        max: 365,
        description: 'Default gallery expiration in days'
    },
    'gallery.maxPhotosPerGallery': {
        type: 'number',
        required: true,
        min: 10,
        max: 10000,
        description: 'Maximum photos per gallery'
    },
    'gallery.defaultDownloadLimit': {
        type: 'number',
        required: false,
        min: 0,
        max: 1000,
        description: 'Default download limit per gallery (0 = unlimited)'
    },

    // Download settings
    'download.mode': {
        type: 'string',
        required: true,
        enum: ['single', 'multipart'],
        description: 'Download mode (single zip or split multipart zips)'
    },
    'download.chunkSize': {
        type: 'number',
        required: true,
        min: 100,
        max: 10000,
        description: 'Multipart chunk size in MB'
    },

    // Upload settings
    'upload.compressionEnabled': {
        type: 'boolean',
        required: true,
        description: 'Enable compression option for photographers'
    },
    'upload.compressionQuality': {
        type: 'number',
        required: true,
        min: 10,
        max: 100,
        description: 'Compression quality percentage (10-100, higher = better quality, less compression)'
    },

    // Branding settings
    'branding.siteName': {
        type: 'string',
        required: true,
        description: 'Site name displayed in header'
    },
    'branding.logoUrl': {
        type: 'string',
        required: false,
        description: 'URL to site logo'
    },
    'branding.primaryColor': {
        type: 'string',
        required: false,
        pattern: '^#[0-9A-Fa-f]{6}$',
        description: 'Primary brand color (hex format)'
    },
    'branding.secondaryColor': {
        type: 'string',
        required: false,
        pattern: '^#[0-9A-Fa-f]{6}$',
        description: 'Secondary brand color (hex format)'
    },

    // Email settings
    'email.fromAddress': {
        type: 'string',
        required: true,
        description: 'Default from email address'
    },
    'email.fromName': {
        type: 'string',
        required: true,
        description: 'Default from name'
    },
    'email.notificationsEnabled': {
        type: 'boolean',
        required: true,
        description: 'Enable email notifications'
    }
}

/**
 * Default configuration values
 */
const DEFAULT_CONFIG: Record<string, any> = {
    'storage.maxFileSize': 50,
    'storage.maxStoragePerUser': 5000,
    'storage.allowedFileTypes': ['jpg', 'jpeg', 'png', 'gif', 'webp', 'tiff', 'bmp'],
    'security.sessionTimeout': 480,
    'security.adminSessionTimeout': 120,
    'security.maxLoginAttempts': 5,
    'security.lockoutDuration': 15,
    'registration.enabled': true,
    'registration.requireApproval': false,
    'registration.defaultRole': 'CLIENT',
    'gallery.maxPhotosPerGallery': 1000,
    'gallery.defaultDownloadLimit': 0,
    'download.mode': 'single',
    'download.chunkSize': 2000,
    'upload.compressionEnabled': true,
    'upload.compressionQuality': 90,
    'branding.siteName': 'Yarrow Weddings & Co.',
    'email.notificationsEnabled': true
}

/**
 * Validate configuration value against schema
 */
const validateConfigValue = (key: string, value: any): { valid: boolean; error?: string } => {
    const rule = CONFIG_SCHEMA[key]
    if (!rule) {
        return { valid: false, error: 'Unknown configuration key' }
    }

    // Check required
    if (rule.required && (value === null || value === undefined)) {
        return { valid: false, error: 'Value is required' }
    }

    // Skip validation if value is null/undefined and not required
    if (!rule.required && (value === null || value === undefined)) {
        return { valid: true }
    }

    // Type validation
    switch (rule.type) {
        case 'string':
            if (typeof value !== 'string') {
                return { valid: false, error: 'Value must be a string' }
            }
            if (rule.pattern && !new RegExp(rule.pattern).test(value)) {
                return { valid: false, error: 'Value does not match required pattern' }
            }
            if (rule.enum && !rule.enum.includes(value)) {
                return { valid: false, error: `Value must be one of: ${rule.enum.join(', ')}` }
            }
            break

        case 'number':
            if (typeof value !== 'number' || isNaN(value)) {
                return { valid: false, error: 'Value must be a number' }
            }
            if (rule.min !== undefined && value < rule.min) {
                return { valid: false, error: `Value must be at least ${rule.min}` }
            }
            if (rule.max !== undefined && value > rule.max) {
                return { valid: false, error: `Value must be at most ${rule.max}` }
            }
            break

        case 'boolean':
            if (typeof value !== 'boolean') {
                return { valid: false, error: 'Value must be a boolean' }
            }
            break

        case 'array':
            if (!Array.isArray(value)) {
                return { valid: false, error: 'Value must be an array' }
            }
            break

        case 'object':
            if (typeof value !== 'object' || Array.isArray(value) || value === null) {
                return { valid: false, error: 'Value must be an object' }
            }
            break
    }

    return { valid: true }
}

/**
 * Get all system configuration settings
 * Requirements: 6.1 - Provide configuration options for upload limits, storage settings, and security policies
 */
export const getAllConfigurations = async (req: AdminAuthRequest, res: Response) => {
    try {
        const adminId = req.admin!.id

        // Get all configurations from database
        const configs = await prisma.systemConfig.findMany({
            select: {
                configKey: true,
                configValue: true,
                updatedAt: true,
                updatedByUser: {
                    select: {
                        name: true,
                        email: true
                    }
                }
            },
            orderBy: { configKey: 'asc' }
        })

        // Convert to key-value format and merge with defaults
        const configMap: Record<string, any> = {}
        const configMetadata: Record<string, any> = {}

        // Add defaults first
        Object.keys(DEFAULT_CONFIG).forEach(key => {
            configMap[key] = DEFAULT_CONFIG[key]
            configMetadata[key] = {
                isDefault: true,
                schema: CONFIG_SCHEMA[key]
            }
        })

        // Override with database values
        configs.forEach(config => {
            configMap[config.configKey] = config.configValue
            configMetadata[config.configKey] = {
                isDefault: false,
                updatedAt: config.updatedAt,
                updatedBy: config.updatedByUser,
                schema: CONFIG_SCHEMA[config.configKey]
            }
        })

        // Group configurations by category
        const groupedConfigs: Record<string, Record<string, any>> = {
            storage: {},
            security: {},
            registration: {},
            gallery: {},
            download: {},
            upload: {},
            branding: {},
            email: {}
        }

        Object.keys(configMap).forEach(key => {
            const category = key.split('.')[0]
            if (groupedConfigs[category] !== undefined) {
                groupedConfigs[category][key] = {
                    value: configMap[key],
                    metadata: configMetadata[key]
                }
            }
        })

        // Log admin action
        await logAdminAction(
            req,
            'VIEW_SYSTEM_CONFIG',
            'system',
            undefined,
            { configCount: Object.keys(configMap).length }
        )

        res.json({
            success: true,
            data: {
                configurations: configMap,
                metadata: configMetadata,
                grouped: groupedConfigs,
                schema: CONFIG_SCHEMA
            }
        })
    } catch (error) {
        console.error('Get all configurations error:', error)
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve system configurations'
        })
    }
}

/**
 * Get a specific configuration value
 * Requirements: 6.1 - System configuration storage and retrieval
 */
export const getConfiguration = async (req: AdminAuthRequest, res: Response) => {
    try {
        const configKey = req.params.configKey as string
        const adminId = req.admin!.id

        if (!configKey) {
            return res.status(400).json({
                success: false,
                error: 'Configuration key is required'
            })
        }

        // Check if key exists in schema
        if (!CONFIG_SCHEMA[configKey] && !DEFAULT_CONFIG[configKey]) {
            return res.status(404).json({
                success: false,
                error: 'Configuration key not found'
            })
        }

        // Try to get from database first
        const config = await prisma.systemConfig.findUnique({
            where: { configKey },
            include: {
                updatedByUser: {
                    select: {
                        name: true,
                        email: true
                    }
                }
            }
        })

        let value: any
        let metadata: any

        if (config) {
            value = config.configValue
            metadata = {
                isDefault: false,
                updatedAt: config.updatedAt,
                updatedBy: config.updatedByUser,
                schema: CONFIG_SCHEMA[configKey]
            }
        } else {
            // Return default value
            value = DEFAULT_CONFIG[configKey]
            metadata = {
                isDefault: true,
                schema: CONFIG_SCHEMA[configKey]
            }
        }

        // Log admin action
        await logAdminAction(
            req,
            'VIEW_CONFIG_VALUE',
            'system',
            configKey,
            { configKey }
        )

        res.json({
            success: true,
            data: {
                key: configKey,
                value,
                metadata
            }
        })
    } catch (error) {
        console.error('Get configuration error:', error)
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve configuration'
        })
    }
}

/**
 * Update system configuration with validation
 * Requirements: 6.2 - Validate changes and apply them without requiring system restart
 */
export const updateConfiguration = async (req: AdminAuthRequest, res: Response) => {
    try {
        const configKey = req.params.configKey as string
        const { value, reason } = req.body
        const adminId = req.admin!.id

        if (!configKey) {
            return res.status(400).json({
                success: false,
                error: 'Configuration key is required'
            })
        }

        // Validate configuration key exists
        if (!CONFIG_SCHEMA[configKey]) {
            return res.status(404).json({
                success: false,
                error: 'Configuration key not found'
            })
        }

        // Validate the new value
        const validation = validateConfigValue(configKey, value)
        if (!validation.valid) {
            return res.status(400).json({
                success: false,
                error: `Invalid configuration value: ${validation.error}`
            })
        }

        // Get current value for logging
        const currentConfig = await prisma.systemConfig.findUnique({
            where: { configKey }
        })

        const oldValue = currentConfig?.configValue || DEFAULT_CONFIG[configKey]

        // Update or create configuration
        const updatedConfig = await prisma.systemConfig.upsert({
            where: { configKey },
            update: {
                configValue: value,
                updatedBy: adminId,
                updatedAt: new Date()
            },
            create: {
                configKey,
                configValue: value,
                updatedBy: adminId
            },
            include: {
                updatedByUser: {
                    select: {
                        name: true,
                        email: true
                    }
                }
            }
        })

        // Log admin action
        await logAdminAction(
            req,
            'UPDATE_SYSTEM_CONFIG',
            'system',
            configKey,
            {
                configKey,
                oldValue,
                newValue: value,
                reason: reason || 'No reason provided'
            }
        )

        res.json({
            success: true,
            data: {
                configuration: {
                    key: configKey,
                    value: updatedConfig.configValue,
                    updatedAt: updatedConfig.updatedAt,
                    updatedBy: updatedConfig.updatedByUser
                }
            },
            message: 'Configuration updated successfully'
        })
    } catch (error) {
        console.error('Update configuration error:', error)
        res.status(500).json({
            success: false,
            error: 'Failed to update configuration'
        })
    }
}

/**
 * Update multiple configurations at once
 * Requirements: 6.2 - Safe update mechanisms
 */
export const updateMultipleConfigurations = async (req: AdminAuthRequest, res: Response) => {
    try {
        const { configurations, reason } = req.body
        const adminId = req.admin!.id

        if (!configurations || typeof configurations !== 'object') {
            return res.status(400).json({
                success: false,
                error: 'Configurations object is required'
            })
        }

        const configKeys = Object.keys(configurations)
        if (configKeys.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'At least one configuration must be provided'
            })
        }

        // Validate all configurations first
        const validationErrors: Record<string, string> = {}
        for (const key of configKeys) {
            if (!CONFIG_SCHEMA[key]) {
                validationErrors[key] = 'Unknown configuration key'
                continue
            }

            const validation = validateConfigValue(key, configurations[key])
            if (!validation.valid) {
                validationErrors[key] = validation.error!
            }
        }

        if (Object.keys(validationErrors).length > 0) {
            return res.status(400).json({
                success: false,
                error: 'Configuration validation failed',
                details: validationErrors
            })
        }

        // Get current values for logging
        const currentConfigs = await prisma.systemConfig.findMany({
            where: {
                configKey: { in: configKeys }
            }
        })

        const currentValues: Record<string, any> = {}
        currentConfigs.forEach(config => {
            currentValues[config.configKey] = config.configValue
        })

        // Add default values for keys not in database
        configKeys.forEach(key => {
            if (!currentValues[key]) {
                currentValues[key] = DEFAULT_CONFIG[key]
            }
        })

        // Update all configurations in a transaction
        const updatedConfigs = await prisma.$transaction(
            configKeys.map(key =>
                prisma.systemConfig.upsert({
                    where: { configKey: key },
                    update: {
                        configValue: configurations[key],
                        updatedBy: adminId,
                        updatedAt: new Date()
                    },
                    create: {
                        configKey: key,
                        configValue: configurations[key],
                        updatedBy: adminId
                    }
                })
            )
        )

        // Log admin action
        await logAdminAction(
            req,
            'UPDATE_MULTIPLE_CONFIGS',
            'system',
            undefined,
            {
                configKeys,
                oldValues: currentValues,
                newValues: configurations,
                reason: reason || 'No reason provided'
            }
        )

        res.json({
            success: true,
            data: {
                updatedConfigurations: updatedConfigs.map(config => ({
                    key: config.configKey,
                    value: config.configValue,
                    updatedAt: config.updatedAt
                }))
            },
            message: `${configKeys.length} configurations updated successfully`
        })
    } catch (error) {
        console.error('Update multiple configurations error:', error)
        res.status(500).json({
            success: false,
            error: 'Failed to update configurations'
        })
    }
}

/**
 * Reset configuration to default value
 * Requirements: 6.6 - Configuration change logging and rollback capabilities
 */
export const resetConfiguration = async (req: AdminAuthRequest, res: Response) => {
    try {
        const configKey = req.params.configKey as string
        const { reason } = req.body
        const adminId = req.admin!.id

        if (!configKey) {
            return res.status(400).json({
                success: false,
                error: 'Configuration key is required'
            })
        }

        // Check if key exists in schema
        if (!CONFIG_SCHEMA[configKey] || !DEFAULT_CONFIG[configKey]) {
            return res.status(404).json({
                success: false,
                error: 'Configuration key not found or has no default value'
            })
        }

        // Get current value for logging
        const currentConfig = await prisma.systemConfig.findUnique({
            where: { configKey }
        })

        const oldValue = currentConfig?.configValue || DEFAULT_CONFIG[configKey]
        const defaultValue = DEFAULT_CONFIG[configKey]

        // Delete the configuration to revert to default
        if (currentConfig) {
            await prisma.systemConfig.delete({
                where: { configKey }
            })
        }

        // Log admin action
        await logAdminAction(
            req,
            'RESET_CONFIG_TO_DEFAULT',
            'system',
            configKey,
            {
                configKey,
                oldValue,
                defaultValue,
                reason: reason || 'No reason provided'
            }
        )

        res.json({
            success: true,
            data: {
                configuration: {
                    key: configKey,
                    value: defaultValue,
                    isDefault: true
                }
            },
            message: 'Configuration reset to default value'
        })
    } catch (error) {
        console.error('Reset configuration error:', error)
        res.status(500).json({
            success: false,
            error: 'Failed to reset configuration'
        })
    }
}

/**
 * Get configuration change history
 * Requirements: 6.5 - Configuration change logging
 */
export const getConfigurationHistory = async (req: AdminAuthRequest, res: Response) => {
    try {
        const configKey = req.params.configKey as string
        const { page = 1, limit = 20 } = req.query
        const adminId = req.admin!.id

        // Build filter for audit logs
        const where: any = {
            action: {
                in: ['UPDATE_SYSTEM_CONFIG', 'UPDATE_MULTIPLE_CONFIGS', 'RESET_CONFIG_TO_DEFAULT']
            }
        }

        if (configKey) {
            where.OR = [
                { targetId: configKey },
                {
                    details: {
                        path: ['configKey'],
                        equals: configKey
                    }
                },
                {
                    details: {
                        path: ['configKeys'],
                        array_contains: [configKey]
                    }
                }
            ]
        }

        // Calculate pagination
        const skip = (Number(page) - 1) * Number(limit)
        const take = Number(limit)

        // Get configuration change history
        const [history, totalCount] = await Promise.all([
            prisma.adminAuditLog.findMany({
                where,
                include: {
                    admin: {
                        select: {
                            name: true,
                            email: true
                        }
                    }
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take
            }),
            prisma.adminAuditLog.count({ where })
        ])

        // Log admin action
        await logAdminAction(
            req,
            'VIEW_CONFIG_HISTORY',
            'system',
            configKey,
            { configKey, resultCount: history.length }
        )

        res.json({
            success: true,
            data: {
                history: history.map(log => ({
                    id: log.id,
                    action: log.action,
                    configKey: log.targetId || (log.details as any)?.configKey,
                    details: log.details,
                    admin: log.admin,
                    createdAt: log.createdAt,
                    ipAddress: log.ipAddress
                })),
                pagination: {
                    page: Number(page),
                    limit: Number(limit),
                    total: totalCount,
                    pages: Math.ceil(totalCount / Number(limit))
                }
            }
        })
    } catch (error) {
        console.error('Get configuration history error:', error)
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve configuration history'
        })
    }
}

/**
 * Export system configuration as backup
 * Requirements: 6.6 - Configuration backup functionality
 */
export const exportConfiguration = async (req: AdminAuthRequest, res: Response) => {
    try {
        const adminId = req.admin!.id

        // Get all configurations
        const configs = await prisma.systemConfig.findMany({
            include: {
                updatedByUser: {
                    select: {
                        name: true,
                        email: true
                    }
                }
            },
            orderBy: { configKey: 'asc' }
        })

        // Create backup object
        const backup = {
            exportedAt: new Date().toISOString(),
            exportedBy: {
                id: adminId,
                email: req.admin!.email
            },
            version: '1.0',
            configurations: configs.map(config => ({
                key: config.configKey,
                value: config.configValue,
                updatedAt: config.updatedAt,
                updatedBy: config.updatedByUser
            })),
            defaults: DEFAULT_CONFIG,
            schema: CONFIG_SCHEMA
        }

        // Log admin action
        await logAdminAction(
            req,
            'EXPORT_SYSTEM_CONFIG',
            'system',
            undefined,
            { configCount: configs.length }
        )

        res.json({
            success: true,
            data: backup
        })
    } catch (error) {
        console.error('Export configuration error:', error)
        res.status(500).json({
            success: false,
            error: 'Failed to export configuration'
        })
    }
}

/**
 * Import system configuration from backup
 * Requirements: 6.6 - Configuration restore functionality
 */
export const importConfiguration = async (req: AdminAuthRequest, res: Response) => {
    try {
        const { backup, reason, overwriteExisting = false } = req.body
        const adminId = req.admin!.id

        if (!backup || !backup.configurations) {
            return res.status(400).json({
                success: false,
                error: 'Invalid backup format'
            })
        }

        // Validate backup format
        if (!Array.isArray(backup.configurations)) {
            return res.status(400).json({
                success: false,
                error: 'Backup configurations must be an array'
            })
        }

        // Validate all configurations in backup
        const validationErrors: Record<string, string> = {}
        const configurationsToImport: Record<string, any> = {}

        for (const config of backup.configurations) {
            if (!config.key || config.value === undefined) {
                validationErrors[config.key || 'unknown'] = 'Invalid configuration format'
                continue
            }

            if (!CONFIG_SCHEMA[config.key]) {
                validationErrors[config.key] = 'Unknown configuration key'
                continue
            }

            const validation = validateConfigValue(config.key, config.value)
            if (!validation.valid) {
                validationErrors[config.key] = validation.error!
                continue
            }

            configurationsToImport[config.key] = config.value
        }

        if (Object.keys(validationErrors).length > 0) {
            return res.status(400).json({
                success: false,
                error: 'Configuration validation failed',
                details: validationErrors
            })
        }

        // Check for existing configurations if not overwriting
        if (!overwriteExisting) {
            const existingKeys = await prisma.systemConfig.findMany({
                where: {
                    configKey: { in: Object.keys(configurationsToImport) }
                },
                select: { configKey: true }
            })

            if (existingKeys.length > 0) {
                return res.status(409).json({
                    success: false,
                    error: 'Some configurations already exist',
                    details: {
                        existingKeys: existingKeys.map(k => k.configKey),
                        message: 'Set overwriteExisting to true to replace existing configurations'
                    }
                })
            }
        }

        // Import configurations in transaction
        const importedConfigs = await prisma.$transaction(
            Object.keys(configurationsToImport).map(key =>
                prisma.systemConfig.upsert({
                    where: { configKey: key },
                    update: {
                        configValue: configurationsToImport[key],
                        updatedBy: adminId,
                        updatedAt: new Date()
                    },
                    create: {
                        configKey: key,
                        configValue: configurationsToImport[key],
                        updatedBy: adminId
                    }
                })
            )
        )

        // Log admin action
        await logAdminAction(
            req,
            'IMPORT_SYSTEM_CONFIG',
            'system',
            undefined,
            {
                configCount: importedConfigs.length,
                overwriteExisting,
                reason: reason || 'No reason provided',
                backupInfo: {
                    exportedAt: backup.exportedAt,
                    exportedBy: backup.exportedBy
                }
            }
        )

        res.json({
            success: true,
            data: {
                importedConfigurations: importedConfigs.map(config => ({
                    key: config.configKey,
                    value: config.configValue,
                    updatedAt: config.updatedAt
                }))
            },
            message: `${importedConfigs.length} configurations imported successfully`
        })
    } catch (error) {
        console.error('Import configuration error:', error)
        res.status(500).json({
            success: false,
            error: 'Failed to import configuration'
        })
    }
}

/**
 * Get configuration schema and validation rules
 * Requirements: 6.2 - Configuration validation
 */
export const getConfigurationSchema = async (req: AdminAuthRequest, res: Response) => {
    try {
        const adminId = req.admin!.id

        // Group schema by category
        const groupedSchema: Record<string, Record<string, any>> = {
            storage: {},
            security: {},
            registration: {},
            gallery: {},
            download: {},
            branding: {},
            email: {}
        }

        Object.keys(CONFIG_SCHEMA).forEach(key => {
            const category = key.split('.')[0]
            if (groupedSchema[category] !== undefined) {
                groupedSchema[category][key] = {
                    ...CONFIG_SCHEMA[key],
                    defaultValue: DEFAULT_CONFIG[key]
                }
            }
        })

        // Log admin action
        await logAdminAction(
            req,
            'VIEW_CONFIG_SCHEMA',
            'system',
            undefined,
            { schemaKeys: Object.keys(CONFIG_SCHEMA).length }
        )

        res.json({
            success: true,
            data: {
                schema: CONFIG_SCHEMA,
                defaults: DEFAULT_CONFIG,
                grouped: groupedSchema
            }
        })
    } catch (error) {
        console.error('Get configuration schema error:', error)
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve configuration schema'
        })
    }
}