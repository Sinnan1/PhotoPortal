'use client'

import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Info, AlertCircle, RefreshCw, Save, Check, RotateCcw, Clock } from 'lucide-react'
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

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

  // Stable key counter for array items (prevents AnimatePresence issues with index keys)
  const keyCounterRef = useRef(0)
  const arrayKeyMapRef = useRef<Map<string, Map<number, string>>>(new Map())

  const getStableKeyForArrayItem = (configKey: string, index: number, arrayLength: number) => {
    if (!arrayKeyMapRef.current.has(configKey)) {
      arrayKeyMapRef.current.set(configKey, new Map())
    }
    const itemKeyMap = arrayKeyMapRef.current.get(configKey)!

    // Clean up stale keys if array shrunk
    if (itemKeyMap.size > arrayLength) {
      const keysToDelete: number[] = []
      itemKeyMap.forEach((_, idx) => {
        if (idx >= arrayLength) keysToDelete.push(idx)
      })
      keysToDelete.forEach(idx => itemKeyMap.delete(idx))
    }

    if (!itemKeyMap.has(index)) {
      itemKeyMap.set(index, `item-${++keyCounterRef.current}`)
    }
    return itemKeyMap.get(index)!
  }

  const updateArrayKeyMap = (configKey: string, oldIndex: number, newArray: any[]) => {
    const itemKeyMap = arrayKeyMapRef.current.get(configKey)
    if (!itemKeyMap) return

    // When an item is removed, shift keys for items after it
    const newKeyMap = new Map<number, string>()
    let skipped = false
    itemKeyMap.forEach((key, idx) => {
      if (idx === oldIndex) {
        skipped = true
        return
      }
      newKeyMap.set(skipped ? idx - 1 : idx, key)
    })
    arrayKeyMapRef.current.set(configKey, newKeyMap)
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
            <div className="flex items-center gap-3">
              <Switch
                checked={currentValue || false}
                onCheckedChange={handleChange}
                className="data-[state=checked]:bg-primary"
              />
              <span className="text-sm text-foreground font-medium">
                {currentValue ? 'Enabled' : 'Disabled'}
              </span>
            </div>
          )

        case 'number':
          return (
            <div className="flex items-center gap-3">
              <Input
                type="number"
                value={currentValue || ''}
                onChange={(e) => handleChange(Number(e.target.value))}
                min={configSchema.min}
                max={configSchema.max}
                className="w-32 bg-background/50 border-border/50 focus:ring-primary/50"
              />
              {configSchema.min !== undefined && configSchema.max !== undefined && (
                <span className="text-xs text-muted-foreground bg-muted/30 px-2 py-1 rounded">
                  Max: {configSchema.max}
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
                className="flex h-10 w-full rounded-md border border-border/50 bg-background/50 px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="">Select an option...</option>
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
              <div className="flex items-center gap-3">
                <div className="relative group">
                  <input
                    type="color"
                    value={currentValue || '#000000'}
                    onChange={(e) => handleChange(e.target.value)}
                    className="h-10 w-12 border border-border/50 rounded cursor-pointer bg-background p-1"
                  />
                </div>
                <Input
                  type="text"
                  value={currentValue || ''}
                  onChange={(e) => handleChange(e.target.value)}
                  placeholder="#000000"
                  pattern="^#[0-9A-Fa-f]{6}$"
                  className="w-28 font-mono bg-background/50 border-border/50 focus:ring-primary/50"
                />
              </div>
            )
          }

          return (
            <Input
              type="text"
              value={currentValue || ''}
              onChange={(e) => handleChange(e.target.value)}
              className="w-full bg-background/50 border-border/50 focus:ring-primary/50"
            />
          )

        case 'array':
          const arrayValue = Array.isArray(currentValue) ? currentValue : []
          return (
            <div className="space-y-2">
              <AnimatePresence>
                {arrayValue.map((item: string, index: number) => (
                  <motion.div
                    key={getStableKeyForArrayItem(configKey, index, arrayValue.length)}
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="flex items-center gap-2"
                  >
                    <Input
                      type="text"
                      value={item}
                      onChange={(e) => {
                        const newArray = [...arrayValue]
                        newArray[index] = e.target.value
                        handleChange(newArray)
                      }}
                      className="flex-1 bg-background/50 border-border/50 focus:ring-primary/50"
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        updateArrayKeyMap(configKey, index, arrayValue)
                        const newArray = arrayValue.filter((_: any, i: number) => i !== index)
                        handleChange(newArray)
                      }}
                      className="text-destructive hover:bg-destructive/10 hover:text-destructive h-10 w-10 p-0"
                    >
                      ✕
                    </Button>
                  </motion.div>
                ))}
              </AnimatePresence>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleChange([...arrayValue, ''])}
                className="mt-2 text-primary border-primary/20 hover:bg-primary/5"
              >
                + Add Item
              </Button>
            </div>
          )

        default:
          return (
            <Input
              type="text"
              value={currentValue || ''}
              onChange={(e) => handleChange(e.target.value)}
              className="w-full bg-background/50 border-border/50 focus:ring-primary/50"
            />
          )
      }
    }

    return (
      <motion.div
        key={configKey}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`p-3 md:p-5 rounded-xl border transition-all duration-300 ${hasChanges ? 'border-amber-500/50 bg-amber-500/5 dark:bg-amber-500/10' : 'border-border/40 bg-background/30 hover:border-border/80'}`}
      >
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex-1 space-y-3">
            <div className="flex items-center justify-between sm:justify-start gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-medium text-foreground tracking-tight">
                  {configKey.split('.').pop()?.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                </h3>
                {hasChanges && (
                  <Badge variant="outline" className="border-amber-500/50 text-amber-500 bg-amber-500/10 text-[10px] h-5 px-1.5">
                    Modified
                  </Badge>
                )}
                {isDefault && (
                  <Badge variant="secondary" className="text-[10px] h-5 px-1.5 opacity-60">
                    Default
                  </Badge>
                )}
              </div>

              {/* Mobile Reset Button Position */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleResetWithReason(configKey)}
                disabled={isDefault}
                className="sm:hidden text-xs h-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10 -mr-2"
                title="Reset to default"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </Button>
            </div>

            <p className="text-sm text-muted-foreground leading-relaxed">
              {configSchema.description}
            </p>

            <div className="pt-2">
              {renderInput()}
            </div>

            {config.metadata && !config.metadata.isDefault && (
              <div className="flex items-center gap-2 pt-2 text-[10px] text-muted-foreground opacity-60">
                <Clock className="h-3 w-3" />
                <span>Last updated: {new Date(config.metadata.updatedAt).toLocaleDateString()}</span>
                {config.metadata.updatedBy && (
                  <span>by {config.metadata.updatedBy.name}</span>
                )}
              </div>
            )}
          </div>

          <div className="hidden sm:block flex-shrink-0 pt-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleResetWithReason(configKey)}
              disabled={isDefault}
              className="text-xs h-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
              title="Reset to default"
            >
              <RotateCcw className="h-3.5 w-3.5 mr-1" />
              Reset
            </Button>
          </div>
        </div>
      </motion.div>
    )
  }

  const configEntries = Object.entries(configurations)

  return (
    <div className="space-y-6 pb-20">
      {configEntries.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Info className="h-10 w-10 mx-auto mb-3 opacity-50" />
          <p>No configurations found for this category.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {configEntries.map(([configKey, config]) =>
            renderConfigInput(configKey, config)
          )}
        </div>
      )}

      {/* Reason Dialog */}
      <Dialog open={showReasonModal} onOpenChange={setShowReasonModal}>
        <DialogContent className="sm:max-w-[425px] bg-background/95 backdrop-blur-xl border-border/50">
          <DialogHeader>
            <DialogTitle className="font-audrey text-xl">
              {reasonModalType === 'save' ? 'Save Changes' : 'Confirm Reset'}
            </DialogTitle>
            <DialogDescription>
              {reasonModalType === 'save'
                ? 'Please provide a reason for these configuration changes for the audit log.'
                : 'Are you sure you want to reset this configuration to its default value?'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="reason">Reason (Optional)</Label>
              <Textarea
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g., Updated per security policy review..."
                className="bg-background/50"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReasonModal(false)}>Cancel</Button>
            <Button
              onClick={handleModalSubmit}
              className={reasonModalType === 'reset' ? "bg-destructive hover:bg-destructive/90" : ""}
              disabled={loading}
            >
              {loading && <RefreshCw className="mr-2 h-4 w-4 animate-spin" />}
              {reasonModalType === 'save' ? 'Confirm Save' : 'Confirm Reset'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
