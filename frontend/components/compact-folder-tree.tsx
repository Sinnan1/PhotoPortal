"use client";

import { useState, useMemo, useEffect } from "react";
import { ChevronRight, Folder } from "lucide-react";
import { SelectionCounter } from "@/components/ui/selection-counter";

interface Folder {
  id: string;
  name: string;
  children?: Folder[];
  _count?: {
    photos: number;
  };
}

interface CompactFolderTreeProps {
  folder: Folder;
  level: number;
  currentFolderId?: string;
  onFolderSelect: (folderId: string) => void;
  isFirst: boolean;
  showSelectionCounters?: boolean;
}

interface FolderTreeProps {
  folders: Folder[];
  currentFolderId?: string;
  onFolderSelect: (folderId: string) => void;
  showSelectionCounters?: boolean;
}

export function FolderTree({ folders, currentFolderId, onFolderSelect, showSelectionCounters = false }: FolderTreeProps) {
  // Get all child folder IDs to filter out duplicates at root level
  const allChildIds = useMemo(() => {
    const childIds = new Set<string>();
    
    const collectChildIds = (folder: Folder) => {
      if (folder.children) {
        folder.children.forEach(child => {
          childIds.add(child.id);
          collectChildIds(child);
        });
      }
    };
    
    folders.forEach(collectChildIds);
    return childIds;
  }, [folders]);

  // Filter out folders that are children of other folders
  const rootFolders = folders.filter(folder => !allChildIds.has(folder.id));

  return (
    <div>
      {rootFolders.map((folder, index) => (
        <CompactFolderTree
          key={folder.id}
          folder={folder}
          level={0}
          currentFolderId={currentFolderId}
          onFolderSelect={onFolderSelect}
          isFirst={index === 0}
          showSelectionCounters={showSelectionCounters}
        />
      ))}
    </div>
  );
}

export function CompactFolderTree({
  folder,
  level,
  currentFolderId,
  onFolderSelect,
  isFirst,
  showSelectionCounters = false
}: CompactFolderTreeProps) {
  const hasChildren = folder.children && folder.children.length > 0;
  const isActive = folder.id === currentFolderId;

  // Check if this folder contains the current folder (for auto-expansion)
  const containsCurrentFolder = useMemo(() => {
    if (!hasChildren || !currentFolderId) return false;

    const checkFolder = (folderToCheck: any): boolean => {
      if (folderToCheck.id === currentFolderId) return true;
      if (folderToCheck.children && folderToCheck.children.length > 0) {
        return folderToCheck.children.some((child: any) => checkFolder(child));
      }
      return false;
    };

    return checkFolder(folder);
  }, [folder, currentFolderId, hasChildren]);

  // Only auto-expand if it contains the current folder, not just because it's first
  const [isExpanded, setIsExpanded] = useState(containsCurrentFolder);

  // Update expansion state when current folder changes
  useEffect(() => {
    setIsExpanded(containsCurrentFolder);
  }, [containsCurrentFolder]);

  return (
    <div>
      <button
        onClick={() => {
          onFolderSelect(folder.id);
          if (hasChildren) setIsExpanded(!isExpanded);
        }}
        className={`
          w-full text-left px-2 py-1.5 rounded text-sm transition-colors hover:bg-accent/50
          ${isActive ? 'bg-accent text-accent-foreground font-medium' : 'text-muted-foreground hover:text-foreground'}
          ${level > 0 ? 'ml-4' : ''}
        `}
        style={{ paddingLeft: `${8 + level * 16}px` }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center min-w-0 flex-1">
            {hasChildren && (
              <ChevronRight
                className={`h-3 w-3 mr-1 transition-transform flex-shrink-0 ${
                  isExpanded ? 'rotate-90' : ''
                }`}
              />
            )}
            {!hasChildren && <div className="w-4 flex-shrink-0" />}
            <Folder className="h-3 w-3 mr-2 flex-shrink-0" />
            <span className="truncate">{folder.name}</span>
          </div>
          <span className="text-xs opacity-60 ml-2 flex-shrink-0">
            {folder._count?.photos ?? 0}
          </span>
        </div>
      </button>

      {/* Selection Counter */}
      {showSelectionCounters && (
        <div className="ml-6 mt-1 mb-2">
          <SelectionCounter
            folderId={folder.id}
            totalPhotos={folder._count?.photos || 0}
            compact={true}
            showBreakdown={false}
            className="text-xs"
          />
        </div>
      )}

      {hasChildren && isExpanded && (
        <div className="ml-2">
          {folder.children?.map((child) => (
            <CompactFolderTree
              key={child.id}
              folder={child}
              level={level + 1}
              currentFolderId={currentFolderId}
              onFolderSelect={onFolderSelect}
              isFirst={false}
              showSelectionCounters={showSelectionCounters}
            />
          ))}
        </div>
      )}
    </div>
  );
}