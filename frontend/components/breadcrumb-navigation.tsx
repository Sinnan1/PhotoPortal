"use client"

import { ChevronRight, Home, Folder } from "lucide-react"
import { Button } from "@/components/ui/button"

interface BreadcrumbItem {
  id: string
  name: string
  type: 'gallery' | 'folder'
}

interface BreadcrumbNavigationProps {
  items: BreadcrumbItem[]
  onNavigate: (itemId: string, type: 'gallery' | 'folder') => void
  className?: string
}

export function BreadcrumbNavigation({
  items,
  onNavigate,
  className = ""
}: BreadcrumbNavigationProps) {
  if (items.length === 0) return null

  return (
    <nav className={`flex items-center space-x-1 text-sm text-gray-600 ${className}`}>
      {/* Home/Gallery Root */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onNavigate(items[0].id, 'gallery')}
        className="h-8 px-2 text-gray-600 hover:text-[#425146] hover:bg-gray-50"
      >
        <Home className="w-4 h-4 mr-1" />
        Gallery
      </Button>

      {/* Breadcrumb Items */}
      {items.slice(1).map((item, index) => (
        <div key={item.id} className="flex items-center">
          <ChevronRight className="w-4 h-4 text-gray-400 mx-1" />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onNavigate(item.id, item.type)}
            className="h-8 px-2 text-gray-600 hover:text-[#425146] hover:bg-gray-50 max-w-32"
          >
            <Folder className="w-4 h-4 mr-1 flex-shrink-0" />
            <span className="truncate">{item.name}</span>
          </Button>
        </div>
      ))}
    </nav>
  )
}

