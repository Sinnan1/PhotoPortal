"use client"

import { GallerySelectionSummary } from "@/components/ui/gallery-selection-summary"

// Mock data for testing
const mockFolderBreakdown = [
  {
    folderId: "folder1",
    folderName: "Barat Ceremony",
    totalPhotos: 150,
    selectedPhotos: 45,
    likedPhotos: 30,
    favoritedPhotos: 10,
    postedPhotos: 5
  },
  {
    folderId: "folder2", 
    folderName: "Walima Reception",
    totalPhotos: 200,
    selectedPhotos: 80,
    likedPhotos: 60,
    favoritedPhotos: 15,
    postedPhotos: 5
  },
  {
    folderId: "folder3",
    folderName: "Mehendi Night",
    totalPhotos: 100,
    selectedPhotos: 0,
    likedPhotos: 0,
    favoritedPhotos: 0,
    postedPhotos: 0
  }
]

export default function TestGallerySummaryPage() {
  return (
    <div className="container mx-auto p-6 space-y-8">
      <h1 className="text-2xl font-bold">Gallery Selection Summary Test</h1>
      
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold mb-4">Full View</h2>
          <GallerySelectionSummary
            galleryId="test-gallery-1"
            folderBreakdown={mockFolderBreakdown}
            totalSelections={125}
            totalPhotos={450}
            showFolderBreakdown={true}
            showProgress={true}
          />
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-4">Compact View</h2>
          <GallerySelectionSummary
            galleryId="test-gallery-2"
            folderBreakdown={mockFolderBreakdown}
            totalSelections={125}
            totalPhotos={450}
            compact={true}
            showProgress={true}
          />
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-4">Empty State</h2>
          <GallerySelectionSummary
            galleryId="test-gallery-3"
            folderBreakdown={[
              {
                folderId: "empty1",
                folderName: "Empty Folder",
                totalPhotos: 50,
                selectedPhotos: 0,
                likedPhotos: 0,
                favoritedPhotos: 0,
                postedPhotos: 0
              }
            ]}
            totalSelections={0}
            totalPhotos={50}
          />
        </div>
      </div>
    </div>
  )
}