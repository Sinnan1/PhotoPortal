"use client";

import { useCallback, useState } from "react";
import { adminApi } from "@/lib/admin-api";

interface StorageData {
    totalStorage: number;
    storageByType: Record<string, number>;
    totalPhotos?: number;
    totalGalleries?: number;
    avgFileSize?: number;
}

/**
 * Centralized hook for fetching B2 storage analytics across admin pages.
 * Uses the /analytics/storage-analytics endpoint to get accurate data.
 */
export function useStorageData() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [data, setData] = useState<StorageData>({
        totalStorage: 0,
        storageByType: {},
        totalPhotos: 0,
        totalGalleries: 0,
        avgFileSize: 0,
    });

    const fetchStorageData = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            const [galleriesResponse, analyticsResponse] = await Promise.all([
                adminApi.getAllGalleries({ limit: 1 }), // Just to get pagination total
                adminApi.getStorageAnalytics(),
            ]);

            const totalGalleries = galleriesResponse.data.pagination?.total || 0;
            const analytics = analyticsResponse.data;

            // Calculate total photos from galleries or estimate from storage
            let totalPhotos = 0;
            if (analytics.storageByUser) {
                totalPhotos = analytics.storageByUser.reduce(
                    (sum: number, user: any) => sum + (user.photoCount || 0),
                    0
                );
            }

            const totalStorage = Number(analytics.totalStorage) || 0;
            const avgFileSize = totalPhotos > 0 ? totalStorage / totalPhotos : 0;

            setData({
                totalStorage,
                storageByType: analytics.storageByType || {},
                totalPhotos,
                totalGalleries,
                avgFileSize,
            });
        } catch (err: any) {
            console.error("Failed to fetch storage data:", err);
            setError(err.message || "Failed to fetch storage data");
        } finally {
            setLoading(false);
        }
    }, []);

    return {
        loading,
        error,
        data,
        fetchStorageData,
        totalStorageBytes: data.totalStorage,
    };
}

/**
 * Utility function to format byte sizes to human-readable format.
 */
export function formatStorageSize(sizeInBytes: number): string {
    if (sizeInBytes < 1024) return `${sizeInBytes} B`;
    if (sizeInBytes < 1024 * 1024) return `${(sizeInBytes / 1024).toFixed(1)} KB`;
    if (sizeInBytes < 1024 * 1024 * 1024) return `${(sizeInBytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(sizeInBytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}
