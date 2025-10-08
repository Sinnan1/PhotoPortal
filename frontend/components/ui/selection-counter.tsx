"use client"

import * as React from "react"
import { useState, useEffect } from "react"
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Heart, Star, Share2, Images, Loader2 } from "lucide-react"

interface SelectionCounterProps {
  folderId: string
  totalPhotos: number
  selectedCount?: number
  likedCount?: number
  favoritedCount?: number
  postedCount?: number
  compact?: boolean
  showProgress?: boolean
  showBreakdown?: boolean
  className?: string
  onCountsUpdate?: (counts: {
    selectedCount: number
    likedCount: number
    favoritedCount: number
    postedCount: number
  }) => void
}

interface SelectionCounts {
  folderId: string
  folderName: string
  totalPhotos: number
  selectedPhotos: number
  likedPhotos: number
  favoritedPhotos: number
  postedPhotos: number
}

export const SelectionCounter = React.forwardRef<
  { refreshCounts: () => void },
  SelectionCounterProps
>(({
  folderId,
  totalPhotos,
  selectedCount: initialSelectedCount = 0,
  likedCount: initialLikedCount = 0,
  favoritedCount: initialFavoritedCount = 0,
  postedCount: initialPostedCount = 0,
  compact = false,
  showProgress = false,
  showBreakdown = false,
  className,
  onCountsUpdate
}, ref) => {
  const { user } = useAuth()
  const [counts, setCounts] = useState({
    selectedCount: initialSelectedCount,
    likedCount: initialLikedCount,
    favoritedCount: initialFavoritedCount,
    postedCount: initialPostedCount
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch selection counts from API
  const fetchSelectionCounts = async () => {
    if (!folderId || !user) return

    setLoading(true)
    setError(null)

    try {
      const token = getAuthToken()
      if (!token) {
        // No need to throw an error, just don't fetch
        setLoading(false)
        return
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/analytics/folder/${folderId}/selections`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch selection counts: ${response.statusText}`)
      }

      const data = await response.json()
      if (data.success && data.data) {
        const selectionData: SelectionCounts = data.data
        const newCounts = {
          selectedCount: selectionData.selectedPhotos,
          likedCount: selectionData.likedPhotos,
          favoritedCount: selectionData.favoritedPhotos,
          postedCount: selectionData.postedPhotos
        }
        
        setCounts(newCounts)
        onCountsUpdate?.(newCounts)
      }
    } catch (err) {
      console.error('Error fetching selection counts:', err)
      setError(err instanceof Error ? err.message : 'Failed to load selection counts')
    } finally {
      setLoading(false)
    }
  }

  // Expose refresh method through ref
  React.useImperativeHandle(ref, () => ({
    refreshCounts: fetchSelectionCounts
  }))

  // Initial load
  useEffect(() => {
    fetchSelectionCounts()
  }, [folderId])

  // Helper function to get auth token
  function getAuthToken() {
    if (typeof document === "undefined") return null

    // First try to get token from cookie
    const cookieToken = document.cookie
      .split("; ")
      .find((row) => row.startsWith("auth-token="))
      ?.split("=")[1]

    if (cookieToken) return cookieToken

    // Fallback: try to get token from localStorage
    try {
      const user = localStorage.getItem("user")
      if (user) {
        const userData = JSON.parse(user)
        const storedToken = localStorage.getItem("auth-token")
        if (storedToken) return storedToken
      }
    } catch (error) {
      console.error("Error reading from localStorage:", error)
    }

    return null
  }

  // Calculate progress percentage
  const progressPercentage = totalPhotos > 0 ? (counts.selectedCount / totalPhotos) * 100 : 0

  // Compact view for smaller spaces
  if (compact) {
    return (
      <div className={cn("flex items-center gap-2 text-sm", className)}>
        {loading ? (
          <div className="flex items-center gap-1 text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" />
            <span>Loading...</span>
          </div>
        ) : error ? (
          <div className="text-destructive text-xs">
            Error loading counts
          </div>
        ) : (
          <>
            <Badge variant="secondary" className="text-xs">
              {counts.selectedCount} / {totalPhotos}
            </Badge>
            {showBreakdown && counts.selectedCount > 0 && (
              <div className="flex items-center gap-1">
                {counts.likedCount > 0 && (
                  <div className="flex items-center gap-0.5 text-xs text-muted-foreground">
                    <Heart className="h-3 w-3 fill-current text-red-500" />
                    <span>{counts.likedCount}</span>
                  </div>
                )}
                {counts.favoritedCount > 0 && (
                  <div className="flex items-center gap-0.5 text-xs text-muted-foreground">
                    <Star className="h-3 w-3 fill-current text-yellow-500" />
                    <span>{counts.favoritedCount}</span>
                  </div>
                )}
                {counts.postedCount > 0 && (
                  <div className="flex items-center gap-0.5 text-xs text-muted-foreground">
                    <Share2 className="h-3 w-3 text-blue-500" />
                    <span>{counts.postedCount}</span>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    )
  }

  // Full view with more details
  return (
    <div className={cn("space-y-2", className)}>
      {loading ? (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Loading selection counts...</span>
        </div>
      ) : error ? (
        <div className="text-destructive text-sm">
          {error}
        </div>
      ) : (
        <>
          {/* Main counter display */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Images className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">
                {counts.selectedCount} selected out of {totalPhotos} total photos
              </span>
            </div>
            
            {counts.selectedCount > 0 && (
              <Badge variant="outline" className="text-xs">
                {progressPercentage.toFixed(1)}%
              </Badge>
            )}
          </div>

          {/* Progress bar */}
          {showProgress && totalPhotos > 0 && (
            <Progress 
              value={progressPercentage} 
              className="h-2"
            />
          )}

          {/* Detailed breakdown */}
          {showBreakdown && counts.selectedCount > 0 && (
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              {counts.likedCount > 0 && (
                <div className="flex items-center gap-1">
                  <Heart className="h-4 w-4 fill-current text-red-500" />
                  <span>{counts.likedCount} liked</span>
                </div>
              )}
              {counts.favoritedCount > 0 && (
                <div className="flex items-center gap-1">
                  <Star className="h-4 w-4 fill-current text-yellow-500" />
                  <span>{counts.favoritedCount} favorited</span>
                </div>
              )}
              {counts.postedCount > 0 && (
                <div className="flex items-center gap-1">
                  <Share2 className="h-4 w-4 text-blue-500" />
                  <span>{counts.postedCount} for posting</span>
                </div>
              )}
            </div>
          )}

          {/* Empty state */}
          {counts.selectedCount === 0 && totalPhotos > 0 && (
            <div className="text-sm text-muted-foreground">
              No photos selected yet
            </div>
          )}
        </>
      )}
    </div>
  )
})

SelectionCounter.displayName = "SelectionCounter"

// Hook for real-time selection count updates
export function useSelectionCounts(folderId: string) {
  const { user } = useAuth()
  const [counts, setCounts] = useState({
    selectedCount: 0,
    likedCount: 0,
    favoritedCount: 0,
    postedCount: 0
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchCounts = async () => {
    if (!folderId || !user) return

    setLoading(true)
    setError(null)

    try {
      const token = getAuthToken()
      if (!token) {
        // No need to throw an error, just don't fetch
        setLoading(false)
        return
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/analytics/folder/${folderId}/selections`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch selection counts: ${response.statusText}`)
      }

      const data = await response.json()
      if (data.success && data.data) {
        const selectionData: SelectionCounts = data.data
        setCounts({
          selectedCount: selectionData.selectedPhotos,
          likedCount: selectionData.likedPhotos,
          favoritedCount: selectionData.favoritedPhotos,
          postedCount: selectionData.postedPhotos
        })
      }
    } catch (err) {
      console.error('Error fetching selection counts:', err)
      setError(err instanceof Error ? err.message : 'Failed to load selection counts')
    } finally {
      setLoading(false)
    }
  }

  // Helper function to get auth token
  function getAuthToken() {
    if (typeof document === "undefined") return null

    const cookieToken = document.cookie
      .split("; ")
      .find((row) => row.startsWith("auth-token="))
      ?.split("=")[1]

    if (cookieToken) return cookieToken

    try {
      const user = localStorage.getItem("user")
      if (user) {
        const storedToken = localStorage.getItem("auth-token")
        if (storedToken) return storedToken
      }
    } catch (error) {
      console.error("Error reading from localStorage:", error)
    }

    return null
  }

  // Refresh function for manual updates
  const refreshCounts = () => {
    fetchCounts()
  }

  // Update counts when photo selections change
  const updateCounts = (photoId: string, changes: { liked?: boolean; favorited?: boolean; posted?: boolean }) => {
    setCounts(prev => {
      const newCounts = { ...prev }
      
      if (changes.liked !== undefined) {
        newCounts.likedCount += changes.liked ? 1 : -1
      }
      if (changes.favorited !== undefined) {
        newCounts.favoritedCount += changes.favorited ? 1 : -1
      }
      if (changes.posted !== undefined) {
        newCounts.postedCount += changes.posted ? 1 : -1
      }

      // Recalculate selected count (any photo with at least one selection)
      // Note: This is an approximation - for exact counts, call refreshCounts()
      const hasSelection = (changes.liked || changes.favorited || changes.posted)
      if (hasSelection !== undefined) {
        // This is a simplified update - for accuracy, use refreshCounts() after batch operations
        newCounts.selectedCount = Math.max(0, Math.max(newCounts.likedCount, newCounts.favoritedCount, newCounts.postedCount))
      }

      return newCounts
    })
  }

  useEffect(() => {
    fetchCounts()
  }, [folderId])

  return {
    counts,
    loading,
    error,
    refreshCounts,
    updateCounts
  }
}