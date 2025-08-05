"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Heart, Star } from "lucide-react";
import { api } from "@/lib/api";
import { useToast } from "@/components/ui/use-toast";

interface PhotoActionsProps {
  photoId: string;
  initialLiked?: boolean;
  initialFavorited?: boolean;
  onStatusChange?: (liked: boolean, favorited: boolean) => void;
  className?: string;
}

export function PhotoActions({
  photoId,
  initialLiked = false,
  initialFavorited = false,
  onStatusChange,
  className = "",
}: PhotoActionsProps) {
  const [liked, setLiked] = useState(initialLiked);
  const [favorited, setFavorited] = useState(initialFavorited);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // Fetch initial status if not provided
    if (initialLiked === undefined || initialFavorited === undefined) {
      fetchPhotoStatus();
    }
  }, [photoId]);

  const fetchPhotoStatus = async () => {
    try {
      const response = await api.getPhotoStatus(photoId);
      const { liked: isLiked, favorited: isFavorited } = response.data;
      setLiked(isLiked);
      setFavorited(isFavorited);
      onStatusChange?.(isLiked, isFavorited);
    } catch (error) {
      console.error("Failed to fetch photo status:", error);
    }
  };

  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (loading) return;

    setLoading(true);
    try {
      const response = await api.likePhoto(photoId);
      const newLiked = response.data.liked;
      setLiked(newLiked);
      onStatusChange?.(newLiked, favorited);
      
      toast({
        title: newLiked ? "Photo liked!" : "Photo unliked",
        description: newLiked ? "Added to your liked photos" : "Removed from liked photos",
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

    setLoading(true);
    try {
      const response = await api.favoritePhoto(photoId);
      const newFavorited = response.data.favorited;
      setFavorited(newFavorited);
      onStatusChange?.(liked, newFavorited);
      
      toast({
        title: newFavorited ? "Photo favorited!" : "Photo unfavorited",
        description: newFavorited ? "Added to your favorites" : "Removed from favorites",
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
        variant={liked ? "default" : "secondary"}
        onClick={handleLike}
        disabled={loading}
        className={`transition-all duration-200 ${
          liked ? "bg-red-500 hover:bg-red-600" : ""
        }`}
      >
        <Heart 
          className={`h-4 w-4 ${liked ? "fill-current" : ""}`} 
        />
      </Button>
      
      <Button
        size="sm"
        variant={favorited ? "default" : "secondary"}
        onClick={handleFavorite}
        disabled={loading}
        className={`transition-all duration-200 ${
          favorited ? "bg-yellow-500 hover:bg-yellow-600" : ""
        }`}
      >
        <Star 
          className={`h-4 w-4 ${favorited ? "fill-current" : ""}`} 
        />
      </Button>
    </div>
  );
} 