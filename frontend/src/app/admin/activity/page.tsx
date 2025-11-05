'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface Activity {
  id: string
  action: string
  user: {
    id: string
    name: string
    email: string
    role: string
  }
  targetType: string | null
  targetId: string | null
  details: any
  timestamp: string
  ipAddress: string | null
}

interface ActivitySummary {
  totalLogins: number
  totalUploads: number
  totalDownloads: number
  totalLikes: number
  totalFavorites: number
  activeUsers: number
}

export default function ActivityPage() {
  const [activities, setActivities] = useState<Activity[]>([])
  const [summary, setSummary] = useState<ActivitySummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState('24h')
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [userFilter, setUserFilter] = useState<'ALL' | 'CLIENT' | 'PHOTOGRAPHER' | 'ADMIN'>('CLIENT')

  const fetchActivity = async () => {
    try {
      // Get token from cookie
      const token = document.cookie
        .split('; ')
        .find(row => row.startsWith('auth-token='))
        ?.split('=')[1]
      
      if (!token) {
        console.error('No auth token found')
        return
      }
      
      const [activityRes, summaryRes] = await Promise.all([
        fetch(`http://localhost:5000/api/admin/activity/recent?limit=50`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch(`http://localhost:5000/api/admin/activity/summary?timeRange=${timeRange}`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ])

      if (activityRes.ok && summaryRes.ok) {
        const activityData = await activityRes.json()
        const summaryData = await summaryRes.json()
        
        setActivities(activityData.data.activities)
        setSummary(summaryData.data.summary)
      }
    } catch (error) {
      console.error('Failed to fetch activity:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchActivity()
    
    if (autoRefresh) {
      const interval = setInterval(fetchActivity, 10000) // Refresh every 10 seconds
      return () => clearInterval(interval)
    }
  }, [timeRange, autoRefresh])

  // Filter activities by user role
  const filteredActivities = activities.filter(activity => {
    if (userFilter === 'ALL') return true
    return activity.user.role === userFilter
  })

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'USER_LOGIN':
      case 'CLIENT_LOGIN':
        return '🔐'
      case 'UPLOAD_PHOTOS':
        return '📤'
      case 'DOWNLOAD_PHOTOS':
        return '📥'
      case 'LIKE_PHOTO':
        return '❤️'
      case 'UNLIKE_PHOTO':
        return '💔'
      case 'FAVORITE_PHOTO':
        return '⭐'
      case 'UNFAVORITE_PHOTO':
        return '☆'
      case 'VIEW_GALLERY':
        return '👁️'
      case 'VIEW_PHOTO':
        return '🖼️'
      case 'DELETE_PHOTO':
        return '🗑️'
      default:
        return '📋'
    }
  }

  const getActionLabel = (action: string) => {
    return action.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())
  }

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    
    const seconds = Math.floor(diff / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)
    
    if (seconds < 60) return 'Just now'
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    if (days < 7) return `${days}d ago`
    
    return date.toLocaleDateString()
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">User Activity Monitor</h1>
          <p className="text-gray-600 mt-1">Real-time monitoring of user actions</p>
        </div>
        
        <div className="flex gap-4">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-4 py-2 border rounded-lg"
          >
            <option value="1h">Last Hour</option>
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
          </select>
          
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`px-4 py-2 rounded-lg ${
              autoRefresh ? 'bg-green-500 text-white' : 'bg-gray-200'
            }`}
          >
            {autoRefresh ? '🔄 Auto-refresh ON' : '⏸️ Auto-refresh OFF'}
          </button>
          
          <button
            onClick={fetchActivity}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            🔄 Refresh Now
          </button>
        </div>
      </div>

      {/* User Type Filter Tabs */}
      <div className="flex gap-2 border-b">
        <button
          onClick={() => setUserFilter('CLIENT')}
          className={`px-6 py-3 font-medium transition-colors ${
            userFilter === 'CLIENT'
              ? 'border-b-2 border-blue-500 text-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          👥 Clients Only
        </button>
        <button
          onClick={() => setUserFilter('PHOTOGRAPHER')}
          className={`px-6 py-3 font-medium transition-colors ${
            userFilter === 'PHOTOGRAPHER'
              ? 'border-b-2 border-blue-500 text-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          📸 Photographers Only
        </button>
        <button
          onClick={() => setUserFilter('ADMIN')}
          className={`px-6 py-3 font-medium transition-colors ${
            userFilter === 'ADMIN'
              ? 'border-b-2 border-blue-500 text-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          🔐 Admins Only
        </button>
        <button
          onClick={() => setUserFilter('ALL')}
          className={`px-6 py-3 font-medium transition-colors ${
            userFilter === 'ALL'
              ? 'border-b-2 border-blue-500 text-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          🌐 All Users
        </button>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Logins</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.totalLogins}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Uploads</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.totalUploads}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Downloads</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.totalDownloads}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Likes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.totalLikes}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Favorites</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.totalFavorites}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Active Users</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.activeUsers}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Activity Feed */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Live feed of user actions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {filteredActivities.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No recent activity for {userFilter === 'ALL' ? 'any users' : `${userFilter.toLowerCase()}s`}
              </div>
            ) : (
              filteredActivities.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-start gap-4 p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="text-2xl">{getActionIcon(activity.action)}</div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{activity.user.name}</span>
                      <span
                        className={`px-2 py-0.5 text-xs rounded-full font-medium ${
                          activity.user.role === 'CLIENT'
                            ? 'bg-blue-100 text-blue-700'
                            : activity.user.role === 'PHOTOGRAPHER'
                            ? 'bg-purple-100 text-purple-700'
                            : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {activity.user.role}
                      </span>
                      <span className="text-gray-600">{getActionLabel(activity.action)}</span>
                    </div>
                    
                    <div className="text-sm text-gray-500 mt-1">
                      {activity.user.email}
                    </div>
                    
                    {activity.details && Object.keys(activity.details).length > 0 && (
                      <div className="text-xs text-gray-400 mt-2 font-mono">
                        {JSON.stringify(activity.details, null, 2).slice(0, 100)}
                        {JSON.stringify(activity.details).length > 100 && '...'}
                      </div>
                    )}
                  </div>
                  
                  <div className="text-right text-sm text-gray-500 whitespace-nowrap">
                    <div>{formatTimestamp(activity.timestamp)}</div>
                    {activity.ipAddress && (
                      <div className="text-xs text-gray-400 mt-1">{activity.ipAddress}</div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
