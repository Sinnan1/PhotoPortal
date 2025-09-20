"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Users,
  Search,
  Plus,
  MoreHorizontal,
  UserCheck,
  UserX,
  Shield,
  Eye,
  Edit,
  Trash2,
  AlertTriangle,
  Calendar,
  Activity
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { UserDetailModal } from "./UserDetailModal";
import { UserRoleModal } from "./UserRoleModal";
import { UserSuspensionModal } from "./UserSuspensionModal";
import { UserDeletionModal } from "./UserDeletionModal";
import { PendingApprovals } from "./PendingApprovals";
import { adminApi } from "@/lib/admin-api";
import { useToast } from "@/components/ui/use-toast";

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
  stats: {
    totalGalleries: number;
    totalClients: number;
    accessibleGalleries: number;
  };
}

interface UserSearchFilters {
  search?: string;
  role?: string;
  status?: string;
  sortBy?: string;
  sortOrder?: string;
  page?: number;
  limit?: number;
}

interface UserManagementProps {
  defaultRole?: string;
}

export function UserManagement({ defaultRole }: UserManagementProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRole, setSelectedRole] = useState<string>(defaultRole || "all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);

  // Modal states
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showSuspensionModal, setShowSuspensionModal] = useState(false);
  const [showDeletionModal, setShowDeletionModal] = useState(false);

  const { toast } = useToast();

  // Fetch users with filters
  const fetchUsers = async () => {
    try {
      setLoading(true);
      const filters: UserSearchFilters = {
        search: searchQuery || undefined,
        role: selectedRole !== "all" ? selectedRole : undefined,
        status: selectedStatus !== "all" ? selectedStatus : undefined,
        sortBy,
        sortOrder,
        page: currentPage,
        limit: 20
      };

      const response = await adminApi.getAllUsers(filters);

      if (response.success) {
        setUsers(response.data.users);
        setTotalPages(response.data.pagination.pages);
        setTotalUsers(response.data.pagination.total);

      } else {

        toast({
          title: "Error",
          description: response.error || "Failed to load users",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('❌ Failed to fetch users:', error);
      toast({
        title: "Error",
        description: "Failed to load users. Please check your connection and try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Effect to fetch users when filters change (excluding searchQuery to avoid duplicate calls)
  useEffect(() => {
    fetchUsers();
  }, [selectedRole, selectedStatus, sortBy, sortOrder, currentPage]);

  // Debounced search - only handles search query changes
  useEffect(() => {
    const timer = setTimeout(() => {
      setCurrentPage(1); // Reset to first page on search
      fetchUsers();
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Initial load
  useEffect(() => {
    fetchUsers();
  }, []);

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "ADMIN":
        return <Badge variant="destructive"><Shield className="h-3 w-3 mr-1" />Admin</Badge>;
      case "PHOTOGRAPHER":
        return <Badge variant="default">Photographer</Badge>;
      case "CLIENT":
        return <Badge variant="secondary">Client</Badge>;
      default:
        return <Badge variant="outline">{role}</Badge>;
    }
  };

  const getStatusBadge = (user: User) => {
    if (!user.isActive) {
      return <Badge variant="destructive"><UserX className="h-3 w-3 mr-1" />Suspended</Badge>;
    }
    return <Badge variant="outline" className="text-green-600 border-green-600"><UserCheck className="h-3 w-3 mr-1" />Active</Badge>;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getTimeAgo = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

    if (diffInHours < 1) return "Less than an hour ago";
    if (diffInHours < 24) return `${diffInHours} hours ago`;
    if (diffInHours < 168) return `${Math.floor(diffInHours / 24)} days ago`;
    return `${Math.floor(diffInHours / 168)} weeks ago`;
  };

  const handleUserAction = (user: User, action: string) => {
    setSelectedUser(user);
    switch (action) {
      case 'view':
        setShowDetailModal(true);
        break;
      case 'edit-role':
        setShowRoleModal(true);
        break;
      case 'suspend':
        setShowSuspensionModal(true);
        break;
      case 'delete':
        setShowDeletionModal(true);
        break;
    }
  };

  const handleModalClose = () => {
    setSelectedUser(null);
    setShowDetailModal(false);
    setShowRoleModal(false);
    setShowSuspensionModal(false);
    setShowDeletionModal(false);
    fetchUsers(); // Refresh the list
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">User Management</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Manage all users, roles, and permissions ({totalUsers} total users)
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Create User
        </Button>
      </div>

      {/* Pending Approvals */}
      <PendingApprovals onUserApproved={fetchUsers} />

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search users by name, email..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="All Roles" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="ADMIN">Admin</SelectItem>
                  <SelectItem value="PHOTOGRAPHER">Photographer</SelectItem>
                  <SelectItem value="CLIENT">Client</SelectItem>
                </SelectContent>
              </Select>

              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                </SelectContent>
              </Select>

              <Select value={`${sortBy}-${sortOrder}`} onValueChange={(value) => {
                const [field, order] = value.split('-');
                setSortBy(field);
                setSortOrder(order);
              }}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="createdAt-desc">Newest First</SelectItem>
                  <SelectItem value="createdAt-asc">Oldest First</SelectItem>
                  <SelectItem value="name-asc">Name A-Z</SelectItem>
                  <SelectItem value="name-desc">Name Z-A</SelectItem>
                  <SelectItem value="email-asc">Email A-Z</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Users List */}
      <Card>
        <CardHeader>
          <CardTitle>Users ({users.length})</CardTitle>
          <CardDescription>
            Complete list of all registered users
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center justify-between p-4 border rounded-lg animate-pulse">
                  <div className="flex items-center space-x-4">
                    <div className="h-10 w-10 rounded-full bg-gray-200 dark:bg-gray-700"></div>
                    <div className="space-y-2">
                      <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
                      <div className="h-3 w-48 bg-gray-200 dark:bg-gray-700 rounded"></div>
                    </div>
                  </div>
                  <div className="h-8 w-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
                </div>
              ))}
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No users found</h3>
              <p className="text-gray-500 dark:text-gray-400">
                {searchQuery ? "Try adjusting your search criteria" : "No users match the current filters"}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {users.map((user) => (
                <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                  <div className="flex items-center space-x-4">
                    <div className="h-10 w-10 rounded-full bg-[#425146] flex items-center justify-center">
                      <Users className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2 mb-1">
                        <h3 className="font-medium text-gray-900 dark:text-gray-100">{user.name}</h3>
                        {getRoleBadge(user.role)}
                        {getStatusBadge(user)}
                        {!user.isActive && (
                          <AlertTriangle className="h-4 w-4 text-red-500" />
                        )}
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{user.email}</p>
                      <div className="flex items-center space-x-4 text-xs text-gray-400 dark:text-gray-500 mt-1">
                        <span className="flex items-center">
                          <Calendar className="h-3 w-3 mr-1" />
                          Joined {formatDate(user.createdAt)}
                        </span>
                        <span className="flex items-center">
                          <Activity className="h-3 w-3 mr-1" />
                          {user.stats.totalGalleries} galleries
                        </span>
                        {user.role === 'PHOTOGRAPHER' && (
                          <span>{user.stats.totalClients} clients</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleUserAction(user, 'view')}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleUserAction(user, 'view')}>
                          <Eye className="h-4 w-4 mr-2" />
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleUserAction(user, 'edit-role')}>
                          <Edit className="h-4 w-4 mr-2" />
                          Change Role
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {user.isActive ? (
                          <DropdownMenuItem
                            onClick={() => handleUserAction(user, 'suspend')}
                            className="text-orange-600"
                          >
                            <UserX className="h-4 w-4 mr-2" />
                            Suspend User
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem
                            onClick={() => handleUserAction(user, 'suspend')}
                            className="text-green-600"
                          >
                            <UserCheck className="h-4 w-4 mr-2" />
                            Activate User
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => handleUserAction(user, 'delete')}
                          className="text-red-600"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete User
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-between items-center mt-6 pt-4 border-t">
              <p className="text-sm text-gray-500">
                Page {currentPage} of {totalPages}
              </p>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modals */}
      {selectedUser && (
        <>
          <UserDetailModal
            user={selectedUser}
            open={showDetailModal}
            onClose={handleModalClose}
          />
          <UserRoleModal
            user={selectedUser}
            open={showRoleModal}
            onClose={handleModalClose}
          />
          <UserSuspensionModal
            user={selectedUser}
            open={showSuspensionModal}
            onClose={handleModalClose}
          />
          <UserDeletionModal
            user={selectedUser}
            open={showDeletionModal}
            onClose={handleModalClose}
          />
        </>
      )}
    </div>
  );
}