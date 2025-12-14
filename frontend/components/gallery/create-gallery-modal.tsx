"use client"

import type React from "react"

import { useState } from "react"
import { api } from "@/lib/api"
import { useQuery } from "@tanstack/react-query"
import { useCreateGallery } from "@/hooks/queries/useGalleries"
import { useToast } from "@/components/ui/toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { PasswordInput } from "@/components/ui/password-input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Loader2 } from "lucide-react"

interface CreateGalleryModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function CreateGalleryModal({ open, onOpenChange, onSuccess }: CreateGalleryModalProps) {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    password: "",
    expiresAt: "",
    downloadLimit: "",
    groupId: "none",
  })

  // Fetch available groups
  const { data: groups } = useQuery({
    queryKey: ['gallery-groups'],
    queryFn: () => api.getGalleryGroups(),
    enabled: open,
  })

  const createGalleryMutation = useCreateGallery()
  const loading = createGalleryMutation.isPending
  const { showToast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const galleryData = {
        title: formData.title,
        description: formData.description,
        password: formData.password || undefined,
        expiresAt: formData.expiresAt || undefined,
        downloadLimit: formData.downloadLimit ? Number.parseInt(formData.downloadLimit) : undefined,
        groupId: formData.groupId === "none" ? undefined : formData.groupId,
      }

      await createGalleryMutation.mutateAsync(galleryData)
      showToast("Gallery created successfully!", "success")
      setFormData({
        title: "",
        description: "",
        password: "",
        expiresAt: "",
        downloadLimit: "",
        groupId: "none",
      })
      onSuccess()
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Failed to create gallery", "error")
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create New Gallery</DialogTitle>
          <DialogDescription>
            Create a new photo gallery for your clients. You can add photos after creation.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Gallery Title</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Enter gallery title"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="group">Event Group (Optional)</Label>
              <Select
                value={formData.groupId}
                onValueChange={(value) => setFormData({ ...formData, groupId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a group" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None (Ungrouped)</SelectItem>
                  {groups?.map((group: any) => (
                    <SelectItem key={group.id} value={group.id}>
                      {group.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Enter gallery description"
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password (Optional)</Label>
              <PasswordInput
                id="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="Set a password for this gallery"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="expiresAt">Expiry Date (Optional)</Label>
              <Input
                id="expiresAt"
                type="datetime-local"
                value={formData.expiresAt}
                onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="downloadLimit">Download Limit (Optional)</Label>
              <Input
                id="downloadLimit"
                type="number"
                value={formData.downloadLimit}
                onChange={(e) => setFormData({ ...formData, downloadLimit: e.target.value })}
                placeholder="Maximum number of downloads"
                min="1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {loading ? "Creating..." : "Create Gallery"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
