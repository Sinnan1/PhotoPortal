"use client"

import { useState, useEffect } from "react"
import { ChevronRight, ChevronDown, Folder, FolderOpen, Plus, MoreHorizontal, Edit, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { api } from "@/lib/api"
import { useToast } from "@/components/ui/toast"

interface Folder {
  id: string
  name: string
  children: Folder[]
  photos: { id: string; filename: string; thumbnailUrl: string }[]
  coverPhoto?: { id: string; filename: string; thumbnailUrl: string }
  _count: {
    photos: number
    children: number
  }
}

interface FolderTreeProps {
  galleryId: string
  onFolderSelect: (folderId: string) => void
  selectedFolderId?: string
  onFolderCreate?: (parentId?: string) => void
  onFolderRename?: (folderId: string, newName: string) => void
  onFolderDelete?: (folderId: string) => void
}

export function FolderTree({
  galleryId,
  onFolderSelect,
  selectedFolderId,
  onFolderCreate,
  onFolderRename,
  onFolderDelete
}: FolderTreeProps) {
  const [folders, setFolders] = useState<Folder[]>([])
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const { showToast } = useToast()

  useEffect(() => {
    fetchFolders()
  }, [galleryId])

  const fetchFolders = async () => {
    try {
      const response = await api.getFolderTree(galleryId)
      setFolders(response.data)
      // Auto-expand root level folders
      const rootIds = response.data.map((folder: Folder) => folder.id)
      setExpandedFolders(new Set(rootIds))
    } catch (error) {
      showToast("Failed to load folders", "error")
    } finally {
      setLoading(false)
    }
  }

  const toggleExpanded = (folderId: string) => {
    const newExpanded = new Set(expandedFolders)
    if (newExpanded.has(folderId)) {
      newExpanded.delete(folderId)
    } else {
      newExpanded.add(folderId)
    }
    setExpandedFolders(newExpanded)
  }

  const handleFolderClick = (folderId: string) => {
    onFolderSelect(folderId)
  }

  const handleCreateSubfolder = (parentId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    onFolderCreate?.(parentId)
  }

  const handleRename = (folderId: string, currentName: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const newName = prompt("Enter new folder name:", currentName)
    if (newName && newName.trim() && newName !== currentName) {
      onFolderRename?.(folderId, newName.trim())
    }
  }

  const handleDelete = (folderId: string, folderName: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (confirm(`Are you sure you want to delete "${folderName}" and all its contents?`)) {
      onFolderDelete?.(folderId)
    }
  }

  const renderFolder = (folder: Folder, level: number = 0) => {
    const isExpanded = expandedFolders.has(folder.id)
    const isSelected = selectedFolderId === folder.id
    const hasChildren = folder.children.length > 0
    const indent = level * 20

    return (
      <div key={folder.id}>
        <div
          className={`
            flex items-center py-2 px-3 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg mx-2 cursor-pointer group
            ${isSelected ? 'bg-[#425146]/10 border border-[#425146]/20' : ''}
          `}
          style={{ paddingLeft: `${12 + indent}px` }}
          onClick={() => handleFolderClick(folder.id)}
        >
          {/* Expand/Collapse Icon */}
          <div className="flex items-center justify-center w-5 h-5 mr-2">
            {hasChildren ? (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  toggleExpanded(folder.id)
                }}
                className="hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
              >
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4 text-gray-500" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-gray-500" />
                )}
              </button>
            ) : (
              <div className="w-4 h-4" />
            )}
          </div>

          {/* Folder Icon */}
          <div className="flex items-center justify-center w-5 h-5 mr-2">
            {isExpanded ? (
              <FolderOpen className="w-4 h-4 text-[#425146]" />
            ) : (
              <Folder className="w-4 h-4 text-[#425146]" />
            )}
          </div>

          {/* Folder Name */}
          <span className="flex-1 text-sm font-medium truncate">
            {folder.name}
          </span>

          {/* Photo Count */}
          <span className="text-xs text-gray-500 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-full mr-2">
            {folder._count.photos}
          </span>

          {/* Actions Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="opacity-0 group-hover:opacity-100 h-6 w-6 p-0"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="w-3 h-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={(e) => handleCreateSubfolder(folder.id, e)}>
                <Plus className="w-4 h-4 mr-2" />
                New Subfolder
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => handleRename(folder.id, folder.name, e)}>
                <Edit className="w-4 h-4 mr-2" />
                Rename
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => handleDelete(folder.id, folder.name, e)}
                className="text-red-600 focus:text-red-600"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Children */}
        {isExpanded && hasChildren && (
          <div>
            {folder.children.map((child) => renderFolder(child, level + 1))}
          </div>
        )}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="space-y-2 p-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="py-2">
      {/* Header with Create Root Folder Button */}
      <div className="px-4 pb-3 border-b border-gray-200 dark:border-gray-700 mb-2">
        <Button
          onClick={() => onFolderCreate?.()}
          size="sm"
          className="w-full bg-[#425146] hover:bg-[#425146]/90"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Folder
        </Button>
      </div>

      {/* Folder Tree */}
      <div className="space-y-1">
        {folders.length === 0 ? (
          <div className="text-center py-8 px-4">
            <Folder className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-sm text-gray-500">No folders yet</p>
            <p className="text-xs text-gray-400 mt-1">Create your first folder to get started</p>
          </div>
        ) : (
          folders.map((folder) => renderFolder(folder))
        )}
      </div>
    </div>
  )
}

