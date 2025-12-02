"use client"

import { useState, useEffect } from "react"
import { api } from "@/lib/api"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useToast } from "@/components/ui/toast"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
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
import type { Gallery } from "@/types"

interface GalleryGroupAssignmentModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    gallery: Gallery | null
}

export function GalleryGroupAssignmentModal({ open, onOpenChange, gallery }: GalleryGroupAssignmentModalProps) {
    const [groupId, setGroupId] = useState<string>("none")
    const { showToast } = useToast()
    const queryClient = useQueryClient()

    // Fetch available groups
    const { data: groups } = useQuery({
        queryKey: ['gallery-groups'],
        queryFn: () => api.getGalleryGroups(),
        enabled: open,
    })

    // Initialize groupId when gallery changes
    useEffect(() => {
        if (gallery) {
            setGroupId(gallery.groupId || "none")
        }
    }, [gallery])

    const updateGalleryMutation = useMutation({
        mutationFn: async (data: { groupId: string | null }) => {
            if (!gallery) return
            return api.updateGallery(gallery.id, data)
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['galleries'] })
            queryClient.invalidateQueries({ queryKey: ['gallery-groups'] })
            showToast("Gallery group updated successfully", "success")
            onOpenChange(false)
        },
        onError: (error) => {
            showToast(error instanceof Error ? error.message : "Failed to update gallery group", "error")
        },
    })

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!gallery) return

        updateGalleryMutation.mutate({
            groupId: groupId === "none" ? null : groupId,
        })
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Manage Event Group</DialogTitle>
                    <DialogDescription>
                        Assign this gallery to an event group or remove it from one.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit}>
                    <div className="grid gap-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="group">Event Group</Label>
                            <Select
                                value={groupId}
                                onValueChange={setGroupId}
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
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={updateGalleryMutation.isPending}>
                            {updateGalleryMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Save Changes
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
