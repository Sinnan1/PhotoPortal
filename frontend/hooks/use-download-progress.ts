import { useState, useCallback } from 'react';

interface DownloadProgressState {
  isActive: boolean;
  totalItems: number;
  processedItems: number;
  currentItem?: string;
  downloadId?: string;
  error?: string;
}

export function useDownloadProgress() {
  const [progressState, setProgressState] = useState<DownloadProgressState>({
    isActive: false,
    totalItems: 0,
    processedItems: 0,
  });

  const startProgress = useCallback((totalItems: number, downloadId?: string) => {
    setProgressState({
      isActive: true,
      totalItems,
      processedItems: 0,
      currentItem: undefined,
      downloadId,
      error: undefined,
    });
  }, []);

  const updateProgress = useCallback((processedItems: number, currentItem?: string) => {
    setProgressState(prev => ({
      ...prev,
      processedItems,
      currentItem,
    }));
  }, []);

  const completeProgress = useCallback(() => {
    setProgressState(prev => ({
      ...prev,
      isActive: false,
      processedItems: prev.totalItems,
    }));
  }, []);

  const errorProgress = useCallback((error: string) => {
    setProgressState(prev => ({
      ...prev,
      isActive: false,
      error,
    }));
  }, []);

  const resetProgress = useCallback(() => {
    setProgressState({
      isActive: false,
      totalItems: 0,
      processedItems: 0,
      downloadId: undefined,
    });
  }, []);

  return {
    progressState,
    startProgress,
    updateProgress,
    completeProgress,
    errorProgress,
    resetProgress,
  };
}