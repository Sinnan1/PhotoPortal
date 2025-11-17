"use client";

import React, { useEffect, useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Monitor, Cable, Clock, CheckCircle2 } from "lucide-react";

interface ClientWelcomeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ClientWelcomeModal({
  open,
  onOpenChange,
}: ClientWelcomeModalProps) {
  const handleDismiss = () => {
    // Store in localStorage that user has seen the modal
    localStorage.setItem("clientWelcomeModalSeen", "true");
    onOpenChange(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center justify-center mb-4">
            <div className="p-3 bg-primary/10 rounded-full">
              <CheckCircle2 className="h-8 w-8 text-primary" />
            </div>
          </div>
          <AlertDialogTitle className="text-2xl text-center">
            Welcome to Your Gallery
          </AlertDialogTitle>
          <AlertDialogDescription className="text-base space-y-4 pt-2">
            <p className="text-center">
              For the best experience viewing and downloading your photos:
            </p>
            
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                <Monitor className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-foreground">Use a Computer</p>
                  <p className="text-sm">
                    Laptops, MacBooks, or desktops provide the best experience for viewing and downloading photos.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                <Cable className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-foreground">Wired Connection Recommended</p>
                  <p className="text-sm">
                    Use a wired ethernet connection or stable Wi-Fi to avoid interruptions during downloads.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                <Clock className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-foreground">Be Patient</p>
                  <p className="text-sm">
                    Photos are high-resolution and large in size. Downloads may take several minutes depending on your connection.
                  </p>
                </div>
              </div>
            </div>

            <p className="text-sm text-center text-muted-foreground pt-2">
              Following these tips will ensure smooth downloads and the best viewing experience.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction onClick={handleDismiss} className="w-full">
            Got it, thanks!
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
