'use client'

import { useState, useRef } from 'react'

interface ConfigurationBackupProps {
  onExportConfiguration: () => Promise<any>
  onImportConfiguration: (backup: any, reason?: string, overwriteExisting?: boolean) => Promise<boolean>
}

export default function ConfigurationBackup({
  onExportConfiguration,
  onImportConfiguration
}: ConfigurationBackupProps) {
  const [loading, setLoading] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [importData, setImportData] = useState('')
  const [importReason, setImportReason] = useState('')
  const [overwriteExisting, setOverwriteExisting] = useState(false)
  const [importPreview, setImportPreview] = useState<any>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleExport = async () => {
    try {
      setLoading(true)
      const backup = await onExportConfiguration()
      
      // Create and download the backup file
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `system-config-backup-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      
      alert('Configuration backup exported successfully!')
    } catch (error: any) {
      console.error('Export failed:', error)
      alert(error.message || 'Failed to export configuration')
    } finally {
      setLoading(false)
    }
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string
        const backup = JSON.parse(content)
        setImportData(content)
        setImportPreview(backup)
        setShowImportModal(true)
      } catch (error) {
        alert('Invalid backup file format')
      }
    }
    reader.readAsText(file)
  }

  const handleImport = async () => {
    try {
      setLoading(true)
      const backup = JSON.parse(importData)
      await onImportConfiguration(backup, importReason, overwriteExisting)
      
      setShowImportModal(false)
      setImportData('')
      setImportReason('')
      setOverwriteExisting(false)
      setImportPreview(null)
      
      alert('Configuration imported successfully!')
    } catch (error: any) {
      console.error('Import failed:', error)
      alert(error.message || 'Failed to import configuration')
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  return (
    <div className="space-y-6">
      {/* Export Section */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="px-6 py-4 border-b">
          <h2 className="text-lg font-medium text-gray-900">Export Configuration</h2>
          <p className="mt-1 text-sm text-gray-500">
            Create a backup of your current system configuration
          </p>
        </div>
        
        <div className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-2">
                System Configuration Backup
              </h3>
              <p className="text-sm text-gray-600">
                Export all current configuration settings to a JSON file that can be used for backup or migration purposes.
              </p>
              <div className="mt-3 text-xs text-gray-500">
                <div>• Includes all configuration values and metadata</div>
                <div>• Contains schema definitions for validation</div>
                <div>• Safe to share (no sensitive data included)</div>
              </div>
            </div>
            
            <button
              onClick={handleExport}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center space-x-2"
            >
              <span>📤</span>
              <span>{loading ? 'Exporting...' : 'Export Configuration'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Import Section */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="px-6 py-4 border-b">
          <h2 className="text-lg font-medium text-gray-900">Import Configuration</h2>
          <p className="mt-1 text-sm text-gray-500">
            Restore configuration from a backup file
          </p>
        </div>
        
        <div className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-2">
                Restore from Backup
              </h3>
              <p className="text-sm text-gray-600">
                Import configuration settings from a previously exported backup file.
              </p>
              <div className="mt-3 text-xs text-red-600">
                <div>⚠️ This will modify your current configuration settings</div>
                <div>⚠️ Make sure to export current settings before importing</div>
                <div>⚠️ All changes will be logged in the audit trail</div>
              </div>
            </div>
            
            <div className="flex flex-col space-y-2">
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileSelect}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={loading}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 flex items-center space-x-2"
              >
                <span>📥</span>
                <span>Select Backup File</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Import Modal */}
      {showImportModal && importPreview && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-5 border w-4/5 max-w-4xl shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Import Configuration Backup
              </h3>
              
              {/* Backup Info */}
              <div className="mb-6 p-4 bg-gray-50 rounded-md">
                <h4 className="text-sm font-medium text-gray-900 mb-2">Backup Information</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-gray-600">Exported At:</span>
                    <div className="text-gray-900">{formatDate(importPreview.exportedAt)}</div>
                  </div>
                  <div>
                    <span className="font-medium text-gray-600">Exported By:</span>
                    <div className="text-gray-900">{importPreview.exportedBy?.email || 'Unknown'}</div>
                  </div>
                  <div>
                    <span className="font-medium text-gray-600">Version:</span>
                    <div className="text-gray-900">{importPreview.version || 'Unknown'}</div>
                  </div>
                  <div>
                    <span className="font-medium text-gray-600">Configurations:</span>
                    <div className="text-gray-900">{importPreview.configurations?.length || 0} settings</div>
                  </div>
                </div>
              </div>

              {/* Configuration Preview */}
              <div className="mb-6">
                <h4 className="text-sm font-medium text-gray-900 mb-2">Configuration Preview</h4>
                <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-md">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Configuration Key
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Value
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Last Updated
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {importPreview.configurations?.map((config: any, index: number) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-4 py-2 text-sm font-mono text-gray-900">
                            {config.key}
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-600">
                            <code className="bg-gray-100 px-1 rounded">
                              {JSON.stringify(config.value)}
                            </code>
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-500">
                            {config.updatedAt ? formatDate(config.updatedAt) : 'Default'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Import Options */}
              <div className="mb-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Reason for import (optional):
                  </label>
                  <textarea
                    value={importReason}
                    onChange={(e) => setImportReason(e.target.value)}
                    rows={3}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="Describe why you're importing this configuration..."
                  />
                </div>

                <div className="flex items-center">
                  <input
                    id="overwrite-existing"
                    type="checkbox"
                    checked={overwriteExisting}
                    onChange={(e) => setOverwriteExisting(e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="overwrite-existing" className="ml-2 block text-sm text-gray-900">
                    Overwrite existing configurations
                  </label>
                </div>
                
                {!overwriteExisting && (
                  <div className="text-sm text-amber-600 bg-amber-50 p-3 rounded-md">
                    ⚠️ Import will fail if any configurations already exist. Enable "Overwrite existing" to replace current values.
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowImportModal(false)
                    setImportData('')
                    setImportReason('')
                    setOverwriteExisting(false)
                    setImportPreview(null)
                  }}
                  disabled={loading}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleImport}
                  disabled={loading}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 disabled:opacity-50"
                >
                  {loading ? 'Importing...' : 'Import Configuration'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}