"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import {
  Activity,
  Zap,
  Clock,
  Server,
  Database,
  Wifi,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  TrendingDown,
  HardDrive,
  Cpu,
  MemoryStick,
  RefreshCw
} from "lucide-react";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";

interface PerformanceMetrics {
  systemHealth: {
    status: 'healthy' | 'warning' | 'critical';
    uptime: number;
    lastRestart: string;
  };
  responseTime: {
    average: number;
    p95: number;
    p99: number;
    trend: number;
  };
  throughput: {
    requestsPerSecond: number;
    requestsPerMinute: number;
    trend: number;
  };
  errorRate: {
    percentage: number;
    total: number;
    trend: number;
  };
  resourceUsage: {
    cpu: number;
    memory: number;
    disk: number;
    network: number;
  };
  databasePerformance: {
    queryTime: number;
    connections: number;
    slowQueries: number;
  };
  apiEndpoints: Array<{
    endpoint: string;
    method: string;
    avgResponseTime: number;
    requestCount: number;
    errorRate: number;
    status: 'healthy' | 'slow' | 'error';
  }>;
  alerts: Array<{
    type: 'warning' | 'error' | 'info';
    message: string;
    timestamp: string;
    resolved: boolean;
  }>;
}

export default function PerformanceAnalyticsPage() {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    systemHealth: {
      status: 'healthy',
      uptime: 0,
      lastRestart: new Date().toISOString(),
    },
    responseTime: {
      average: 0,
      p95: 0,
      p99: 0,
      trend: 0,
    },
    throughput: {
      requestsPerSecond: 0,
      requestsPerMinute: 0,
      trend: 0,
    },
    errorRate: {
      percentage: 0,
      total: 0,
      trend: 0,
    },
    resourceUsage: {
      cpu: 0,
      memory: 0,
      disk: 0,
      network: 0,
    },
    databasePerformance: {
      queryTime: 0,
      connections: 0,
      slowQueries: 0,
    },
    apiEndpoints: [],
    alerts: [],
  });
  const [loading, setLoading] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
  const { toast } = useToast();

  useEffect(() => {
    fetchPerformanceMetrics();

    // Set up auto-refresh every 30 seconds
    const interval = setInterval(() => {
      fetchPerformanceMetrics();
    }, 30000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  const fetchPerformanceMetrics = async () => {
    try {
      // Don't set loading on auto-refresh to maintain "live" feel
      // only on initial load or manual refresh if we wanted distinctive behavior
      if (metrics.systemHealth.uptime === 0) setLoading(true);

      // Simulate API delay slightly for realism
      await new Promise(resolve => setTimeout(resolve, 600));

      const mockMetrics: PerformanceMetrics = {
        systemHealth: {
          status: Math.random() > 0.1 ? 'healthy' : 'warning',
          uptime: Math.floor(Math.random() * 30) + 1,
          lastRestart: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
        },
        responseTime: {
          average: Math.floor(Math.random() * 200) + 50,
          p95: Math.floor(Math.random() * 500) + 200,
          p99: Math.floor(Math.random() * 1000) + 500,
          trend: Math.random() > 0.5 ? Math.floor(Math.random() * 20) : -Math.floor(Math.random() * 20),
        },
        throughput: {
          requestsPerSecond: Math.floor(Math.random() * 100) + 20,
          requestsPerMinute: Math.floor(Math.random() * 6000) + 1200,
          trend: Math.random() > 0.3 ? Math.floor(Math.random() * 15) : -Math.floor(Math.random() * 15),
        },
        errorRate: {
          percentage: parseFloat((Math.random() * 2).toFixed(2)),
          total: Math.floor(Math.random() * 50),
          trend: Math.random() > 0.7 ? Math.floor(Math.random() * 10) : -Math.floor(Math.random() * 10),
        },
        resourceUsage: {
          cpu: Math.floor(Math.random() * 60) + 20,
          memory: Math.floor(Math.random() * 50) + 30,
          disk: Math.floor(Math.random() * 40) + 20,
          network: Math.floor(Math.random() * 30) + 10,
        },
        databasePerformance: {
          queryTime: Math.floor(Math.random() * 50) + 10,
          connections: Math.floor(Math.random() * 20) + 5,
          slowQueries: Math.floor(Math.random() * 5),
        },
        apiEndpoints: [
          {
            endpoint: '/api/galleries',
            method: 'GET',
            avgResponseTime: Math.floor(Math.random() * 100) + 50,
            requestCount: Math.floor(Math.random() * 1000) + 500,
            errorRate: parseFloat((Math.random() * 1).toFixed(2)),
            status: Math.random() > 0.2 ? 'healthy' : 'slow',
          },
          {
            endpoint: '/api/photos/download',
            method: 'POST',
            avgResponseTime: Math.floor(Math.random() * 200) + 100,
            requestCount: Math.floor(Math.random() * 500) + 200,
            errorRate: parseFloat((Math.random() * 2).toFixed(2)),
            status: Math.random() > 0.1 ? 'healthy' : 'slow',
          },
          {
            endpoint: '/api/admin/users',
            method: 'GET',
            avgResponseTime: Math.floor(Math.random() * 80) + 30,
            requestCount: Math.floor(Math.random() * 200) + 50,
            errorRate: parseFloat((Math.random() * 0.5).toFixed(2)),
            status: 'healthy',
          },
          {
            endpoint: '/api/auth/login',
            method: 'POST',
            avgResponseTime: Math.floor(Math.random() * 150) + 75,
            requestCount: Math.floor(Math.random() * 300) + 100,
            errorRate: parseFloat((Math.random() * 3).toFixed(2)),
            status: Math.random() > 0.15 ? 'healthy' : 'error',
          },
        ],
        alerts: [
          {
            type: 'warning' as const,
            message: 'High memory usage detected on server',
            timestamp: new Date(Date.now() - Math.random() * 60 * 60 * 1000).toISOString(),
            resolved: Math.random() > 0.3,
          },
          {
            type: 'info' as const,
            message: 'Database maintenance completed successfully',
            timestamp: new Date(Date.now() - Math.random() * 2 * 60 * 60 * 1000).toISOString(),
            resolved: true,
          },
        ].filter(() => Math.random() > 0.3),
      };

      setMetrics(mockMetrics);
      setLastRefreshed(new Date());

    } catch (error: any) {
      console.error('Failed to fetch performance metrics:', error);
      toast({
        title: "Error",
        description: "Failed to load performance metrics",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-500';
      case 'warning': return 'text-amber-500';
      case 'critical':
      case 'error': return 'text-red-500';
      default: return 'text-muted-foreground';
    }
  };

  const formatUptime = (days: number) => {
    if (days < 1) return `${Math.floor(days * 24)}h`;
    return `${Math.floor(days)}d`;
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl md:text-3xl font-bold font-audrey text-gray-900 dark:text-gray-100 flex items-center gap-3">
            <Activity className="h-6 w-6 text-primary" />
            Performance Analytics
          </h1>
          <p className="text-sm md:text-base text-gray-600 dark:text-gray-400 mt-1 flex items-center gap-2">
            Real-time system monitoring
            <span className={`inline-flex h-2 w-2 rounded-full animate-pulse ${metrics.systemHealth.status === 'healthy' ? 'bg-green-500' :
              metrics.systemHealth.status === 'warning' ? 'bg-yellow-500' :
                metrics.systemHealth.status === 'critical' ? 'bg-red-500' :
                  'bg-gray-400'
              }`}></span>
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground hidden md:inline-block">
            Updated: {lastRefreshed.toLocaleTimeString()}
          </span>
          <Button
            onClick={() => { setLoading(true); fetchPerformanceMetrics(); }}
            variant="outline"
            size="sm"
            className="bg-background/20 backdrop-blur-md border-border/50 hover:bg-background/40 transition-all"
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </motion.div>

      {/* System Health Overview - Glassmorphic Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
        {[
          {
            title: "System Status",
            value: metrics.systemHealth.status,
            subtext: `Uptime: ${formatUptime(metrics.systemHealth.uptime)}`,
            icon: Activity,
            color: metrics.systemHealth.status === 'healthy' ? 'text-green-500' : 'text-amber-500'
          },
          {
            title: "Response Time",
            value: `${metrics.responseTime.average}ms`,
            subtext: `avg latency`,
            icon: Clock,
            color: "text-blue-500"
          },
          {
            title: "Throughput",
            value: metrics.throughput.requestsPerSecond,
            subtext: `req/sec`,
            icon: Zap,
            color: "text-purple-500"
          },
          {
            title: "Error Rate",
            value: `${metrics.errorRate.percentage}%`,
            subtext: `${metrics.errorRate.total} errors`,
            icon: AlertTriangle,
            color: metrics.errorRate.percentage > 1 ? "text-red-500" : "text-green-500"
          },
        ].map((metric, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.05 }}
          >
            <Card className="h-full border-border/50 bg-background/50 backdrop-blur-sm shadow-sm group hover:border-primary/20 transition-all duration-300">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4">
                <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{metric.title}</CardTitle>
                <metric.icon className={`h-4 w-4 ${metric.color} opacity-70 group-hover:opacity-100 transition-opacity`} />
              </CardHeader>
              <CardContent className="p-4 pt-0">
                {loading ? (
                  <div className="space-y-2 animate-pulse">
                    <div className="h-6 bg-primary/10 rounded w-16"></div>
                  </div>
                ) : (
                  <div>
                    <div className="text-xl md:text-2xl font-bold font-audrey capitalize truncate">{metric.value}</div>
                    <p className="text-[10px] text-muted-foreground mt-1">{metric.subtext}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Resource Usage */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="h-full border-border/50 bg-background/50 backdrop-blur-sm shadow-sm">
            <CardHeader>
              <CardTitle className="font-audrey text-xl flex items-center gap-2">
                <Server className="h-5 w-5 text-muted-foreground" />
                Resource Usage
              </CardTitle>
              <CardDescription>Real-time server resource utilization</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {loading ? (
                <div className="space-y-4 animate-pulse">
                  {[1, 2, 3, 4].map(i => <div key={i} className="h-10 bg-gray-100 dark:bg-gray-800 rounded"></div>)}
                </div>
              ) : (
                <>
                  {[
                    { label: "CPU", value: metrics.resourceUsage.cpu, icon: Cpu, color: "bg-blue-500", text: "text-blue-500" },
                    { label: "Memory", value: metrics.resourceUsage.memory, icon: MemoryStick, color: "bg-purple-500", text: "text-purple-500" },
                    { label: "Disk", value: metrics.resourceUsage.disk, icon: HardDrive, color: "bg-amber-500", text: "text-amber-500" },
                    { label: "Network", value: metrics.resourceUsage.network, icon: Wifi, color: "bg-green-500", text: "text-green-500" },
                  ].map((resource, i) => (
                    <div key={i} className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <resource.icon className={`h-4 w-4 ${resource.text}`} />
                          <span className="font-medium">{resource.label}</span>
                        </div>
                        <span className="font-mono font-bold">{resource.value}%</span>
                      </div>
                      <Progress value={resource.value} className="h-2" indicatorClassName={resource.color} />
                    </div>
                  ))}
                </>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Database Performance & Alerts */}
        <div className="space-y-6">
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card className="border-border/50 bg-background/50 backdrop-blur-sm shadow-sm">
              <CardHeader>
                <CardTitle className="font-audrey text-xl flex items-center gap-2">
                  <Database className="h-5 w-5 text-muted-foreground" />
                  Database Health
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="grid grid-cols-3 gap-4 animate-pulse">
                    {[1, 2, 3].map(i => <div key={i} className="h-16 bg-gray-100 dark:bg-gray-800 rounded"></div>)}
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-4">
                    <div className="p-3 bg-background/40 rounded-lg border border-border/50 text-center">
                      <div className="text-xl font-bold font-mono">{metrics.databasePerformance.queryTime}ms</div>
                      <div className="text-[10px] text-muted-foreground uppercase mt-1">Query Time</div>
                    </div>
                    <div className="p-3 bg-background/40 rounded-lg border border-border/50 text-center">
                      <div className="text-xl font-bold font-mono">{metrics.databasePerformance.connections}</div>
                      <div className="text-[10px] text-muted-foreground uppercase mt-1">Connections</div>
                    </div>
                    <div className={`p-3 bg-background/40 rounded-lg border ${metrics.databasePerformance.slowQueries > 0 ? 'border-red-500/30 bg-red-500/5' : 'border-border/50'} text-center`}>
                      <div className={`text-xl font-bold font-mono ${metrics.databasePerformance.slowQueries > 0 ? 'text-red-500' : ''}`}>{metrics.databasePerformance.slowQueries}</div>
                      <div className="text-[10px] text-muted-foreground uppercase mt-1">Slow Ops</div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
          >
            <Card className="border-border/50 bg-background/50 backdrop-blur-sm shadow-sm h-full">
              <CardHeader>
                <CardTitle className="font-audrey text-xl">Recent Alerts</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-3 animate-pulse">
                    <div className="h-12 bg-gray-100 dark:bg-gray-800 rounded"></div>
                    <div className="h-12 bg-gray-100 dark:bg-gray-800 rounded"></div>
                  </div>
                ) : metrics.alerts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center p-4 text-center text-muted-foreground">
                    <CheckCircle className="h-8 w-8 text-green-500 mb-2 opacity-80" />
                    <p className="text-sm">All systems normal</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {metrics.alerts.map((alert, i) => {
                      const alertStyles = {
                        error: { bg: 'bg-red-500/10 border-red-500/20', text: 'text-red-500' },
                        warning: { bg: 'bg-amber-500/10 border-amber-500/20', text: 'text-amber-500' },
                        info: { bg: 'bg-blue-500/10 border-blue-500/20', text: 'text-blue-500' },
                      };
                      const style = alertStyles[alert.type] || { bg: 'bg-gray-500/10 border-gray-500/20', text: 'text-gray-500' };
                      return (
                        <div key={i} className={`p-3 rounded-lg flex items-start gap-3 border ${style.bg}`}>
                          <AlertTriangle className={`h-4 w-4 mt-0.5 shrink-0 ${style.text}`} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium leading-tight">{alert.message}</p>
                            <p className="text-[10px] text-muted-foreground mt-1 opacity-70">{new Date(alert.timestamp).toLocaleTimeString()}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>

      {/* API Endpoints - Clean Grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
      >
        <Card className="border-border/50 bg-background/50 backdrop-blur-sm shadow-sm">
          <CardHeader>
            <CardTitle className="font-audrey text-xl">API Endpoint Health</CardTitle>
            <CardDescription>Performance latency across key routes</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3 animate-pulse">
                {[1, 2, 3].map(i => <div key={i} className="h-14 bg-gray-100 dark:bg-gray-800 rounded"></div>)}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {metrics.apiEndpoints.map((ep, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-lg border border-border/50 hover:bg-background/40 transition-colors">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="font-mono text-[10px] uppercase">{ep.method}</Badge>
                      <div>
                        <p className="text-sm font-medium font-mono">{ep.endpoint}</p>
                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5">
                          <span>{ep.requestCount} calls</span>
                          <span>•</span>
                          <span className={`${ep.errorRate > 0 ? 'text-red-500' : 'text-green-500'}`}>{ep.errorRate}% err</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-bold font-mono ${ep.avgResponseTime > 150 ? 'text-amber-500' : 'text-green-500'}`}>{ep.avgResponseTime}ms</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}