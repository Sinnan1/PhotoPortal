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
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
            <Camera className="h-8 w-8 text-primary" />
          </div>
          <h2 className="mt-4 text-3xl font-bold">Create your account</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Or{" "}
            <Link href="/login" className="text-primary font-medium hover:underline">
              sign in to your existing account
            </Link>
          </p>
        </div>

        <Card className="border rounded-2xl bg-card/60 backdrop-blur-md">
          <CardHeader>
            <CardTitle className="text-2xl">
              Get started
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Create your PhotoPortal account
            </CardDescription>
          </CardHeader>

          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-5">
              <div>
                <Label htmlFor="name">
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
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="email">
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
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="password">
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
                  className="mt-1"
                />
              </div>

              <div className="space-y-2">
                <Label>Account type</Label>
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
                </RadioGroup>
              </div>
            </CardContent>

            <CardFooter>
              <Button type="submit" className="w-full rounded-full" disabled={loading}>
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
