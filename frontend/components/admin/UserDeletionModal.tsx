"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Trash2, 
  AlertTriangle,
  Shield,
  Calendar,
  Database,
  Users,
  FolderOpen
} from "lucide-react";
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

interface UserDeletionModalProps {
  user: User;
  open: boolean;
  onClose: () => void;
}

export function UserDeletionModal({ user, open, onClose }: UserDeletionModalProps) {
  const [reason, setReason] = useState("");
  const [confirmEmail, setConfirmEmail] = useState("");
  const [confirmUnderstand, setConfirmUnderstand] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (!reason.trim()) {
      toast({
        title: "Reason Required",
        description: "Please provide a reason for deleting this user",
        variant: "destructive",
      });
      return;
    }

    if (confirmEmail !== user.email) {
      toast({
        title: "Email Confirmation Required",
        description: "Please type the user's email address to confirm deletion",
        variant: "destructive",
      });
      return;
    }

    if (!confirmUnderstand) {
      toast({
        title: "Confirmation Required",
        description: "Please confirm that you understand this action cannot be undone",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);
      const response = await adminApi.deleteUser(user.id, {
        reason: reason.trim(),
        confirmEmail: confirmEmail
      });

      if (response.success) {
        toast({
          title: "User Deleted",
          description: `${user.name} has been permanently deleted from the system`,
          variant: "default",
        });
        onClose();
      }
    } catch (error: any) {
      console.error('Failed to delete user:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete user",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getDeletionImpact = () => {
    const impacts = [];
    
    impacts.push("• User account will be permanently deleted");
    impacts.push("• User will be immediately logged out of all sessions");
    impacts.push("• All user data will be removed from the system");
    
    if (user.role === 'PHOTOGRAPHER') {
      if (user.stats.totalGalleries > 0) {
        impacts.push(`• ${user.stats.totalGalleries} galleries will be permanently deleted`);
        impacts.push("• All photos in these galleries will be permanently deleted");
      }
      if (user.stats.totalClients > 0) {
        impacts.push(`• ${user.stats.totalClients} client relationships will be removed`);
        impacts.push("• Clients will lose access to this photographer's galleries");
      }
    } else if (user.role === 'CLIENT') {
      if (user.stats.accessibleGalleries > 0) {
        impacts.push(`• Access to ${user.stats.accessibleGalleries} galleries will be removed`);
      }
    } else if (user.role === 'ADMIN') {
      impacts.push("• Administrative privileges will be permanently revoked");
      impacts.push("• Admin audit logs will be preserved for compliance");
    }
    
    impacts.push("• This action cannot be undone");

    return impacts;
  };

  const getDataToBeDeleted = () => {
    const data = [];
    
    data.push("User profile and account information");
    data.push("Authentication credentials");
    data.push("User preferences and settings");
    
    if (user.role === 'PHOTOGRAPHER') {
      if (user.stats.totalGalleries > 0) {
        data.push(`${user.stats.totalGalleries} galleries and all contained photos`);
        data.push("Gallery metadata and settings");
      }
      if (user.stats.totalClients > 0) {
        data.push(`${user.stats.totalClients} client relationships`);
      }
    } else if (user.role === 'CLIENT') {
      data.push("Gallery access permissions");
      data.push("Photo interactions (likes, favorites)");
    }
    
    return data;
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2 text-red-600">
            <Trash2 className="h-5 w-5" />
            <span>Delete User Account</span>
          </DialogTitle>
          <DialogDescription>
            Permanently delete {user.name} ({user.email}) from the system
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Critical Warning */}
          <div className="p-4 border-2 border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800 rounded-lg">
            <div className="flex items-center space-x-2 mb-3">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <span className="font-bold text-red-800 dark:text-red-200 text-lg">
                CRITICAL WARNING
              </span>
            </div>
            <p className="text-red-700 dark:text-red-300 font-medium">
              This action will permanently delete the user account and all associated data. 
              This operation cannot be undone and will result in immediate data loss.
            </p>
          </div>

          {/* User Information */}
          <div className="p-4 border rounded-lg bg-gray-50 dark:bg-gray-800">
            <h3 className="font-medium mb-3">User to be Deleted</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-500">Name</p>
                <p className="text-sm mt-1">{user.name}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Email</p>
                <p className="text-sm mt-1">{user.email}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Role</p>
                <div className="flex items-center space-x-2 mt-1">
                  <Shield className="h-4 w-4 text-gray-400" />
                  <Badge variant="outline">{user.role}</Badge>
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Member Since</p>
                <div className="flex items-center space-x-2 mt-1">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <span className="text-sm">{formatDate(user.createdAt)}</span>
                </div>
              </div>
              {user.role === 'PHOTOGRAPHER' && (
                <>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Galleries</p>
                    <div className="flex items-center space-x-2 mt-1">
                      <FolderOpen className="h-4 w-4 text-gray-400" />
                      <span className="text-sm">{user.stats.totalGalleries}</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Clients</p>
                    <div className="flex items-center space-x-2 mt-1">
                      <Users className="h-4 w-4 text-gray-400" />
                      <span className="text-sm">{user.stats.totalClients}</span>
                    </div>
                  </div>
                </>
              )}
              {user.role === 'CLIENT' && (
                <div>
                  <p className="text-sm font-medium text-gray-500">Gallery Access</p>
                  <div className="flex items-center space-x-2 mt-1">
                    <FolderOpen className="h-4 w-4 text-gray-400" />
                    <span className="text-sm">{user.stats.accessibleGalleries} galleries</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Data to be Deleted */}
          <div className="p-4 border border-orange-200 bg-orange-50 dark:bg-orange-900/20 dark:border-orange-800 rounded-lg">
            <div className="flex items-center space-x-2 mb-3">
              <Database className="h-4 w-4 text-orange-600" />
              <span className="font-medium text-orange-800 dark:text-orange-200">
                Data to be Permanently Deleted
              </span>
            </div>
            <ul className="text-sm text-orange-700 dark:text-orange-300 space-y-1">
              {getDataToBeDeleted().map((data, index) => (
                <li key={index}>• {data}</li>
              ))}
            </ul>
          </div>

          {/* Impact Assessment */}
          <div className="p-4 border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800 rounded-lg">
            <div className="flex items-center space-x-2 mb-3">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <span className="font-medium text-red-800 dark:text-red-200">
                System Impact
              </span>
            </div>
            <ul className="text-sm text-red-700 dark:text-red-300 space-y-1">
              {getDeletionImpact().map((impact, index) => (
                <li key={index}>{impact}</li>
              ))}
            </ul>
          </div>

          {/* Special Warning for Admin Deletion */}
          {user.role === 'ADMIN' && (
            <div className="p-4 border-2 border-red-300 bg-red-100 dark:bg-red-900/30 dark:border-red-700 rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <Shield className="h-5 w-5 text-red-600" />
                <span className="font-bold text-red-800 dark:text-red-200">
                  Administrator Account Deletion
                </span>
              </div>
              <p className="text-sm text-red-700 dark:text-red-300">
                You are about to delete an administrator account. Ensure there are other active 
                administrators who can manage the system before proceeding. Admin audit logs will 
                be preserved for compliance purposes.
              </p>
            </div>
          )}

          {/* Reason */}
          <div>
            <Label htmlFor="reason" className="text-base font-medium">
              Reason for Deletion *
            </Label>
            <Textarea
              id="reason"
              placeholder="Provide a detailed reason for deleting this user account..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="mt-2"
              rows={3}
            />
            <p className="text-sm text-gray-500 mt-1">
              This reason will be permanently logged in the audit trail for compliance purposes.
            </p>
          </div>

          {/* Email Confirmation */}
          <div>
            <Label htmlFor="confirmEmail" className="text-base font-medium">
              Confirm User Email *
            </Label>
            <Input
              id="confirmEmail"
              type="email"
              placeholder={`Type "${user.email}" to confirm`}
              value={confirmEmail}
              onChange={(e) => setConfirmEmail(e.target.value)}
              className="mt-2"
            />
            <p className="text-sm text-gray-500 mt-1">
              Type the user's email address exactly as shown above to confirm deletion.
            </p>
          </div>

          {/* Final Confirmation */}
          <div className="flex items-start space-x-2 p-4 border rounded-lg">
            <Checkbox
              id="confirmUnderstand"
              checked={confirmUnderstand}
              onCheckedChange={(checked) => setConfirmUnderstand(checked === true)}
              className="mt-1"
            />
            <div>
              <Label htmlFor="confirmUnderstand" className="text-sm font-medium cursor-pointer">
                I understand that this action cannot be undone
              </Label>
              <p className="text-xs text-gray-500 mt-1">
                By checking this box, you confirm that you understand the permanent nature of this 
                deletion and accept responsibility for the data loss that will occur.
              </p>
            </div>
          </div>
        </div>

        <DialogFooter className="border-t pt-4">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={loading || !reason.trim() || confirmEmail !== user.email || !confirmUnderstand}
            variant="destructive"
          >
            {loading ? "Deleting..." : "Delete User Permanently"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}