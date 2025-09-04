"use client";

import { useState } from "react";
import { ChevronRight, Folder } from "lucide-react";

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
}

export function CompactFolderTree({
  folder,
  level,
  currentFolderId,
  onFolderSelect,
  isFirst
}: CompactFolderTreeProps) {
  const [isExpanded, setIsExpanded] = useState(isFirst);
  const hasChildren = folder.children && folder.children.length > 0;
  const isActive = folder.id === currentFolderId;

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
            />
          ))}
        </div>
      )}
    </div>
  );
}
