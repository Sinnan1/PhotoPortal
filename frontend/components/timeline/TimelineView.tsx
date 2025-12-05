import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { YearFolderCard } from "./YearFolderCard";
import { MonthFolderCard } from "./MonthFolderCard";
import { EventGroupCard } from "./EventGroupCard";
import { GalleryCardDetailed } from "./GalleryCardDetailed";
import { TimelineBreadcrumb } from "./TimelineBreadcrumb";
import { UncategorizedSection } from "./UncategorizedSection";
import { Gallery } from "@/types";
import { Loader2, Calendar, Plus, AlertCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import Image from "next/image";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GalleryGroupModal } from "./GalleryGroupModal";

interface TimelineViewProps {
    onGalleryClick: (galleryId: string) => void;
    onAddDate: (gallery: Gallery) => void;
}

export function TimelineView({ onGalleryClick, onAddDate }: TimelineViewProps) {
    const [selectedYear, setSelectedYear] = useState<number | null>(null);
    const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
    const [selectedMonthName, setSelectedMonthName] = useState<string | null>(null);
    const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
    const [selectedGroupName, setSelectedGroupName] = useState<string | null>(null);
    const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);

    // Fetch timeline structure
    const { data: timelineData, isLoading: isLoadingTimeline } = useQuery({
        queryKey: ['galleries', 'timeline'],
        queryFn: () => api.getGalleriesTimeline(),
    });

    // Fetch month galleries when year and month are selected
    const { data: monthData, isLoading: isLoadingMonth } = useQuery({
        queryKey: ['galleries', 'timeline', selectedYear, selectedMonth],
        queryFn: () => api.getGalleriesByYearMonth(selectedYear!, selectedMonth!),
        enabled: !!selectedYear && !!selectedMonth,
    });

    // Fetch group galleries when a group is selected
    // Fetch group galleries when a group is selected
    const {
        data: groupData,
        isLoading: isLoadingGroup,
        isError: isErrorGroup,
        refetch: refetchGroup
    } = useQuery({
        queryKey: ['gallery-group', selectedGroup],
        queryFn: () => api.getGalleryGroup(selectedGroup!),
        enabled: !!selectedGroup,
    });

    const handleYearClick = (year: number) => {
        setSelectedYear(year);
        setSelectedMonth(null);
        setSelectedMonthName(null);
        setSelectedGroup(null);
        setSelectedGroupName(null);
    };

    const handleMonthClick = (month: number, monthName: string) => {
        setSelectedMonth(month);
        setSelectedMonthName(monthName);
        setSelectedGroup(null);
        setSelectedGroupName(null);
    };

    const handleGroupClick = (groupId: string, groupName: string) => {
        setSelectedGroup(groupId);
        setSelectedGroupName(groupName);
    };

    const handleHomeClick = () => {
        setSelectedYear(null);
        setSelectedMonth(null);
        setSelectedMonthName(null);
        setSelectedGroup(null);
        setSelectedGroupName(null);
    };

    const isLoading = isLoadingTimeline ||
        (!!selectedYear && !!selectedMonth && isLoadingMonth) ||
        (!!selectedGroup && isLoadingGroup);

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center py-32">
                <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
                <p className="text-muted-foreground animate-pulse">Loading...</p>
            </div>
        );
    }

    if (isErrorGroup) {
        return (
            <div className="flex flex-col items-center justify-center py-32 text-center animate-in fade-in duration-300">
                <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mb-4">
                    <AlertCircle className="w-8 h-8 text-destructive" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Failed to load group</h3>
                <p className="text-muted-foreground mb-6 max-w-sm">
                    There was a problem loading the group details. Please try again.
                </p>
                <Button onClick={() => refetchGroup()} variant="outline">
                    Try Again
                </Button>
            </div>
        );
    }

    // Render Group View (Galleries within a selected group)
    if (selectedGroup && groupData) {
        return (
            <div className="animate-in fade-in duration-500">
                <TimelineBreadcrumb
                    year={selectedYear}
                    month={selectedMonth}
                    monthName={selectedMonthName}
                    groupName={selectedGroupName}
                    onYearClick={handleYearClick}
                    onMonthClick={() => handleMonthClick(selectedMonth!, selectedMonthName!)}
                    onHomeClick={handleHomeClick}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {groupData.galleries?.map((gallery: any) => (
                        <div
                            key={gallery.id}
                            className="group cursor-pointer"
                        >
                            <Link href={`/gallery/${gallery.id}`}>
                                <div className="relative aspect-[4/3] bg-muted rounded-2xl overflow-hidden shadow-sm hover:shadow-2xl transition-all duration-500 group-hover:-translate-y-1">
                                    {(() => {
                                        const coverPhoto = gallery.folders?.[0]?.coverPhoto;
                                        const coverUrl = coverPhoto?.thumbnailUrl || coverPhoto?.mediumUrl;

                                        if (coverUrl) {
                                            return (
                                                <Image
                                                    src={coverUrl}
                                                    alt={gallery.title}
                                                    fill
                                                    className="object-cover transition-transform duration-700 group-hover:scale-105"
                                                />
                                            );
                                        }

                                        return (
                                            <div className="w-full h-full flex items-center justify-center bg-muted">
                                                <span className="text-muted-foreground">No Cover</span>
                                            </div>
                                        );
                                    })()}
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                                </div>

                                <div className="mt-4 px-2">
                                    <h3 className="text-xl font-bold truncate group-hover:text-primary transition-colors duration-300">
                                        {gallery.title}
                                    </h3>
                                    <p className="text-sm text-muted-foreground mt-1">
                                        {gallery._count?.likedBy || 0} likes · {gallery._count?.favoritedBy || 0} favorites
                                    </p>
                                </div>
                            </Link>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    // Render Month View (Galleries in a specific month)
    if (selectedYear && selectedMonth && monthData) {
        return (
            <div className="animate-in fade-in duration-500">
                <TimelineBreadcrumb
                    year={selectedYear}
                    month={selectedMonth}
                    monthName={selectedMonthName}
                    onYearClick={handleYearClick}
                    onHomeClick={handleHomeClick}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {/* Galleries in this month */}
                    {monthData.ungroupedGalleries?.map((gallery: any) => (
                        <GalleryCardDetailed key={gallery.id} gallery={gallery} />
                    ))}
                </div>
            </div>
        );
    }

    // Render Year View (Months in a specific year)
    if (selectedYear) {
        const yearData = timelineData?.years.find((y: any) => y.year === selectedYear);

        return (
            <div className="animate-in fade-in duration-500">
                <TimelineBreadcrumb
                    year={selectedYear}
                    month={null}
                    monthName={null}
                    onYearClick={handleYearClick}
                    onHomeClick={handleHomeClick}
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
                    {yearData?.months.map((month: any) => (
                        <MonthFolderCard
                            key={month.month}
                            month={month.month}
                            monthName={month.monthName}
                            galleryCount={month.galleryCount}
                            onClick={() => handleMonthClick(month.month, month.monthName)}
                        />
                    ))}
                </div>
            </div>
        );
    }

    // Render Root View (Years)
    return (
        <div className="animate-in fade-in duration-500">
            {timelineData?.uncategorized && timelineData.uncategorized.length > 0 && (
                <UncategorizedSection
                    galleries={timelineData.uncategorized}
                    onAddDate={onAddDate}
                />
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
                {timelineData?.years.map((year: any) => (
                    <YearFolderCard
                        key={year.year}
                        year={year.year}
                        galleryCount={year.galleryCount}
                        onClick={() => handleYearClick(year.year)}
                    />
                ))}
            </div>

            {timelineData?.years.length === 0 && (!timelineData.uncategorized || timelineData.uncategorized.length === 0) && (
                <div className="text-center py-32 border-2 border-dashed border-muted rounded-3xl bg-muted/5">
                    <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto mb-6">
                        <Calendar className="w-10 h-10 text-muted-foreground" />
                    </div>
                    <h3 className="text-2xl font-bold mb-2">No galleries yet</h3>
                    <p className="text-muted-foreground max-w-sm mx-auto">
                        Create your first gallery to start building your timeline.
                    </p>
                </div>
            )}
        </div>
    );
}
