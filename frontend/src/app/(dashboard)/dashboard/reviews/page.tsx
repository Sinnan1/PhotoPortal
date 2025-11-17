"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/components/ui/toast";
import { api } from "@/lib/api";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Star, MessageSquare, ThumbsUp, ThumbsDown, TrendingUp, Users } from "lucide-react";
import { Loader2 } from "lucide-react";

interface Feedback {
  id: string;
  overallRating: number;
  selectionProcessRating: number;
  portalExperienceRating: number;
  comments: string | null;
  wouldRecommend: boolean;
  createdAt: string;
  client: {
    id: string;
    name: string;
    email: string;
  };
}

export default function ReviewsPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.role === "PHOTOGRAPHER") {
      fetchFeedback();
    }
  }, [user]);

  const fetchFeedback = async () => {
    try {
      const response = await api.getAllFeedback();
      setFeedback(response.data);
    } catch (error) {
      showToast("Failed to load feedback", "error");
    } finally {
      setLoading(false);
    }
  };

  const calculateAverages = () => {
    if (feedback.length === 0) return { overall: 0, selection: 0, portal: 0 };
    
    const totals = feedback.reduce(
      (acc, f) => ({
        overall: acc.overall + f.overallRating,
        selection: acc.selection + f.selectionProcessRating,
        portal: acc.portal + f.portalExperienceRating,
      }),
      { overall: 0, selection: 0, portal: 0 }
    );

    return {
      overall: (totals.overall / feedback.length).toFixed(1),
      selection: (totals.selection / feedback.length).toFixed(1),
      portal: (totals.portal / feedback.length).toFixed(1),
    };
  };

  const recommendCount = feedback.filter((f) => f.wouldRecommend).length;
  const averages = calculateAverages();

  const StarRating = ({ rating }: { rating: number }) => (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`h-4 w-4 ${
            star <= rating
              ? "fill-yellow-400 text-yellow-400"
              : "text-gray-300"
          }`}
        />
      ))}
    </div>
  );

  if (user?.role !== "PHOTOGRAPHER") {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Access Denied</h1>
          <p className="text-muted-foreground mt-2">
            This page is only available to photographers.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Header */}
      <div className="mb-12">
        <h1 className="text-4xl font-bold tracking-tight mb-2">Client Reviews</h1>
        <p className="text-muted-foreground text-lg">
          Feedback from your clients about their experience
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : feedback.length === 0 ? (
        <div className="text-center py-20">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-muted/50 mb-6">
            <MessageSquare className="h-10 w-10 text-muted-foreground" />
          </div>
          <h3 className="text-xl font-semibold mb-2">No reviews yet</h3>
          <p className="text-muted-foreground max-w-sm mx-auto">
            Request feedback from your clients in the Clients page to start collecting reviews.
          </p>
        </div>
      ) : (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
            <Card className="border-2 hover:border-primary/20 transition-colors">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-yellow-100 dark:bg-yellow-950/30 rounded-2xl">
                    <Star className="h-6 w-6 text-yellow-600 dark:text-yellow-500" />
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">
                    Overall Rating
                  </p>
                  <p className="text-4xl font-bold tracking-tight">
                    {averages.overall}
                  </p>
                  <div className="flex items-center gap-1">
                    <StarRating rating={Math.round(Number(averages.overall))} />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-2 hover:border-primary/20 transition-colors">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-blue-100 dark:bg-blue-950/30 rounded-2xl">
                    <TrendingUp className="h-6 w-6 text-blue-600 dark:text-blue-500" />
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">
                    Selection Process
                  </p>
                  <p className="text-4xl font-bold tracking-tight">
                    {averages.selection}
                  </p>
                  <div className="flex items-center gap-1">
                    <StarRating rating={Math.round(Number(averages.selection))} />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-2 hover:border-primary/20 transition-colors">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-purple-100 dark:bg-purple-950/30 rounded-2xl">
                    <MessageSquare className="h-6 w-6 text-purple-600 dark:text-purple-500" />
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">
                    Portal Experience
                  </p>
                  <p className="text-4xl font-bold tracking-tight">
                    {averages.portal}
                  </p>
                  <div className="flex items-center gap-1">
                    <StarRating rating={Math.round(Number(averages.portal))} />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-2 hover:border-primary/20 transition-colors">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-green-100 dark:bg-green-950/30 rounded-2xl">
                    <ThumbsUp className="h-6 w-6 text-green-600 dark:text-green-500" />
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">
                    Would Recommend
                  </p>
                  <p className="text-4xl font-bold tracking-tight">
                    {Math.round((recommendCount / feedback.length) * 100)}%
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {recommendCount} of {feedback.length} clients
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Reviews List */}
          <Card className="border-2">
            <CardHeader className="border-b bg-muted/30">
              <CardTitle className="text-2xl">All Reviews</CardTitle>
              <CardDescription className="text-base">
                {feedback.length} review{feedback.length !== 1 ? "s" : ""} from your clients
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-6">
                {feedback.map((review) => (
                  <div
                    key={review.id}
                    className="p-6 border-2 rounded-xl hover:border-primary/20 transition-colors"
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-semibold mb-1">
                          {review.client.name}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {new Date(review.createdAt).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })}
                        </p>
                      </div>
                      <Badge
                        variant={review.wouldRecommend ? "default" : "secondary"}
                        className="gap-1"
                      >
                        {review.wouldRecommend ? (
                          <>
                            <ThumbsUp className="h-3 w-3" />
                            Recommends
                          </>
                        ) : (
                          <>
                            <ThumbsDown className="h-3 w-3" />
                            Not Recommended
                          </>
                        )}
                      </Badge>
                    </div>

                    {/* Ratings */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div className="flex items-center gap-3">
                        <div className="text-sm font-medium text-muted-foreground min-w-[120px]">
                          Overall
                        </div>
                        <StarRating rating={review.overallRating} />
                        <span className="text-sm font-semibold">
                          {review.overallRating}/5
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-sm font-medium text-muted-foreground min-w-[120px]">
                          Selection
                        </div>
                        <StarRating rating={review.selectionProcessRating} />
                        <span className="text-sm font-semibold">
                          {review.selectionProcessRating}/5
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-sm font-medium text-muted-foreground min-w-[120px]">
                          Portal
                        </div>
                        <StarRating rating={review.portalExperienceRating} />
                        <span className="text-sm font-semibold">
                          {review.portalExperienceRating}/5
                        </span>
                      </div>
                    </div>

                    {/* Comments */}
                    {review.comments && (
                      <div className="mt-4 p-4 bg-muted/50 rounded-lg">
                        <p className="text-sm leading-relaxed">{review.comments}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
