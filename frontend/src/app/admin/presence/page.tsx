'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { adminApi } from '@/lib/admin-api'

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
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

    const fetchActiveUsers = useCallback(async () => {
        try {
            const response = await adminApi.getActiveUsers()
            if (response.success) {
                setActiveUsers(response.data.activeUsers)
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

    const formatUpdatedAgo = () => {
        if (!lastUpdated) return ''
        const diff = Math.floor((Date.now() - lastUpdated.getTime()) / 1000)
        if (diff < 5) return 'just now'
        if (diff < 60) return `${diff}s ago`
        return `${Math.floor(diff / 60)}m ago`
    }

    const getDeviceIcon = (deviceType: string | null) => {
        switch (deviceType) {
            case 'mobile': return '📱'
            case 'tablet': return '📲'
            default: return '💻'
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Active Users</h1>
                    <p className="text-sm text-muted-foreground">
                        Real-time user presence tracking
                    </p>
                </div>
                <div className="flex items-center gap-4">
                    <span className="text-sm text-muted-foreground">
                        Updated {formatUpdatedAgo()}
                    </span>
                    <button
                        onClick={fetchActiveUsers}
                        className="px-3 py-1 text-sm bg-primary/10 text-primary rounded-md hover:bg-primary/20"
                    >
                        Refresh
                    </button>
                </div>
            </div>

            {error && (
                <div className="p-4 bg-destructive/10 text-destructive rounded-lg">
                    {error}
                </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-card border border-border rounded-lg p-4">
                    <div className="text-3xl font-bold text-foreground">{activeUsers.length}</div>
                    <div className="text-sm text-muted-foreground">Active Users</div>
                </div>
                <div className="bg-card border border-border rounded-lg p-4">
                    <div className="text-3xl font-bold text-foreground">
                        {activeUsers.filter(u => u.galleryId).length}
                    </div>
                    <div className="text-sm text-muted-foreground">Viewing Galleries</div>
                </div>
                <div className="bg-card border border-border rounded-lg p-4">
                    <div className="text-3xl font-bold text-foreground">
                        {new Set(activeUsers.filter(u => u.galleryId).map(u => u.galleryId)).size}
                    </div>
                    <div className="text-sm text-muted-foreground">Active Galleries</div>
                </div>
            </div>

            {/* Users Table */}
            <div className="bg-card border border-border rounded-lg overflow-hidden">
                <table className="w-full">
                    <thead className="bg-muted/50">
                        <tr>
                            <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">User</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Gallery</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Device</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Browser</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">IP</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Last Seen</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {activeUsers.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                                    No active users at the moment
                                </td>
                            </tr>
                        ) : (
                            activeUsers.map((user) => (
                                <tr key={user.userId} className="hover:bg-muted/30">
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full bg-green-500"></div>
                                            <div>
                                                <div className="font-medium text-foreground">{user.userName}</div>
                                                <div className="text-xs text-muted-foreground">{user.userEmail}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        {user.galleryTitle ? (
                                            <span className="text-foreground">{user.galleryTitle}</span>
                                        ) : (
                                            <span className="text-muted-foreground">-</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-1">
                                            <span>{getDeviceIcon(user.device.type)}</span>
                                            <span className="text-sm text-foreground capitalize">
                                                {user.device.type || 'Desktop'}
                                            </span>
                                        </div>
                                        <div className="text-xs text-muted-foreground">{user.device.os || '-'}</div>
                                    </td>
                                    <td className="px-4 py-3 text-sm text-foreground">
                                        {user.device.browser || '-'}
                                        {user.device.browserVersion && (
                                            <span className="text-muted-foreground"> {user.device.browserVersion}</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-muted-foreground font-mono">
                                        {user.ipAddress || '-'}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-foreground">
                                        {formatLastSeen(user.lastSeenAt)}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Legend */}
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                    <span>Active (within 2 min)</span>
                </div>
                <span>•</span>
                <span>Auto-refreshes every 30 seconds</span>
            </div>
        </div>
    )
}
