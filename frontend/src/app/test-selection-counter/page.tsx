"use client"

import { useState } from "react"
import { SelectionCounter, useSelectionCounts } from "@/components/ui/selection-counter"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

// Mock data for testing
const mockFolders = [
  {
    id: "folder-1",
    name: "Wedding Ceremony",
    totalPhotos: 150,
    selectedCount: 25,
    likedCount: 20,
    favoritedCount: 8,
    postedCount: 3
  },
  {
    id: "folder-2", 
    name: "Reception",
    totalPhotos: 200,
    selectedCount: 45,
    likedCount: 35,
    favoritedCount: 15,
    postedCount: 5
  },
  {
    id: "folder-3",
    name: "Portraits",
    totalPhotos: 75,
    selectedCount: 0,
    likedCount: 0,
    favoritedCount: 0,
    postedCount: 0
  }
]

export default function TestSelectionCounterPage() {
  const [selectedFolder, setSelectedFolder] = useState(mockFolders[0])

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-4">Selection Counter Component Test</h1>
        <p className="text-muted-foreground">
          This page demonstrates the SelectionCounter component with different configurations.
        </p>
      </div>

      {/* Folder Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Test Folders</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 flex-wrap">
            {mockFolders.map((folder) => (
              <Button
                key={folder.id}
                variant={selectedFolder.id === folder.id ? "default" : "outline"}
                onClick={() => setSelectedFolder(folder)}
              >
                {folder.name}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Compact View */}
      <Card>
        <CardHeader>
          <CardTitle>Compact View</CardTitle>
        </CardHeader>
        <CardContent>
          <SelectionCounter
            folderId={selectedFolder.id}
            totalPhotos={selectedFolder.totalPhotos}
            selectedCount={selectedFolder.selectedCount}
            likedCount={selectedFolder.likedCount}
            favoritedCount={selectedFolder.favoritedCount}
            postedCount={selectedFolder.postedCount}
            compact={true}
            showBreakdown={true}
          />
        </CardContent>
      </Card>

      {/* Full View */}
      <Card>
        <CardHeader>
          <CardTitle>Full View</CardTitle>
        </CardHeader>
        <CardContent>
          <SelectionCounter
            folderId={selectedFolder.id}
            totalPhotos={selectedFolder.totalPhotos}
            selectedCount={selectedFolder.selectedCount}
            likedCount={selectedFolder.likedCount}
            favoritedCount={selectedFolder.favoritedCount}
            postedCount={selectedFolder.postedCount}
            compact={false}
            showProgress={true}
            showBreakdown={true}
          />
        </CardContent>
      </Card>

      {/* Full View with Progress */}
      <Card>
        <CardHeader>
          <CardTitle>Full View with Progress Bar</CardTitle>
        </CardHeader>
        <CardContent>
          <SelectionCounter
            folderId={selectedFolder.id}
            totalPhotos={selectedFolder.totalPhotos}
            selectedCount={selectedFolder.selectedCount}
            likedCount={selectedFolder.likedCount}
            favoritedCount={selectedFolder.favoritedCount}
            postedCount={selectedFolder.postedCount}
            compact={false}
            showProgress={true}
            showBreakdown={true}
          />
        </CardContent>
      </Card>

      {/* Multiple Folders Grid */}
      <Card>
        <CardHeader>
          <CardTitle>Multiple Folders (Compact)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {mockFolders.map((folder) => (
              <div key={folder.id} className="p-4 border rounded-lg">
                <h3 className="font-semibold mb-2">{folder.name}</h3>
                <SelectionCounter
                  folderId={folder.id}
                  totalPhotos={folder.totalPhotos}
                  selectedCount={folder.selectedCount}
                  likedCount={folder.likedCount}
                  favoritedCount={folder.favoritedCount}
                  postedCount={folder.postedCount}
                  compact={true}
                  showBreakdown={true}
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Real API Test */}
      <Card>
        <CardHeader>
          <CardTitle>Real API Test</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            This will attempt to fetch real data from the API. Make sure you're logged in and have access to galleries.
          </p>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Test with real folder ID:</label>
              <input 
                type="text" 
                placeholder="Enter folder ID" 
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                id="real-folder-id"
              />
              <Button 
                className="mt-2"
                onClick={() => {
                  const input = document.getElementById('real-folder-id') as HTMLInputElement
                  if (input.value) {
                    // This will trigger the component to fetch real data
                    setSelectedFolder({
                      id: input.value,
                      name: "Real Folder",
                      totalPhotos: 0,
                      selectedCount: 0,
                      likedCount: 0,
                      favoritedCount: 0,
                      postedCount: 0
                    })
                  }
                }}
              >
                Test Real API
              </Button>
            </div>
            
            {selectedFolder.id.startsWith('folder-') ? (
              <p className="text-sm text-muted-foreground">Using mock data</p>
            ) : (
              <SelectionCounter
                folderId={selectedFolder.id}
                totalPhotos={0}
                compact={false}
                showProgress={true}
                showBreakdown={true}
              />
            )}
          </div>
        </CardContent>
      </Card>

      {/* Hook Test */}
      <Card>
        <CardHeader>
          <CardTitle>useSelectionCounts Hook Test</CardTitle>
        </CardHeader>
        <CardContent>
          <SelectionCountsHookTest folderId={selectedFolder.id} />
        </CardContent>
      </Card>
    </div>
  )
}

// Component to test the useSelectionCounts hook
function SelectionCountsHookTest({ folderId }: { folderId: string }) {
  const { counts, loading, error, refreshCounts } = useSelectionCounts(folderId)

  if (loading) {
    return <div>Loading selection counts...</div>
  }

  if (error) {
    return <div className="text-destructive">Error: {error}</div>
  }

  return (
    <div className="space-y-2">
      <div className="text-sm">
        <strong>Hook Results:</strong>
      </div>
      <div className="text-sm space-y-1">
        <div>Selected: {counts.selectedCount}</div>
        <div>Liked: {counts.likedCount}</div>
        <div>Favorited: {counts.favoritedCount}</div>
        <div>Posted: {counts.postedCount}</div>
      </div>
      <Button size="sm" onClick={refreshCounts}>
        Refresh Counts
      </Button>
    </div>
  )
}