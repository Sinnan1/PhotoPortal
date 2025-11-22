"use client"

import { Button } from "@/components/ui/button"
import { Trash2, FileImage, Folder } from "lucide-react"
import { formatDistanceToNow } from "date-fns"

interface Photo {
  id: string
  filename: string
  fileSize?: number
  createdAt: string
}

interface ChildFolder {
  id: string
  name: string
  _count: {
    photos: number
    children: number
  }
}

interface Folder {
  id: string
  name: string
  children: ChildFolder[]
  photos: Photo[]
  _count: {
    photos: number
    children: number
  }
}

interface FileListProps {
  folder: Folder
  onPhotoDelete?: (photoId: string) => void
  onFolderSelect: (folderId: string) => void
  onFolderRename?: (folderId: string, newName: string) => void
  onFolderDelete?: (folderId: string) => void
}

export function FileList({
  folder,
  onPhotoDelete,
  onFolderSelect,
  onFolderRename,
  onFolderDelete,
}: FileListProps) {
  const formatBytes = (bytes?: number): string => {
    if (!bytes) return 'Unknown size'
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
  }

  const handleDelete = (photoId: string, filename: string) => {
    if (onPhotoDelete && confirm(`Are you sure you want to delete "${filename}"?`)) {
      onPhotoDelete(photoId)
    }
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

  return (
    <div className="space-y-2">
      {/* Subfolders */}
      {(folder.children || []).map((subfolder) => (
        <div
          key={`folder-${subfolder.id}`}
          className="flex items-center justify-between p-3 bg-muted/50 hover:bg-muted rounded-lg border border-border transition-colors cursor-pointer group"
          onClick={() => onFolderSelect(subfolder.id)}
        >
          <div className="flex items-center space-x-3 flex-1 min-w-0">
            <Folder className="h-5 w-5 text-primary flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {subfolder.name}
              </p>
              <p className="text-xs text-muted-foreground">
                {subfolder._count.photos} photos • {subfolder._count.children} subfolders
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
            {onFolderRename && (
              <Button
                size="sm"
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation()
                  handleFolderRename(subfolder.id, subfolder.name)
                }}
                className="h-8 text-xs"
              >
                Rename
              </Button>
            )}
            {onFolderDelete && (
              <Button
                size="sm"
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation()
                  handleFolderDelete(subfolder.id, subfolder.name)
                }}
                className="h-8 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>
      ))}

      {/* Photos */}
      {(folder.photos || []).map((photo) => (
        <div
          key={`photo-${photo.id}`}
          className="flex items-center justify-between p-3 bg-card hover:bg-muted/50 rounded-lg border border-border transition-colors group"
        >
          <div className="flex items-center space-x-3 flex-1 min-w-0">
            <FileImage className="h-5 w-5 text-muted-foreground flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {photo.filename}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatBytes(photo.fileSize)} • {formatDistanceToNow(new Date(photo.createdAt), { addSuffix: true })}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
            {onPhotoDelete && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleDelete(photo.id, photo.filename)}
                className="h-8 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="h-3.5 w-3.5 mr-1" />
                Delete
              </Button>
            )}
          </div>
        </div>
      ))}

      {/* Empty State */}
      {(folder.photos?.length || 0) === 0 && (folder.children?.length || 0) === 0 && (
        <div className="text-center py-12">
          <FileImage className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-2 text-sm font-medium text-foreground">
            This folder is empty
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Upload photos or create subfolders to get started.
          </p>
        </div>
      )}
    </div>
  )
}
