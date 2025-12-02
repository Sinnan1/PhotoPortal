import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { YearFolderCard } from "./YearFolderCard";
import { MonthFolderCard } from "./MonthFolderCard";
import { TimelineBreadcrumb } from "./TimelineBreadcrumb";
import { UncategorizedSection } from "./UncategorizedSection";
import { Gallery } from "@/types";
import { Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import Image from "next/image";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

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
    const { data: groupData, isLoading: isLoadingGroup } = useQuery({
        queryKey: ['gallery-group', selectedGroup],
        queryFn: async () => {
            const response = await fetch(`/api/gallery-groups/${selectedGroup}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            if (!response.ok) throw new Error('Failed to fetch group');
            return response.json();
        },
        enabled: !!selectedGroup,
    });

    const handleYearClick = (year: number) => {
        setSelectedYear(year);
        setSelectedMonth(null);
        setSelectedMonthName(null);
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
            <div className="flex justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    // Render Group View (Galleries within a specific group)
    if (selectedGroup && groupData) {
        return (
            <div className="animate-in fade-in duration-300">
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
                    {groupData.galleries.map((gallery: any) => (
                        <Card
                            key={gallery.id}
                            className="group overflow-hidden hover:shadow-xl transition-all duration-300 border-2 hover:border-primary/20 cursor-pointer"
                        >
                            <Link href={`/gallery/${gallery.id}`}>
                                <div className="relative aspect-[4/3] bg-muted overflow-hidden">
                                    {gallery.coverPhoto ? (
                                        <Image
                                            src={gallery.coverPhoto}
                                            alt={gallery.title}
                                            fill
                                            className="object-cover group-hover:scale-105 transition-transform duration-500"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center bg-muted">
                                            <span className="text-muted-foreground">No Cover</span>
                                        </div>
                                    )}
                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300" />
                                </div>
                                <CardContent className="p-4">
                                    <h3 className="font-bold truncate mb-1 group-hover:text-primary transition-colors">
                                        {gallery.title}
                                    </h3>
                                    {gallery.shootDate && (
                                        <p className="text-xs text-muted-foreground">
                                            {new Date(gallery.shootDate).toLocaleDateString(undefined, {
                                                weekday: 'long',
                                                year: 'numeric',
                                                month: 'long',
                                                day: 'numeric'
                                            })}
                                        </p>
                                    )}
                                </CardContent>
                            </Link>
                        </Card>
                    ))}
                </div>
            </div>
        );
    }

    // Render Month View (Galleries in a specific month)
    if (selectedYear && selectedMonth && monthData) {
        return (
            <div className="animate-in fade-in duration-300">
                <TimelineBreadcrumb
                    year={selectedYear}
                    month={selectedMonth}
                    monthName={selectedMonthName}
                    onYearClick={handleYearClick}
                    onHomeClick={handleHomeClick}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {monthData.galleries.map((gallery: any) => (
                        <Card
                            key={gallery.id}
                            className="group overflow-hidden hover:shadow-xl transition-all duration-300 border-2 hover:border-primary/20 cursor-pointer"
                        >
                            <Link href={`/gallery/${gallery.id}`}>
                                <div className="relative aspect-[4/3] bg-muted overflow-hidden">
                                    {gallery.coverPhoto ? (
                                        <Image
                                            src={gallery.coverPhoto}
                                            alt={gallery.title}
                                            fill
                                            className="object-cover group-hover:scale-105 transition-transform duration-500"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center bg-muted">
                                            <span className="text-muted-foreground">No Cover</span>
                                        </div>
                                    )}
                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300" />
                                </div>
                                <CardContent className="p-4">
                                    <h3 className="font-bold truncate mb-1 group-hover:text-primary transition-colors">
                                        {gallery.title}
                                    </h3>
                                    <p className="text-xs text-muted-foreground">
                                        {new Date(gallery.shootDate).toLocaleDateString(undefined, {
                                            weekday: 'long',
                                            year: 'numeric',
                                            month: 'long',
                                            day: 'numeric'
                                        })}
                                    </p>
                                </CardContent>
                            </Link>
                        </Card>
                    ))}
                </div>
            </div>
        );
    }

    // Render Year View (Months in a specific year)
    if (selectedYear) {
        const yearData = timelineData?.years.find((y: any) => y.year === selectedYear);

        return (
            <div className="animate-in fade-in duration-300">
                <TimelineBreadcrumb
                    year={selectedYear}
                    month={null}
                    monthName={null}
                    onYearClick={handleYearClick}
                    onHomeClick={handleHomeClick}
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {yearData?.months.map((month: any) => (
                        <MonthFolderCard
                            key={month.month}
                            month={month.month}
                            monthName={month.monthName}
                            galleryCount={month.galleryCount}
                            coverPhoto={month.coverPhoto}
                            onClick={() => handleMonthClick(month.month, month.monthName)}
                        />
                    ))}
                </div>
            </div>
        );
    }

    // Render Root View (Years)
    return (
        <div className="animate-in fade-in duration-300">
            {timelineData?.uncategorized && timelineData.uncategorized.length > 0 && (
                <UncategorizedSection
                    galleries={timelineData.uncategorized}
                    onAddDate={onAddDate}
                />
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
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
                <div className="text-center py-20">
                    <h3 className="text-xl font-semibold mb-2">No galleries found</h3>
                    <p className="text-muted-foreground">
                        Create your first gallery to see the timeline.
                    </p>
                </div>
            )}
        </div>
    );
}
