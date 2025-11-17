"use client";

import React, { useState } from "react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Star, MessageSquare, ThumbsUp } from "lucide-react";
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
    <div className="space-y-2">
      <label className="text-sm font-medium">{label}</label>
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            className="transition-transform hover:scale-110"
          >
            <Star
              className={`h-8 w-8 ${
                star <= value
                  ? "fill-yellow-400 text-yellow-400"
                  : "text-gray-300"
              }`}
            />
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <AlertDialogHeader>
          <div className="flex items-center justify-center mb-4">
            <div className="p-3 bg-primary/10 rounded-full">
              <MessageSquare className="h-8 w-8 text-primary" />
            </div>
          </div>
          <AlertDialogTitle className="text-2xl text-center">
            We'd Love Your Feedback!
          </AlertDialogTitle>
          <AlertDialogDescription className="text-base text-center">
            Help us improve by sharing your experience working with {photographerName}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-6 py-4">
          <StarRating
            value={overallRating}
            onChange={setOverallRating}
            label="Overall Experience"
          />

          <StarRating
            value={selectionRating}
            onChange={setSelectionRating}
            label="Image Selection Process"
          />

          <StarRating
            value={portalRating}
            onChange={setPortalRating}
            label="Portal Experience"
          />

          <div className="space-y-2">
            <label className="text-sm font-medium">
              Would you recommend our service?
            </label>
            <div className="flex gap-3">
              <Button
                type="button"
                variant={wouldRecommend === true ? "default" : "outline"}
                onClick={() => setWouldRecommend(true)}
                className="flex-1"
              >
                <ThumbsUp className="h-4 w-4 mr-2" />
                Yes
              </Button>
              <Button
                type="button"
                variant={wouldRecommend === false ? "default" : "outline"}
                onClick={() => setWouldRecommend(false)}
                className="flex-1"
              >
                No
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">
              Additional Comments (Optional)
            </label>
            <textarea
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              placeholder="Tell us more about your experience..."
              className="w-full min-h-[100px] p-3 border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary"
              maxLength={1000}
            />
            <p className="text-xs text-muted-foreground text-right">
              {comments.length}/1000
            </p>
          </div>
        </div>

        <AlertDialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Skip for Now
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Submitting..." : "Submit Feedback"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
