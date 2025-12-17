"use client";

import React from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Download, AlertTriangle, HardDrive } from "lucide-react";
import { formatBytes } from "@/lib/utils";

interface DownloadWarningModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void | Promise<void>;
  downloadType: string;
  photoCount: number;
  estimatedSize?: number; // in bytes
}

export function DownloadWarningModal({
  open,
  onOpenChange,
  onConfirm,
  downloadType,
  photoCount,
  estimatedSize,
}: DownloadWarningModalProps) {
  const handleConfirm = async () => {
    onOpenChange(false);
    await onConfirm();
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-[95vw] sm:max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center gap-2 sm:gap-3 mb-2">
            <div className="p-1.5 sm:p-2 bg-primary/10 rounded-full flex-shrink-0">
              <Download className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
            </div>
            <AlertDialogTitle className="text-lg sm:text-xl truncate">
              Download {downloadType}
            </AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-sm sm:text-base">
            You're about to download <strong>{photoCount}</strong> photo{photoCount !== 1 ? 's' : ''}.
          </AlertDialogDescription>

          {/* Download Size Info */}
          <div className="flex items-center gap-2 sm:gap-3 mt-3 sm:mt-4 p-3 sm:p-4 bg-muted/50 rounded-lg border">
            <div className="p-1.5 sm:p-2 bg-background rounded-full flex-shrink-0">
              <HardDrive className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
            </div>
            <div className="min-w-0">
              <div className="text-xs sm:text-sm text-muted-foreground">Estimated download size</div>
              <div className="text-base sm:text-lg font-semibold">
                {estimatedSize ? formatBytes(estimatedSize) : 'Calculating...'}
              </div>
            </div>
          </div>

          {photoCount > 50 && (
            <div className="flex items-start gap-2 mt-2 sm:mt-3 p-2 sm:p-3 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-900 rounded-lg">
              <AlertTriangle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-yellow-600 dark:text-yellow-500 mt-0.5 flex-shrink-0" />
              <p className="text-xs sm:text-sm text-yellow-800 dark:text-yellow-200">
                Large download: This may take several minutes. Please keep this tab open.
              </p>
            </div>
          )}

          {estimatedSize && estimatedSize > 500 * 1024 * 1024 && (
            <div className="flex items-start gap-2 mt-2 sm:mt-3 p-2 sm:p-3 bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-900 rounded-lg">
              <AlertTriangle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-orange-600 dark:text-orange-500 mt-0.5 flex-shrink-0" />
              <p className="text-xs sm:text-sm text-orange-800 dark:text-orange-200">
                Large file ({formatBytes(estimatedSize)}): Ensure you have enough storage and a stable connection.
              </p>
            </div>
          )}
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col-reverse sm:flex-row gap-2 sm:gap-3 mt-2">
          <AlertDialogCancel className="w-full sm:w-auto mt-0">Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirm} className="w-full sm:w-auto">
            <Download className="h-4 w-4 mr-2" />
            Start Download
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
