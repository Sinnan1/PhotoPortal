"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Wifi, Download, RefreshCw } from "lucide-react";

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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            Download Instructions
          </DialogTitle>
          <DialogDescription>
            Please read these important instructions before downloading
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-3">
              <Wifi className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium">Use a stable internet connection</p>
                <p className="text-muted-foreground">
                  We recommend using a laptop or desktop with a reliable wired or Wi-Fi connection.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Download className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium">Don't click repeatedly</p>
                <p className="text-muted-foreground">
                  Click the download button only once. The download will start automatically.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <RefreshCw className="h-5 w-5 text-orange-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium">Don't refresh or close the page</p>
                <p className="text-muted-foreground">
                  Keep this page open until the download completes. Refreshing will cancel the download.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-lg bg-muted p-3 text-sm">
            <p className="font-medium mb-1">Download Details:</p>
            <p className="text-muted-foreground">
              Type: <span className="font-medium text-foreground">{downloadType}</span>
            </p>
            <p className="text-muted-foreground">
              Photos: <span className="font-medium text-foreground">{photoCount}</span>
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button onClick={handleConfirm}>
            I Understand, Start Download
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
