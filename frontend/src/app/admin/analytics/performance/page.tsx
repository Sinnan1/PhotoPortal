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
import { adminApi } from "@/lib/admin-api";
import { useToast } from "@/hooks/use-toast";

interface PerformanceMetrics {
  systemHealth: {
    status: 'healthy' | 'warning' | 'critical';
    uptime: number;
    uptimeFormatted: string;
  };
  responseTime: {
    average: number;
    status: string;
  };
  errorRate: {
    percentage: number;
    status: string;
  };
  resourceUsage: {
    memoryUsed: number;
    memoryTotal: number;
    memoryPercent: number;
  };
  databasePerformance: {
    queryTime: number;
    status: string;
  };
  storage: {
    totalUsed: number;
    utilizationPercent: number;
    status: string;
  };
  performance: {
    activeSessions: number;
    uploadsPerHour: number;
    errorRate: number;
  };
  alerts: Array<{
    type: 'warning' | 'error' | 'info';
    message: string;
    severity: string;
  }>;
}

export default function PerformanceAnalyticsPage() {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    systemHealth: {
      status: 'healthy',
      uptime: 0,
      uptimeFormatted: '0h',
    },
    responseTime: {
      average: 0,
      status: 'excellent',
    },
    errorRate: {
      percentage: 0,
      status: 'excellent',
    },
    resourceUsage: {
      memoryUsed: 0,
      memoryTotal: 0,
      memoryPercent: 0,
    },
    databasePerformance: {
      queryTime: 0,
      status: 'excellent',
    },
    storage: {
      totalUsed: 0,
      utilizationPercent: 0,
      status: 'healthy',
    },
    performance: {
      activeSessions: 0,
      uploadsPerHour: 0,
      errorRate: 0,
    },
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
      if (metrics.systemHealth.uptime === 0) setLoading(true);

      // Fetch real system health data from the API
      const healthResponse = await adminApi.getSystemHealth();
      const healthData = healthResponse.data;

      // Determine overall system status based on health metrics
      let systemStatus: 'healthy' | 'warning' | 'critical' = 'healthy';
      if (healthData.database.status === 'poor' || healthData.performance.errorRateStatus === 'critical') {
        systemStatus = 'critical';
      } else if (healthData.database.status === 'fair' || healthData.storage.status === 'warning' || healthData.performance.errorRateStatus === 'warning') {
        systemStatus = 'warning';
      }

      // Build alerts from health data
      const alerts: PerformanceMetrics['alerts'] = (healthData.alerts || []).map((alert: any) => ({
        type: alert.severity === 'high' ? 'error' : alert.severity === 'medium' ? 'warning' : 'info',
        message: alert.message,
        severity: alert.severity,
      }));

      const realMetrics: PerformanceMetrics = {
        systemHealth: {
          status: systemStatus,
          uptime: healthData.system.uptime || 0,
          uptimeFormatted: healthData.system.uptimeFormatted || '0h',
        },
        responseTime: {
          average: healthData.database.responseTime || 0,
          status: healthData.database.status || 'unknown',
        },
        errorRate: {
          percentage: healthData.performance.errorRate || 0,
          status: healthData.performance.errorRateStatus || 'unknown',
        },
        resourceUsage: {
          memoryUsed: healthData.system.memory?.used || 0,
          memoryTotal: healthData.system.memory?.total || 0,
          memoryPercent: healthData.system.memory?.total > 0
            ? Math.round((healthData.system.memory.used / healthData.system.memory.total) * 100)
            : 0,
        },
        databasePerformance: {
          queryTime: healthData.database.responseTime || 0,
          status: healthData.database.status || 'unknown',
        },
        storage: {
          totalUsed: healthData.storage.totalUsed || 0,
          utilizationPercent: healthData.storage.utilizationPercent || 0,
          status: healthData.storage.status || 'healthy',
        },
        performance: {
          activeSessions: healthData.performance.activeSessions || 0,
          uploadsPerHour: healthData.performance.uploadsPerHour || 0,
          errorRate: healthData.performance.errorRate || 0,
        },
        alerts,
      };

      setMetrics(realMetrics);
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
            subtext: `Uptime: ${metrics.systemHealth.uptimeFormatted}`,
            icon: Activity,
            color: metrics.systemHealth.status === 'healthy' ? 'text-green-500' : metrics.systemHealth.status === 'warning' ? 'text-amber-500' : 'text-red-500'
          },
          {
            title: "DB Response",
            value: `${metrics.responseTime.average}ms`,
            subtext: metrics.responseTime.status,
            icon: Clock,
            color: metrics.responseTime.average < 100 ? "text-green-500" : metrics.responseTime.average < 500 ? "text-blue-500" : "text-amber-500"
          },
          {
            title: "Active Sessions",
            value: metrics.performance.activeSessions,
            subtext: `${metrics.performance.uploadsPerHour} uploads/hr`,
            icon: Zap,
            color: "text-purple-500"
          },
          {
            title: "Error Rate",
            value: `${metrics.errorRate.percentage.toFixed(1)}%`,
            subtext: metrics.errorRate.status,
            icon: AlertTriangle,
            color: metrics.errorRate.percentage > 5 ? "text-red-500" : metrics.errorRate.percentage > 1 ? "text-amber-500" : "text-green-500"
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
                <div className="space-y-4">
                  {/* Memory Usage */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <MemoryStick className="h-4 w-4 text-purple-500" />
                        <span className="font-medium">Memory</span>
                      </div>
                      <span className="font-mono font-bold">{metrics.resourceUsage.memoryUsed} / {metrics.resourceUsage.memoryTotal} MB</span>
                    </div>
                    <Progress value={metrics.resourceUsage.memoryPercent} className="h-2" indicatorClassName="bg-purple-500" />
                    <p className="text-xs text-muted-foreground text-right">{metrics.resourceUsage.memoryPercent}% used</p>
                  </div>

                  {/* Storage Usage */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <HardDrive className="h-4 w-4 text-amber-500" />
                        <span className="font-medium">Storage</span>
                      </div>
                      <span className="font-mono font-bold text-sm">
                        {(metrics.storage.totalUsed / (1024 * 1024 * 1024)).toFixed(2)} GB
                      </span>
                    </div>
                    <Progress value={metrics.storage.utilizationPercent} className="h-2" indicatorClassName="bg-amber-500" />
                    <p className="text-xs text-muted-foreground text-right">{metrics.storage.status}</p>
                  </div>
                </div>
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
                    <div className={`p-3 bg-background/40 rounded-lg border text-center ${metrics.databasePerformance.status === 'excellent' ? 'border-green-500/30 bg-green-500/5' :
                      metrics.databasePerformance.status === 'good' ? 'border-blue-500/30 bg-blue-500/5' :
                        'border-amber-500/30 bg-amber-500/5'
                      }`}>
                      <div className={`text-xl font-bold font-mono capitalize ${metrics.databasePerformance.status === 'excellent' ? 'text-green-500' :
                        metrics.databasePerformance.status === 'good' ? 'text-blue-500' :
                          'text-amber-500'
                        }`}>{metrics.databasePerformance.status}</div>
                      <div className="text-[10px] text-muted-foreground uppercase mt-1">Status</div>
                    </div>
                    <div className={`p-3 bg-background/40 rounded-lg border text-center ${metrics.storage.status === 'healthy' ? 'border-green-500/30 bg-green-500/5' :
                      metrics.storage.status === 'warning' ? 'border-amber-500/30 bg-amber-500/5' :
                        'border-red-500/30 bg-red-500/5'
                      }`}>
                      <div className={`text-xl font-bold font-mono capitalize ${metrics.storage.status === 'healthy' ? 'text-green-500' :
                        metrics.storage.status === 'warning' ? 'text-amber-500' :
                          'text-red-500'
                        }`}>{metrics.storage.status}</div>
                      <div className="text-[10px] text-muted-foreground uppercase mt-1">Storage</div>
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
                            <p className="text-[10px] text-muted-foreground mt-1 opacity-70 capitalize">{alert.severity} priority</p>
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
    </div>
  );
}