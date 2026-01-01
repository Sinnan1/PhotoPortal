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
import { motion } from "framer-motion";
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
      case 'activate':
        // UserSuspensionModal handles both suspend and activate based on user.isActive
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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-0">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">User Management</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1 sm:mt-2 text-sm sm:text-base">
            Manage all users, roles, and permissions ({totalUsers} total users)
          </p>
        </div>
        <Button className="w-full sm:w-auto">
          <Plus className="h-4 w-4 mr-2" />
          Create User
        </Button>
      </div>

      {/* Pending Approvals */}
      <PendingApprovals onUserApproved={fetchUsers} />

      {/* Search and Filters - Glassmorphic */}
      <Card className="border-border/50 bg-background/50 backdrop-blur-sm shadow-sm hover:border-primary/20 transition-all duration-300">
        <CardContent className="pt-6">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search users by name, email..."
                className="pl-10 bg-background/50 border-border/50 focus:ring-primary/20"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger className="w-full sm:w-[140px] bg-background/50 border-border/50">
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
                <SelectTrigger className="w-full sm:w-[140px] bg-background/50 border-border/50">
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
                <SelectTrigger className="w-full sm:w-[160px] bg-background/50 border-border/50">
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

      {/* Users Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-lg font-audrey font-bold">{users.length} Users Found</h2>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-48 rounded-xl border border-border/50 bg-background/50 animate-pulse" />
            ))}
          </div>
        ) : users.length === 0 ? (
          <Card className="border-border/50 bg-background/50 backdrop-blur-sm">
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-muted/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium mb-2">No users found</h3>
              <p className="text-muted-foreground">
                {searchQuery ? "Try adjusting your search criteria" : "No users match the current filters"}
              </p>
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {users.map((user, index) => (
              <motion.div
                key={user.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="group relative"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-transparent opacity-0 group-hover:opacity-100 rounded-xl transition-opacity duration-500 blur-xl" />
                <Card className="relative h-full border-border/50 bg-background/50 backdrop-blur-md hover:border-primary/30 transition-all duration-300 overflow-hidden">
                  <CardHeader className="flex flex-row items-start justify-between pb-2 p-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20 group-hover:scale-110 transition-transform duration-300">
                        <Users className="h-5 w-5 text-primary" />
                      </div>
                      <div className="space-y-1">
                        <h3 className="font-audrey font-bold text-lg leading-none group-hover:text-primary transition-colors">{user.name}</h3>
                        <p className="text-xs text-muted-foreground break-all line-clamp-1">{user.email}</p>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleUserAction(user, 'view')}>
                          <Eye className="h-4 w-4 mr-2" /> View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleUserAction(user, 'edit-role')}>
                          <Edit className="h-4 w-4 mr-2" /> Change Role
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleUserAction(user, user.isActive ? 'suspend' : 'activate')} className={user.isActive ? "text-orange-600" : "text-green-600"}>                          {user.isActive ? <UserX className="h-4 w-4 mr-2" /> : <UserCheck className="h-4 w-4 mr-2" />}
                          {user.isActive ? "Suspend User" : "Activate User"}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleUserAction(user, 'delete')} className="text-red-600">
                          <Trash2 className="h-4 w-4 mr-2" /> Delete User
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </CardHeader>
                  <CardContent className="p-4 pt-0 space-y-3">
                    <div className="flex flex-wrap gap-2">
                      {getRoleBadge(user.role)}
                      {getStatusBadge(user)}
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground pt-2 border-t border-border/50">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-3 w-3" />
                        <span>{new Date(user.createdAt).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Activity className="h-3 w-3" />
                        <span>{user.stats.accessibleGalleries} galleries</span>
                      </div>
                    </div>

                    <div className="pt-2">
                      <Button
                        className="w-full bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground border-none transition-all"
                        size="sm"
                        onClick={() => handleUserAction(user, 'view')}
                      >
                        View Profile
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-between items-center mt-6 pt-4 border-t border-border/40">
            <p className="text-sm text-muted-foreground">
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
      </div>

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