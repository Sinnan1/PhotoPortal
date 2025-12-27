'use client'

import { useState, useEffect } from 'react'
import { adminApi } from '../../lib/admin-api'
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from "@/components/ui/select"
import { Search, History, ArrowLeft, ArrowRight, User, Globe, Edit3, RotateCcw, Download, Upload, Boxes, AlertCircle, RefreshCw } from 'lucide-react'
import { motion, AnimatePresence } from "framer-motion"

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
  const [selectedConfigKey, setSelectedConfigKey] = useState<string>('all')
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

      const configKey = selectedConfigKey === 'all' ? undefined : selectedConfigKey;

      const response = await adminApi.getConfigurationHistory(
        configKey,
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
        return <Edit3 className="h-4 w-4 text-blue-500" />
      case 'UPDATE_MULTIPLE_CONFIGS':
        return <Boxes className="h-4 w-4 text-purple-500" />
      case 'RESET_CONFIG_TO_DEFAULT':
        return <RotateCcw className="h-4 w-4 text-amber-500" />
      case 'EXPORT_SYSTEM_CONFIG':
        return <Download className="h-4 w-4 text-green-500" />
      case 'IMPORT_SYSTEM_CONFIG':
        return <Upload className="h-4 w-4 text-indigo-500" />
      default:
        return <History className="h-4 w-4 text-gray-500" />
    }
  }

  const getActionName = (action: string) => {
    switch (action) {
      case 'UPDATE_SYSTEM_CONFIG': return 'Configuration Updated'
      case 'UPDATE_MULTIPLE_CONFIGS': return 'Bulk Update'
      case 'RESET_CONFIG_TO_DEFAULT': return 'Reset to Default'
      case 'EXPORT_SYSTEM_CONFIG': return 'Exported Config'
      case 'IMPORT_SYSTEM_CONFIG': return 'Imported Config'
      default: return action.replace(/_/g, ' ').toLowerCase()
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

  return (
    <div className="space-y-6">
      {/* Filters Card */}
      <Card className="border-border/50 bg-background/50 backdrop-blur-sm">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search history..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 bg-background/50 border-border/50"
              />
            </div>
            <div className="w-full md:w-64">
              <Select value={selectedConfigKey} onValueChange={(val) => {
                setSelectedConfigKey(val)
                setCurrentPage(1)
              }}>
                <SelectTrigger className="bg-background/50 border-border/50">
                  <SelectValue placeholder="Filter by Config" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Configurations</SelectItem>
                  <SelectGroup>
                    <SelectLabel>Storage</SelectLabel>
                    <SelectItem value="storage.maxFileSize">Max File Size</SelectItem>
                    <SelectItem value="storage.maxStoragePerUser">Max Storage Per User</SelectItem>
                  </SelectGroup>
                  {/* More items can be added here or dynamically generated */}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* History Timeline */}
      <div className="space-y-4 relative">
        {/* Timeline Line */}
        <div className="absolute left-6 top-6 bottom-6 w-px bg-border/50 hidden md:block" />

        <AnimatePresence>
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-32 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse ml-0 md:ml-12" />
              ))}
            </div>
          ) : error ? (
            <div
              role="alert"
              aria-live="polite"
              className="text-center py-8 bg-red-500/10 border border-red-500/20 rounded-xl"
            >
              <AlertCircle className="h-10 w-10 mx-auto mb-3 text-red-500 opacity-80" />
              <p className="text-red-500 font-medium mb-1">Failed to load history</p>
              <p className="text-sm text-muted-foreground mb-4">{error}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setError(null)
                  loadHistory()
                }}
                className="border-red-500/30 text-red-500 hover:bg-red-500/10"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </Button>
            </div>
          ) : filteredHistory.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground bg-background/30 rounded-xl border border-border/30">
              <History className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p>No history records found.</p>
            </div>
          ) : (
            filteredHistory.map((entry, index) => (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="relative ml-0 md:ml-12"
              >
                {/* Timeline Dot */}
                <div className="absolute -left-[31px] top-6 h-4 w-4 rounded-full border-2 border-background bg-primary shadow hidden md:block" />

                <Card className="border-border/50 bg-background/50 backdrop-blur-sm overflow-hidden hover:border-primary/20 transition-all duration-300">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="p-1.5 rounded-full bg-background/80 border border-border/50 shadow-sm">
                            {getActionIcon(entry.action)}
                          </div>
                          <span className="font-bold text-foreground">{getActionName(entry.action)}</span>
                          {entry.configKey && (
                            <Badge variant="outline" className="font-mono text-[10px] opacity-70">
                              {entry.configKey}
                            </Badge>
                          )}
                        </div>

                        <div className="flex items-center gap-4 text-xs text-muted-foreground mt-2 mb-4">
                          <div className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            <span>{entry.admin.name}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Globe className="h-3 w-3" />
                            <span className="font-mono">{entry.ipAddress}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <History className="h-3 w-3" />
                            <span>{new Date(entry.createdAt).toLocaleString()}</span>
                          </div>
                        </div>

                        {entry.details && (
                          <div className="bg-background/40 rounded-lg p-3 border border-border/30 text-sm">
                            {entry.details.reason && (
                              <div className="mb-2 italic opacity-80">"{entry.details.reason}"</div>
                            )}
                            {entry.details.oldValue !== undefined && entry.details.newValue !== undefined && (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 font-mono text-xs">
                                <div className="flex flex-col">
                                  <span className="text-destructive font-bold uppercase text-[10px]">Previous</span>
                                  <span className="text-muted-foreground break-all">{formatValue(entry.details.oldValue)}</span>
                                </div>
                                <div className="flex flex-col">
                                  <span className="text-green-500 font-bold uppercase text-[10px]">New</span>
                                  <span className="text-foreground break-all">{formatValue(entry.details.newValue)}</span>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-4 pt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1 || loading}
          >
            <ArrowLeft className="h-4 w-4 mr-2" /> Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {currentPage} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages || loading}
          >
            Next <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      )}
    </div>
  )
}