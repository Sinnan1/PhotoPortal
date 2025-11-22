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
import { Download, AlertTriangle } from "lucide-react";

interface DownloadWarningModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  downloadType: string;
  photoCount: number;
}

export function DownloadWarningModal({
  open,
  onOpenChange,
  onConfirm,
  downloadType,
  photoCount,
}: DownloadWarningModalProps) {
  const handleConfirm = () => {
    onConfirm();
    onOpenChange(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-primary/10 rounded-full">
              <Download className="h-5 w-5 text-primary" />
            </div>
            <AlertDialogTitle className="text-xl">
              Download {downloadType}
            </AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-base">
            You're about to download <strong>{photoCount}</strong> photo{photoCount !== 1 ? 's' : ''}.
            This may take a few moments depending on the file sizes.
          </AlertDialogDescription>
          
          {photoCount > 50 && (
            <div className="flex items-start gap-2 mt-3 p-3 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-900 rounded-lg">
              <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-500 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                Large download: This may take several minutes. Please keep this tab open.
              </p>
            </div>
          )}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirm}>
            <Download className="h-4 w-4 mr-2" />
            Start Download
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
