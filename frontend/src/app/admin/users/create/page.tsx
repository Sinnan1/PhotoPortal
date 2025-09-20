    "use client";

import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { 
  UserPlus, 
  Mail,
  User,
  Lock,
  Camera,
  Users,
  Shield,
  ArrowLeft,
  CheckCircle,
  AlertCircle
} from "lucide-react";
import { adminApi } from "@/lib/admin-api";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";

interface CreateUserForm {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  role: 'PHOTOGRAPHER' | 'CLIENT' | 'ADMIN' | '';
  notes: string;
}

export default function CreateUserPage() {
  const [formData, setFormData] = useState<CreateUserForm>({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: '',
    notes: '',
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Partial<CreateUserForm>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [createdUser, setCreatedUser] = useState<any>(null);
  const { toast } = useToast();
  const router = useRouter();

  const validateForm = (): boolean => {
    const newErrors: Partial<CreateUserForm> = {};

    // Name validation
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters';
    }

    // Email validation
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
      newErrors.password = 'Password must contain at least one uppercase letter, one lowercase letter, and one number';
    }

    // Confirm password validation
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    // Role validation
    if (!formData.role) {
      newErrors.role = 'Please select a role';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);
      
      console.log('Creating user with data:', {
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        role: formData.role,
      });
      
      const response = await adminApi.createUser({
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
        role: formData.role as string,
      });

      console.log('User creation response:', response);

      // Store the created user data
      setCreatedUser(response.data.user);

      toast({
        title: "Success",
        description: `User ${formData.name} has been created successfully`,
      });

      // Reset form
      setFormData({
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
        role: '',
        notes: '',
      });
      
    } catch (error: any) {
      console.error('Failed to create user:', error);
      
      // Extract error message from different possible error structures
      let errorMessage = "Failed to create user";
      if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof CreateUserForm, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'PHOTOGRAPHER':
        return <Camera className="h-4 w-4" />;
      case 'CLIENT':
        return <Users className="h-4 w-4" />;
      case 'ADMIN':
        return <Shield className="h-4 w-4" />;
      default:
        return <User className="h-4 w-4" />;
    }
  };

  const getRoleDescription = (role: string) => {
    switch (role) {
      case 'PHOTOGRAPHER':
        return 'Can create and manage galleries, upload photos, and share with clients';
      case 'CLIENT':
        return 'Can view shared galleries and download photos with appropriate permissions';
      case 'ADMIN':
        return 'Full system access including user management and system configuration';
      default:
        return '';
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center space-x-4">
        <Button 
          variant="outline" 
          onClick={() => router.back()}
          className="flex items-center space-x-2"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back</span>
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Create New User</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Add a new user to the system with appropriate role and permissions
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Form */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <UserPlus className="h-5 w-5" />
                <span>User Information</span>
              </CardTitle>
              <CardDescription>
                Enter the basic information for the new user account
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Name Field */}
                <div className="space-y-2">
                  <Label htmlFor="name" className="flex items-center space-x-2">
                    <User className="h-4 w-4" />
                    <span>Full Name</span>
                  </Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="Enter user's full name"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    className={errors.name ? 'border-red-500' : ''}
                  />
                  {errors.name && (
                    <p className="text-sm text-red-600 flex items-center space-x-1">
                      <AlertCircle className="h-4 w-4" />
                      <span>{errors.name}</span>
                    </p>
                  )}
                </div>

                {/* Email Field */}
                <div className="space-y-2">
                  <Label htmlFor="email" className="flex items-center space-x-2">
                    <Mail className="h-4 w-4" />
                    <span>Email Address</span>
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter user's email address"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    className={errors.email ? 'border-red-500' : ''}
                  />
                  {errors.email && (
                    <p className="text-sm text-red-600 flex items-center space-x-1">
                      <AlertCircle className="h-4 w-4" />
                      <span>{errors.email}</span>
                    </p>
                  )}
                </div>

                {/* Role Selection */}
                <div className="space-y-2">
                  <Label className="flex items-center space-x-2">
                    <Shield className="h-4 w-4" />
                    <span>User Role</span>
                  </Label>
                  <Select 
                    value={formData.role} 
                    onValueChange={(value) => handleInputChange('role', value)}
                  >
                    <SelectTrigger className={errors.role ? 'border-red-500' : ''}>
                      <SelectValue placeholder="Select a role for this user" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PHOTOGRAPHER">
                        <div className="flex items-center space-x-2">
                          <Camera className="h-4 w-4 text-blue-600" />
                          <span>Photographer</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="CLIENT">
                        <div className="flex items-center space-x-2">
                          <Users className="h-4 w-4 text-green-600" />
                          <span>Client</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="ADMIN">
                        <div className="flex items-center space-x-2">
                          <Shield className="h-4 w-4 text-purple-600" />
                          <span>Administrator</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.role && (
                    <p className="text-sm text-red-600 flex items-center space-x-1">
                      <AlertCircle className="h-4 w-4" />
                      <span>{errors.role}</span>
                    </p>
                  )}
                  {formData.role && (
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {getRoleDescription(formData.role)}
                    </p>
                  )}
                </div>

                {/* Password Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="password" className="flex items-center space-x-2">
                      <Lock className="h-4 w-4" />
                      <span>Password</span>
                    </Label>
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter password"
                      value={formData.password}
                      onChange={(e) => handleInputChange('password', e.target.value)}
                      className={errors.password ? 'border-red-500' : ''}
                    />
                    {errors.password && (
                      <p className="text-sm text-red-600 flex items-center space-x-1">
                        <AlertCircle className="h-4 w-4" />
                        <span>{errors.password}</span>
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword" className="flex items-center space-x-2">
                      <Lock className="h-4 w-4" />
                      <span>Confirm Password</span>
                    </Label>
                    <Input
                      id="confirmPassword"
                      type={showPassword ? "text" : "password"}
                      placeholder="Confirm password"
                      value={formData.confirmPassword}
                      onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                      className={errors.confirmPassword ? 'border-red-500' : ''}
                    />
                    {errors.confirmPassword && (
                      <p className="text-sm text-red-600 flex items-center space-x-1">
                        <AlertCircle className="h-4 w-4" />
                        <span>{errors.confirmPassword}</span>
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="showPassword"
                    checked={showPassword}
                    onChange={(e) => setShowPassword(e.target.checked)}
                    className="rounded border-gray-300"
                  />
                  <Label htmlFor="showPassword" className="text-sm">
                    Show passwords
                  </Label>
                </div>

                {/* Notes Field */}
                <div className="space-y-2">
                  <Label htmlFor="notes">
                    Notes (Optional)
                  </Label>
                  <Textarea
                    id="notes"
                    placeholder="Add any additional notes about this user..."
                    value={formData.notes}
                    onChange={(e) => handleInputChange('notes', e.target.value)}
                    rows={3}
                  />
                </div>

                {/* Success Message */}
                {createdUser && (
                  <div className="p-4 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800">
                    <div className="flex items-center space-x-2 mb-2">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <h3 className="font-medium text-green-800 dark:text-green-200">User Created Successfully!</h3>
                    </div>
                    <div className="text-sm text-green-700 dark:text-green-300 space-y-1">
                      <p><strong>Name:</strong> {createdUser.name}</p>
                      <p><strong>Email:</strong> {createdUser.email}</p>
                      <p><strong>Role:</strong> {createdUser.role}</p>
                      <p><strong>Created:</strong> {new Date(createdUser.createdAt).toLocaleString()}</p>
                    </div>
                    <div className="flex space-x-2 mt-3">
                      <Button 
                        size="sm"
                        onClick={() => {
                          setCreatedUser(null);
                          // Form is already reset
                        }}
                      >
                        Create Another User
                      </Button>
                      <Button 
                        size="sm"
                        variant="outline"
                        onClick={() => router.push('/admin/users')}
                      >
                        Go to Users List
                      </Button>
                    </div>
                  </div>
                )}

                {/* Submit Button */}
                <div className="flex justify-end space-x-4">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => router.back()}
                    disabled={loading}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={loading || !!createdUser}
                    className="flex items-center space-x-2"
                  >
                    {loading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>Creating...</span>
                      </>
                    ) : (
                      <>
                        <UserPlus className="h-4 w-4" />
                        <span>Create User</span>
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Role Information */}
          <Card>
            <CardHeader>
              <CardTitle>Role Permissions</CardTitle>
              <CardDescription>
                Understanding user roles and their capabilities
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20">
                  <div className="flex items-center space-x-2 mb-2">
                    <Camera className="h-4 w-4 text-blue-600" />
                    <span className="font-medium text-blue-800 dark:text-blue-200">Photographer</span>
                  </div>
                  <ul className="text-xs text-blue-600 dark:text-blue-400 space-y-1">
                    <li>• Create and manage galleries</li>
                    <li>• Upload and organize photos</li>
                    <li>• Share galleries with clients</li>
                    <li>• Manage client access permissions</li>
                  </ul>
                </div>

                <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950/20">
                  <div className="flex items-center space-x-2 mb-2">
                    <Users className="h-4 w-4 text-green-600" />
                    <span className="font-medium text-green-800 dark:text-green-200">Client</span>
                  </div>
                  <ul className="text-xs text-green-600 dark:text-green-400 space-y-1">
                    <li>• View shared galleries</li>
                    <li>• Download permitted photos</li>
                    <li>• Leave comments and feedback</li>
                    <li>• Manage personal profile</li>
                  </ul>
                </div>

                <div className="p-3 rounded-lg bg-purple-50 dark:bg-purple-950/20">
                  <div className="flex items-center space-x-2 mb-2">
                    <Shield className="h-4 w-4 text-purple-600" />
                    <span className="font-medium text-purple-800 dark:text-purple-200">Administrator</span>
                  </div>
                  <ul className="text-xs text-purple-600 dark:text-purple-400 space-y-1">
                    <li>• Full system access</li>
                    <li>• User management</li>
                    <li>• System configuration</li>
                    <li>• Analytics and reporting</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Security Guidelines */}
          <Card>
            <CardHeader>
              <CardTitle>Security Guidelines</CardTitle>
              <CardDescription>
                Best practices for user account security
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                <div className="flex items-start space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
                  <span>Use strong passwords with mixed characters</span>
                </div>
                <div className="flex items-start space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
                  <span>Assign appropriate role permissions</span>
                </div>
                <div className="flex items-start space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
                  <span>Verify email addresses before activation</span>
                </div>
                <div className="flex items-start space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
                  <span>Monitor user activity regularly</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}