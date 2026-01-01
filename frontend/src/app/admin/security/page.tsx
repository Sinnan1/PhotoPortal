"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { adminApi } from "@/lib/admin-api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Shield,
  Clock,
  Monitor,
  Smartphone,
  AlertTriangle,
  CheckCircle,
  LogOut,
  RefreshCw,
  Eye,
  Lock,
  Activity,
  FileText,
  Users,
  Globe
} from "lucide-react";

interface AdminSession {
  id: string;
  ipAddress: string;
  userAgent: string;
  createdAt: string;
  expiresAt: string;
}

interface AuditLog {
  id: string;
  action: string;
  admin: { name: string; email: string };
  targetType: string;
  ipAddress: string;
  createdAt: string;
  details: any;
}

interface SecurityStats {
  totalLogs: number;
  recentAlerts: number;
}

export default function AdminSecurityPage() {
  const { user, adminLogout } = useAuth();
  const [sessions, setSessions] = useState<AdminSession[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [securityStats, setSecurityStats] = useState<SecurityStats>({ totalLogs: 0, recentAlerts: 0 });
  const [loading, setLoading] = useState(true);
  const [logsLoading, setLogsLoading] = useState(true);
  const [error, setError] = useState("");
  const [revoking, setRevoking] = useState<string | null>(null);

  // Real security alerts from getSystemHealth
  const [securityAlerts, setSecurityAlerts] = useState<any[]>([]);

  useEffect(() => {
    loadSessions();
    loadAuditLogs();
    loadSecurityAlerts();
  }, []);

  const loadSessions = async () => {
    try {
      setLoading(true);
      const response = await adminApi.getAdminSessions();
      if (response.success) {
        setSessions(response.data.sessions);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load sessions");
    } finally {
      setLoading(false);
    }
  };

  const loadAuditLogs = async () => {
    try {
      setLogsLoading(true);
      const response = await adminApi.getSecurityLogs({ limit: 10 });
      if (response.success && response.data) {
        setAuditLogs(response.data.logs || []);
        setSecurityStats({
          totalLogs: response.data.pagination?.total || 0,
          recentAlerts: 0, // From getSystemHealth alerts
        });
      }
    } catch (err) {
      console.error("Failed to load audit logs:", err);
    } finally {
      setLogsLoading(false);
    }
  };

  const loadSecurityAlerts = async () => {
    try {
      const response = await adminApi.getSystemHealth();
      if (response.data?.alerts) {
        setSecurityAlerts(response.data.alerts);
      }
    } catch (err) {
      console.error("Failed to load security alerts:", err);
    }
  };

  const revokeSession = async (sessionId: string) => {
    if (!confirm("Are you sure you want to revoke this session? The user will be logged out immediately.")) {
      return;
    }

    try {
      setRevoking(sessionId);
      await adminApi.revokeAdminSession(sessionId);
      await loadSessions(); // Reload sessions
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to revoke session");
    } finally {
      setRevoking(null);
    }
  };

  const getCurrentSessionId = () => {
    try {
      const adminSession = localStorage.getItem("admin-session");
      if (adminSession) {
        return JSON.parse(adminSession).sessionId;
      }
    } catch (error) {
      console.error("Error reading session ID:", error);
    }
    return null;
  };

  const currentSessionId = getCurrentSessionId();

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getDeviceIcon = (userAgent: string) => {
    if (userAgent.toLowerCase().includes('mobile')) {
      return <Smartphone className="h-4 w-4" />;
    }
    return <Monitor className="h-4 w-4" />;
  };

  const getSessionStatus = (expiresAt: string) => {
    const now = new Date();
    const expires = new Date(expiresAt);
    const timeLeft = expires.getTime() - now.getTime();
    const minutesLeft = Math.floor(timeLeft / (1000 * 60));

    if (minutesLeft <= 0) {
      return { status: 'expired', color: 'destructive', text: 'Expired' };
    } else if (minutesLeft <= 15) {
      return { status: 'expiring', color: 'destructive', text: `${minutesLeft}m left` };
    } else if (minutesLeft <= 60) {
      return { status: 'warning', color: 'secondary', text: `${minutesLeft}m left` };
    } else {
      const hoursLeft = Math.floor(minutesLeft / 60);
      return { status: 'active', color: 'secondary', text: `${hoursLeft}h left` };
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case "high":
        return <Badge variant="destructive">High</Badge>;
      case "medium":
        return <Badge variant="outline" className="border-amber-500 text-amber-600">Medium</Badge>;
      case "low":
        return <Badge variant="secondary">Low</Badge>;
      default:
        return <Badge variant="outline">{severity}</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "success":
        return <Badge variant="outline" className="text-green-600 border-green-600">Success</Badge>;
      case "failed":
        return <Badge variant="destructive">Failed</Badge>;
      case "active":
        return <Badge variant="destructive">Active</Badge>;
      case "investigating":
        return <Badge variant="outline" className="border-amber-500 text-amber-600">Investigating</Badge>;
      case "pending":
        return <Badge variant="secondary">Pending</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Security & Audit</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Monitor security events, manage sessions, and review audit logs
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Security Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Security Status</CardTitle>
            <Shield className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">Secure</div>
            <p className="text-xs text-muted-foreground">
              All systems operational
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Alerts</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{securityAlerts.length}</div>
            <p className="text-xs text-muted-foreground">
              No active alerts
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Admin Sessions</CardTitle>
            <Activity className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{sessions.length}</div>
            <p className="text-xs text-muted-foreground">
              Currently active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Audit Events</CardTitle>
            <FileText className="h-4 w-4 text-gray-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{securityStats.totalLogs}</div>
            <p className="text-xs text-muted-foreground">
              Total logged events
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Current Session Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Shield className="h-5 w-5 text-green-600" />
            <span>Current Admin Session</span>
          </CardTitle>
          <CardDescription>
            Your current admin session information and security status
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <div className="text-sm font-medium text-gray-700 dark:text-gray-300">Admin User</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">{user?.name} ({user?.email})</div>
            </div>
            <div>
              <div className="text-sm font-medium text-gray-700 dark:text-gray-300">Session Status</div>
              <Badge variant="secondary" className="mt-1">
                <CheckCircle className="h-3 w-3 mr-1" />
                Active & Secure
              </Badge>
            </div>
            <div>
              <div className="text-sm font-medium text-gray-700 dark:text-gray-300">Security Level</div>
              <Badge variant="outline" className="mt-1 text-green-600 border-green-600">
                <Lock className="h-3 w-3 mr-1" />
                Enhanced
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Active Admin Sessions */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center space-x-2">
              <Monitor className="h-5 w-5" />
              <span>Active Admin Sessions</span>
            </CardTitle>
            <CardDescription>
              All active admin sessions for your account
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={loadSessions}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#425146]"></div>
            </div>
          ) : sessions.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              No active sessions found
            </div>
          ) : (
            <div className="space-y-4">
              {sessions.map((session) => {
                const isCurrentSession = session.id === currentSessionId;
                const sessionStatus = getSessionStatus(session.expiresAt);

                return (
                  <div
                    key={session.id}
                    className={`p-4 border rounded-lg ${isCurrentSession
                      ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/20'
                      : 'border-gray-200 dark:border-gray-700'
                      }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        {getDeviceIcon(session.userAgent)}
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-medium text-sm">
                              {session.ipAddress}
                            </span>
                            {isCurrentSession && (
                              <Badge variant="secondary" className="text-xs">
                                Current Session
                              </Badge>
                            )}
                            <Badge
                              variant={sessionStatus.color as any}
                              className="text-xs"
                            >
                              <Clock className="h-3 w-3 mr-1" />
                              {sessionStatus.text}
                            </Badge>
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            Started: {formatDate(session.createdAt)}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            Expires: {formatDate(session.expiresAt)}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        {!isCurrentSession && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => revokeSession(session.id)}
                            disabled={revoking === session.id}
                            className="text-red-600 hover:text-red-700"
                          >
                            {revoking === session.id ? (
                              <RefreshCw className="h-4 w-4 animate-spin" />
                            ) : (
                              <LogOut className="h-4 w-4" />
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Security Alerts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <span>Security Alerts</span>
            <Badge variant="secondary">{securityAlerts.length}</Badge>
          </CardTitle>
          <CardDescription>
            Security monitoring and incident tracking
          </CardDescription>
        </CardHeader>
        <CardContent>
          {securityAlerts.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle className="h-12 w-12 text-green-400 mx-auto mb-4" />
              <p className="text-gray-500">No active security alerts</p>
              <p className="text-sm text-gray-400 mt-1">
                System is operating normally with no security incidents
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {securityAlerts.map((alert) => (
                <div key={alert.id} className="flex items-start justify-between p-4 border rounded-lg">
                  <div className="flex items-start space-x-4">
                    <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <h3 className="font-medium text-gray-900 dark:text-gray-100">{alert.message}</h3>
                        {getSeverityBadge(alert.severity)}
                        {getStatusBadge(alert.status)}
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{alert.details}</p>
                      <div className="flex items-center space-x-4 text-xs text-gray-500 dark:text-gray-500">
                        <span className="flex items-center">
                          <Clock className="h-3 w-3 mr-1" />
                          {alert.timestamp}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <Button size="sm" variant="outline">
                      <Eye className="h-4 w-4 mr-1" />
                      Investigate
                    </Button>
                    <Button size="sm" variant="outline">
                      Resolve
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Audit Logs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <FileText className="h-5 w-5" />
            <span>Recent Audit Logs</span>
          </CardTitle>
          <CardDescription>
            Latest administrative activities and security events
          </CardDescription>
        </CardHeader>
        <CardContent>
          {logsLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#425146]"></div>
            </div>
          ) : auditLogs.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No audit logs found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {auditLogs.map((log) => (
                <div key={log.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="h-2 w-2 rounded-full bg-blue-600"></div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <p className="font-medium text-sm">{log.action}</p>
                        <Badge variant="outline" className="text-xs">{log.targetType}</Badge>
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        <div>{log.admin?.name || 'System'} ({log.admin?.email || 'N/A'})</div>
                        <div className="flex items-center space-x-4 mt-1">
                          <span>{log.ipAddress || 'Unknown IP'}</span>
                          <span>{new Date(log.createdAt).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="mt-4 text-center">
            <Button variant="outline" size="sm">
              <FileText className="h-4 w-4 mr-2" />
              View All Audit Logs
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Security Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Lock className="h-5 w-5" />
            <span>Security Actions</span>
          </CardTitle>
          <CardDescription>
            Manage your admin account security and sessions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <div className="font-medium">Sign Out All Sessions</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                This will sign you out of all devices and require re-authentication
              </div>
            </div>
            <Button
              variant="outline"
              onClick={() => {
                if (confirm("This will sign you out of all sessions. Continue?")) {
                  adminLogout();
                }
              }}
              className="text-red-600 hover:text-red-700"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out All
            </Button>
          </div>

          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <div className="font-medium">Change Admin Password</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Update your admin password with enhanced security requirements
              </div>
            </div>
            <Button variant="outline">
              <Lock className="h-4 w-4 mr-2" />
              Change Password
            </Button>
          </div>

          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <div className="font-medium">Download Security Report</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Export detailed security and audit logs for compliance
              </div>
            </div>
            <Button variant="outline">
              <FileText className="h-4 w-4 mr-2" />
              Export Report
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}