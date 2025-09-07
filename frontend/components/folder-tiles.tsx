"use client"

import { useState } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Folder, MoreHorizontal, Edit, Trash2, ImageIcon, ChevronDown, ChevronUp } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface Photo {
  id: string
  filename: string
  thumbnailUrl: string
  originalUrl: string
  createdAt: string
  likedBy: { userId: string }[]
  favoritedBy: { userId: string }[]
}

interface SubFolder {
  id: string
  name: string
  children: SubFolder[]
  photos: Photo[]
  coverPhoto?: Photo
  _count: {
    photos: number
    children: number
  }
}

interface FolderTilesProps {
  folders: SubFolder[]
  isPhotographer: boolean
  onFolderSelect: (folderId: string) => void
  onFolderRename?: (folderId: string, newName: string) => void
  onFolderDelete?: (folderId: string) => void
  onSetCoverPhoto?: (folderId: string, photoId: string) => void
}

export function FolderTiles({
  folders,
  isPhotographer,
  onFolderSelect,
  onFolderRename,
  onFolderDelete,
  onSetCoverPhoto,
}: FolderTilesProps) {
  const [foldersVisible, setFoldersVisible] = useState(true)

  const handleFolderClick = (folderId: string) => {
    onFolderSelect(folderId)
  }

  const handleFolderRename = (folderId: string, currentName: string) => {
    const newName = prompt("Enter new folder name:", currentName)
    if (newName && newName.trim() && newName !== currentName) {
      onFolderRename?.(folderId, newName.trim())
    }
  }

  const handleFolderDelete = (folderId: string, folderName: string) => {
    if (confirm(`Are you sure you want to delete "${folderName}" and all its contents?`)) {
      onFolderDelete?.(folderId)
    }
  }

  // Only show actions menu if handlers are provided
  const showActionsMenu = onFolderRename || onFolderDelete || onSetCoverPhoto

  if (!folders || folders.length === 0) {
    return null
  }

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-foreground">Folders</h2>
          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
            {folders.length}
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setFoldersVisible(!foldersVisible)}
          className="h-6 w-6 p-0 hover:bg-muted"
        >
          {foldersVisible ? (
            <ChevronUp className="h-3 w-3" />
          ) : (
            <ChevronDown className="h-3 w-3" />
          )}
        </Button>
      </div>

      <div className={`overflow-hidden transition-all duration-300 ease-in-out ${
        foldersVisible ? 'max-h-32 opacity-100' : 'max-h-0 opacity-0'
      }`}>
        <div className="flex gap-3 overflow-x-auto pb-3 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 dark:scrollbar-thumb-gray-600 dark:scrollbar-track-gray-800">
          {folders.map((folder) => (
            <div
              key={`folder-${folder.id}`}
              className="group relative flex-shrink-0 w-28 h-20 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-muted dark:to-muted/80 rounded-md overflow-hidden border border-gray-200 dark:border-border hover:shadow-sm hover:shadow-[#425146]/10 transition-all duration-200 cursor-pointer hover:scale-[1.02]"
              onClick={() => handleFolderClick(folder.id)}
            >
              {/* Cover Photo Background (if available) */}
              {folder.coverPhoto && (
                <div className="absolute inset-0 opacity-15">
                  <Image
                    src={folder.coverPhoto.thumbnailUrl}
                    alt={folder.coverPhoto.filename}
                    fill
                    className="object-cover"
                  />
                </div>
              )}

              {/* Folder Content */}
              <div className="absolute inset-0 flex flex-col items-center justify-center p-2">
                <Folder className="w-5 h-5 text-[#425146] mb-1" />
                <p className="text-xs font-medium text-gray-900 dark:text-white text-center truncate w-full leading-tight">
                  {folder.name || 'Unnamed'}
                </p>
                <p className="text-[10px] text-gray-600 dark:text-gray-400 leading-tight">
                  {folder._count?.photos ?? 0}
                </p>
              </div>

              {/* Actions Menu for Photographers */}
              {isPhotographer && showActionsMenu && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 bg-black/40 hover:bg-black/60 text-white h-4 w-4 p-0 z-20"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MoreHorizontal className="w-2.5 h-2.5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-40">
                    <DropdownMenuItem
                      onClick={() => handleFolderRename(folder.id, folder.name || 'Unnamed Folder')}
                      className="text-xs"
                    >
                      <Edit className="w-3 h-3 mr-2" />
                      Rename
                    </DropdownMenuItem>
                    {folder.coverPhoto && onSetCoverPhoto && (
                      <DropdownMenuItem
                        onClick={() => onSetCoverPhoto(folder.id, '')}
                        className="text-xs"
                      >
                        <ImageIcon className="w-3 h-3 mr-2" />
                        Remove Cover
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem
                      onClick={() => handleFolderDelete(folder.id, folder.name || 'Unnamed Folder')}
                      className="text-red-600 focus:text-red-600 text-xs"
                    >
                      <Trash2 className="w-3 h-3 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
