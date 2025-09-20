"use client";

import React, { useState, useEffect } from "react";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, XCircle, Loader2, Download } from "lucide-react";
import { formatDownloadStatusMessage, estimateDownloadTime, formatDuration } from "@/lib/download-utils";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

function getAuthToken() {
    if (typeof document === "undefined") return null;

    const cookieToken = document.cookie
        .split("; ")
        .find((row) => row.startsWith("auth-token="))
        ?.split("=")[1];

    if (cookieToken) return cookieToken;

    try {
        const storedToken = localStorage.getItem("auth-token");
        if (storedToken) return storedToken;
    } catch (error) {
        console.error("Error reading from localStorage:", error);
    }

    return null;
}

interface DownloadProgressData {
    downloadId: string;
    status: 'preparing' | 'processing' | 'ready' | 'error';
    progress: number; // 0-100
    totalPhotos: number;
    processedPhotos: number;
    filename: string;
    error?: string;
    createdAt: string;
    updatedAt: string;
}

interface DownloadProgressProps {
    downloadId: string;
    onComplete: (filename: string) => void;
    onError: (error: string) => void;
    className?: string;
}

export function DownloadProgress({
    downloadId,
    onComplete,
    onError,
    className = ""
}: DownloadProgressProps) {
    const [progressData, setProgressData] = useState<DownloadProgressData | null>(null);
    const [isPolling, setIsPolling] = useState(true);
    const [hasCompleted, setHasCompleted] = useState(false);

    useEffect(() => {
        if (!downloadId || !isPolling) return;

        const pollProgress = async () => {
            try {
                const token = getAuthToken();
                if (!token) {
                    onError("Authentication required");
                    setIsPolling(false);
                    return;
                }

                const response = await fetch(`${API_BASE_URL}/photos/download/${downloadId}/progress`, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                    },
                });

                if (!response.ok) {
                    if (response.status === 404) {
                        // Download not found or expired
                        setIsPolling(false);
                        return;
                    }
                    throw new Error('Failed to fetch progress');
                }

                const data = await response.json();
                const progress = data.data as DownloadProgressData;
                setProgressData(progress);

                // Handle completion states
                if (progress.status === 'ready' && !hasCompleted) {
                    setHasCompleted(true);
                    setIsPolling(false);
                    onComplete(progress.filename);
                } else if (progress.status === 'error' && !hasCompleted) {
                    setHasCompleted(true);
                    setIsPolling(false);
                    onError(progress.error || 'Download failed');
                }
            } catch (error: any) {
                console.error('Failed to fetch download progress:', error);
                setIsPolling(false);
                onError(error.message || 'Failed to track progress');
            }
        };

        // Initial fetch
        pollProgress();

        // Set up polling interval
        const interval = setInterval(pollProgress, 1000); // Poll every second

        return () => {
            clearInterval(interval);
        };
    }, [downloadId, isPolling]); // Removed onComplete and onError from dependencies to prevent infinite loop

    if (!progressData) {
        return (
            <div className={`flex items-center gap-2 text-sm text-muted-foreground ${className}`}>
                <Loader2 className="h-4 w-4 animate-spin" />
                Initializing download...
            </div>
        );
    }

    const getStatusIcon = () => {
        switch (progressData.status) {
            case 'preparing':
                return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
            case 'processing':
                return <Download className="h-4 w-4 text-blue-500" />;
            case 'ready':
                return <CheckCircle className="h-4 w-4 text-green-500" />;
            case 'error':
                return <XCircle className="h-4 w-4 text-red-500" />;
            default:
                return <Loader2 className="h-4 w-4 animate-spin" />;
        }
    };

    const getStatusText = () => {
        if (progressData.status === 'error') {
            return `Error: ${progressData.error || 'Download failed'}`;
        }

        // Extract filter type from filename for better messaging
        const filterType = progressData.filename.includes('_liked_') ? 'liked' : 'favorited';
        return formatDownloadStatusMessage(
            progressData.status,
            progressData.processedPhotos,
            progressData.totalPhotos,
            filterType
        );
    };

    const getProgressValue = () => {
        if (progressData.status === 'ready') return 100;
        if (progressData.status === 'error') return 0;
        return progressData.progress;
    };

    const getProgressColor = () => {
        switch (progressData.status) {
            case 'ready':
                return 'bg-green-500';
            case 'error':
                return 'bg-red-500';
            default:
                return 'bg-blue-500';
        }
    };

    return (
        <div className={`space-y-2 p-3 bg-muted/50 rounded-lg border ${className}`}>
            <div className="flex items-center gap-2">
                {getStatusIcon()}
                <span className="text-sm font-medium">{getStatusText()}</span>
            </div>

            <div className="space-y-1">
                <Progress
                    value={getProgressValue()}
                    className="h-2"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{progressData.filename}</span>
                    <span>{getProgressValue()}%</span>
                </div>
            </div>

            {progressData.status === 'processing' && (
                <div className="text-xs text-muted-foreground">
                    Estimated time remaining: {
                        progressData.totalPhotos > 0 && progressData.processedPhotos > 0
                            ? formatDuration(estimateDownloadTime(progressData.totalPhotos, progressData.processedPhotos))
                            : 'Calculating...'
                    }
                </div>
            )}
        </div>
    );
}