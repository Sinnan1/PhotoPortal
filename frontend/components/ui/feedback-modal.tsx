"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Star, MessageSquare, ThumbsUp, Loader2, X } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { api } from "@/lib/api";

interface FeedbackModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  photographerName?: string;
}

export function FeedbackModal({
  open,
  onOpenChange,
  photographerName = "your photographer",
}: FeedbackModalProps) {
  const { showToast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [overallRating, setOverallRating] = useState(0);
  const [selectionRating, setSelectionRating] = useState(0);
  const [portalRating, setPortalRating] = useState(0);
  const [comments, setComments] = useState("");
  const [wouldRecommend, setWouldRecommend] = useState<boolean | null>(null);

  const handleSubmit = async () => {
    if (overallRating === 0 || selectionRating === 0 || portalRating === 0) {
      showToast("Please provide all ratings", "error");
      return;
    }

    if (wouldRecommend === null) {
      showToast("Please let us know if you'd recommend us", "error");
      return;
    }

    setSubmitting(true);
    try {
      await api.submitFeedback({
        overallRating,
        selectionProcessRating: selectionRating,
        portalExperienceRating: portalRating,
        comments,
        wouldRecommend,
      });

      showToast("Thank you for your feedback!", "success");
      onOpenChange(false);
    } catch (error) {
      showToast("Failed to submit feedback", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const StarRating = ({
    value,
    onChange,
    label,
  }: {
    value: number;
    onChange: (val: number) => void;
    label: string;
  }) => (
    <div className="space-y-4">
      <label className="text-base font-semibold block">{label}</label>
      <div className="flex gap-3 justify-center">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            onMouseEnter={(e) => {
              const btn = e.currentTarget;
              btn.style.transform = "scale(1.2) rotate(5deg)";
            }}
            onMouseLeave={(e) => {
              const btn = e.currentTarget;
              btn.style.transform = "scale(1) rotate(0deg)";
            }}
            className="transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-full p-1"
          >
            <Star
              className={`h-10 w-10 transition-all duration-200 ${
                star <= value
                  ? "fill-yellow-400 text-yellow-400 drop-shadow-lg"
                  : "text-gray-300 hover:text-gray-400"
              }`}
            />
          </button>
        ))}
      </div>
      {value > 0 && (
        <p className="text-center text-sm text-muted-foreground animate-in fade-in slide-in-from-bottom-2 duration-300">
          {value === 5 && "⭐ Excellent!"}
          {value === 4 && "😊 Great!"}
          {value === 3 && "👍 Good"}
          {value === 2 && "😐 Fair"}
          {value === 1 && "😞 Needs Improvement"}
        </p>
      )}
    </div>
  );

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm">
      <div className="w-full h-full overflow-hidden">
        {/* Full Page Layout with Two Columns */}
        <div className="grid grid-cols-1 lg:grid-cols-5 h-full bg-gradient-to-br from-background via-background to-muted/20">
          {/* Left Side - Beautiful Hero Section */}
          <div className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-8 flex flex-col justify-center items-center lg:col-span-2">
            {/* Close Button */}
            <button
              onClick={() => onOpenChange(false)}
              className="absolute top-4 right-4 p-2 rounded-full hover:bg-background/50 transition-colors z-10"
              aria-label="Close"
            >
              <X className="h-6 w-6" />
            </button>
            
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-primary/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
            
            <div className="relative z-10 text-center space-y-6">
              <div className="flex items-center justify-center mb-4">
                <div className="p-5 bg-gradient-to-br from-primary/20 to-primary/10 rounded-2xl shadow-2xl backdrop-blur-sm">
                  <MessageSquare className="h-12 w-12 text-primary" />
                </div>
              </div>
              
              <div className="space-y-3">
                <h2 className="text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
                  Portal Review & Feedback
                </h2>
                <p className="text-base leading-relaxed text-muted-foreground px-4">
                  Your thoughts help us improve. Share your experience working with{" "}
                  <span className="font-semibold text-foreground">{photographerName}</span>
                </p>
              </div>

              <div className="pt-6 space-y-3">
                <div className="flex items-center gap-3 p-3 bg-background/50 backdrop-blur-sm rounded-xl border border-border/50">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Star className="h-5 w-5 text-primary" />
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-sm">Quick & Easy</p>
                    <p className="text-xs text-muted-foreground">Takes less than 2 minutes</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-background/50 backdrop-blur-sm rounded-xl border border-border/50">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <ThumbsUp className="h-5 w-5 text-primary" />
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-sm">Your Voice Matters</p>
                    <p className="text-xs text-muted-foreground">Help us serve you better</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Side - Feedback Form */}
          <div className="flex flex-col h-full overflow-y-auto lg:col-span-3">
            <div className="flex-1 p-8 space-y-6">
              {/* Rating Sections in Grid */}
              <div className="grid grid-cols-1 gap-5">
                <div className="p-5 rounded-xl bg-gradient-to-br from-muted/50 to-muted/30 border border-border/50 hover:border-primary/30 transition-all duration-300">
                  <StarRating
                    value={selectionRating}
                    onChange={setSelectionRating}
                    label="Image Selection Process"
                  />
                </div>

                <div className="p-5 rounded-xl bg-gradient-to-br from-muted/50 to-muted/30 border border-border/50 hover:border-primary/30 transition-all duration-300">
                  <StarRating
                    value={portalRating}
                    onChange={setPortalRating}
                    label="Portal Experience"
                  />
                </div>

                <div className="p-5 rounded-xl bg-gradient-to-br from-muted/50 to-muted/30 border border-border/50 hover:border-primary/30 transition-all duration-300">
                  <StarRating
                    value={overallRating}
                    onChange={setOverallRating}
                    label="Overall Experience"
                  />
                </div>
              </div>

              {/* Recommendation Section */}
              <div className="space-y-3">
                <label className="text-base font-semibold block">
                  Would you recommend our service?
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    type="button"
                    variant={wouldRecommend === true ? "default" : "outline"}
                    onClick={() => setWouldRecommend(true)}
                    className="h-12 text-sm font-medium transition-all duration-300 hover:scale-105"
                  >
                    <ThumbsUp className="h-4 w-4 mr-2" />
                    Yes, Absolutely!
                  </Button>
                  <Button
                    type="button"
                    variant={wouldRecommend === false ? "default" : "outline"}
                    onClick={() => setWouldRecommend(false)}
                    className="h-12 text-sm font-medium transition-all duration-300 hover:scale-105"
                  >
                    Not Really
                  </Button>
                </div>
              </div>

              {/* Comments Section */}
              <div className="space-y-3">
                <label className="text-base font-semibold block">
                  Share Your Thoughts <span className="text-muted-foreground font-normal text-sm">(Optional)</span>
                </label>
                <div className="relative">
                  <textarea
                    value={comments}
                    onChange={(e) => setComments(e.target.value)}
                    placeholder="What did you love? What could be better? Your feedback helps us grow..."
                    className="w-full min-h-[100px] p-3 border-2 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-300 bg-background/50 backdrop-blur-sm text-sm"
                    maxLength={1000}
                  />
                  <p className="text-xs text-muted-foreground text-right mt-1">
                    {comments.length}/1000 characters
                  </p>
                </div>
              </div>
            </div>

            {/* Footer with Actions */}
            <div className="px-8 py-4 bg-muted/30 border-t flex items-center justify-between gap-4">
              <Button
                variant="ghost"
                onClick={() => onOpenChange(false)}
                disabled={submitting}
                className="text-muted-foreground hover:text-foreground"
              >
                Maybe Later
              </Button>
              <Button 
                onClick={handleSubmit} 
                disabled={submitting}
                className="px-6 font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Submit Feedback
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
