'use client'

import { useState } from 'react'
import ConfigurationForm from './ConfigurationForm'
import ConfigurationHistory from './ConfigurationHistory'
import ConfigurationBackup from './ConfigurationBackup'

interface SystemConfigProps {
    configurations: any
    onConfigurationUpdate: (configKey: string, value: any, reason?: string) => Promise<boolean>
    onBulkUpdate: (configurations: Record<string, any>, reason?: string) => Promise<boolean>
    onConfigurationReset: (configKey: string, reason?: string) => Promise<boolean>
    onExportConfiguration: () => Promise<any>
    onImportConfiguration: (backup: any, reason?: string, overwriteExisting?: boolean) => Promise<boolean>
}

export default function SystemConfig({
    configurations,
    onConfigurationUpdate,
    onBulkUpdate,
    onConfigurationReset,
    onExportConfiguration,
    onImportConfiguration
}: SystemConfigProps) {
    const [activeTab, setActiveTab] = useState('settings')
    const [selectedCategory, setSelectedCategory] = useState('storage')
    const [searchTerm, setSearchTerm] = useState('')
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
    const [pendingChanges, setPendingChanges] = useState<Record<string, any>>({})

    if (!configurations) {
        return <div>Loading...</div>
    }

    const { grouped, schema } = configurations

    // Filter configurations based on search term
    const filterConfigurations = (configs: Record<string, any>) => {
        if (!searchTerm) return configs

        const filtered: Record<string, any> = {}
        Object.keys(configs).forEach(key => {
            if (key.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (schema[key]?.description || '').toLowerCase().includes(searchTerm.toLowerCase())) {
                filtered[key] = configs[key]
            }
        })
        return filtered
    }

    const categories = [
        { id: 'storage', name: 'Storage Settings', icon: '💾' },
        { id: 'security', name: 'Security Settings', icon: '🔒' },
        { id: 'registration', name: 'User Registration', icon: '👥' },
        { id: 'gallery', name: 'Gallery Settings', icon: '🖼️' },
        { id: 'download', name: 'Download Settings', icon: '⬇️' },
        { id: 'upload', name: 'Upload Settings', icon: '⬆️' },
        { id: 'branding', name: 'Branding & UI', icon: '🎨' },
        { id: 'email', name: 'Email Settings', icon: '📧' }
    ]

    const tabs = [
        { id: 'settings', name: 'Configuration Settings', icon: '⚙️' },
        { id: 'history', name: 'Change History', icon: '📋' },
        { id: 'backup', name: 'Backup & Restore', icon: '💾' }
    ]

    const handleConfigChange = (configKey: string, value: any) => {
        setPendingChanges(prev => ({
            ...prev,
            [configKey]: value
        }))
        setHasUnsavedChanges(true)
    }

    const handleSaveChanges = async (reason?: string) => {
        try {
            if (Object.keys(pendingChanges).length === 1) {
                const [configKey, value] = Object.entries(pendingChanges)[0]
                await onConfigurationUpdate(configKey, value, reason)
            } else {
                await onBulkUpdate(pendingChanges, reason)
            }
            setPendingChanges({})
            setHasUnsavedChanges(false)
            return true
        } catch (error) {
            throw error
        }
    }

    const handleDiscardChanges = () => {
        setPendingChanges({})
        setHasUnsavedChanges(false)
    }

    const getCurrentValue = (configKey: string) => {
        return pendingChanges[configKey] !== undefined
            ? pendingChanges[configKey]
            : grouped[selectedCategory]?.[configKey]?.value
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="border-b border-border pb-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">System Configuration</h1>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Manage platform settings, security policies, and business rules
                        </p>
                    </div>

                    {hasUnsavedChanges && (
                        <div className="flex items-center space-x-3">
                            <span className="text-sm text-amber-600 dark:text-amber-400 font-medium">
                                {Object.keys(pendingChanges).length} unsaved change(s)
                            </span>
                            <button
                                onClick={handleDiscardChanges}
                                className="px-3 py-1 text-sm border border-border rounded-md hover:bg-muted text-foreground"
                            >
                                Discard
                            </button>
                            <button
                                onClick={() => handleSaveChanges()}
                                className="px-3 py-1 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
                            >
                                Save Changes
                            </button>
                        </div>
                    )}
                </div>

                {/* Tabs */}
                <div className="mt-6">
                    <nav className="flex space-x-8">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm ${activeTab === tab.id
                                    ? 'border-primary text-primary'
                                    : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                                    }`}
                            >
                                <span>{tab.icon}</span>
                                <span>{tab.name}</span>
                            </button>
                        ))}
                    </nav>
                </div>
            </div>

            {/* Content */}
            <div>
                {activeTab === 'settings' && (
                    <div className="flex gap-8">
                        {/* Sidebar */}
                        <div className="w-64 flex-shrink-0">
                            <div className="bg-card rounded-lg shadow-sm border border-border">
                                <div className="p-4 border-b border-border">
                                    <div className="relative">
                                        <input
                                            type="text"
                                            placeholder="Search settings..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            className="w-full pl-8 pr-4 py-2 border border-border bg-background text-foreground rounded-md text-sm focus:ring-2 focus:ring-primary focus:border-primary placeholder:text-muted-foreground"
                                        />
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <span className="text-muted-foreground">🔍</span>
                                        </div>
                                    </div>
                                </div>

                                <nav className="p-2">
                                    {categories.map((category) => (
                                        <button
                                            key={category.id}
                                            onClick={() => setSelectedCategory(category.id)}
                                            className={`w-full flex items-center space-x-3 px-3 py-2 rounded-md text-sm font-medium ${selectedCategory === category.id
                                                ? 'bg-primary/10 text-primary border-r-2 border-primary'
                                                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                                                }`}
                                        >
                                            <span>{category.icon}</span>
                                            <span>{category.name}</span>
                                        </button>
                                    ))}
                                </nav>
                            </div>
                        </div>

                        {/* Main Content */}
                        <div className="flex-1">
                            <ConfigurationForm
                                category={selectedCategory}
                                configurations={filterConfigurations(grouped[selectedCategory] || {})}
                                schema={schema}
                                pendingChanges={pendingChanges}
                                onConfigChange={handleConfigChange}
                                onSaveChanges={handleSaveChanges}
                                onResetConfiguration={onConfigurationReset}
                                getCurrentValue={getCurrentValue}
                            />
                        </div>
                    </div>
                )}

                {activeTab === 'history' && (
                    <ConfigurationHistory />
                )}

                {activeTab === 'backup' && (
                    <ConfigurationBackup
                        onExportConfiguration={onExportConfiguration}
                        onImportConfiguration={onImportConfiguration}
                    />
                )}
            </div>
        </div>
    )
}