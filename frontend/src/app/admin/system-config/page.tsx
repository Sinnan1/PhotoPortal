'use client'

import { useState, useEffect } from 'react'
import { adminApi } from '../../../../lib/admin-api'
import SystemConfig from '../../../../components/admin/SystemConfig'

export default function SystemConfigPage() {
    const [configurations, setConfigurations] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        loadConfigurations()
    }, [])

    const loadConfigurations = async () => {
        try {
            setLoading(true)
            setError(null)
            const response = await adminApi.getAllConfigurations()
            setConfigurations(response.data)
        } catch (error: any) {
            console.error('Failed to load configurations:', error)
            setError(error.message || 'Failed to load system configurations')
        } finally {
            setLoading(false)
        }
    }

    const handleConfigurationUpdate = async (configKey: string, value: any, reason?: string) => {
        try {
            await adminApi.updateConfiguration(configKey, { value, reason })
            await loadConfigurations() // Reload to get updated data
            return true
        } catch (error: any) {
            console.error('Failed to update configuration:', error)
            throw error
        }
    }

    const handleBulkUpdate = async (configurations: Record<string, any>, reason?: string) => {
        try {
            await adminApi.updateMultipleConfigurations({ configurations, reason })
            await loadConfigurations() // Reload to get updated data
            return true
        } catch (error: any) {
            console.error('Failed to update configurations:', error)
            throw error
        }
    }

    const handleConfigurationReset = async (configKey: string, reason?: string) => {
        try {
            await adminApi.resetConfiguration(configKey, { reason })
            await loadConfigurations() // Reload to get updated data
            return true
        } catch (error: any) {
            console.error('Failed to reset configuration:', error)
            throw error
        }
    }

    const handleExportConfiguration = async () => {
        try {
            const response = await adminApi.exportConfiguration()
            return response.data
        } catch (error: any) {
            console.error('Failed to export configuration:', error)
            throw error
        }
    }

    const handleImportConfiguration = async (backup: any, reason?: string, overwriteExisting?: boolean) => {
        try {
            await adminApi.importConfiguration({ backup, reason, overwriteExisting })
            await loadConfigurations() // Reload to get updated data
            return true
        } catch (error: any) {
            console.error('Failed to import configuration:', error)
            throw error
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="text-red-600 text-xl mb-4">Error Loading System Configuration</div>
                    <div className="text-gray-600 mb-4">{error}</div>
                    <button
                        onClick={loadConfigurations}
                        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                    >
                        Retry
                    </button>
                </div>
            </div>
        )
    }

    return (
        <SystemConfig
            configurations={configurations}
            onConfigurationUpdate={handleConfigurationUpdate}
            onBulkUpdate={handleBulkUpdate}
            onConfigurationReset={handleConfigurationReset}
            onExportConfiguration={handleExportConfiguration}
            onImportConfiguration={handleImportConfiguration}
        />
    )
}