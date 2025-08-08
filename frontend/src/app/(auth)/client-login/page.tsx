"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Camera, Loader2, Users } from "lucide-react";

export default function ClientLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { clientLogin } = useAuth();
  const { showToast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await clientLogin(email, password);
      showToast("Successfully logged in!", "success");
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Login failed",
        "error"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-100 via-white to-pink-100 flex items-center justify-center px-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto bg-white/30 backdrop-blur-sm rounded-full shadow-lg flex items-center justify-center">
            <Users className="h-8 w-8 text-blue-600" />
          </div>
          <h2 className="mt-4 text-3xl font-bold text-gray-800">
            Client Login
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Access your shared galleries
          </p>
        </div>

        <Card className="bg-white/30 backdrop-blur-md shadow-2xl border border-white/40 rounded-3xl transition-all duration-300 hover:shadow-[0_8px_30px_rgb(0,0,0,0.2)]">
          <CardHeader>
            <CardTitle className="text-2xl text-gray-800">Welcome Back</CardTitle>
            <CardDescription className="text-gray-600">
              Enter your client credentials to access your galleries
            </CardDescription>
          </CardHeader>

          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-5">
              <div>
                <Label htmlFor="email" className="text-gray-700">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="mt-1 bg-white/70 backdrop-blur-sm border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 rounded-lg"
                />
              </div>

              <div>
                <Label htmlFor="password" className="text-gray-700">
                  Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="mt-1 bg-white/70 backdrop-blur-sm border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 rounded-lg mb-4"
                />
              </div>
            </CardContent>

            <CardFooter className="flex flex-col space-y-4">
              <Button
                type="submit"
                className="w-full rounded-full bg-blue-600 text-white hover:bg-blue-700 transition-all duration-200"
                disabled={loading}
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Sign In as Client
              </Button>
              
              <div className="text-center text-sm text-gray-600">
                <p>Are you a photographer?</p>
                <Link
                  href="/login"
                  className="text-blue-600 font-medium hover:underline"
                >
                  Sign in as photographer
                </Link>
              </div>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}
