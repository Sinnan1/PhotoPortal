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
        >
            <Card className={cn(
                "overflow-hidden border-border/50 bg-background/50 backdrop-blur-sm hover:bg-background/80 transition-all duration-300 group hover:shadow-lg hover:border-primary/20",
                className
            )}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground group-hover:text-primary transition-colors">
                        {title}
                    </CardTitle>
                    <div className="p-2 rounded-full bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300">
                        <Icon className="h-4 w-4" />
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold tracking-tight font-audrey">{value}</div>
                    {(description || trend) && (
                        <div className="flex items-center mt-1 space-x-2">
                            {trend && (
                                <span className={cn(
                                    "text-xs font-medium px-1.5 py-0.5 rounded",
                                    trend.isPositive
                                        ? "text-emerald-500 bg-emerald-500/10"
                                        : "text-rose-500 bg-rose-500/10"
                                )}>
                                    {trend.isPositive ? "+" : ""}{trend.value}%
                                </span>
                            )}
                            <p className="text-xs text-muted-foreground">
                                {description || trend?.label}
                            </p>
                        </div>
                    )}

                    {/* Decorative background gradient glow */}
                    <div className="absolute -bottom-10 -right-10 w-24 h-24 bg-primary/5 blur-3xl rounded-full group-hover:bg-primary/10 transition-colors duration-500" />
                </CardContent>
            </Card>
        </motion.div>
    );
}
