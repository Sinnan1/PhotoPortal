"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import {
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  CheckCircle,
  XCircle,
  Save,
  Shield,
  Calendar,
  Monitor,
  LogOut
} from "lucide-react";


// Password strength validation
const validatePasswordStrength = (password: string) => {
  const requirements = {
    length: password.length >= 16,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    numbers: /\d/.test(password),
    special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
  };

  const score = Object.values(requirements).filter(Boolean).length;
  return { requirements, score, isStrong: score >= 4 && requirements.length };
};

interface AdminProfile {
  id: string;
  email: string;
  name: string;
  role: string;
  createdAt: string;
}

interface AdminSession {
  id: string;
  ipAddress: string;
  userAgent: string;
  createdAt: string;
  expiresAt: string;
}

export default function AdminProfilePage() {
  const [profile, setProfile] = useState<AdminProfile | null>(null);
  const [sessions, setSessions] = useState<AdminSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Helper function to get auth token safely
  const getAuthToken = () => {
    try {
      if (typeof document !== 'undefined') {
        const cookieToken = document.cookie.split('; ').find(row => row.startsWith('auth-token='))?.split('=')[1];
        if (cookieToken) return cookieToken;
      }

      if (typeof window !== 'undefined') {
        const storageToken = window.localStorage.getItem('auth-token');
        if (storageToken) return storageToken;
      }
    } catch (e) {
      console.warn('Storage access restricted', e);
    }
    return null;
  };

  // Profile form data
  const [profileData, setProfileData] = useState({
    name: ""
  });

  // Password form data
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    loadProfile();
    loadSessions();
  }, []);

  const loadProfile = async () => {
    const token = getAuthToken();
    if (!token) {
      // Silent fail or redirect handled by middleware/layout usually, but here we just stop
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/admin/auth/profile`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (data.success) {
        setProfile(data.data.admin);
        setProfileData({ name: data.data.admin.name });
      } else {
        // Don't show error on first load to avoid flashing if it's just a sync issue
        console.error('Failed to load profile');
      }
    } catch (err) {
      setError('Failed to connect to server');
    } finally {
      setLoading(false);
    }
  };

  const loadSessions = async () => {
    const token = getAuthToken();
    if (!token) return;

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/admin/auth/sessions`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (data.success) {
        setSessions(data.data.sessions);
      }
    } catch (err) {
      console.error('Failed to load sessions:', err);
    }
  };

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!profileData.name.trim()) {
      setError("Name is required");
      return;
    }

    const token = getAuthToken();
    if (!token) {
      setError("Session expired. Please log in again.");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/admin/auth/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: profileData.name.trim(),
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess("Profile updated successfully!");
        setProfile(data.data.admin);
      } else {
        setError(data.error || 'Failed to update profile');
      }
    } catch (err) {
      setError('Failed to update profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      setError("All password fields are required");
      return;
    }

    const passwordValidation = validatePasswordStrength(passwordData.newPassword);
    if (!passwordValidation.isStrong) {
      setError("New password does not meet security requirements");
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setError("New passwords do not match");
      return;
    }

    const token = getAuthToken();
    if (!token) {
      setError("Session expired. Please log in again.");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/admin/auth/change-password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess("Password changed successfully! Other sessions have been invalidated.");
        setPasswordData({
          currentPassword: "",
          newPassword: "",
          confirmPassword: ""
        });
        loadSessions(); // Reload sessions since others were invalidated
      } else {
        setError(data.error || 'Failed to change password');
      }
    } catch (err) {
      setError('Failed to change password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const revokeSession = async (sessionId: string) => {
    if (!confirm("Are you sure you want to revoke this session?")) {
      return;
    }

    const token = getAuthToken();
    if (!token) return;

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/admin/auth/sessions/${sessionId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (data.success) {
        setSuccess("Session revoked successfully!");
        loadSessions();
      } else {
        setError(data.error || 'Failed to revoke session');
      }
    } catch (err) {
      setError('Failed to revoke session');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getBrowserName = (userAgent: string) => {
    if (userAgent.includes('Chrome')) return 'Chrome';
    if (userAgent.includes('Firefox')) return 'Firefox';
    if (userAgent.includes('Safari')) return 'Safari';
    if (userAgent.includes('Edge')) return 'Edge';
    return 'Unknown Browser';
  };

  const passwordValidation = validatePasswordStrength(passwordData.newPassword);

  return (

    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-0">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">Admin Profile</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1 sm:mt-2 text-sm sm:text-base">
            Manage your administrator account settings
          </p>
        </div>
      </div>

      {error && (
        <Alert className="border-red-200 bg-red-50">
          <XCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">{success}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Profile Information */}
        <Card className="border-border/50 bg-background/50 backdrop-blur-sm shadow-sm hover:border-primary/20 transition-all duration-300">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Profile Information
            </CardTitle>
            <CardDescription>
              Update your basic account information
            </CardDescription>
          </CardHeader>
          <CardContent>
            {profile && (
              <div className="space-y-4">
                <div className="bg-muted p-4 rounded-lg space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Mail className="h-4 w-4" />
                    <span>Email: {profile.email}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Shield className="h-4 w-4" />
                    <span>Role: {profile.role}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>Created: {formatDate(profile.createdAt)}</span>
                  </div>
                </div>

                <form onSubmit={handleProfileUpdate} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input
                      id="name"
                      type="text"
                      value={profileData.name}
                      onChange={(e) => setProfileData({ name: e.target.value })}
                      placeholder="Enter your full name"
                      className="bg-background/50 border-border/50"
                      required
                    />
                  </div>

                  <Button type="submit" disabled={loading} className="w-full">
                    <Save className="h-4 w-4 mr-2" />
                    {loading ? 'Updating...' : 'Update Profile'}
                  </Button>
                </form>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Change Password */}
        <Card className="border-border/50 bg-background/50 backdrop-blur-sm shadow-sm hover:border-primary/20 transition-all duration-300">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Change Password
            </CardTitle>
            <CardDescription>
              Update your admin password with a strong, secure password
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="currentPassword">Current Password</Label>
                <div className="relative">
                  <Input
                    id="currentPassword"
                    type={showCurrentPassword ? "text" : "password"}
                    value={passwordData.currentPassword}
                    onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                    placeholder="Enter current password"
                    className="pr-10 bg-background/50 border-border/50"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                  >
                    {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <div className="relative">
                  <Input
                    id="newPassword"
                    type={showNewPassword ? "text" : "password"}
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                    placeholder="Enter new password"
                    className="pr-10 bg-background/50 border-border/50"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                  >
                    {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {passwordData.newPassword && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Password Requirements</Label>
                  <div className="space-y-1 text-sm bg-muted/50 p-3 rounded-md">
                    <div className={`flex items-center gap-2 ${passwordValidation.requirements.length ? 'text-green-600' : 'text-red-500'}`}>
                      {passwordValidation.requirements.length ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                      At least 16 characters
                    </div>
                    <div className={`flex items-center gap-2 ${passwordValidation.requirements.uppercase ? 'text-green-600' : 'text-red-500'}`}>
                      {passwordValidation.requirements.uppercase ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                      One uppercase letter
                    </div>
                    <div className={`flex items-center gap-2 ${passwordValidation.requirements.lowercase ? 'text-green-600' : 'text-red-500'}`}>
                      {passwordValidation.requirements.lowercase ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                      One lowercase letter
                    </div>
                    <div className={`flex items-center gap-2 ${passwordValidation.requirements.numbers ? 'text-green-600' : 'text-red-500'}`}>
                      {passwordValidation.requirements.numbers ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                      One number
                    </div>
                    <div className={`flex items-center gap-2 ${passwordValidation.requirements.special ? 'text-green-600' : 'text-red-500'}`}>
                      {passwordValidation.requirements.special ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                      One special character
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                    placeholder="Confirm new password"
                    className="pr-10 bg-background/50 border-border/50"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading || !passwordValidation.isStrong || passwordData.newPassword !== passwordData.confirmPassword}
                className="w-full"
              >
                <Lock className="h-4 w-4 mr-2" />
                {loading ? 'Changing...' : 'Change Password'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Active Sessions */}
      <Card className="border-border/50 bg-background/50 backdrop-blur-sm shadow-sm hover:border-primary/20 transition-all duration-300">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Monitor className="h-5 w-5" />
            Active Sessions
          </CardTitle>
          <CardDescription>
            Manage your active admin sessions across different devices
          </CardDescription>
        </CardHeader>
        <CardContent>
          {sessions.length === 0 ? (
            <div className="text-center py-8">
              <Monitor className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No active sessions found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {sessions.map((session) => (
                <div
                  key={session.id}
                  className="border border-border/50 rounded-lg p-4 bg-background/30 hover:bg-background/50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <Monitor className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium text-foreground">{getBrowserName(session.userAgent)}</span>
                      </div>
                      <div className="space-y-1 text-sm text-muted-foreground">
                        <p>IP Address: {session.ipAddress}</p>
                        <p>Created: {formatDate(session.createdAt)}</p>
                        <p>Expires: {formatDate(session.expiresAt)}</p>
                      </div>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => revokeSession(session.id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20 border-red-200 dark:border-red-900"
                    >
                      <LogOut className="h-3 w-3 mr-1" />
                      Revoke
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}