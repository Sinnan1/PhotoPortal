'use client'

import { useState, useEffect } from 'react'
import { adminApi } from '../../lib/admin-api'

interface HistoryEntry {
  id: string
  action: string
  configKey?: string
  details: any
  admin: {
    name: string
    email: string
  }
  createdAt: string
  ipAddress: string
}

export default function ConfigurationHistory() {
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedConfigKey, setSelectedConfigKey] = useState<string>('')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    loadHistory()
  }, [selectedConfigKey, currentPage])

  const loadHistory = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await adminApi.getConfigurationHistory(
        selectedConfigKey || undefined,
        {
          page: currentPage,
          limit: 20
        }
      )

      setHistory(response.data.history)
      setTotalPages(response.data.pagination.pages)
    } catch (error: any) {
      console.error('Failed to load configuration history:', error)
      setError(error.message || 'Failed to load configuration history')
    } finally {
      setLoading(false)
    }
  }

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'UPDATE_SYSTEM_CONFIG':
        return '✏️'
      case 'UPDATE_MULTIPLE_CONFIGS':
        return '📝'
      case 'RESET_CONFIG_TO_DEFAULT':
        return '🔄'
      case 'EXPORT_SYSTEM_CONFIG':
        return '📤'
      case 'IMPORT_SYSTEM_CONFIG':
        return '📥'
      default:
        return '⚙️'
    }
  }

  const getActionName = (action: string) => {
    switch (action) {
      case 'UPDATE_SYSTEM_CONFIG':
        return 'Configuration Updated'
      case 'UPDATE_MULTIPLE_CONFIGS':
        return 'Bulk Configuration Update'
      case 'RESET_CONFIG_TO_DEFAULT':
        return 'Configuration Reset'
      case 'EXPORT_SYSTEM_CONFIG':
        return 'Configuration Exported'
      case 'IMPORT_SYSTEM_CONFIG':
        return 'Configuration Imported'
      default:
        return action.replace(/_/g, ' ').toLowerCase()
    }
  }

  const formatValue = (value: any) => {
    if (value === null || value === undefined) return 'null'
    if (typeof value === 'boolean') return value ? 'true' : 'false'
    if (Array.isArray(value)) return `[${value.join(', ')}]`
    if (typeof value === 'object') return JSON.stringify(value, null, 2)
    return String(value)
  }

  const filteredHistory = history.filter(entry => {
    if (!searchTerm) return true

    const searchLower = searchTerm.toLowerCase()
    return (
      entry.configKey?.toLowerCase().includes(searchLower) ||
      entry.admin.name.toLowerCase().includes(searchLower) ||
      entry.admin.email.toLowerCase().includes(searchLower) ||
      getActionName(entry.action).toLowerCase().includes(searchLower)
    )
  })

  if (loading && history.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-card rounded-lg shadow-sm border border-border p-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-foreground mb-2">
              Search History
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="Search by configuration key, admin, or action..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-border rounded-md leading-5 bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:placeholder-muted-foreground focus:ring-1 focus:ring-primary focus:border-primary sm:text-sm"
              />
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="text-muted-foreground">🔍</span>
              </div>
            </div>
          </div>

          <div className="w-full sm:w-64">
            <label className="block text-sm font-medium text-foreground mb-2">
              Filter by Configuration
            </label>
            <select
              value={selectedConfigKey}
              onChange={(e) => {
                setSelectedConfigKey(e.target.value)
                setCurrentPage(1)
              }}
              className="block w-full px-3 py-2 border border-border rounded-md shadow-sm focus:ring-primary focus:border-primary sm:text-sm bg-background text-foreground"
            >
              <option value="">All Configurations</option>
              <optgroup label="Storage">
                <option value="storage.maxFileSize">Max File Size</option>
                <option value="storage.maxStoragePerUser">Max Storage Per User</option>
                <option value="storage.allowedFileTypes">Allowed File Types</option>
              </optgroup>
              <optgroup label="Security">
                <option value="security.sessionTimeout">Session Timeout</option>
                <option value="security.adminSessionTimeout">Admin Session Timeout</option>
                <option value="security.maxLoginAttempts">Max Login Attempts</option>
                <option value="security.lockoutDuration">Lockout Duration</option>
              </optgroup>
              <optgroup label="Registration">
                <option value="registration.enabled">Registration Enabled</option>
                <option value="registration.requireApproval">Require Approval</option>
                <option value="registration.defaultRole">Default Role</option>
              </optgroup>
              <optgroup label="Gallery">
                <option value="gallery.defaultExpirationDays">Default Expiration</option>
                <option value="gallery.maxPhotosPerGallery">Max Photos Per Gallery</option>
                <option value="gallery.defaultDownloadLimit">Default Download Limit</option>
              </optgroup>
              <optgroup label="Branding">
                <option value="branding.siteName">Site Name</option>
                <option value="branding.logoUrl">Logo URL</option>
                <option value="branding.primaryColor">Primary Color</option>
                <option value="branding.secondaryColor">Secondary Color</option>
              </optgroup>
              <optgroup label="Email">
                <option value="email.fromAddress">From Address</option>
                <option value="email.fromName">From Name</option>
                <option value="email.notificationsEnabled">Notifications Enabled</option>
              </optgroup>
            </select>
          </div>
        </div>
      </div>

      {/* History List */}
      <div className="bg-card rounded-lg shadow-sm border border-border">
        <div className="px-6 py-4 border-b border-border">
          <h2 className="text-lg font-medium text-foreground">Configuration Change History</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Track all configuration changes made by administrators
          </p>
        </div>

        {error ? (
          <div className="p-6 text-center">
            <div className="text-destructive mb-2">Error loading history</div>
            <div className="text-muted-foreground text-sm mb-4">{error}</div>
            <button
              onClick={loadHistory}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
            >
              Retry
            </button>
          </div>
        ) : filteredHistory.length === 0 ? (
          <div className="p-6 text-center text-muted-foreground">
            {searchTerm || selectedConfigKey ? 'No matching history entries found.' : 'No configuration changes recorded yet.'}
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filteredHistory.map((entry) => (
              <div key={entry.id} className="p-6 hover:bg-muted/50">
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                      <span className="text-sm">{getActionIcon(entry.action)}</span>
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {getActionName(entry.action)}
                        </p>
                        {entry.configKey && (
                          <p className="text-sm text-muted-foreground">
                            Configuration: <code className="bg-muted px-1 rounded text-foreground">{entry.configKey}</code>
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">
                          {new Date(entry.createdAt).toLocaleString()}
                        </p>
                        <p className="text-xs text-muted-foreground/70">
                          {entry.ipAddress}
                        </p>
                      </div>
                    </div>

                    <div className="mt-2">
                      <p className="text-sm text-muted-foreground">
                        By: <span className="font-medium text-foreground">{entry.admin.name}</span> ({entry.admin.email})
                      </p>
                    </div>

                    {/* Change Details */}
                    {entry.details && (
                      <div className="mt-3 p-3 bg-muted/50 rounded-md">
                        <div className="text-xs font-medium text-foreground mb-2">Change Details:</div>

                        {entry.details.reason && (
                          <div className="mb-2">
                            <span className="text-xs font-medium text-muted-foreground">Reason: </span>
                            <span className="text-xs text-foreground">{entry.details.reason}</span>
                          </div>
                        )}

                        {entry.details.oldValue !== undefined && entry.details.newValue !== undefined && (
                          <div className="space-y-1">
                            <div>
                              <span className="text-xs font-medium text-destructive">Old Value: </span>
                              <code className="text-xs bg-destructive/10 px-1 rounded text-destructive">{formatValue(entry.details.oldValue)}</code>
                            </div>
                            <div>
                              <span className="text-xs font-medium text-green-600 dark:text-green-400">New Value: </span>
                              <code className="text-xs bg-green-500/10 px-1 rounded text-green-600 dark:text-green-400">{formatValue(entry.details.newValue)}</code>
                            </div>
                          </div>
                        )}

                        {entry.details.configKeys && (
                          <div>
                            <span className="text-xs font-medium text-muted-foreground">Configurations: </span>
                            <span className="text-xs text-foreground">{entry.details.configKeys.join(', ')}</span>
                          </div>
                        )}

                        {entry.details.configCount && (
                          <div>
                            <span className="text-xs font-medium text-muted-foreground">Count: </span>
                            <span className="text-xs text-foreground">{entry.details.configCount} configurations</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-border bg-muted/20">
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages}
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1 || loading}
                  className="px-3 py-1 text-sm border border-border rounded-md hover:bg-muted text-foreground disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages || loading}
                  className="px-3 py-1 text-sm border border-border rounded-md hover:bg-muted text-foreground disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}