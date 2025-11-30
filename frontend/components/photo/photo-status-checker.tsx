"use client";

import { usePhotoStatus } from "@/hooks/usePhotoStatus";
import type { Photo } from "@/types";

interface PhotoStatusCheckerProps {
  photos: Photo[];
  onStatusUpdate: (photoId: string, status: { liked: boolean; favorited: boolean }) => void;
}

export function PhotoStatusChecker({ photos, onStatusUpdate }: PhotoStatusCheckerProps) {
  usePhotoStatus({ photos, onStatusUpdate });

  // This component doesn't render anything visible
  return null;
}
