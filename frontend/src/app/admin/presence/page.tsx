'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { adminApi } from '@/lib/admin-api'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { motion, AnimatePresence } from "framer-motion"
import {
    Users,
    Smartphone,
    Monitor,
    Tablet,
    Globe,
    Clock,
    MapPin,
    Eye,
    RefreshCw,
    Activity
} from "lucide-react"

interface ActiveUser {
    userId: string
    userName: string
    userEmail: string
    userRole: string
    galleryId: string | null
    galleryTitle: string | null
    lastSeenAt: string
    isOnline: boolean
    device: {
        browser: string | null
        browserVersion: string | null
        os: string | null
        type: string | null
    }
    ipAddress: string | null
}

export default function PresencePage() {
    const router = useRouter()
    const [activeUsers, setActiveUsers] = useState<ActiveUser[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [lastUpdated, setLastUpdated] = useState<Date>(new Date())

    const fetchActiveUsers = useCallback(async () => {
        try {
            const response = await adminApi.getActiveUsers()
            if (response.success) {
                // Sort users: Online first, then by last seen
                const sortedUsers = response.data.activeUsers.sort((a: ActiveUser, b: ActiveUser) => {
                    if (a.isOnline === b.isOnline) {
                        return new Date(b.lastSeenAt).getTime() - new Date(a.lastSeenAt).getTime();
                    }
                    return a.isOnline ? -1 : 1;
                });
                setActiveUsers(sortedUsers)
                setLastUpdated(new Date())
                setError(null)
            }
        } catch (err: any) {
            setError(err.message || 'Failed to fetch active users')
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchActiveUsers()

        // Auto-refresh every 30 seconds
        const interval = setInterval(fetchActiveUsers, 30000)

        return () => clearInterval(interval)
    }, [fetchActiveUsers])

    const formatLastSeen = (lastSeenAt: string) => {
        const diff = Date.now() - new Date(lastSeenAt).getTime()
        const seconds = Math.floor(diff / 1000)

        if (seconds < 60) return `${seconds}s ago`
        const minutes = Math.floor(seconds / 60)
        if (minutes < 60) return `${minutes}m ago`
        const hours = Math.floor(minutes / 60)
        return `${hours}h ago`
    }

    const getDeviceIcon = (deviceType: string | null) => {
        switch (deviceType?.toLowerCase()) {
            case 'mobile': return <Smartphone className="h-4 w-4" />;
            case 'tablet': return <Tablet className="h-4 w-4" />;
            default: return <Monitor className="h-4 w-4" />;
        }
    }

    const getRoleBadge = (role: string) => {
        switch (role) {
            case 'photographer': return "bg-blue-500/10 text-blue-500 border-blue-500/20";
            case 'admin': return "bg-purple-500/10 text-purple-500 border-purple-500/20";
            default: return "bg-green-500/10 text-green-500 border-green-500/20";
        }
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold font-audrey text-gray-900 dark:text-gray-100 flex items-center gap-3">
                        <Activity className="h-6 w-6 text-primary" />
                        Live Presence
                    </h1>
                    <p className="text-sm md:text-base text-gray-600 dark:text-gray-400 mt-1 flex items-center gap-2">
                        Real-time user monitoring
                        {activeUsers.some(u => u.isOnline) && (
                            <span className="flex h-2 w-2 relative">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                            </span>
                        )}
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground hidden md:inline-block">
                        Updated: {lastUpdated.toLocaleTimeString()}
                    </span>
                    <Button
                        onClick={() => { setLoading(true); fetchActiveUsers(); }}
                        variant="outline"
                        size="sm"
                        className="bg-background/20 backdrop-blur-md border-border/50 hover:bg-background/40 transition-all"
                    >
                        <RefreshCw className={`h-3.5 w-3.5 mr-2 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                </div>
            </motion.div>

            {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-500 rounded-lg text-sm">
                    {error}
                </div>
            )}

            {/* Overview Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                    { label: "Active Users", value: activeUsers.length, icon: Users, color: "text-blue-500" },
                    { label: "Viewing Galleries", value: activeUsers.filter(u => u.galleryId).length, icon: Eye, color: "text-amber-500" },
                    { label: "Active Galleries", value: new Set(activeUsers.filter(u => u.galleryId).map(u => u.galleryId)).size, icon: Activity, color: "text-purple-500" },
                ].map((stat, i) => (
                    <motion.div
                        key={i}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: i * 0.1 }}
                    >
                        <Card className="border-border/50 bg-background/50 backdrop-blur-sm">
                            <CardContent className="p-4 flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
                                    <h3 className="text-2xl font-bold font-audrey mt-1">{stat.value}</h3>
                                </div>
                                <div className={`p-3 rounded-full bg-background/10 ${stat.color}`}>                                    <stat.icon className="h-5 w-5" />
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                ))}
            </div>

            {/* Users Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                <AnimatePresence>
                    {activeUsers.length === 0 && !loading ? (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="col-span-full py-12 text-center text-muted-foreground"
                        >
                            <div className="w-16 h-16 bg-muted/30 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Users className="h-8 w-8 opacity-50" />
                            </div>
                            <p>No active users at the moment</p>
                        </motion.div>
                    ) : (
                        activeUsers.map((user) => (
                            <motion.div
                                key={user.userId}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                layout
                            >
                                <Card className={`h-full border-border/50 bg-background/50 backdrop-blur-sm overflow-hidden group hover:border-primary/20 transition-all duration-300 relative ${user.isOnline ? 'border-l-4 border-l-green-500' : ''}`}>
                                    <CardContent className="p-5">
                                        <div className="flex items-start justify-between mb-4">
                                            <div className="flex items-center gap-3">
                                                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center text-white font-bold text-sm shadow-md">
                                                    {user.userName?.charAt(0) || '?'}                                                </div>
                                                <div>
                                                    <h3 className="font-bold text-sm text-foreground">{user.userName}</h3>
                                                    <div className="flex items-center gap-2 mt-0.5">
                                                        <Badge variant="outline" className={`text-[10px] h-4 px-1.5 ${getRoleBadge(user.userRole)}`}>
                                                            {user.userRole}
                                                        </Badge>
                                                        {user.isOnline && (
                                                            <span className="text-[10px] text-green-500 flex items-center gap-1 font-medium animate-pulse">
                                                                <span className="block h-1.5 w-1.5 rounded-full bg-green-500"></span>
                                                                Live
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="flex items-center justify-end gap-1 text-muted-foreground" title={user.device.type || 'Desktop'}>
                                                    {getDeviceIcon(user.device.type)}
                                                </div>
                                                <p className="text-[10px] text-muted-foreground mt-1 font-mono">{formatLastSeen(user.lastSeenAt)}</p>
                                            </div>
                                        </div>

                                        <div className="space-y-3">
                                            {/* Current Activity */}
                                            <div className="p-3 bg-background/40 rounded-lg border border-border/50">
                                                <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1 flex items-center gap-1">
                                                    <Activity className="h-3 w-3" /> Current Activity
                                                </div>
                                                {user.galleryTitle ? (
                                                    <div className="flex items-center gap-2 text-sm font-medium text-primary">
                                                        <Eye className="h-3.5 w-3.5" />
                                                        Viewing "{user.galleryTitle}"
                                                    </div>
                                                ) : (
                                                    <div className="text-sm text-muted-foreground">Browsing portal</div>
                                                )}
                                            </div>

                                            {/* Tech Info */}
                                            <div className="grid grid-cols-2 gap-2 text-[10px] text-muted-foreground">
                                                <div className="flex items-center gap-1.5">
                                                    <Globe className="h-3 w-3" />
                                                    <span className="truncate" title={user.device.browser || 'Unknown'}>
                                                        {user.device.browser || 'Unknown'} {user.device.browserVersion || ''}
                                                    </span>                                                </div>
                                                <div className="flex items-center gap-1.5 justify-end">
                                                    <MapPin className="h-3 w-3" />
                                                    <span className="font-mono">{user.ipAddress || 'Unknown'}</span>                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>

                                    {/* Action footer could go here */}
                                </Card>
                            </motion.div>
                        ))
                    )}
                </AnimatePresence>
            </div>
        </div>
    )
}
