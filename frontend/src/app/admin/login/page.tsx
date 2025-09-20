"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Shield, Eye, EyeOff, AlertTriangle, Lock, CheckCircle, XCircle, Clock } from "lucide-react";
import { adminApi } from "@/lib/admin-api";

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

export default function AdminLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutTime, setLockoutTime] = useState<number | null>(null);
  const [showPasswordRequirements, setShowPasswordRequirements] = useState(false);
  const [rememberDevice, setRememberDevice] = useState(false);
  const { user, adminLogin } = useAuth();
  const router = useRouter();

  // Redirect if already logged in as admin
  useEffect(() => {
    if (user && user.role === "ADMIN") {
      router.push("/admin");
    }
  }, [user, router]);

  // Handle lockout countdown
  useEffect(() => {
    if (lockoutTime && lockoutTime > 0) {
      const timer = setInterval(() => {
        setLockoutTime(prev => {
          if (prev && prev > 1) {
            return prev - 1;
          } else {
            setFailedAttempts(0);
            return null;
          }
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [lockoutTime]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    // Check if account is locked out
    if (lockoutTime && lockoutTime > 0) {
      setError(`Account temporarily locked. Try again in ${Math.ceil(lockoutTime / 60)} minutes.`);
      return;
    }

    // Validate password strength for admin accounts
    const passwordValidation = validatePasswordStrength(password);
    if (!passwordValidation.isStrong) {
      setError("Password does not meet admin security requirements. Please check the requirements below.");
      setShowPasswordRequirements(true);
      return;
    }

    setLoading(true);

    try {
      // Use auth context admin login which handles everything properly
      await adminLogin(email, password);
      
      // Reset failed attempts on successful login
      setFailedAttempts(0);
      setLockoutTime(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Login failed";
      setError(errorMessage);
      
      // Handle rate limiting
      if (errorMessage.includes("Too many failed attempts")) {
        const retryMatch = errorMessage.match(/(\d+)/);
        if (retryMatch) {
          setLockoutTime(parseInt(retryMatch[0]));
        }
      } else {
        // Increment failed attempts for other errors
        const newFailedAttempts = failedAttempts + 1;
        setFailedAttempts(newFailedAttempts);
        
        // Show warning after 3 failed attempts
        if (newFailedAttempts >= 3) {
          setError(`${errorMessage}. Warning: Account will be temporarily locked after 5 failed attempts.`);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const passwordValidation = validatePasswordStrength(password);
  const isFormValid = email && password && passwordValidation.isStrong;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="h-16 w-16 bg-[#425146] rounded-full flex items-center justify-center">
              <Shield className="h-8 w-8 text-white" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Admin Access
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Yarrow Weddings & Co. Administration Panel
          </p>
        </div>

        {/* Login Form */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-center">Administrator Login</CardTitle>
            <CardDescription className="text-center">
              Enter your admin credentials to access the control panel
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {lockoutTime && lockoutTime > 0 && (
                <Alert variant="destructive">
                  <Clock className="h-4 w-4" />
                  <AlertDescription>
                    Account temporarily locked due to multiple failed attempts. 
                    Try again in {Math.ceil(lockoutTime / 60)} minutes.
                  </AlertDescription>
                </Alert>
              )}

              {failedAttempts > 0 && failedAttempts < 5 && !lockoutTime && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    {failedAttempts} failed attempt{failedAttempts > 1 ? 's' : ''}. 
                    Account will be locked after 5 failed attempts.
                  </AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Admin Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@yarrowweddings.com"
                  required
                  disabled={loading || (lockoutTime !== null && lockoutTime > 0)}
                  className="admin-form-input"
                  autoComplete="username"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Admin Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (e.target.value && !showPasswordRequirements) {
                        setShowPasswordRequirements(true);
                      }
                    }}
                    placeholder="Enter your secure admin password"
                    required
                    disabled={loading || (lockoutTime !== null && lockoutTime > 0)}
                    className="admin-form-input pr-10"
                    autoComplete="current-password"
                    minLength={16}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={loading}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-gray-400" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-400" />
                    )}
                  </Button>
                </div>

                {/* Password Requirements */}
                {showPasswordRequirements && password && (
                  <div className="mt-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border">
                    <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Admin Password Requirements:
                    </div>
                    <div className="space-y-1 text-xs">
                      <div className={`flex items-center space-x-2 ${passwordValidation.requirements.length ? 'text-green-600' : 'text-red-600'}`}>
                        {passwordValidation.requirements.length ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                        <span>At least 16 characters</span>
                      </div>
                      <div className={`flex items-center space-x-2 ${passwordValidation.requirements.uppercase ? 'text-green-600' : 'text-red-600'}`}>
                        {passwordValidation.requirements.uppercase ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                        <span>At least one uppercase letter</span>
                      </div>
                      <div className={`flex items-center space-x-2 ${passwordValidation.requirements.lowercase ? 'text-green-600' : 'text-red-600'}`}>
                        {passwordValidation.requirements.lowercase ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                        <span>At least one lowercase letter</span>
                      </div>
                      <div className={`flex items-center space-x-2 ${passwordValidation.requirements.numbers ? 'text-green-600' : 'text-red-600'}`}>
                        {passwordValidation.requirements.numbers ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                        <span>At least one number</span>
                      </div>
                      <div className={`flex items-center space-x-2 ${passwordValidation.requirements.special ? 'text-green-600' : 'text-red-600'}`}>
                        {passwordValidation.requirements.special ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                        <span>At least one special character</span>
                      </div>
                    </div>
                    <div className="mt-2">
                      <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400 mb-1">
                        <span>Password Strength</span>
                        <span>{passwordValidation.score}/5</span>
                      </div>
                      <Progress 
                        value={(passwordValidation.score / 5) * 100} 
                        className={`h-2 ${passwordValidation.isStrong ? 'bg-green-100' : 'bg-red-100'}`}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Remember Device Option */}
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="rememberDevice"
                  checked={rememberDevice}
                  onChange={(e) => setRememberDevice(e.target.checked)}
                  className="rounded border-gray-300 text-[#425146] focus:ring-[#425146]"
                  disabled={loading}
                />
                <Label htmlFor="rememberDevice" className="text-sm text-gray-600 dark:text-gray-400">
                  Remember this device for 30 days
                </Label>
              </div>

              <Button
                type="submit"
                className="w-full admin-btn-primary"
                disabled={loading || !isFormValid || (lockoutTime !== null && lockoutTime > 0)}
              >
                {loading ? (
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Authenticating...</span>
                  </div>
                ) : lockoutTime && lockoutTime > 0 ? (
                  <div className="flex items-center space-x-2">
                    <Lock className="h-4 w-4" />
                    <span>Account Locked ({Math.ceil(lockoutTime / 60)}m)</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <Shield className="h-4 w-4" />
                    <span>Secure Admin Access</span>
                  </div>
                )}
              </Button>
            </form>

            {/* Account Recovery */}
            <div className="mt-4 text-center">
              <Button
                variant="ghost"
                onClick={() => {
                  alert("Admin account recovery requires contacting system administrator. Please reach out to your IT support team.");
                }}
                className="text-sm text-gray-600 dark:text-gray-400 hover:text-[#425146]"
                disabled={loading}
              >
                Forgot your admin password?
              </Button>
            </div>

            {/* Security Notice */}
            <div className="mt-6 p-4 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800">
              <div className="flex items-start space-x-2">
                <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-amber-800 dark:text-amber-200">
                  <p className="font-medium mb-1">Security Notice</p>
                  <ul className="space-y-1 text-xs">
                    <li>• All admin access attempts are logged and monitored</li>
                    <li>• Sessions expire after 2 hours of inactivity</li>
                    <li>• Account locks after 5 failed login attempts</li>
                    <li>• Unauthorized access is prohibited and prosecuted</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Back to Main Site */}
            <div className="mt-4 text-center">
              <Button
                variant="ghost"
                onClick={() => router.push("/")}
                className="text-sm text-gray-600 dark:text-gray-400 hover:text-[#425146]"
              >
                ← Back to Main Site
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}