"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Shield, Eye, EyeOff, CheckCircle, XCircle, Lock, UserCheck } from "lucide-react";

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

interface InvitationDetails {
  id: string;
  email: string;
  name: string;
  expiresAt: string;
  invitedBy: {
    name: string;
    email: string;
  };
}

function AdminActivatePageContent() {
  const [invitation, setInvitation] = useState<InvitationDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [token, setToken] = useState("");

  // Form data
  const [formData, setFormData] = useState({
    password: "",
    confirmPassword: ""
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const tokenParam = searchParams.get('token');
    if (tokenParam) {
      setToken(tokenParam);
      verifyInvitation(tokenParam);
    } else {
      setError('Invalid invitation link - missing token');
    }
  }, [searchParams]);

  const verifyInvitation = async (invitationToken: string) => {
    try {
      setLoading(true);
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/admin/auth/verify-invitation/${invitationToken}`);
      const data = await response.json();

      if (data.success) {
        setInvitation(data.data.invitation);
      } else {
        setError(data.error || 'Invalid or expired invitation');
      }
    } catch (err) {
      setError('Failed to verify invitation');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError(""); // Clear error when user types
  };

  const validateForm = () => {
    if (!formData.password) {
      setError("Password is required");
      return false;
    }

    const passwordValidation = validatePasswordStrength(formData.password);
    if (!passwordValidation.isStrong) {
      setError("Password does not meet security requirements");
      return false;
    }

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return false;
    }

    return true;
  };

  const handleActivateAccount = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);
      setError("");

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/admin/auth/activate-account`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          password: formData.password,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess("Admin account activated successfully!");

        // Redirect to login after a delay
        setTimeout(() => {
          router.push('/admin/login');
        }, 2000);
      } else {
        setError(data.error || 'Failed to activate account');
      }
    } catch (err) {
      setError('Failed to activate account. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const passwordValidation = validatePasswordStrength(formData.password);

  if (loading && !invitation) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Shield className="h-12 w-12 text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Verifying invitation...</p>
        </div>
      </div>
    );
  }

  if (error && !invitation) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <Card>
            <CardHeader className="text-center">
              <XCircle className="h-16 w-16 text-red-600 mx-auto mb-4" />
              <CardTitle className="text-red-900">Invalid Invitation</CardTitle>
              <CardDescription className="text-red-700">
                {error}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={() => router.push('/admin/login')}
                className="w-full"
              >
                Go to Admin Login
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Shield className="h-16 w-16 text-blue-600 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-gray-900">Activate Admin Account</h1>
          <p className="text-gray-600 mt-2">Complete your administrator account setup</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCheck className="h-5 w-5" />
              Account Activation
            </CardTitle>
            <CardDescription>
              Set your password to activate your administrator account
            </CardDescription>
          </CardHeader>

          <CardContent>
            {error && (
              <Alert className="mb-4 border-red-200 bg-red-50">
                <XCircle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-800">{error}</AlertDescription>
              </Alert>
            )}

            {success && (
              <Alert className="mb-4 border-green-200 bg-green-50">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">{success}</AlertDescription>
              </Alert>
            )}

            {invitation && (
              <div className="bg-gray-50 p-4 rounded-lg mb-6">
                <h3 className="font-medium text-gray-900 mb-2">Invitation Details</h3>
                <div className="space-y-1 text-sm text-gray-600">
                  <p><strong>Name:</strong> {invitation.name}</p>
                  <p><strong>Email:</strong> {invitation.email}</p>
                  <p><strong>Invited by:</strong> {invitation.invitedBy.name}</p>
                  <p><strong>Expires:</strong> {new Date(invitation.expiresAt).toLocaleDateString()}</p>
                </div>
              </div>
            )}

            {success ? (
              <div className="text-center space-y-4">
                <CheckCircle className="h-16 w-16 text-green-600 mx-auto" />
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Account Activated!</h3>
                  <p className="text-gray-600 mt-2">
                    Your administrator account has been activated successfully.
                  </p>
                </div>
                <p className="text-sm text-gray-500">
                  Redirecting to login page...
                </p>
              </div>
            ) : (
              <form onSubmit={handleActivateAccount} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="password">Admin Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter a strong password"
                      value={formData.password}
                      onChange={(e) => handleInputChange('password', e.target.value)}
                      className="pl-10 pr-10"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {formData.password && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Password Requirements</Label>
                    <div className="space-y-1 text-sm">
                      <div className={`flex items-center gap-2 ${passwordValidation.requirements.length ? 'text-green-600' : 'text-red-600'}`}>
                        {passwordValidation.requirements.length ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                        At least 16 characters
                      </div>
                      <div className={`flex items-center gap-2 ${passwordValidation.requirements.uppercase ? 'text-green-600' : 'text-red-600'}`}>
                        {passwordValidation.requirements.uppercase ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                        One uppercase letter
                      </div>
                      <div className={`flex items-center gap-2 ${passwordValidation.requirements.lowercase ? 'text-green-600' : 'text-red-600'}`}>
                        {passwordValidation.requirements.lowercase ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                        One lowercase letter
                      </div>
                      <div className={`flex items-center gap-2 ${passwordValidation.requirements.numbers ? 'text-green-600' : 'text-red-600'}`}>
                        {passwordValidation.requirements.numbers ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                        One number
                      </div>
                      <div className={`flex items-center gap-2 ${passwordValidation.requirements.special ? 'text-green-600' : 'text-red-600'}`}>
                        {passwordValidation.requirements.special ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                        One special character
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Confirm your password"
                      value={formData.confirmPassword}
                      onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                      className="pl-10 pr-10"
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
                  className="w-full"
                  disabled={loading || !passwordValidation.isStrong || formData.password !== formData.confirmPassword}
                >
                  {loading ? 'Activating...' : 'Activate Account'}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

        <div className="text-center mt-6">
          <p className="text-sm text-gray-500">
            Already have an admin account?{' '}
            <button
              onClick={() => router.push('/admin/login')}
              className="text-blue-600 hover:text-blue-800 font-medium"
            >
              Sign in here
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function AdminActivatePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Shield className="h-12 w-12 text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <AdminActivatePageContent />
    </Suspense>
  );
}