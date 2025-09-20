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
import { Textarea } from "@/components/ui/textarea";
import { 
  UserX, 
  UserCheck, 
  AlertTriangle,
  Shield,
  Calendar,
  Clock
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

interface UserSuspensionModalProps {
  user: User;
  open: boolean;
  onClose: () => void;
}

export function UserSuspensionModal({ user, open, onClose }: UserSuspensionModalProps) {
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const isSuspended = !user.isActive;
  const action = isSuspended ? 'activate' : 'suspend';

  const handleSubmit = async () => {
    if (!isSuspended && !reason.trim()) {
      toast({
        title: "Reason Required",
        description: "Please provide a reason for suspending this user",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);
      let response;
      
      if (isSuspended) {
        // Activate user
        response = await adminApi.activateUser(user.id, {
          reason: reason.trim() || 'Account reactivated by admin'
        });
      } else {
        // Suspend user
        response = await adminApi.suspendUser(user.id, {
          reason: reason.trim()
        });
      }

      if (response.success) {
        toast({
          title: isSuspended ? "User Activated" : "User Suspended",
          description: isSuspended 
            ? `${user.name} has been reactivated and can now access the system`
            : `${user.name} has been suspended and can no longer access the system`,
          variant: "default",
        });
        onClose();
      }
    } catch (error: any) {
      console.error(`Failed to ${action} user:`, error);
      toast({
        title: "Error",
        description: error.message || `Failed to ${action} user`,
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
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getSuspensionImpact = () => {
    const impacts = [];
    
    if (!isSuspended) {
      // Suspending user
      impacts.push("• User will be immediately logged out of all sessions");
      impacts.push("• User will not be able to log in until reactivated");
      
      if (user.role === 'PHOTOGRAPHER') {
        impacts.push(`• ${user.stats.totalGalleries} galleries will remain accessible to clients`);
        impacts.push(`• ${user.stats.totalClients} clients will still have gallery access`);
        impacts.push("• User will not be able to upload new photos or manage galleries");
      } else if (user.role === 'CLIENT') {
        impacts.push(`• User will lose access to ${user.stats.accessibleGalleries} galleries`);
        impacts.push("• User will not be able to view, like, or download photos");
      }
    } else {
      // Activating user
      impacts.push("• User will be able to log in again");
      impacts.push("• All previous access permissions will be restored");
      
      if (user.role === 'PHOTOGRAPHER') {
        impacts.push("• User will regain full access to their galleries and clients");
      } else if (user.role === 'CLIENT') {
        impacts.push("• User will regain access to assigned galleries");
      }
    }

    return impacts;
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            {isSuspended ? (
              <UserCheck className="h-5 w-5 text-green-600" />
            ) : (
              <UserX className="h-5 w-5 text-red-600" />
            )}
            <span>
              {isSuspended ? 'Activate User Account' : 'Suspend User Account'}
            </span>
          </DialogTitle>
          <DialogDescription>
            {isSuspended 
              ? `Reactivate access for ${user.name} (${user.email})`
              : `Suspend access for ${user.name} (${user.email})`
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Current Status */}
          <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <h3 className="font-medium mb-2">Current Status</h3>
            <div className="flex items-center space-x-3">
              {isSuspended ? (
                <>
                  <UserX className="h-5 w-5 text-red-600" />
                  <div>
                    <Badge variant="destructive">Suspended</Badge>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      Account is currently suspended and cannot access the system
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <UserCheck className="h-5 w-5 text-green-600" />
                  <div>
                    <Badge variant="outline" className="text-green-600 border-green-600">Active</Badge>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      Account is currently active and can access the system
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Suspension Details (if currently suspended) */}
          {isSuspended && user.suspendedAt && (
            <div className="p-4 border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800 rounded-lg">
              <div className="flex items-center space-x-2 mb-3">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <span className="font-medium text-red-800 dark:text-red-200">
                  Suspension Details
                </span>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4 text-red-600" />
                  <span className="text-red-700 dark:text-red-300">
                    <strong>Suspended:</strong> {formatDate(user.suspendedAt)}
                  </span>
                </div>
                {user.suspensionReason && (
                  <div className="text-red-700 dark:text-red-300">
                    <strong>Reason:</strong> {user.suspensionReason}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* User Information */}
          <div className="grid grid-cols-2 gap-4 p-4 border rounded-lg">
            <div>
              <p className="text-sm font-medium text-gray-500">Role</p>
              <div className="flex items-center space-x-2 mt-1">
                <Shield className="h-4 w-4 text-gray-400" />
                <span className="text-sm">{user.role}</span>
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Member Since</p>
              <div className="flex items-center space-x-2 mt-1">
                <Clock className="h-4 w-4 text-gray-400" />
                <span className="text-sm">{formatDate(user.createdAt)}</span>
              </div>
            </div>
            {user.role === 'PHOTOGRAPHER' && (
              <>
                <div>
                  <p className="text-sm font-medium text-gray-500">Galleries</p>
                  <p className="text-sm mt-1">{user.stats.totalGalleries}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Clients</p>
                  <p className="text-sm mt-1">{user.stats.totalClients}</p>
                </div>
              </>
            )}
            {user.role === 'CLIENT' && (
              <div>
                <p className="text-sm font-medium text-gray-500">Gallery Access</p>
                <p className="text-sm mt-1">{user.stats.accessibleGalleries} galleries</p>
              </div>
            )}
          </div>

          {/* Impact Assessment */}
          <div className="p-4 border border-orange-200 bg-orange-50 dark:bg-orange-900/20 dark:border-orange-800 rounded-lg">
            <div className="flex items-center space-x-2 mb-3">
              <AlertTriangle className="h-4 w-4 text-orange-600" />
              <span className="font-medium text-orange-800 dark:text-orange-200">
                Impact of {isSuspended ? 'Activation' : 'Suspension'}
              </span>
            </div>
            <ul className="text-sm text-orange-700 dark:text-orange-300 space-y-1">
              {getSuspensionImpact().map((impact, index) => (
                <li key={index}>{impact}</li>
              ))}
            </ul>
          </div>

          {/* Warning for Admin Suspension */}
          {!isSuspended && user.role === 'ADMIN' && (
            <div className="p-4 border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800 rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <span className="font-medium text-red-800 dark:text-red-200">
                  Administrator Suspension Warning
                </span>
              </div>
              <p className="text-sm text-red-700 dark:text-red-300">
                You are about to suspend an administrator account. This will remove their ability to 
                manage the system. Ensure there are other active administrators before proceeding.
              </p>
            </div>
          )}

          {/* Reason */}
          <div>
            <Label htmlFor="reason" className="text-base font-medium">
              {isSuspended ? 'Reason for Activation (Optional)' : 'Reason for Suspension *'}
            </Label>
            <Textarea
              id="reason"
              placeholder={isSuspended 
                ? "Explain why this user is being reactivated..."
                : "Explain why this user is being suspended..."
              }
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="mt-2"
              rows={3}
            />
            <p className="text-sm text-gray-500 mt-1">
              This reason will be logged in the audit trail and {!isSuspended ? 'stored with the user account' : 'recorded for compliance'}.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={loading || (!isSuspended && !reason.trim())}
            variant={isSuspended ? "default" : "destructive"}
          >
            {loading 
              ? (isSuspended ? "Activating..." : "Suspending...") 
              : (isSuspended ? "Activate User" : "Suspend User")
            }
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}