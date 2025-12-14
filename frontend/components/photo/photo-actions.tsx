"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Heart, Star, Share2 } from "lucide-react";
import { api } from "@/lib/api";
import { useToast } from "@/components/ui/use-toast";

interface PhotoActionsProps {
  photoId: string;
  initialLiked?: boolean;
  initialFavorited?: boolean;
  onUnpost?: () => void;
  onStatusChange?: (liked: boolean, favorited: boolean) => void;
  liked?: boolean;
  favorited?: boolean;
  onLikeToggle?: () => void;
  onFavoriteToggle?: () => void;
  className?: string;
}

export function PhotoActions({
  photoId,
  initialLiked = false,
  initialFavorited = false,
  onUnpost,
  onStatusChange,
  liked: controlledLiked,
  favorited: controlledFavorited,
  onLikeToggle,
  onFavoriteToggle,
  className = "",
}: PhotoActionsProps) {
  const [internalLiked, setInternalLiked] = useState(initialLiked);
  const [internalFavorited, setInternalFavorited] = useState(initialFavorited);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const isControlled = controlledLiked !== undefined && controlledFavorited !== undefined;
  const isLiked = isControlled ? controlledLiked : internalLiked;
  const isFavorited = isControlled ? controlledFavorited : internalFavorited;

  useEffect(() => {
    // Fetch initial status if not provided and not controlled
    if (!isControlled && (initialLiked === undefined || initialFavorited === undefined)) {
      fetchPhotoStatus();
    }
  }, [photoId, isControlled]);

  const fetchPhotoStatus = async () => {
    try {
      const response = await api.getPhotoStatus(photoId);
      const { liked: likedStatus, favorited: favoritedStatus } = response.data;
      setInternalLiked(likedStatus);
      setInternalFavorited(favoritedStatus);
      onStatusChange?.(likedStatus, favoritedStatus);
    } catch (error) {
      console.error("Failed to fetch photo status:", error);
    }
  };

  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (loading) return;

    if (onLikeToggle) {
      onLikeToggle();
      return;
    }

    setLoading(true);
    try {
      if (isLiked) {
        await api.unlikePhoto(photoId);
        setInternalLiked(false);
        onStatusChange?.(false, isFavorited!);
      } else {
        await api.likePhoto(photoId);
        setInternalLiked(true);
        onStatusChange?.(true, isFavorited!);
      }

      toast({
        title: !isLiked ? "Photo liked!" : "Photo unliked",
        description: !isLiked ? "Added to your liked photos" : "Removed from liked photos",
      });
    } catch (error) {
      console.error("Failed to like photo:", error);
      toast({
        title: "Error",
        description: "Failed to update like status",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFavorite = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (loading) return;

    if (onFavoriteToggle) {
      onFavoriteToggle();
      return;
    }

    setLoading(true);
    try {
      if (isFavorited) {
        await api.unfavoritePhoto(photoId);
        setInternalFavorited(false);
        onStatusChange?.(isLiked!, false);
      } else {
        await api.favoritePhoto(photoId);
        setInternalFavorited(true);
        onStatusChange?.(isLiked!, true);
      }

      toast({
        title: !isFavorited ? "Photo favorited!" : "Photo unfavorited",
        description: !isFavorited ? "Added to your favorites" : "Removed from favorites",
      });
    } catch (error) {
      console.error("Failed to favorite photo:", error);
      toast({
        title: "Error",
        description: "Failed to update favorite status",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`flex gap-2 ${className}`}>
      <Button
        size="sm"
        variant={isLiked ? "default" : "secondary"}
        onClick={handleLike}
        disabled={loading}
        data-action="like"
        title="Like photo (Press Q)"
        className={`transition-all duration-200 ${isLiked ? "bg-red-500 hover:bg-red-600" : ""
          }`}
      >
        <Heart
          className={`h-4 w-4 ${isLiked ? "fill-current" : ""}`}
        />
      </Button>

      <Button
        size="sm"
        variant={isFavorited ? "default" : "secondary"}
        onClick={handleFavorite}
        disabled={loading}
        data-action="favorite"
        title="Favorite photo (Press W)"
        className={`transition-all duration-200 ${isFavorited ? "bg-yellow-500 hover:bg-yellow-600" : ""
          }`}
      >
        <Star
          className={`h-4 w-4 ${isFavorited ? "fill-current" : ""}`}
        />
      </Button>

      {onUnpost && (
        <Button
          size="sm"
          variant="outline"
          onClick={(e) => {
            e.stopPropagation();
            onUnpost();
          }}
          disabled={loading}
          data-action="unpost"
          title="Remove from posts"
          className="transition-all duration-200 border-purple-500 text-purple-600 hover:bg-purple-50"
        >
          <Share2 className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}