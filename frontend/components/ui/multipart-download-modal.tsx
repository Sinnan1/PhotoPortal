"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, HardDrive, Package } from "lucide-react";
import { formatBytes } from "@/lib/utils";

interface MultipartDownloadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  parts: Array<{
    part: number;
    filename: string;
    size: number;
    count: number;
    downloadUrl: string;
  }>;
}

export function MultipartDownloadModal({
  open,
  onOpenChange,
  parts,
}: MultipartDownloadModalProps) {

  // Calculate total stats
  const totalSize = parts.reduce((acc, part) => acc + part.size, 0);
  const totalCount = parts.reduce((acc, part) => acc + part.count, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 sm:gap-3 mb-2">
            <div className="p-1.5 sm:p-2 bg-primary/10 rounded-full flex-shrink-0">
              <Package className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
            </div>
            <DialogTitle className="text-lg sm:text-xl truncate">
              Multipart Download
            </DialogTitle>
          </div>
          <DialogDescription className="text-sm sm:text-base">
             Your download is large ({formatBytes(totalSize)}) and has been split into <strong>{parts.length} parts</strong> for better reliability.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 my-2 max-h-[60vh] overflow-y-auto">
           {parts.map((part) => (
             <div key={part.part} className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
                <div className="min-w-0">
                    <h4 className="font-medium text-sm truncate">Part {part.part}</h4>
                    <p className="text-xs text-muted-foreground">
                        {part.count} photos • {formatBytes(part.size)}
                    </p>
                </div>
                <Button
                    variant="outline"
                    size="sm"
                    asChild
                    className="ml-2 flex-shrink-0"
                >
                    <a href={part.downloadUrl} download={part.filename} target="_blank" rel="noopener noreferrer">
                        <Download className="h-4 w-4 sm:mr-2" />
                        <span className="hidden sm:inline">Download</span>
                    </a>
                </Button>
             </div>
           ))}
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="secondary" className="w-full sm:w-auto">Close</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
