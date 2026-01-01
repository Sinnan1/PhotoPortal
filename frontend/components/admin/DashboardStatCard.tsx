"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface DashboardStatCardProps {
    title: string;
    value: string | number;
    icon: React.ComponentType<{ className?: string }>;
    description?: string;
    trend?: {
        value: number;
        label: string;
        isPositive: boolean;
    };
    className?: string;
    delay?: number;
}

export function DashboardStatCard({
    title,
    value,
    icon: Icon,
    description,
    trend,
    className,
    delay = 0,
}: DashboardStatCardProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: delay }}
            className="h-full" // Ensure motion div takes full height of grid cell
        >
            <Card className={cn(
                "overflow-hidden border-border/50 bg-background/50 backdrop-blur-sm hover:bg-background/80 transition-all duration-300 group hover:shadow-lg hover:border-primary/20 h-full flex flex-col justify-between", // h-full and flex column for spacing
                className
            )}>
                <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2 p-3 md:p-6">
                    <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground group-hover:text-primary transition-colors line-clamp-2 md:line-clamp-1 md:h-auto flex items-center">
                        {title}
                    </CardTitle>                    <div className="hidden md:block p-2 rounded-full bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300 shrink-0 ml-2">
                        <Icon className="h-4 w-4" />
                    </div>
                </CardHeader>
                <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
                    <div className="text-xl md:text-2xl font-bold tracking-tight font-audrey mb-1">{value}</div>
                    {(description || trend) && (
                        <div className="flex flex-wrap items-center gap-1.5 md:space-x-2 text-[10px] md:text-xs">
                            {trend && (
                                <span className={cn(
                                    "font-medium px-1.5 py-0.5 rounded",
                                    trend.isPositive
                                        ? "text-emerald-500 bg-emerald-500/10"
                                        : "text-rose-500 bg-rose-500/10"
                                )}>
                                    {trend.isPositive ? "+" : ""}{trend.value}%
                                </span>
                            )}
                            <p className="text-muted-foreground line-clamp-1">
                                {description || trend?.label}
                            </p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </motion.div>
    );
}
