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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { 
  Shield, 
  Camera, 
  User, 
  AlertTriangle,
  ArrowRight
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

interface UserRoleModalProps {
  user: User;
  open: boolean;
  onClose: () => void;
}

const roleOptions = [
  {
    value: 'CLIENT',
    label: 'Client',
    description: 'Can view assigned galleries and interact with photos',
    icon: User,
    color: 'text-blue-600'
  },
  {
    value: 'PHOTOGRAPHER',
    label: 'Photographer',
    description: 'Can create galleries, upload photos, and manage clients',
    icon: Camera,
    color: 'text-green-600'
  },
  {
    value: 'ADMIN',
    label: 'Administrator',
    description: 'Full system access with user and system management capabilities',
    icon: Shield,
    color: 'text-red-600'
  }
];

export function UserRoleModal({ user, open, onClose }: UserRoleModalProps) {
  const [selectedRole, setSelectedRole] = useState(user.role);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (selectedRole === user.role) {
      toast({
        title: "No Changes",
        description: "The selected role is the same as the current role",
        variant: "default",
      });
      return;
    }

    if (!reason.trim()) {
      toast({
        title: "Reason Required",
        description: "Please provide a reason for the role change",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);
      const response = await adminApi.updateUserRole(user.id, {
        role: selectedRole,
        reason: reason.trim()
      });

      if (response.success) {
        toast({
          title: "Role Updated",
          description: `User role changed from ${user.role} to ${selectedRole}`,
          variant: "default",
        });
        onClose();
      }
    } catch (error: any) {
      console.error('Failed to update user role:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update user role",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getCurrentRoleInfo = () => {
    return roleOptions.find(option => option.value === user.role);
  };

  const getNewRoleInfo = () => {
    return roleOptions.find(option => option.value === selectedRole);
  };

  const getRoleImpact = () => {
    const impacts = [];
    
    if (user.role === 'PHOTOGRAPHER' && selectedRole !== 'PHOTOGRAPHER') {
      impacts.push(`• Will lose access to ${user.stats.totalGalleries} galleries they created`);
      impacts.push(`• Will lose management of ${user.stats.totalClients} clients`);
    }
    
    if (user.role === 'CLIENT' && selectedRole === 'PHOTOGRAPHER') {
      impacts.push(`• Will gain ability to create galleries and manage clients`);
      impacts.push(`• Will lose access to ${user.stats.accessibleGalleries} galleries they currently access`);
    }
    
    if (selectedRole === 'ADMIN') {
      impacts.push(`• Will gain full administrative access to the system`);
      impacts.push(`• Will be able to manage all users and system settings`);
    }
    
    if (user.role === 'ADMIN' && selectedRole !== 'ADMIN') {
      impacts.push(`• Will lose administrative access to the system`);
      impacts.push(`• Will no longer be able to manage users or system settings`);
    }

    return impacts;
  };

  const currentRoleInfo = getCurrentRoleInfo();
  const newRoleInfo = getNewRoleInfo();

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Shield className="h-5 w-5" />
            <span>Change User Role</span>
          </DialogTitle>
          <DialogDescription>
            Update the role for {user.name} ({user.email})
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Current Role */}
          <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <h3 className="font-medium mb-2">Current Role</h3>
            <div className="flex items-center space-x-3">
              {currentRoleInfo && (
                <>
                  <currentRoleInfo.icon className={`h-5 w-5 ${currentRoleInfo.color}`} />
                  <div>
                    <Badge variant="outline">{currentRoleInfo.label}</Badge>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {currentRoleInfo.description}
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Role Selection */}
          <div>
            <Label className="text-base font-medium">Select New Role</Label>
            <RadioGroup
              value={selectedRole}
              onValueChange={(value) => setSelectedRole(value as 'ADMIN' | 'PHOTOGRAPHER' | 'CLIENT')}
              className="mt-3 space-y-3"
            >
              {roleOptions.map((option) => (
                <div key={option.value} className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800">
                  <RadioGroupItem value={option.value} id={option.value} />
                  <option.icon className={`h-5 w-5 ${option.color}`} />
                  <div className="flex-1">
                    <Label htmlFor={option.value} className="font-medium cursor-pointer">
                      {option.label}
                    </Label>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {option.description}
                    </p>
                  </div>
                  {option.value === user.role && (
                    <Badge variant="outline" className="text-xs">Current</Badge>
                  )}
                </div>
              ))}
            </RadioGroup>
          </div>

          {/* Role Change Preview */}
          {selectedRole !== user.role && (
            <div className="p-4 border border-orange-200 bg-orange-50 dark:bg-orange-900/20 dark:border-orange-800 rounded-lg">
              <div className="flex items-center space-x-2 mb-3">
                <ArrowRight className="h-4 w-4 text-orange-600" />
                <span className="font-medium text-orange-800 dark:text-orange-200">
                  Role Change Preview
                </span>
              </div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  {currentRoleInfo && <currentRoleInfo.icon className="h-4 w-4" />}
                  <span className="text-sm">{currentRoleInfo?.label}</span>
                </div>
                <ArrowRight className="h-4 w-4 text-gray-400" />
                <div className="flex items-center space-x-2">
                  {newRoleInfo && <newRoleInfo.icon className="h-4 w-4" />}
                  <span className="text-sm font-medium">{newRoleInfo?.label}</span>
                </div>
              </div>
              
              {/* Impact Assessment */}
              {getRoleImpact().length > 0 && (
                <div className="mt-3">
                  <p className="text-sm font-medium text-orange-800 dark:text-orange-200 mb-2">
                    Impact of this change:
                  </p>
                  <ul className="text-sm text-orange-700 dark:text-orange-300 space-y-1">
                    {getRoleImpact().map((impact, index) => (
                      <li key={index}>{impact}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Warning for Admin Role */}
          {selectedRole === 'ADMIN' && user.role !== 'ADMIN' && (
            <div className="p-4 border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800 rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <span className="font-medium text-red-800 dark:text-red-200">
                  Administrative Access Warning
                </span>
              </div>
              <p className="text-sm text-red-700 dark:text-red-300">
                Granting admin role will give this user full system access, including the ability to 
                manage all users, galleries, and system settings. Only grant admin access to trusted users.
              </p>
            </div>
          )}

          {/* Reason */}
          <div>
            <Label htmlFor="reason" className="text-base font-medium">
              Reason for Role Change *
            </Label>
            <Textarea
              id="reason"
              placeholder="Explain why this role change is necessary..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="mt-2"
              rows={3}
            />
            <p className="text-sm text-gray-500 mt-1">
              This reason will be logged in the audit trail for compliance purposes.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={loading || selectedRole === user.role || !reason.trim()}
          >
            {loading ? "Updating..." : "Update Role"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}