"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Shield, Eye, EyeOff, CheckCircle, XCircle, User, Mail, Lock, ArrowRight, ArrowLeft } from "lucide-react";

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

interface SetupStatus {
  needsFirstAdminSetup: boolean;
  totalUsers: number;
  adminCount: number;
  setupComplete: boolean;
}

export default function AdminSetupPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [setupStatus, setSetupStatus] = useState<SetupStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  
  // Form data
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: ""
  });
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const router = useRouter();

  // Check setup status on component mount
  useEffect(() => {
    checkSetupStatus();
  }, []);

  const checkSetupStatus = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/admin/auth/setup-status`);
      const data = await response.json();
      
      if (data.success) {
        setSetupStatus(data.data);
        
        // If setup is already complete, redirect to login
        if (!data.data.needsFirstAdminSetup) {
          router.push('/admin/login');
          return;
        }
      } else {
        setError('Failed to check setup status');
      }
    } catch (err) {
      setError('Failed to connect to server');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError(""); // Clear error when user types
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      setError("Name is required");
      return false;
    }
    
    if (!formData.email.trim()) {
      setError("Email is required");
      return false;
    }
    
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      setError("Please enter a valid email address");
      return false;
    }
    
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    try {
      setLoading(true);
      setError("");
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/admin/auth/setup-first-admin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          email: formData.email.trim(),
          password: formData.password,
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setSuccess("Admin account created successfully!");
        setCurrentStep(3); // Move to success step
        
        // Redirect to login after a delay
        setTimeout(() => {
          router.push('/admin/login');
        }, 2000);
      } else {
        setError(data.error || 'Failed to create admin account');
      }
    } catch (err) {
      setError('Failed to create admin account. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const passwordValidation = validatePasswordStrength(formData.password);

  if (loading && !setupStatus) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Shield className="h-12 w-12 text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Checking setup status...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Shield className="h-16 w-16 text-blue-600 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-gray-900">Admin Setup</h1>
          <p className="text-gray-600 mt-2">Create your first administrator account</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Step {currentStep} of 3: {currentStep === 1 ? 'Account Details' : currentStep === 2 ? 'Security' : 'Complete'}
            </CardTitle>
            <CardDescription>
              {currentStep === 1 && "Enter your administrator account information"}
              {currentStep === 2 && "Set a strong password for your admin account"}
              {currentStep === 3 && "Your admin account has been created successfully"}
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <Progress value={(currentStep / 3) * 100} className="mb-6" />
            
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

            <form onSubmit={handleSubmit} className="space-y-4">
              {currentStep === 1 && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="name"
                        type="text"
                        placeholder="Enter your full name"
                        value={formData.name}
                        onChange={(e) => handleInputChange('name', e.target.value)}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="Enter your email address"
                        value={formData.email}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>
                  
                  <Button
                    type="button"
                    onClick={() => setCurrentStep(2)}
                    className="w-full"
                    disabled={!formData.name.trim() || !formData.email.trim()}
                  >
                    Next: Set Password
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </>
              )}

              {currentStep === 2 && (
                <>
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

                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setCurrentStep(1)}
                      className="flex-1"
                    >
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Back
                    </Button>
                    <Button
                      type="submit"
                      className="flex-1"
                      disabled={loading || !passwordValidation.isStrong || formData.password !== formData.confirmPassword}
                    >
                      {loading ? 'Creating...' : 'Create Admin Account'}
                    </Button>
                  </div>
                </>
              )}

              {currentStep === 3 && (
                <div className="text-center space-y-4">
                  <CheckCircle className="h-16 w-16 text-green-600 mx-auto" />
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Setup Complete!</h3>
                    <p className="text-gray-600 mt-2">
                      Your administrator account has been created successfully.
                    </p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg text-left">
                    <h4 className="font-medium text-gray-900 mb-2">Account Details:</h4>
                    <p className="text-sm text-gray-600">Name: {formData.name}</p>
                    <p className="text-sm text-gray-600">Email: {formData.email}</p>
                    <p className="text-sm text-gray-600">Role: Administrator</p>
                  </div>
                  <p className="text-sm text-gray-500">
                    Redirecting to login page...
                  </p>
                </div>
              )}
            </form>
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