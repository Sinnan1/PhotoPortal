"use client"

import * as React from "react"
import { useState, useEffect } from "react"
import { cn } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Heart, Star, Share2, Images, Loader2, FolderOpen, TrendingUp } from "lucide-react"

interface SelectionCounts {
  folderId: string
  folderName: string
  totalPhotos: number
  selectedPhotos: number
  likedPhotos: number
  favoritedPhotos: number
  postedPhotos: number
}

interface GallerySelectionSummaryProps {
  galleryId: string
  folderBreakdown?: SelectionCounts[]
  totalSelections?: number
  totalPhotos?: number
  showFolderBreakdown?: boolean
  showProgress?: boolean
  compact?: boolean
  className?: string
  onDataUpdate?: (data: {
    totalSelections: number
    totalPhotos: number
    folderBreakdown: SelectionCounts[]
  }) => void
}

interface GallerySelectionData {
  galleryId: string
  galleryTitle: string
  totalPhotos: number
  totalSelections: number
  folderBreakdown: SelectionCounts[]
  lastActivity: Date
}

export const GallerySelectionSummary = React.forwardRef<
  { refreshData: () => void },
  GallerySelectionSummaryProps
>(({
  galleryId,
  folderBreakdown: initialFolderBreakdown = [],
  totalSelections: initialTotalSelections = 0,
  totalPhotos: initialTotalPhotos = 0,
  showFolderBreakdown = true,
  showProgress = true,
  compact = false,
  className,
  onDataUpdate
}, ref) => {
  const [data, setData] = useState({
    totalSelections: initialTotalSelections,
    totalPhotos: initialTotalPhotos,
    folderBreakdown: initialFolderBreakdown
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch gallery selection data from API
  const fetchGallerySelections = async () => {
    if (!galleryId) return

    setLoading(true)
    setError(null)

    try {
      const token = getAuthToken()
      if (!token) {
        throw new Error("Authentication required")
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/analytics/gallery/${galleryId}/selections`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch gallery selections: ${response.statusText}`)
      }

      const result = await response.json()
      if (result.success && result.data) {
        const galleryData: GallerySelectionData = result.data
        const newData = {
          totalSelections: galleryData.totalSelections,
          totalPhotos: galleryData.totalPhotos,
          folderBreakdown: galleryData.folderBreakdown
        }
        
        setData(newData)
        onDataUpdate?.(newData)
      }
    } catch (err) {
      console.error('Error fetching gallery selections:', err)
      setError(err instanceof Error ? err.message : 'Failed to load gallery selections')
    } finally {
      setLoading(false)
    }
  }

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
        const storedToken = localStorage.getItem("auth-token")
        if (storedToken) return storedToken
      }
    } catch (error) {
      console.error("Error reading from localStorage:", error)
    }

    return null
  }  

  // Expose refresh method through ref
  React.useImperativeHandle(ref, () => ({
    refreshData: fetchGallerySelections
  }))

  // Initial load
  useEffect(() => {
    fetchGallerySelections()
  }, [galleryId])

  // Calculate overall progress percentage
  const overallProgressPercentage = data.totalPhotos > 0 ? (data.totalSelections / data.totalPhotos) * 100 : 0

  // Compact view for smaller spaces
  if (compact) {
    return (
      <div className={cn("flex items-center gap-3 p-3 bg-muted/50 rounded-lg", className)}>
        {loading ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">Loading...</span>
          </div>
        ) : error ? (
          <div className="text-destructive text-sm">
            Error loading summary
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <Images className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium text-sm">
                {data.totalSelections} photos selected
              </span>
            </div>
            
            {data.totalSelections > 0 && (
              <Badge variant="secondary" className="text-xs">
                {overallProgressPercentage.toFixed(1)}%
              </Badge>
            )}

            {showProgress && data.totalPhotos > 0 && (
              <div className="flex-1 max-w-24">
                <Progress value={overallProgressPercentage} className="h-1.5" />
              </div>
            )}
          </>
        )}
      </div>
    )
  }

  // Full view with detailed breakdown
  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Selection Summary
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {loading ? (
          <div className="flex items-center gap-2 text-muted-foreground py-4">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Loading selection summary...</span>
          </div>
        ) : error ? (
          <div className="text-destructive py-4">
            {error}
          </div>
        ) : (
          <>
            {/* Overall summary */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Images className="h-5 w-5 text-muted-foreground" />
                  <span className="font-medium">
                    {data.totalSelections} photos selected across all folders
                  </span>
                </div>
                
                {data.totalSelections > 0 && (
                  <Badge variant="outline">
                    {overallProgressPercentage.toFixed(1)}% of {data.totalPhotos} total
                  </Badge>
                )}
              </div>

              {/* Overall progress bar */}
              {showProgress && data.totalPhotos > 0 && (
                <Progress value={overallProgressPercentage} className="h-3" />
              )}

              {/* Empty state */}
              {data.totalSelections === 0 && data.totalPhotos > 0 && (
                <div className="text-center py-6 text-muted-foreground">
                  <Images className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No photos selected yet</p>
                  <p className="text-xs">Start selecting photos from the folders below</p>
                </div>
              )}
            </div>  
          {/* Folder breakdown */}
            {showFolderBreakdown && data.folderBreakdown.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <FolderOpen className="h-4 w-4" />
                  Breakdown by folder
                </div>
                
                <div className="space-y-3">
                  {data.folderBreakdown.map((folder) => {
                    const folderProgress = folder.totalPhotos > 0 ? (folder.selectedPhotos / folder.totalPhotos) * 100 : 0
                    
                    return (
                      <div key={folder.folderId} className="space-y-2 p-3 bg-muted/30 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <FolderOpen className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium text-sm">{folder.folderName}</span>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground">
                              {folder.selectedPhotos} / {folder.totalPhotos}
                            </span>
                            {folder.selectedPhotos > 0 && (
                              <Badge variant="secondary" className="text-xs">
                                {folderProgress.toFixed(1)}%
                              </Badge>
                            )}
                          </div>
                        </div>

                        {/* Folder progress bar */}
                        {showProgress && folder.totalPhotos > 0 && (
                          <Progress value={folderProgress} className="h-2" />
                        )}

                        {/* Selection type breakdown */}
                        {folder.selectedPhotos > 0 && (
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            {folder.likedPhotos > 0 && (
                              <div className="flex items-center gap-1">
                                <Heart className="h-3 w-3 fill-current text-red-500" />
                                <span>{folder.likedPhotos} liked</span>
                              </div>
                            )}
                            {folder.favoritedPhotos > 0 && (
                              <div className="flex items-center gap-1">
                                <Star className="h-3 w-3 fill-current text-yellow-500" />
                                <span>{folder.favoritedPhotos} favorited</span>
                              </div>
                            )}
                            {folder.postedPhotos > 0 && (
                              <div className="flex items-center gap-1">
                                <Share2 className="h-3 w-3 text-blue-500" />
                                <span>{folder.postedPhotos} for posting</span>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Empty folder state */}
                        {folder.selectedPhotos === 0 && folder.totalPhotos > 0 && (
                          <div className="text-xs text-muted-foreground">
                            No photos selected from this folder
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
})

GallerySelectionSummary.displayName = "GallerySelectionSummary"

// Hook for real-time gallery selection updates
export function useGallerySelections(galleryId: string) {
  const [data, setData] = useState({
    totalSelections: 0,
    totalPhotos: 0,
    folderBreakdown: [] as SelectionCounts[]
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = async () => {
    if (!galleryId) return

    setLoading(true)
    setError(null)

    try {
      const token = getAuthToken()
      if (!token) {
        throw new Error("Authentication required")
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/analytics/gallery/${galleryId}/selections`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch gallery selections: ${response.statusText}`)
      }

      const result = await response.json()
      if (result.success && result.data) {
        const galleryData: GallerySelectionData = result.data
        setData({
          totalSelections: galleryData.totalSelections,
          totalPhotos: galleryData.totalPhotos,
          folderBreakdown: galleryData.folderBreakdown
        })
      }
    } catch (err) {
      console.error('Error fetching gallery selections:', err)
      setError(err instanceof Error ? err.message : 'Failed to load gallery selections')
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
  const refreshData = () => {
    fetchData()
  }

  // Update data when folder selections change
  const updateFolderSelection = (folderId: string, changes: { 
    selectedPhotos?: number
    likedPhotos?: number
    favoritedPhotos?: number
    postedPhotos?: number
  }) => {
    setData(prev => {
      const newFolderBreakdown = prev.folderBreakdown.map(folder => {
        if (folder.folderId === folderId) {
          return {
            ...folder,
            selectedPhotos: changes.selectedPhotos ?? folder.selectedPhotos,
            likedPhotos: changes.likedPhotos ?? folder.likedPhotos,
            favoritedPhotos: changes.favoritedPhotos ?? folder.favoritedPhotos,
            postedPhotos: changes.postedPhotos ?? folder.postedPhotos
          }
        }
        return folder
      })

      // Recalculate total selections
      const newTotalSelections = newFolderBreakdown.reduce((sum, folder) => sum + folder.selectedPhotos, 0)

      return {
        ...prev,
        totalSelections: newTotalSelections,
        folderBreakdown: newFolderBreakdown
      }
    })
  }

  useEffect(() => {
    fetchData()
  }, [galleryId])

  return {
    data,
    loading,
    error,
    refreshData,
    updateFolderSelection
  }
}