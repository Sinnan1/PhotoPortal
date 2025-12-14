import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Folder } from "@/types";

export function useFolderTree(galleryId: string) {
    return useQuery({
        queryKey: ["folder-tree", galleryId],
        queryFn: async () => {
            const response = await api.getFolderTree(galleryId);
            return response.data;
        },
        enabled: !!galleryId,
    });
}

export function useFolder(folderId: string) {
    return useQuery({
        queryKey: ["folder", folderId],
        queryFn: async () => {
            const response = await api.getFolder(folderId);
            return response.data as Folder;
        },
        enabled: !!folderId,
    });
}

export function useCreateFolder() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ galleryId, ...folderData }: { galleryId: string; name: string; parentId?: string }) =>
            api.createFolder(galleryId, folderData),
        onSuccess: (data, variables) => {
            queryClient.invalidateQueries({ queryKey: ["folder-tree"] });
            queryClient.invalidateQueries({ queryKey: ["gallery"] });
        },
    });
}

export function useRenameFolder() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ folderId, name }: { folderId: string; name: string }) => api.updateFolder(folderId, { name }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["folder-tree"] });
            queryClient.invalidateQueries({ queryKey: ["gallery"] });
        },
    });
}

export function useDeleteFolder() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (folderId: string) => api.deleteFolder(folderId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["folder-tree"] });
            queryClient.invalidateQueries({ queryKey: ["gallery"] });
        },
    });
}

export function useSetFolderCover() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ folderId, photoId }: { folderId: string; photoId?: string }) => api.setFolderCover(folderId, photoId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["folder-tree"] });
            queryClient.invalidateQueries({ queryKey: ["gallery"] });
        },
    });
}
