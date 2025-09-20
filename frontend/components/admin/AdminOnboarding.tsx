"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  CheckCircle, 
  ArrowRight, 
  ArrowLeft, 
  X, 
  Users, 
  FolderOpen, 
  BarChart3, 
  Settings,
  Shield,
  UserPlus,
  Lightbulb
} from "lucide-react";

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  content: React.ReactNode;
  action?: {
    label: string;
    path: string;
  };
}

const onboardingSteps: OnboardingStep[] = [
  {
    id: "welcome",
    title: "Welcome to Admin Panel",
    description: "Get started with managing your photo portal platform",
    icon: Shield,
    content: (
      <div className="space-y-4">
        <p className="text-gray-600">
          Welcome to the Yarrow Weddings & Co. admin panel! This powerful interface gives you 
          complete control over your photo portal platform.
        </p>
        <div className="bg-blue-50 p-4 rounded-lg">
          <h4 className="font-semibold text-blue-900 mb-2">What you can do:</h4>
          <ul className="space-y-1 text-sm text-blue-800">
            <li>• Manage all user accounts and permissions</li>
            <li>• Oversee galleries across all photographers</li>
            <li>• Monitor system performance and analytics</li>
            <li>• Configure platform settings and business rules</li>
            <li>• Track all administrative actions with audit logs</li>
          </ul>
        </div>
      </div>
    )
  },
  {
    id: "user-management",
    title: "User Management",
    description: "Learn how to manage photographers and clients",
    icon: Users,
    content: (
      <div className="space-y-4">
        <p className="text-gray-600">
          The User Management section is your central hub for controlling access to the platform.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-semibold mb-2">Key Features:</h4>
            <ul className="space-y-1 text-sm text-gray-600">
              <li>• View all users with detailed profiles</li>
              <li>• Search and filter by role, status, or activity</li>
              <li>• Change user roles and permissions</li>
              <li>• Suspend or activate accounts</li>
              <li>• Track user activity and statistics</li>
            </ul>
          </div>
          <div className="bg-yellow-50 p-4 rounded-lg">
            <h4 className="font-semibold text-yellow-900 mb-2">Best Practices:</h4>
            <ul className="space-y-1 text-sm text-yellow-800">
              <li>• Regularly review user permissions</li>
              <li>• Document reasons for account changes</li>
              <li>• Monitor for suspicious activity</li>
              <li>• Keep user information up to date</li>
            </ul>
          </div>
        </div>
      </div>
    ),
    action: {
      label: "Explore User Management",
      path: "/admin/users"
    }
  },
  {
    id: "gallery-oversight",
    title: "Gallery Oversight",
    description: "Monitor and manage galleries across all photographers",
    icon: FolderOpen,
    content: (
      <div className="space-y-4">
        <p className="text-gray-600">
          Gallery Oversight gives you visibility into all galleries on the platform, regardless of photographer.
        </p>
        <div className="space-y-3">
          <div className="border-l-4 border-blue-500 pl-4">
            <h4 className="font-semibold">Cross-Photographer Visibility</h4>
            <p className="text-sm text-gray-600">View and manage galleries from all photographers in one place.</p>
          </div>
          <div className="border-l-4 border-green-500 pl-4">
            <h4 className="font-semibold">Storage Management</h4>
            <p className="text-sm text-gray-600">Monitor storage usage and set limits to control costs.</p>
          </div>
          <div className="border-l-4 border-purple-500 pl-4">
            <h4 className="font-semibold">Content Moderation</h4>
            <p className="text-sm text-gray-600">Review and moderate content to ensure quality standards.</p>
          </div>
        </div>
      </div>
    ),
    action: {
      label: "View All Galleries",
      path: "/admin/galleries"
    }
  },
  {
    id: "analytics",
    title: "System Analytics",
    description: "Monitor platform performance and user engagement",
    icon: BarChart3,
    content: (
      <div className="space-y-4">
        <p className="text-gray-600">
          The Analytics dashboard provides insights into how your platform is performing.
        </p>
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">📊</div>
            <h4 className="font-semibold mt-2">User Analytics</h4>
            <p className="text-sm text-gray-600">Track user growth, engagement, and activity patterns</p>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">💾</div>
            <h4 className="font-semibold mt-2">Storage Metrics</h4>
            <p className="text-sm text-gray-600">Monitor storage usage and optimize costs</p>
          </div>
          <div className="text-center p-4 bg-purple-50 rounded-lg">
            <div className="text-2xl font-bold text-purple-600">🔒</div>
            <h4 className="font-semibold mt-2">Security Events</h4>
            <p className="text-sm text-gray-600">Track security incidents and failed login attempts</p>
          </div>
          <div className="text-center p-4 bg-orange-50 rounded-lg">
            <div className="text-2xl font-bold text-orange-600">⚡</div>
            <h4 className="font-semibold mt-2">Performance</h4>
            <p className="text-sm text-gray-600">Monitor system health and response times</p>
          </div>
        </div>
      </div>
    ),
    action: {
      label: "View Analytics",
      path: "/admin/analytics"
    }
  },
  {
    id: "security",
    title: "Security & Audit",
    description: "Maintain security and track all administrative actions",
    icon: Shield,
    content: (
      <div className="space-y-4">
        <p className="text-gray-600">
          Security is paramount. The audit system tracks every administrative action for accountability.
        </p>
        <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
          <h4 className="font-semibold text-red-900 mb-2">🔐 Security Features:</h4>
          <ul className="space-y-1 text-sm text-red-800">
            <li>• All admin actions are automatically logged</li>
            <li>• Failed login attempts are tracked and blocked</li>
            <li>• Session management with automatic timeouts</li>
            <li>• IP address validation for admin sessions</li>
            <li>• Comprehensive audit trail for compliance</li>
          </ul>
        </div>
        <div className="bg-blue-50 p-4 rounded-lg">
          <h4 className="font-semibold text-blue-900 mb-2">💡 Security Tips:</h4>
          <ul className="space-y-1 text-sm text-blue-800">
            <li>• Use strong, unique passwords (16+ characters)</li>
            <li>• Regularly review audit logs for suspicious activity</li>
            <li>• Log out when finished with admin tasks</li>
            <li>• Keep your browser and system updated</li>
          </ul>
        </div>
      </div>
    ),
    action: {
      label: "View Security Dashboard",
      path: "/admin/security"
    }
  },
  {
    id: "admin-management",
    title: "Admin Management",
    description: "Invite other administrators and manage your profile",
    icon: UserPlus,
    content: (
      <div className="space-y-4">
        <p className="text-gray-600">
          As the platform grows, you may need to invite additional administrators to help manage it.
        </p>
        <div className="space-y-3">
          <div className="bg-green-50 p-4 rounded-lg">
            <h4 className="font-semibold text-green-900 mb-2">Inviting Administrators:</h4>
            <ul className="space-y-1 text-sm text-green-800">
              <li>• Send secure invitation links via email</li>
              <li>• Invitations expire after 7 days for security</li>
              <li>• Track invitation status and manage pending invites</li>
              <li>• New admins must set strong passwords during activation</li>
            </ul>
          </div>
          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-semibold text-blue-900 mb-2">Profile Management:</h4>
            <ul className="space-y-1 text-sm text-blue-800">
              <li>• Update your name and contact information</li>
              <li>• Change your password regularly</li>
              <li>• Monitor your active sessions across devices</li>
              <li>• Revoke sessions from lost or compromised devices</li>
            </ul>
          </div>
        </div>
      </div>
    ),
    action: {
      label: "Manage Admins",
      path: "/admin/invitations"
    }
  },
  {
    id: "complete",
    title: "You're All Set!",
    description: "Start managing your photo portal platform",
    icon: CheckCircle,
    content: (
      <div className="space-y-4 text-center">
        <div className="text-6xl">🎉</div>
        <p className="text-gray-600">
          Congratulations! You've completed the admin onboarding. You now have the knowledge 
          to effectively manage your photo portal platform.
        </p>
        <div className="bg-green-50 p-4 rounded-lg">
          <h4 className="font-semibold text-green-900 mb-2">Quick Start Checklist:</h4>
          <div className="space-y-2 text-sm text-green-800">
            <div className="flex items-center justify-center gap-2">
              <CheckCircle className="h-4 w-4" />
              <span>Review current users and their permissions</span>
            </div>
            <div className="flex items-center justify-center gap-2">
              <CheckCircle className="h-4 w-4" />
              <span>Check system analytics and performance</span>
            </div>
            <div className="flex items-center justify-center gap-2">
              <CheckCircle className="h-4 w-4" />
              <span>Configure system settings as needed</span>
            </div>
            <div className="flex items-center justify-center gap-2">
              <CheckCircle className="h-4 w-4" />
              <span>Set up additional admin accounts if needed</span>
            </div>
          </div>
        </div>
        <p className="text-sm text-gray-500">
          You can always access this tutorial again from the help menu.
        </p>
      </div>
    )
  }
];

interface AdminOnboardingProps {
  onComplete: () => void;
  onSkip: () => void;
}

export function AdminOnboarding({ onComplete, onSkip }: AdminOnboardingProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  const currentStepData = onboardingSteps[currentStep];
  const progress = ((currentStep + 1) / onboardingSteps.length) * 100;

  const handleNext = () => {
    if (currentStep < onboardingSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = () => {
    setIsVisible(false);
    onComplete();
  };

  const handleSkip = () => {
    setIsVisible(false);
    onSkip();
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="relative">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <currentStepData.icon className="h-6 w-6 text-blue-600" />
              <div>
                <CardTitle>{currentStepData.title}</CardTitle>
                <CardDescription>{currentStepData.description}</CardDescription>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSkip}
              className="text-gray-500 hover:text-gray-700"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="mt-4">
            <div className="flex items-center justify-between text-sm text-gray-500 mb-2">
              <span>Step {currentStep + 1} of {onboardingSteps.length}</span>
              <span>{Math.round(progress)}% complete</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {currentStepData.content}
          
          <div className="flex items-center justify-between pt-4 border-t">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={currentStep === 0}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Previous
            </Button>
            
            <div className="flex gap-2">
              {currentStepData.action && (
                <Button
                  variant="outline"
                  onClick={() => window.open(currentStepData.action!.path, '_blank')}
                >
                  <Lightbulb className="h-4 w-4 mr-2" />
                  {currentStepData.action.label}
                </Button>
              )}
              
              <Button onClick={handleNext}>
                {currentStep === onboardingSteps.length - 1 ? (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Complete
                  </>
                ) : (
                  <>
                    Next
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}