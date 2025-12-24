'use client'

import { useState } from 'react'

interface ConfigurationFormProps {
  category: string
  configurations: Record<string, any>
  schema: Record<string, any>
  pendingChanges: Record<string, any>
  onConfigChange: (configKey: string, value: any) => void
  onSaveChanges: (reason?: string) => Promise<boolean>
  onResetConfiguration: (configKey: string, reason?: string) => Promise<boolean>
  getCurrentValue: (configKey: string) => any
}

export default function ConfigurationForm({
  category,
  configurations,
  schema,
  pendingChanges,
  onConfigChange,
  onSaveChanges,
  onResetConfiguration,
  getCurrentValue
}: ConfigurationFormProps) {
  const [showReasonModal, setShowReasonModal] = useState(false)
  const [reasonModalType, setReasonModalType] = useState<'save' | 'reset'>('save')
  const [resetConfigKey, setResetConfigKey] = useState<string>('')
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)

  const categoryTitles: Record<string, string> = {
    storage: 'Storage Settings',
    security: 'Security Settings',
    registration: 'User Registration',
    gallery: 'Gallery Settings',
    download: 'Download Settings',
    upload: 'Upload Settings',
    branding: 'Branding & UI',
    email: 'Email Settings'
  }

  const handleSaveWithReason = () => {
    setReasonModalType('save')
    setShowReasonModal(true)
  }

  const handleResetWithReason = (configKey: string) => {
    setResetConfigKey(configKey)
    setReasonModalType('reset')
    setShowReasonModal(true)
  }

  const handleModalSubmit = async () => {
    try {
      setLoading(true)
      if (reasonModalType === 'save') {
        await onSaveChanges(reason)
      } else {
        await onResetConfiguration(resetConfigKey, reason)
      }
      setShowReasonModal(false)
      setReason('')
      setResetConfigKey('')
    } catch (error: any) {
      alert(error.message || 'Operation failed')
    } finally {
      setLoading(false)
    }
  }

  const renderConfigInput = (configKey: string, config: any) => {
    const configSchema = schema[configKey]
    const currentValue = getCurrentValue(configKey)
    const hasChanges = pendingChanges[configKey] !== undefined
    const isDefault = config.metadata?.isDefault

    if (!configSchema) return null

    const handleChange = (value: any) => {
      onConfigChange(configKey, value)
    }

    const renderInput = () => {
      switch (configSchema.type) {
        case 'boolean':
          return (
            <div className="flex items-center">
              <input
                type="checkbox"
                checked={currentValue || false}
                onChange={(e) => handleChange(e.target.checked)}
                className="h-4 w-4 text-primary focus:ring-primary border-border rounded bg-background"
              />
              <span className="ml-2 text-sm text-muted-foreground">
                {currentValue ? 'Enabled' : 'Disabled'}
              </span>
            </div>
          )

        case 'number':
          return (
            <div className="flex items-center space-x-2">
              <input
                type="number"
                value={currentValue || ''}
                onChange={(e) => handleChange(Number(e.target.value))}
                min={configSchema.min}
                max={configSchema.max}
                className="block w-32 px-3 py-2 border border-border bg-background text-foreground rounded-md shadow-sm focus:ring-primary focus:border-primary sm:text-sm"
              />
              {configSchema.min !== undefined && configSchema.max !== undefined && (
                <span className="text-xs text-muted-foreground">
                  ({configSchema.min} - {configSchema.max})
                </span>
              )}
            </div>
          )

        case 'string':
          if (configSchema.enum) {
            return (
              <select
                value={currentValue || ''}
                onChange={(e) => handleChange(e.target.value)}
                className="block w-full px-3 py-2 border border-border bg-background text-foreground rounded-md shadow-sm focus:ring-primary focus:border-primary sm:text-sm"
              >
                <option value="">Select...</option>
                {configSchema.enum.map((option: string) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            )
          }

          if (configSchema.pattern === '^#[0-9A-Fa-f]{6}$') {
            return (
              <div className="flex items-center space-x-2">
                <input
                  type="color"
                  value={currentValue || '#000000'}
                  onChange={(e) => handleChange(e.target.value)}
                  className="h-10 w-16 border border-border rounded cursor-pointer bg-background"
                />
                <input
                  type="text"
                  value={currentValue || ''}
                  onChange={(e) => handleChange(e.target.value)}
                  placeholder="#000000"
                  pattern="^#[0-9A-Fa-f]{6}$"
                  className="block w-24 px-3 py-2 border border-border bg-background text-foreground rounded-md shadow-sm focus:ring-primary focus:border-primary sm:text-sm font-mono"
                />
              </div>
            )
          }

          return (
            <input
              type="text"
              value={currentValue || ''}
              onChange={(e) => handleChange(e.target.value)}
              className="block w-full px-3 py-2 border border-border bg-background text-foreground rounded-md shadow-sm focus:ring-primary focus:border-primary sm:text-sm"
            />
          )

        case 'array':
          const arrayValue = Array.isArray(currentValue) ? currentValue : []
          return (
            <div className="space-y-2">
              {arrayValue.map((item: string, index: number) => (
                <div key={index} className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={item}
                    onChange={(e) => {
                      const newArray = [...arrayValue]
                      newArray[index] = e.target.value
                      handleChange(newArray)
                    }}
                    className="block flex-1 px-3 py-2 border border-border bg-background text-foreground rounded-md shadow-sm focus:ring-primary focus:border-primary sm:text-sm"
                  />
                  <button
                    onClick={() => {
                      const newArray = arrayValue.filter((_: any, i: number) => i !== index)
                      handleChange(newArray)
                    }}
                    className="px-2 py-1 text-destructive hover:bg-destructive/10 rounded"
                  >
                    ✕
                  </button>
                </div>
              ))}
              <button
                onClick={() => handleChange([...arrayValue, ''])}
                className="px-3 py-1 text-sm text-primary hover:bg-primary/10 rounded border border-primary/30"
              >
                + Add Item
              </button>
            </div>
          )

        default:
          return (
            <input
              type="text"
              value={currentValue || ''}
              onChange={(e) => handleChange(e.target.value)}
              className="block w-full px-3 py-2 border border-border bg-background text-foreground rounded-md shadow-sm focus:ring-primary focus:border-primary sm:text-sm"
            />
          )
      }
    }

    return (
      <div key={configKey} className={`p-4 border rounded-lg ${hasChanges ? 'border-amber-500/50 bg-amber-500/5 dark:border-amber-400/30 dark:bg-amber-500/10' : 'border-border bg-card'}`}>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-2">
              <h3 className="text-sm font-medium text-foreground">
                {configKey.split('.').pop()}
              </h3>
              {hasChanges && (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
                  Modified
                </span>
              )}
              {isDefault && (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-muted text-muted-foreground">
                  Default
                </span>
              )}
            </div>

            <p className="mt-1 text-xs text-muted-foreground">
              {configSchema.description}
            </p>

            <div className="mt-3">
              {renderInput()}
            </div>

            {config.metadata && !config.metadata.isDefault && (
              <div className="mt-2 text-xs text-muted-foreground">
                Last updated: {new Date(config.metadata.updatedAt).toLocaleString()}
                {config.metadata.updatedBy && (
                  <span> by {config.metadata.updatedBy.name}</span>
                )}
              </div>
            )}
          </div>

          <div className="ml-4 flex-shrink-0">
            <button
              onClick={() => handleResetWithReason(configKey)}
              className="text-xs text-muted-foreground hover:text-destructive"
              title="Reset to default"
            >
              Reset
            </button>
          </div>
        </div>
      </div>
    )
  }

  const configEntries = Object.entries(configurations)

  return (
    <div className="space-y-6">
      <div className="bg-card rounded-lg shadow-sm border border-border">
        <div className="px-6 py-4 border-b border-border">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium text-foreground">
              {categoryTitles[category] || category}
            </h2>
            {Object.keys(pendingChanges).length > 0 && (
              <button
                onClick={handleSaveWithReason}
                className="px-4 py-2 bg-primary text-primary-foreground text-sm rounded-md hover:bg-primary/90"
              >
                Save Changes ({Object.keys(pendingChanges).length})
              </button>
            )}
          </div>
        </div>

        <div className="p-6">
          {configEntries.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No configurations found for this category.
            </div>
          ) : (
            <div className="space-y-4">
              {configEntries.map(([configKey, config]) =>
                renderConfigInput(configKey, config)
              )}
            </div>
          )}
        </div>
      </div>

      {/* Reason Modal */}
      {showReasonModal && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border border-border w-96 shadow-lg rounded-md bg-card">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-foreground mb-4">
                {reasonModalType === 'save' ? 'Save Configuration Changes' : 'Reset Configuration'}
              </h3>

              <div className="mb-4">
                <label className="block text-sm font-medium text-foreground mb-2">
                  Reason for change (optional):
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={3}
                  className="block w-full px-3 py-2 border border-border bg-background text-foreground rounded-md shadow-sm focus:ring-primary focus:border-primary sm:text-sm placeholder:text-muted-foreground"
                  placeholder="Describe why you're making this change..."
                />
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowReasonModal(false)
                    setReason('')
                    setResetConfigKey('')
                  }}
                  disabled={loading}
                  className="px-4 py-2 text-sm font-medium text-foreground bg-muted border border-border rounded-md hover:bg-muted/80 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleModalSubmit}
                  disabled={loading}
                  className="px-4 py-2 text-sm font-medium text-primary-foreground bg-primary border border-transparent rounded-md hover:bg-primary/90 disabled:opacity-50"
                >
                  {loading ? 'Processing...' : (reasonModalType === 'save' ? 'Save Changes' : 'Reset Configuration')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
