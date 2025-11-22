"use client";

import { useState, useEffect, useMemo } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Star, MessageSquare, ThumbsUp, ThumbsDown, TrendingUp, Users, Filter, ArrowUpDown, CheckCircle2 } from "lucide-react";
import { Loader2 } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from "recharts";

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

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-lg border bg-popover p-2 shadow-sm">
        <div className="grid grid-cols-2 gap-2">
          <div className="flex flex-col">
            <span className="text-[0.70rem] uppercase text-muted-foreground">
              Rating
            </span>
            <span className="font-bold text-muted-foreground">
              {label} ★
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-[0.70rem] uppercase text-muted-foreground">
              Count
            </span>
            <span className="font-bold">
              {payload[0].value}
            </span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

export default function ReviewsPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState("newest");
  const [filterRating, setFilterRating] = useState<string>("all");

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

  // Prepare data for the chart
  const ratingDistribution = useMemo(() => {
    const distribution = [
      { rating: 5, count: 0, color: "#22c55e" }, // Green
      { rating: 4, count: 0, color: "#84cc16" }, // Lime
      { rating: 3, count: 0, color: "#eab308" }, // Yellow
      { rating: 2, count: 0, color: "#f97316" }, // Orange
      { rating: 1, count: 0, color: "#ef4444" }, // Red
    ];

    feedback.forEach((f) => {
      const rating = Math.round(f.overallRating);
      const index = distribution.findIndex((d) => d.rating === rating);
      if (index !== -1) {
        distribution[index].count += 1;
      }
    });

    return distribution;
  }, [feedback]);

  // Filter and sort feedback
  const filteredFeedback = useMemo(() => {
    let result = [...feedback];

    // Filter by rating
    if (filterRating !== "all") {
      const rating = parseInt(filterRating);
      result = result.filter((f) => Math.round(f.overallRating) === rating);
    }

    // Sort
    switch (sortBy) {
      case "newest":
        result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
      case "oldest":
        result.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        break;
      case "highest":
        result.sort((a, b) => b.overallRating - a.overallRating);
        break;
      case "lowest":
        result.sort((a, b) => a.overallRating - b.overallRating);
        break;
    }

    return result;
  }, [feedback, sortBy, filterRating]);

  const StarRating = ({ rating }: { rating: number }) => (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`h-4 w-4 ${star <= rating
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
          <p className="text-muted-foreground max-w-sm mx-auto mb-6">
            Request feedback from your clients in the Clients page to start collecting reviews.
          </p>
        </div>
      ) : (
        <>
          {/* Stats Overview */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {/* Key Metrics */}
            <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-6">
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
                    <div className="p-3 bg-green-100 dark:bg-green-950/30 rounded-2xl">
                      <ThumbsUp className="h-6 w-6 text-green-600 dark:text-green-500" />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">
                      Recommendation Rate
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
            </div>

            {/* Rating Distribution Chart */}
            <Card className="border-2">
              <CardHeader>
                <CardTitle>Rating Distribution</CardTitle>
                <CardDescription>Breakdown of overall ratings</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[250px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={ratingDistribution}
                      layout="vertical"
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                      <XAxis type="number" hide />
                      <YAxis
                        dataKey="rating"
                        type="category"
                        tickFormatter={(value) => `${value} ★`}
                        width={40}
                      />
                      <Tooltip
                        cursor={{ fill: 'transparent' }}
                        content={<CustomTooltip />}
                      />
                      <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={20}>
                        {ratingDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Controls */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-bold tracking-tight">All Reviews</h2>
              <Badge variant="secondary" className="ml-2">
                {filteredFeedback.length}
              </Badge>
            </div>

            <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
              <Select value={filterRating} onValueChange={setFilterRating}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <Filter className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="Filter by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Ratings</SelectItem>
                  <SelectItem value="5">5 Stars Only</SelectItem>
                  <SelectItem value="4">4 Stars Only</SelectItem>
                  <SelectItem value="3">3 Stars Only</SelectItem>
                  <SelectItem value="2">2 Stars Only</SelectItem>
                  <SelectItem value="1">1 Star Only</SelectItem>
                </SelectContent>
              </Select>

              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <ArrowUpDown className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest First</SelectItem>
                  <SelectItem value="oldest">Oldest First</SelectItem>
                  <SelectItem value="highest">Highest Rated</SelectItem>
                  <SelectItem value="lowest">Lowest Rated</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Reviews List */}
          <div className="space-y-6">
            {filteredFeedback.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="p-4 bg-muted rounded-full mb-4">
                    <Filter className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold mb-1">No reviews match your filter</h3>
                  <p className="text-muted-foreground mb-4">
                    Try adjusting your filters to see more reviews.
                  </p>
                  <button
                    onClick={() => {
                      setFilterRating("all");
                      setSortBy("newest");
                    }}
                    className="text-primary hover:underline text-sm font-medium"
                  >
                    Clear all filters
                  </button>
                </CardContent>
              </Card>
            ) : (
              filteredFeedback.map((review) => (
                <Card key={review.id} className="border-2 hover:border-primary/20 transition-all duration-300">
                  <CardContent className="p-6">
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
                      <div className="flex items-start gap-4">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-lg">
                          {review.client.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-lg font-semibold">
                              {review.client.name}
                            </h3>
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5">
                              <CheckCircle2 className="h-3 w-3 mr-1 text-primary" />
                              Verified Client
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {new Date(review.createdAt).toLocaleDateString("en-US", {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            })}
                          </p>
                        </div>
                      </div>

                      <Badge
                        variant={review.wouldRecommend ? "default" : "secondary"}
                        className="self-start sm:self-center gap-1"
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
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 p-4 bg-muted/30 rounded-xl">
                      <div className="flex items-center justify-between md:justify-start md:gap-3">
                        <div className="text-sm font-medium text-muted-foreground">
                          Overall
                        </div>
                        <div className="flex items-center gap-2">
                          <StarRating rating={review.overallRating} />
                          <span className="text-sm font-bold">
                            {review.overallRating}/5
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between md:justify-start md:gap-3">
                        <div className="text-sm font-medium text-muted-foreground">
                          Selection
                        </div>
                        <div className="flex items-center gap-2">
                          <StarRating rating={review.selectionProcessRating} />
                          <span className="text-sm font-bold">
                            {review.selectionProcessRating}/5
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between md:justify-start md:gap-3">
                        <div className="text-sm font-medium text-muted-foreground">
                          Portal
                        </div>
                        <div className="flex items-center gap-2">
                          <StarRating rating={review.portalExperienceRating} />
                          <span className="text-sm font-bold">
                            {review.portalExperienceRating}/5
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Comments */}
                    {review.comments && (
                      <div className="relative">
                        <MessageSquare className="absolute top-0 left-0 h-4 w-4 text-muted-foreground/50" />
                        <p className="text-sm leading-relaxed pl-6 text-muted-foreground">
                          "{review.comments}"
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}
