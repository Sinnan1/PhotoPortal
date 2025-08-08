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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Camera, Loader2 } from "lucide-react";

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "PHOTOGRAPHER" as "PHOTOGRAPHER" | "CLIENT",
  });
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const { showToast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await register(formData);
      showToast("Account created successfully!", "success");
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Registration failed",
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
            <Camera className="h-8 w-8 text-blue-600" />
          </div>
          <h2 className="mt-4 text-3xl font-bold text-gray-800">
            Create your account
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Or{" "}
            <Link
              href="/login"
              className="text-blue-600 font-medium hover:underline"
            >
              sign in to your existing account
            </Link>
          </p>
        </div>

        <Card className="bg-white/30 backdrop-blur-md shadow-2xl border border-white/40 rounded-3xl transition-all duration-300 hover:shadow-[0_8px_30px_rgb(0,0,0,0.2)]">
          <CardHeader>
            <CardTitle className="text-2xl text-gray-800">
              Get started
            </CardTitle>
            <CardDescription className="text-gray-600">
              Create your PhotoPortal account
            </CardDescription>
          </CardHeader>

          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-5">
              <div>
                <Label htmlFor="name" className="text-gray-700">
                  Full Name
                </Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="John Doe"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  required
                  className="mt-1 bg-white/70 backdrop-blur-sm border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 rounded-lg"
                />
              </div>

              <div>
                <Label htmlFor="email" className="text-gray-700">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
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
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  required
                  className="mt-1 bg-white/70 backdrop-blur-sm border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 rounded-lg"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-gray-700">Account type</Label>
                <RadioGroup
                  value={formData.role}
                  onValueChange={(value) =>
                    setFormData({
                      ...formData,
                      role: value as "PHOTOGRAPHER" | "CLIENT",
                    })
                  }
                  className="flex space-x-6"
                >
                  <div className="flex items-center space-x-2 mb-3.5">
                    <RadioGroupItem value="PHOTOGRAPHER" id="photographer" />
                    <Label htmlFor="photographer">Photographer</Label>
                  </div>
                  <div className="flex items-center space-x-2 mb-3.5">
                    <RadioGroupItem value="CLIENT" id="client" />
                    <Label htmlFor="client">Client</Label>
                  </div>
                </RadioGroup>
              </div>
            </CardContent>

            <CardFooter>
              <Button
                type="submit"
                className="w-full rounded-full bg-blue-600 text-white hover:bg-blue-700 transition-all duration-200"
                disabled={loading}
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create account
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}
