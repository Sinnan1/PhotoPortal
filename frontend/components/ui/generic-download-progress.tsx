"use client";

import React, { useState, useEffect } from "react";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, XCircle, Loader2, Download } from "lucide-react";
import { formatDuration } from "@/lib/download-utils";

interface GenericDownloadProgressProps {
  isActive: boolean;
  totalItems: number;
  processedItems: number;
  currentItem?: string;
  downloadType: string;
  onComplete?: () => void;
  onError?: (error: string) => void;
  className?: string;
}

export function GenericDownloadProgress({
  isActive,
  totalItems,
  processedItems,
  currentItem,
  downloadType,
  onComplete,
  onError,
  className = ""
}: GenericDownloadProgressProps) {
  const [startTime] = useState(Date.now());
  const [hasCompleted, setHasCompleted] = useState(false);

  useEffect(() => {
    if (processedItems === totalItems && totalItems > 0 && isActive && !hasCompleted) {
      setHasCompleted(true);
      onComplete?.();
    }
  }, [processedItems, totalItems, isActive, hasCompleted]);

  // Reset completion flag when download starts again
  useEffect(() => {
    if (isActive && processedItems === 0) {
      setHasCompleted(false);
    }
  }, [isActive, processedItems]);

  if (!isActive) {
    return null;
  }

  const progress = totalItems > 0 ? Math.round((processedItems / totalItems) * 100) : 0;
  const isComplete = processedItems === totalItems && totalItems > 0;
  
  const getStatusIcon = () => {
    if (isComplete) {
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    }
    return <Download className="h-4 w-4 text-blue-500" />;
  };

  const getStatusText = () => {
    if (isComplete) {
      return `${downloadType} download complete!`;
    }
    return `Processing ${downloadType} (${processedItems}/${totalItems})`;
  };

  const getEstimatedTime = () => {
    if (processedItems === 0 || isComplete) return null;
    
    const elapsed = (Date.now() - startTime) / 1000;
    const rate = processedItems / elapsed;
    const remaining = (totalItems - processedItems) / rate;
    
    return formatDuration(remaining);
  };

  return (
    <div className={`space-y-2 p-3 bg-muted/50 rounded-lg border ${className}`}>
      <div className="flex items-center gap-2">
        {getStatusIcon()}
        <span className="text-sm font-medium">{getStatusText()}</span>
      </div>
      
      <div className="space-y-1">
        <Progress value={progress} className="h-2" />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{currentItem || `${downloadType} photos`}</span>
          <span>{progress}%</span>
        </div>
      </div>

      {!isComplete && getEstimatedTime() && (
        <div className="text-xs text-muted-foreground">
          Estimated time remaining: {getEstimatedTime()}
        </div>
      )}
    </div>
  );
}