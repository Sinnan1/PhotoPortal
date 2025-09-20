"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  User,
  Mail,
  Calendar,
  Shield,
  Camera,
  Users,
  Activity,
  AlertTriangle,
  Clock,
  Image,
  FolderOpen,
  Eye,
  Settings,
  UserPlus,
  UserMinus,
  Edit
} from "lucide-react";
import { adminApi } from "@/lib/admin-api";
import { useToast } from "@/components/ui/use-toast";

interface UserStats {
  totalGalleries: number;
  totalPhotos?: number;
  totalClients: number;
  accessibleGalleries?: number;
}

interface User {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'PHOTOGRAPHER' | 'CLIENT';
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
  suspendedAt?: string;
  suspendedBy?: string;
  suspensionReason?: string;
  stats: UserStats;
}

interface Gallery {
  id: string;
  title: string;
  createdAt: string;
  _count?: {
    folders: number;
  };
}

interface AccessibleGallery {
  gallery: {
    id: string;
    title: string;
    photographer: {
      name: string;
      email: string;
    };
  };
  createdAt: string;
}

interface Client {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

interface ActivityLog {
  id: string;
  action: string;
  targetType: string;
  createdAt: string;
  admin: {
    name: string;
    email: string;
  };
}

interface DetailedUserData {
  user: User & { stats: UserStats & { totalPhotos: number } };
  galleries: Gallery[];
  accessibleGalleries: AccessibleGallery[];
  clients: Client[];
  photographer?: {
    id: string;
    name: string;
    email: string;
  };
  recentActivity: ActivityLog[];
}

interface UserDetailModalProps {
  user: User;
  open: boolean;
  onClose: () => void;
}

export function UserDetailModal({ user, open, onClose }: UserDetailModalProps) {
  const [loading, setLoading] = useState(false);
  const [userDetails, setUserDetails] = useState<DetailedUserData | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (open && user) {
      fetchUserDetails();
    }
  }, [open, user]);

  const fetchUserDetails = async () => {
    try {
      setLoading(true);
      const response = await adminApi.getUserDetails(user.id);

      if (response.success) {
        setUserDetails(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch user details:', error);
      toast({
        title: "Error",
        description: "Failed to load user details",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "ADMIN":
        return <Badge variant="destructive"><Shield className="h-3 w-3 mr-1" />Admin</Badge>;
      case "PHOTOGRAPHER":
        return <Badge variant="default"><Camera className="h-3 w-3 mr-1" />Photographer</Badge>;
      case "CLIENT":
        return <Badge variant="secondary"><User className="h-3 w-3 mr-1" />Client</Badge>;
      default:
        return <Badge variant="outline">{role}</Badge>;
    }
  };

  const getStatusBadge = (isActive: boolean) => {
    if (!isActive) {
      return <Badge variant="destructive"><AlertTriangle className="h-3 w-3 mr-1" />Suspended</Badge>;
    }
    return <Badge variant="outline" className="text-green-600 border-green-600">Active</Badge>;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatTimeAgo = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) return "Just now";
    if (diffInMinutes < 60) return `${diffInMinutes} minutes ago`;

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours} hours ago`;

    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays} days ago`;

    const diffInWeeks = Math.floor(diffInDays / 7);
    if (diffInWeeks < 4) return `${diffInWeeks} weeks ago`;

    return formatDate(dateString);
  };

  const getActivityIcon = (action: string) => {
    switch (action.toLowerCase()) {
      case 'view_user_details':
      case 'view_user_list':
        return <Eye className="h-4 w-4 text-blue-500" />;
      case 'update_user_role':
        return <Edit className="h-4 w-4 text-orange-500" />;
      case 'suspend_user':
        return <UserMinus className="h-4 w-4 text-red-500" />;
      case 'activate_user':
        return <UserPlus className="h-4 w-4 text-green-500" />;
      case 'delete_user':
        return <UserMinus className="h-4 w-4 text-red-600" />;
      case 'create_user':
        return <UserPlus className="h-4 w-4 text-green-600" />;
      default:
        return <Settings className="h-4 w-4 text-gray-500" />;
    }
  };

  const formatActivityAction = (action: string) => {
    const actionMap: { [key: string]: string } = {
      'VIEW_USER_DETAILS': 'Viewed user details',
      'VIEW_USER_LIST': 'Viewed user list',
      'UPDATE_USER_ROLE': 'Updated user role',
      'SUSPEND_USER': 'Suspended user account',
      'ACTIVATE_USER': 'Activated user account',
      'DELETE_USER': 'Deleted user account',
      'CREATE_USER': 'Created user account',
      'VIEW_GALLERY_DETAILS': 'Viewed gallery details',
      'UPDATE_GALLERY': 'Updated gallery settings',
      'DELETE_GALLERY': 'Deleted gallery'
    };

    return actionMap[action] || action.replace(/_/g, ' ').toLowerCase();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <User className="h-5 w-5" />
            <span>User Details: {user.name}</span>
          </DialogTitle>
          <DialogDescription>
            Comprehensive information about this user account
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="space-y-4">
            <div className="animate-pulse">
              <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded-lg mb-4"></div>
              <div className="space-y-2">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
              </div>
            </div>
          </div>
        ) : (
          <Tabs defaultValue="overview" className="space-y-4">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="activity">Activity</TabsTrigger>
              <TabsTrigger value="galleries">Galleries</TabsTrigger>
              <TabsTrigger value="statistics">Statistics</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              {/* User Overview */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>User Overview</span>
                    <div className="flex space-x-2">
                      {getRoleBadge(user.role)}
                      {getStatusBadge(user.isActive)}
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <div className="flex items-center space-x-2">
                        <Mail className="h-4 w-4 text-gray-500" />
                        <span className="text-sm font-medium">Email:</span>
                        <span className="text-sm">{user.email}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-4 w-4 text-gray-500" />
                        <span className="text-sm font-medium">Joined:</span>
                        <span className="text-sm">{formatDate(user.createdAt)}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Clock className="h-4 w-4 text-gray-500" />
                        <span className="text-sm font-medium">Last Updated:</span>
                        <span className="text-sm">{formatDate(user.updatedAt)}</span>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center space-x-2">
                        <FolderOpen className="h-4 w-4 text-gray-500" />
                        <span className="text-sm font-medium">Galleries:</span>
                        <span className="text-sm">{user.stats.totalGalleries}</span>
                      </div>
                      {user.role === 'PHOTOGRAPHER' && (
                        <div className="flex items-center space-x-2">
                          <Users className="h-4 w-4 text-gray-500" />
                          <span className="text-sm font-medium">Clients:</span>
                          <span className="text-sm">{user.stats.totalClients}</span>
                        </div>
                      )}
                      {user.role === 'CLIENT' && user.stats.accessibleGalleries !== undefined && (
                        <div className="flex items-center space-x-2">
                          <FolderOpen className="h-4 w-4 text-gray-500" />
                          <span className="text-sm font-medium">Accessible Galleries:</span>
                          <span className="text-sm">{user.stats.accessibleGalleries}</span>
                        </div>
                      )}
                      {userDetails?.user.stats.totalPhotos !== undefined && (
                        <div className="flex items-center space-x-2">
                          <Image className="h-4 w-4 text-gray-500" />
                          <span className="text-sm font-medium">Total Photos:</span>
                          <span className="text-sm">{userDetails.user.stats.totalPhotos}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Suspension Info */}
                  {!user.isActive && user.suspendedAt && (
                    <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                      <div className="flex items-center space-x-2 mb-2">
                        <AlertTriangle className="h-4 w-4 text-red-600" />
                        <span className="font-medium text-red-800 dark:text-red-200">Account Suspended</span>
                      </div>
                      <p className="text-sm text-red-700 dark:text-red-300 mb-1">
                        <strong>Date:</strong> {formatDate(user.suspendedAt)}
                      </p>
                      {user.suspensionReason && (
                        <p className="text-sm text-red-700 dark:text-red-300">
                          <strong>Reason:</strong> {user.suspensionReason}
                        </p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Quick Stats */}
              <Card>
                <CardHeader>
                  <CardTitle>Quick Statistics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-4 border rounded-lg">
                      <div className="text-2xl font-bold text-[#425146]">
                        {user.stats.totalGalleries}
                      </div>
                      <div className="text-sm text-gray-500">
                        {user.role === 'PHOTOGRAPHER' ? 'Galleries Created' : 'Galleries Accessible'}
                      </div>
                    </div>
                    {user.role === 'PHOTOGRAPHER' && (
                      <>
                        <div className="text-center p-4 border rounded-lg">
                          <div className="text-2xl font-bold text-[#425146]">
                            {user.stats.totalClients}
                          </div>
                          <div className="text-sm text-gray-500">Clients</div>
                        </div>
                        {userDetails?.user.stats.totalPhotos !== undefined && (
                          <div className="text-center p-4 border rounded-lg">
                            <div className="text-2xl font-bold text-[#425146]">
                              {userDetails.user.stats.totalPhotos}
                            </div>
                            <div className="text-sm text-gray-500">Photos</div>
                          </div>
                        )}
                      </>
                    )}
                    <div className="text-center p-4 border rounded-lg">
                      <div className="text-2xl font-bold text-[#425146]">
                        {Math.floor((Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24))}
                      </div>
                      <div className="text-sm text-gray-500">Days Active</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="activity" className="space-y-6">
              {/* User Activity Timeline */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Activity className="h-5 w-5" />
                    <span>Recent Activity</span>
                  </CardTitle>
                  <CardDescription>
                    Recent administrative actions and system events for this user
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {userDetails?.recentActivity && userDetails.recentActivity.length > 0 ? (
                    <div className="space-y-4">
                      {userDetails.recentActivity.map((activity) => (
                        <div key={activity.id} className="flex items-start space-x-3 p-3 border rounded-lg">
                          <div className="flex-shrink-0 mt-1">
                            {getActivityIcon(activity.action)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                {formatActivityAction(activity.action)}
                              </p>
                              <p className="text-xs text-gray-500">
                                {formatTimeAgo(activity.createdAt)}
                              </p>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                              By {activity.admin.name} ({activity.admin.email})
                            </p>
                            <p className="text-xs text-gray-400 mt-1">
                              Target: {activity.targetType}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No Recent Activity</h3>
                      <p className="text-gray-500 dark:text-gray-400">
                        No administrative actions have been recorded for this user recently.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="galleries" className="space-y-6">
              {/* Galleries Information */}
              {user.role === 'PHOTOGRAPHER' && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <FolderOpen className="h-5 w-5" />
                      <span>Created Galleries</span>
                    </CardTitle>
                    <CardDescription>
                      Galleries created by this photographer
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {userDetails?.galleries && userDetails.galleries.length > 0 ? (
                      <div className="space-y-3">
                        {userDetails.galleries.map((gallery) => (
                          <div key={gallery.id} className="flex items-center justify-between p-3 border rounded-lg">
                            <div>
                              <p className="font-medium">{gallery.title}</p>
                              <p className="text-sm text-gray-500">
                                Created {formatDate(gallery.createdAt)}
                              </p>
                              {gallery._count && (
                                <p className="text-xs text-gray-400">
                                  {gallery._count.folders} folders
                                </p>
                              )}
                            </div>
                            <Badge variant="outline">{gallery.id}</Badge>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-center text-gray-500 py-4">No galleries created yet</p>
                    )}
                  </CardContent>
                </Card>
              )}

              {user.role === 'CLIENT' && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Eye className="h-5 w-5" />
                      <span>Accessible Galleries</span>
                    </CardTitle>
                    <CardDescription>
                      Galleries this client has access to
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {userDetails?.accessibleGalleries && userDetails.accessibleGalleries.length > 0 ? (
                      <div className="space-y-3">
                        {userDetails.accessibleGalleries.map((access, index) => (
                          <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                            <div>
                              <p className="font-medium">{access.gallery.title}</p>
                              <p className="text-sm text-gray-500">
                                By {access.gallery.photographer.name}
                              </p>
                              <p className="text-xs text-gray-400">
                                Access granted {formatDate(access.createdAt)}
                              </p>
                            </div>
                            <Badge variant="outline">{access.gallery.id}</Badge>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-center text-gray-500 py-4">No gallery access granted yet</p>
                    )}
                  </CardContent>
                </Card>
              )}

              {user.role === 'PHOTOGRAPHER' && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Users className="h-5 w-5" />
                      <span>Clients</span>
                    </CardTitle>
                    <CardDescription>
                      Clients managed by this photographer
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {userDetails?.clients && userDetails.clients.length > 0 ? (
                      <div className="space-y-3">
                        {userDetails.clients.map((client) => (
                          <div key={client.id} className="flex items-center justify-between p-3 border rounded-lg">
                            <div>
                              <p className="font-medium">{client.name}</p>
                              <p className="text-sm text-gray-500">{client.email}</p>
                              <p className="text-xs text-gray-400">
                                Added {formatDate(client.createdAt)}
                              </p>
                            </div>
                            <Badge variant="outline">Client</Badge>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-center text-gray-500 py-4">No clients added yet</p>
                    )}
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="statistics" className="space-y-6">
              {/* Comprehensive Statistics */}
              <Card>
                <CardHeader>
                  <CardTitle>Comprehensive Statistics</CardTitle>
                  <CardDescription>
                    Detailed metrics and analytics for this user account
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Account Statistics */}
                    <div className="space-y-4">
                      <h4 className="font-medium text-gray-900 dark:text-gray-100">Account Information</h4>
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-500">Account Age</span>
                          <span className="text-sm font-medium">
                            {Math.floor((Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24))} days
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-500">Status</span>
                          <span className="text-sm font-medium">
                            {user.isActive ? 'Active' : 'Suspended'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-500">Role</span>
                          <span className="text-sm font-medium">{user.role}</span>
                        </div>
                      </div>
                    </div>

                    {/* Content Statistics */}
                    {user.role === 'PHOTOGRAPHER' && (
                      <div className="space-y-4">
                        <h4 className="font-medium text-gray-900 dark:text-gray-100">Content Statistics</h4>
                        <div className="space-y-3">
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-500">Galleries Created</span>
                            <span className="text-sm font-medium">{user.stats.totalGalleries}</span>
                          </div>
                          {userDetails?.user.stats.totalPhotos !== undefined && (
                            <div className="flex justify-between">
                              <span className="text-sm text-gray-500">Photos Uploaded</span>
                              <span className="text-sm font-medium">{userDetails.user.stats.totalPhotos}</span>
                            </div>
                          )}
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-500">Clients Managed</span>
                            <span className="text-sm font-medium">{user.stats.totalClients}</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {user.role === 'CLIENT' && (
                      <div className="space-y-4">
                        <h4 className="font-medium text-gray-900 dark:text-gray-100">Access Statistics</h4>
                        <div className="space-y-3">
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-500">Accessible Galleries</span>
                            <span className="text-sm font-medium">{user.stats.accessibleGalleries || 0}</span>
                          </div>
                          {userDetails?.photographer && (
                            <div className="flex justify-between">
                              <span className="text-sm text-gray-500">Photographer</span>
                              <span className="text-sm font-medium">{userDetails.photographer.name}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Activity Statistics */}
                    <div className="space-y-4">
                      <h4 className="font-medium text-gray-900 dark:text-gray-100">Activity Statistics</h4>
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-500">Recent Actions</span>
                          <span className="text-sm font-medium">
                            {userDetails?.recentActivity?.length || 0}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-500">Last Updated</span>
                          <span className="text-sm font-medium">
                            {formatTimeAgo(user.updatedAt)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}

        <div className="flex justify-end space-x-2 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}