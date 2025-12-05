import { Heart, Star, Activity } from "lucide-react";

interface ClientActivityMetricsProps {
    totalViews?: number;
    totalLikes?: number;
    totalFavorites?: number;
}

export function ClientActivityMetrics({
    totalViews = 0,
    totalLikes = 0,
    totalFavorites = 0
}: ClientActivityMetricsProps) {
    const hasActivity = totalViews > 0 || totalLikes > 0 || totalFavorites > 0;

    if (!hasActivity) {
        return (
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                No client activity yet
            </p>
        );
    }

    return (
        <div className="flex items-center gap-4 mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center text-xs text-gray-600 dark:text-gray-400">
                <Activity className="h-3 w-3 mr-1 text-blue-500" />
                <span className="font-medium">{totalViews}</span>
                <span className="ml-1">views</span>
            </div>
            <div className="flex items-center text-xs text-gray-600 dark:text-gray-400">
                <Heart className="h-3 w-3 mr-1 text-red-500" />
                <span className="font-medium">{totalLikes}</span>
                <span className="ml-1">likes</span>
            </div>
            <div className="flex items-center text-xs text-gray-600 dark:text-gray-400">
                <Star className="h-3 w-3 mr-1 text-yellow-500" />
                <span className="font-medium">{totalFavorites}</span>
                <span className="ml-1">favorites</span>
            </div>
        </div>
    );
}
