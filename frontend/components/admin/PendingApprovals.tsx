"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  UserCheck, 
  UserX, 
  Clock, 
  AlertCircle,
  Calendar,
  Mail,
  User
} from "lucide-react";
import { adminApi } from "@/lib/admin-api";
import { useToast } from "@/components/ui/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

interface PendingUser {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
  suspendedAt: string;
  suspensionReason: string;
}

interface PendingApprovalsProps {
  onUserApproved?: () => void;
}

export function PendingApprovals({ onUserApproved }: PendingApprovalsProps) {
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<string | null>(null);
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [showRejectionDialog, setShowRejectionDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<PendingUser | null>(null);
  const [reason, setReason] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    fetchPendingApprovals();
  }, []);

  const fetchPendingApprovals = async () => {
    try {
      setLoading(true);
      const response = await adminApi.getPendingApprovals();
      setPendingUsers(response.data.pendingUsers);
    } catch (error: any) {
      console.error("Failed to fetch pending approvals:", error);
      toast({
        title: "Error",
        description: "Failed to load pending approvals",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = (user: PendingUser) => {
    setSelectedUser(user);
    setReason("");
    setShowApprovalDialog(true);
  };

  const handleReject = (user: PendingUser) => {
    setSelectedUser(user);
    setReason("");
    setShowRejectionDialog(true);
  };

  const confirmApproval = async () => {
    if (!selectedUser) return;

    try {
      setApproving(selectedUser.id);
      await adminApi.approveUser(selectedUser.id, {
        reason: reason || "Account approved by admin"
      });
      
      toast({
        title: "Success",
        description: `${selectedUser.name} has been approved`,
      });
      
      await fetchPendingApprovals();
      onUserApproved?.();
      setShowApprovalDialog(false);
      setSelectedUser(null);
      setReason("");
    } catch (error: any) {
      console.error("Failed to approve user:", error);
      toast({
        title: "Error",
        description: error.response?.data?.error || "Failed to approve user",
        variant: "destructive",
      });
    } finally {
      setApproving(null);
    }
  };

  const confirmRejection = async () => {
    if (!selectedUser) return;

    try {
      setRejecting(selectedUser.id);
      // For rejection, we can delete the user or keep them suspended with a different reason
      await adminApi.deleteUser(selectedUser.id, {
        reason: reason || "Registration rejected by admin",
        confirmEmail: selectedUser.email
      });
      
      toast({
        title: "Success",
        description: `${selectedUser.name}'s registration has been rejected`,
      });
      
      await fetchPendingApprovals();
      setShowRejectionDialog(false);
      setSelectedUser(null);
      setReason("");
    } catch (error: any) {
      console.error("Failed to reject user:", error);
      toast({
        title: "Error",
        description: error.response?.data?.error || "Failed to reject user",
        variant: "destructive",
      });
    } finally {
      setRejecting(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Pending Approvals
          </CardTitle>
          <CardDescription>
            Loading pending photographer registrations...
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Pending Approvals
            {pendingUsers.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {pendingUsers.length}
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            Photographer registrations awaiting admin approval
          </CardDescription>
        </CardHeader>
        <CardContent>
          {pendingUsers.length === 0 ? (
            <div className="text-center py-8">
              <UserCheck className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No pending approvals</p>
              <p className="text-sm text-gray-400 mt-1">
                All photographer registrations have been processed
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingUsers.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-4 border rounded-lg bg-yellow-50 border-yellow-200"
                >
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
                        <User className="h-5 w-5 text-yellow-600" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {user.name}
                        </p>
                        <Badge variant="outline" className="text-xs">
                          {user.role}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 mt-1">
                        <div className="flex items-center gap-1 text-sm text-gray-500">
                          <Mail className="h-3 w-3" />
                          {user.email}
                        </div>
                        <div className="flex items-center gap-1 text-sm text-gray-500">
                          <Calendar className="h-3 w-3" />
                          {formatDate(user.createdAt)}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleReject(user)}
                      disabled={rejecting === user.id || approving === user.id}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <UserX className="h-4 w-4 mr-1" />
                      Reject
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleApprove(user)}
                      disabled={approving === user.id || rejecting === user.id}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      {approving === user.id ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-1"></div>
                      ) : (
                        <UserCheck className="h-4 w-4 mr-1" />
                      )}
                      Approve
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Approval Dialog */}
      <Dialog open={showApprovalDialog} onOpenChange={setShowApprovalDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Photographer Registration</DialogTitle>
            <DialogDescription>
              You are about to approve {selectedUser?.name}'s photographer account.
              They will be able to log in and create galleries.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <User className="h-4 w-4" />
                <span className="font-medium">{selectedUser?.name}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Mail className="h-3 w-3" />
                {selectedUser?.email}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Approval Reason (Optional)</label>
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Enter reason for approval..."
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowApprovalDialog(false)}
              disabled={approving !== null}
            >
              Cancel
            </Button>
            <Button
              onClick={confirmApproval}
              disabled={approving !== null}
              className="bg-green-600 hover:bg-green-700"
            >
              {approving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Approving...
                </>
              ) : (
                <>
                  <UserCheck className="h-4 w-4 mr-2" />
                  Approve Account
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rejection Dialog */}
      <Dialog open={showRejectionDialog} onOpenChange={setShowRejectionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Photographer Registration</DialogTitle>
            <DialogDescription>
              You are about to reject {selectedUser?.name}'s photographer registration.
              This action will permanently delete their account.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 bg-red-50 rounded-lg border border-red-200">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <span className="font-medium text-red-800">Warning</span>
              </div>
              <p className="text-sm text-red-700">
                This action cannot be undone. The user will need to register again if they want to create an account.
              </p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <User className="h-4 w-4" />
                <span className="font-medium">{selectedUser?.name}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Mail className="h-3 w-3" />
                {selectedUser?.email}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Rejection Reason</label>
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Enter reason for rejection..."
                className="mt-1"
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowRejectionDialog(false)}
              disabled={rejecting !== null}
            >
              Cancel
            </Button>
            <Button
              onClick={confirmRejection}
              disabled={rejecting !== null || !reason.trim()}
              variant="destructive"
            >
              {rejecting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Rejecting...
                </>
              ) : (
                <>
                  <UserX className="h-4 w-4 mr-2" />
                  Reject Registration
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}