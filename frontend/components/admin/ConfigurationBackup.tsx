'use client'

import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Download, Upload, FileJson, AlertTriangle, Check, RefreshCw, X, ShieldAlert } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

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
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
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

      // Optional: Add a toast notification here
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
    <div className="space-y-6 container mx-auto p-4 md:p-0 max-w-5xl">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Export Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="h-full border-border/50 bg-background/50 backdrop-blur-sm hover:border-primary/20 transition-all duration-300">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl font-audrey">
                <Download className="h-5 w-5 text-primary" />
                Export Configuration
              </CardTitle>
              <CardDescription>
                Create a full backup of your system settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg bg-background/40 p-4 border border-border/30 text-sm space-y-3">
                <div className="flex items-start gap-3">
                  <FileJson className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="font-medium text-foreground">JSON Format Backup</p>
                    <p className="text-muted-foreground text-xs mt-1">
                      Downloads a complete snapshot of all active configurations, schemas, and metadata.
                    </p>
                  </div>
                </div>
                <div className="flex flex-col gap-2 pt-2 border-t border-border/20">
                  <Badge variant="outline" className="w-fit text-[10px] opacity-70"> Safe to share (No secrets)</Badge>
                  <Badge variant="outline" className="w-fit text-[10px] opacity-70"> Includes Audit Metadata</Badge>
                </div>
              </div>

              <Button
                onClick={handleExport}
                disabled={loading}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20"
              >
                {loading ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                {loading ? 'Exporting...' : 'Export Configuration'}
              </Button>
            </CardContent>
          </Card>
        </motion.div>

        {/* Import Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <Card className="h-full border-border/50 bg-background/50 backdrop-blur-sm hover:border-indigo-500/20 transition-all duration-300">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl font-audrey">
                <Upload className="h-5 w-5 text-indigo-500" />
                Import Configuration
              </CardTitle>
              <CardDescription>
                Restore settings from a previous backup
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-4 text-sm space-y-3">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5" />
                  <div>
                    <p className="font-medium text-amber-500">Warning: Destructive Action</p>
                    <p className="text-amber-500/80 text-xs mt-1 leading-relaxed">
                      Importing will overwrite current settings. Ensure you have a recent backup before proceeding. All changes are logged.
                    </p>
                  </div>
                </div>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileSelect}
                className="hidden"
              />
              <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={loading}
                variant="outline"
                className="w-full border-indigo-500/50 text-indigo-500 hover:bg-indigo-500/10 hover:text-indigo-400"
              >
                {loading ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                Select Backup File
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Import Dialog */}
      <Dialog open={showImportModal} onOpenChange={setShowImportModal}>
        <DialogContent className="sm:max-w-2xl bg-background/95 backdrop-blur-xl border-border/50 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-audrey">
              <RefreshCw className="h-5 w-5 text-indigo-500" />
              Review Import
            </DialogTitle>
            <DialogDescription>
              Verify the backup content before applying changes.
            </DialogDescription>
          </DialogHeader>

          {importPreview && (
            <div className="space-y-6 py-4">
              {/* Metadata Grid */}
              <div className="grid grid-cols-2 gap-4 text-sm bg-muted/30 p-4 rounded-lg border border-border/30">
                <div>
                  <span className="text-muted-foreground text-xs uppercase tracking-wider block mb-1">Export Date</span>
                  <span className="font-medium font-mono">{formatDate(importPreview.exportedAt)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground text-xs uppercase tracking-wider block mb-1">Version</span>
                  <span className="font-medium font-mono">{importPreview.version || 'Unknown'}</span>
                </div>
                <div>
                  <span className="text-muted-foreground text-xs uppercase tracking-wider block mb-1">Exported By</span>
                  <span className="font-medium">{importPreview.exportedBy?.email || 'System'}</span>
                </div>
                <div>
                  <span className="text-muted-foreground text-xs uppercase tracking-wider block mb-1">Count</span>
                  <span className="font-medium">{importPreview.configurations?.length || 0} Settings</span>
                </div>
              </div>

              {/* Preview Table */}
              <div className="border border-border/40 rounded-lg overflow-hidden max-h-48 overflow-y-auto bg-background/40">
                <table className="w-full text-sm text-left">
                  <thead className="bg-muted/50 text-xs uppercase text-muted-foreground sticky top-0 backdrop-blur-md">
                    <tr>
                      <th className="px-4 py-2 font-medium">Key</th>
                      <th className="px-4 py-2 font-medium">Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/20">
                    {importPreview.configurations?.slice(0, 10).map((config: any, i: number) => (
                      <tr key={i} className="hover:bg-white/5">
                        <td className="px-4 py-2 font-mono text-xs text-primary/80">{config.key}</td>
                        <td className="px-4 py-2 font-mono text-xs text-muted-foreground truncate max-w-[150px]">
                          {JSON.stringify(config.value)}
                        </td>
                      </tr>
                    ))}
                    {(importPreview.configurations?.length || 0) > 10 && (
                      <tr>
                        <td colSpan={2} className="px-4 py-2 text-center text-xs text-muted-foreground italic">
                          ...and {(importPreview.configurations?.length || 0) - 10} more
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Form Controls */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="import-reason">Reason for Import (Optional)</Label>
                  <Textarea
                    id="import-reason"
                    value={importReason}
                    onChange={(e) => setImportReason(e.target.value)}
                    placeholder="Audit log note..."
                    className="bg-background/50"
                  />
                </div>

                <div className="flex items-center space-x-2 bg-amber-500/5 p-3 rounded-lg border border-amber-500/10">
                  <Switch
                    id="overwrite"
                    checked={overwriteExisting}
                    onCheckedChange={setOverwriteExisting}
                    className="data-[state=checked]:bg-amber-500"
                  />
                  <Label htmlFor="overwrite" className="flex-1 cursor-pointer">
                    <span className="font-medium text-foreground">Overwrite Existing</span>
                    <p className="text-xs text-muted-foreground">Force update values that are already defined.</p>
                  </Label>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowImportModal(false)}>Cancel</Button>
            <Button
              onClick={handleImport}
              disabled={loading}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {loading ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
              Confirm Import
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}