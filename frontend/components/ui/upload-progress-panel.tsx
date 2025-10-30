"use client"

import { useState, useEffect } from 'react'
import { uploadManager, type UploadBatch } from '@/lib/upload-manager'
import { X, CheckCircle, XCircle, Loader2, RefreshCw, Trash2 } from 'lucide-react'
import { Button } from './button'

export function UploadProgressPanel() {
  const [batches, setBatches] = useState<UploadBatch[]>([])
  const [isMinimized, setIsMinimized] = useState(false)
  const [expandedBatches, setExpandedBatches] = useState<Set<string>>(new Set())

  useEffect(() => {
    const unsubscribe = uploadManager.subscribe((newBatches) => {
      setBatches(newBatches)
    })

    // Load initial state
    setBatches(uploadManager.getAllBatches())

    return () => {
      unsubscribe()
    }
  }, [])

  const activeBatches = batches.filter(b =>
    b.files.some(f => f.status === 'queued' || f.status === 'uploading')
  )

  if (batches.length === 0) return null

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
  }

  const calculateETA = (batch: UploadBatch): string => {
    if (batch.averageSpeed === 0 || batch.uploadedBytes >= batch.totalBytes) return 'Done'
    const remainingBytes = batch.totalBytes - batch.uploadedBytes
    const remainingSeconds = remainingBytes / batch.averageSpeed
    if (remainingSeconds < 60) return `${Math.round(remainingSeconds)}s`
    if (remainingSeconds < 3600) return `${Math.round(remainingSeconds / 60)}m`
    return `${Math.round(remainingSeconds / 3600)}h`
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-96 max-w-md bg-white rounded-lg shadow-2xl border border-gray-200 z-50">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center space-x-2">
          <Loader2 className={`h-4 w-4 ${activeBatches.length > 0 ? 'animate-spin text-[#425146]' : 'text-gray-400'}`} />
          <h3 className="font-semibold text-gray-900">
            {activeBatches.length > 0 ? 'Uploading...' : 'Upload Complete'}
          </h3>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsMinimized(!isMinimized)}
            className="h-8 w-8 p-0"
          >
            {isMinimized ? '▲' : '▼'}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => uploadManager.clearCompleted()}
            className="h-8 w-8 p-0"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Content */}
      {!isMinimized && (
        <div className="max-h-96 overflow-y-auto">
          {batches.map(batch => {
            const totalFiles = batch.files.length
            const completed = batch.completedFiles
            const failed = batch.failedFiles
            const remaining = totalFiles - completed - failed
            const isActive = batch.files.some(f => f.status === 'queued' || f.status === 'uploading')

            const isExpanded = expandedBatches.has(batch.id)
            
            return (
              <div key={batch.id} className="p-4 border-b border-gray-100 last:border-b-0">
                {/* Batch Summary */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => {
                        const newExpanded = new Set(expandedBatches)
                        if (isExpanded) {
                          newExpanded.delete(batch.id)
                        } else {
                          newExpanded.add(batch.id)
                        }
                        setExpandedBatches(newExpanded)
                      }}
                      className="text-sm font-medium text-gray-900 hover:text-[#425146] flex items-center space-x-2"
                    >
                      <span>{isActive ? 'Uploading' : 'Upload Complete'}</span>
                      <span className="text-xs text-gray-500">({totalFiles} files)</span>
                      <span className="text-gray-400">{isExpanded ? '▼' : '▶'}</span>
                    </button>
                    <div className="flex items-center space-x-2">
                      {failed > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => uploadManager.retryFailed(batch.id)}
                          className="h-7 text-xs"
                        >
                          <RefreshCw className="h-3 w-3 mr-1" />
                          Retry
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => uploadManager.cancelBatch(batch.id)}
                        className="h-7 text-xs text-red-600 hover:text-red-700"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-gray-600">
                      <span>{completed + failed}/{totalFiles} files</span>
                      <span>{formatBytes(batch.uploadedBytes)} / {formatBytes(batch.totalBytes)}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-[#425146] h-2 rounded-full transition-all duration-300"
                        style={{
                          width: `${batch.totalBytes > 0 ? (batch.uploadedBytes / batch.totalBytes) * 100 : 0}%`
                        }}
                      />
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="flex items-center space-x-1 text-green-600">
                      <CheckCircle className="h-3 w-3" />
                      <span>{completed}</span>
                    </div>
                    {failed > 0 && (
                      <div className="flex items-center space-x-1 text-red-600">
                        <XCircle className="h-3 w-3" />
                        <span>{failed}</span>
                      </div>
                    )}
                    {remaining > 0 && (
                      <div className="flex items-center space-x-1 text-gray-600">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        <span>{remaining}</span>
                      </div>
                    )}
                  </div>

                  {isActive && (
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>{formatBytes(batch.averageSpeed)}/s</span>
                      <span>ETA: {calculateETA(batch)}</span>
                    </div>
                  )}

                  {/* Individual Files - Show all with scrolling when expanded */}
                  {isExpanded && (
                    <div className="space-y-2 mt-3 max-h-48 overflow-y-auto border-t border-gray-100 pt-3">
                      {batch.files.map(file => (
                      <div key={file.id} className="flex items-center space-x-2 text-xs min-w-0">
                        {file.status === 'success' && (
                          <CheckCircle className="h-3 w-3 text-green-600 flex-shrink-0" />
                        )}
                        {file.status === 'failed' && (
                          <XCircle className="h-3 w-3 text-red-600 flex-shrink-0" />
                        )}
                        {(file.status === 'uploading' || file.status === 'processing') && (
                          <Loader2 className="h-3 w-3 text-[#425146] animate-spin flex-shrink-0" />
                        )}
                        {file.status === 'queued' && (
                          <div className="h-3 w-3 rounded-full border-2 border-gray-300 flex-shrink-0" />
                        )}
                        <span className="truncate flex-1 text-gray-700 min-w-0 overflow-hidden text-ellipsis" title={file.file?.name}>
                          {file.file?.name || 'Unknown file'}
                        </span>
                        {file.status === 'uploading' && (
                          <span className="text-gray-500 flex-shrink-0 whitespace-nowrap">{file.progress}%</span>
                        )}
                        {file.status === 'processing' && (
                          <span className="text-gray-500 flex-shrink-0 whitespace-nowrap text-[10px]">Processing</span>
                        )}
                        {file.attempts > 1 && file.status !== 'success' && (
                          <span className="text-gray-400 flex-shrink-0">({file.attempts}/3)</span>
                        )}
                      </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
