"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { AlertTriangle, Clock, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface AdminSessionTimeoutProps {
  sessionDuration?: number; // in minutes, default 120 (2 hours)
  warningTime?: number; // in minutes before expiry to show warning, default 15
}

export function AdminSessionTimeout({ 
  sessionDuration = 120, 
  warningTime = 15 
}: AdminSessionTimeoutProps) {
  const { user, logout, extendAdminSession } = useAuth();
  const router = useRouter();
  
  const [timeLeft, setTimeLeft] = useState<number>(sessionDuration * 60); // in seconds
  const [showWarning, setShowWarning] = useState(false);
  const [isExtending, setIsExtending] = useState(false);
  const [lastActivity, setLastActivity] = useState<number>(Date.now());

  // Reset session timer
  const resetTimer = useCallback(() => {
    setTimeLeft(sessionDuration * 60);
    setShowWarning(false);
    setLastActivity(Date.now());
  }, [sessionDuration]);

  // Extend session by making an API call
  const extendSession = useCallback(async () => {
    if (!user || user.role !== "ADMIN") return;

    setIsExtending(true);
    try {
      const success = await extendAdminSession();
      
      if (success) {
        resetTimer();
      } else {
        // Session extension failed, logout
        logout();
      }
    } catch (error) {
      console.error("Failed to extend session:", error);
      logout();
    } finally {
      setIsExtending(false);
    }
  }, [user, logout, resetTimer, extendAdminSession]);

  // Handle user activity
  const handleActivity = useCallback(() => {
    const now = Date.now();
    // Only reset if more than 1 minute has passed since last activity
    if (now - lastActivity > 60000) {
      setLastActivity(now);
      // Auto-extend session on activity if warning is not shown
      if (!showWarning && timeLeft < (sessionDuration * 60 - 300)) { // 5 minutes buffer
        extendSession();
      }
    }
  }, [lastActivity, showWarning, timeLeft, sessionDuration, extendSession]);

  // Set up activity listeners
  useEffect(() => {
    if (!user || user.role !== "ADMIN") return;

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    
    events.forEach(event => {
      document.addEventListener(event, handleActivity, true);
    });

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleActivity, true);
      });
    };
  }, [handleActivity, user]);

  // Countdown timer
  useEffect(() => {
    if (!user || user.role !== "ADMIN") return;

    const interval = setInterval(() => {
      setTimeLeft(prev => {
        const newTime = prev - 1;
        
        // Show warning when warning time is reached
        if (newTime <= warningTime * 60 && !showWarning) {
          setShowWarning(true);
        }
        
        // Auto logout when time reaches 0
        if (newTime <= 0) {
          logout();
          return 0;
        }
        
        return newTime;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [user, warningTime, showWarning, logout]);

  // Don't render if not admin user
  if (!user || user.role !== "ADMIN") {
    return null;
  }

  // Format time display
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progressPercentage = (timeLeft / (sessionDuration * 60)) * 100;
  const isUrgent = timeLeft <= 300; // Last 5 minutes

  // Warning modal
  if (showWarning) {
    return (
      <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-amber-600">
              <AlertTriangle className="h-5 w-5" />
              <span>Session Expiring Soon</span>
            </CardTitle>
            <CardDescription>
              Your admin session will expire in {formatTime(timeLeft)}. 
              Extend your session to continue working.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Time Remaining</span>
                <span className={isUrgent ? "text-red-600 font-bold" : "text-amber-600"}>
                  {formatTime(timeLeft)}
                </span>
              </div>
              <Progress 
                value={progressPercentage} 
                className={`h-2 ${isUrgent ? "bg-red-100" : "bg-amber-100"}`}
              />
            </div>
            
            <div className="flex space-x-2">
              <Button 
                onClick={extendSession}
                disabled={isExtending}
                className="flex-1"
              >
                {isExtending ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Extending...
                  </>
                ) : (
                  <>
                    <Clock className="h-4 w-4 mr-2" />
                    Extend Session
                  </>
                )}
              </Button>
              <Button 
                variant="outline" 
                onClick={logout}
                className="flex-1"
              >
                Logout Now
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Status indicator (only show when time is getting low but warning not shown)
  if (timeLeft <= 1800 && timeLeft > warningTime * 60) { // Last 30 minutes
    return (
      <Alert className="fixed top-20 right-4 z-50 w-80 border-amber-200 bg-amber-50 dark:bg-amber-950/20">
        <Clock className="h-4 w-4 text-amber-600" />
        <AlertDescription className="text-amber-800 dark:text-amber-200">
          Session expires in {formatTime(timeLeft)}
        </AlertDescription>
      </Alert>
    );
  }

  return null;
}