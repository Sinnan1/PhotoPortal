'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Save, RotateCcw, Download, Upload, Clock, Settings, HardDrive, Shield, Users, Image as ImageIcon, ArrowDownCircle, ArrowUpCircle, Palette, Mail, ChevronRight } from 'lucide-react'
import ConfigurationForm from './ConfigurationForm'
import ConfigurationHistory from './ConfigurationHistory'
import ConfigurationBackup from './ConfigurationBackup'
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"

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
        return (
            <div className="flex items-center justify-center p-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        )
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
        { id: 'storage', name: 'Storage Settings', icon: HardDrive },
        { id: 'security', name: 'Security Settings', icon: Shield },
        { id: 'registration', name: 'User Registration', icon: Users },
        { id: 'gallery', name: 'Gallery Settings', icon: ImageIcon },
        { id: 'download', name: 'Download Settings', icon: ArrowDownCircle },
        { id: 'upload', name: 'Upload Settings', icon: ArrowUpCircle },
        { id: 'branding', name: 'Branding & UI', icon: Palette },
        { id: 'email', name: 'Email Settings', icon: Mail }
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
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-6"
            >
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold font-audrey text-foreground flex items-center gap-3">
                        <Settings className="h-6 w-6 text-primary" />
                        System Configuration
                    </h1>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Manage platform settings, security policies, and business rules
                    </p>
                </div>

                <AnimatePresence>
                    {hasUnsavedChanges && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="flex items-center gap-3 bg-amber-500/10 border border-amber-500/20 px-4 py-2 rounded-lg"
                        >
                            <span className="text-sm text-amber-500 font-medium">
                                {Object.keys(pendingChanges).length} unsaved change(s)
                            </span>
                            <div className="flex gap-2">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={handleDiscardChanges}
                                    className="h-8 text-amber-500 hover:text-amber-600 hover:bg-amber-500/10"
                                >
                                    Discard
                                </Button>
                                <Button
                                    size="sm"
                                    onClick={() => handleSaveChanges()}
                                    className="h-8 bg-amber-500 hover:bg-amber-600 text-white border-none"
                                >
                                    <Save className="h-3.5 w-3.5 mr-2" />
                                    Save Changes
                                </Button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>

            {/* Main Content Tabs */}
            <Tabs defaultValue="settings" value={activeTab} onValueChange={setActiveTab} className="w-full">
                <div className="w-full overflow-x-auto pb-2 scrollbar-none">
                    <TabsList className="bg-background/20 backdrop-blur-md border border-white/10 p-1 rounded-xl mb-4 flex w-max min-w-full">
                        <TabsTrigger value="settings" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary font-audrey tracking-wide px-6">
                            <Settings className="h-4 w-4 mr-2" /> Configuration Settings
                        </TabsTrigger>
                        <TabsTrigger value="history" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary font-audrey tracking-wide px-6">
                            <Clock className="h-4 w-4 mr-2" /> Change History
                        </TabsTrigger>
                        <TabsTrigger value="backup" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary font-audrey tracking-wide px-6">
                            <Save className="h-4 w-4 mr-2" /> Backup & Restore
                        </TabsTrigger>
                    </TabsList>
                </div>

                <TabsContent value="settings" className="space-y-6">
                    <div className="flex flex-col lg:flex-row gap-6 lg:h-[calc(100vh-250px)]">
                        {/* Sidebar */}
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="lg:w-72 flex-shrink-0 h-64 lg:h-full overflow-hidden flex flex-col gap-4"
                        >
                            <Card className="h-full border-border/50 bg-background/50 backdrop-blur-sm overflow-hidden flex flex-col">
                                <div className="p-4 border-b border-border/50">
                                    <div className="relative">
                                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            type="text"
                                            placeholder="Search settings..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            className="pl-9 bg-background/50 border-border/50 focus:ring-primary/50"
                                        />
                                    </div>
                                </div>

                                <div className="flex-1 overflow-y-auto p-2 space-y-1 scrollbar-thin scrollbar-thumb-border/50">
                                    {categories.map((category) => (
                                        <button
                                            key={category.id}
                                            onClick={() => setSelectedCategory(category.id)}
                                            className={`w-full flex items-center justify-between px-3 py-3 rounded-lg text-sm font-medium transition-all duration-200 group ${selectedCategory === category.id
                                                ? 'bg-primary/10 text-primary border border-primary/20'
                                                : 'text-muted-foreground hover:bg-white/5 hover:text-foreground'
                                                }`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <category.icon className={`h-4 w-4 ${selectedCategory === category.id ? 'text-primary' : 'text-muted-foreground/70 group-hover:text-foreground'}`} />
                                                <span>{category.name}</span>
                                            </div>
                                            {selectedCategory === category.id && (
                                                <motion.div layoutId="activeCategory" className="text-primary">
                                                    <ChevronRight className="h-3.5 w-3.5" />
                                                </motion.div>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </Card>
                        </motion.div>

                        {/* Main Form Area */}
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="flex-1 lg:h-full lg:overflow-hidden flex flex-col"
                        >
                            <Card className="h-full border-border/50 bg-background/50 backdrop-blur-sm flex flex-col overflow-hidden min-h-[500px]">
                                <div className="p-4 md:p-6 border-b border-border/50 flex justify-between items-center bg-white/5">
                                    <h2 className="text-lg font-bold font-audrey text-foreground flex items-center gap-2">
                                        {categories.find(c => c.id === selectedCategory)?.name}
                                    </h2>
                                    {Object.keys(pendingChanges).length > 0 && (
                                        <Badge variant="outline" className="border-amber-500/50 text-amber-500">
                                            Unsaved Changes
                                        </Badge>
                                    )}
                                </div>
                                <div className="flex-1 overflow-y-auto p-3 md:p-6 scrollbar-thin scrollbar-thumb-border/50">
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
                            </Card>
                        </motion.div>
                    </div>
                </TabsContent>

                <TabsContent value="history">
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                    >
                        <ConfigurationHistory />
                    </motion.div>
                </TabsContent>

                <TabsContent value="backup">
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                    >
                        <ConfigurationBackup
                            onExportConfiguration={onExportConfiguration}
                            onImportConfiguration={onImportConfiguration}
                        />
                    </motion.div>
                </TabsContent>
            </Tabs>
        </div>
    )
}