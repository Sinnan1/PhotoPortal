"use client"

import type React from "react"
import { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { useAuth } from "@/lib/auth-context"
import { useToast } from "@/components/ui/toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { PasswordInput } from "@/components/ui/password-input"
import { Label } from "@/components/ui/label"
import { Loader2, Camera } from "lucide-react"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const { login } = useAuth()
  const { showToast } = useToast()

  // Prevent body scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      await login(email, password)
      showToast("Successfully logged in!", "success")
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Login failed", "error")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed left-0 right-0 bottom-0 top-16 lg:grid lg:grid-cols-2 overflow-hidden">
      {/* Left side: Image Panel */}
      <div className="hidden bg-muted lg:block relative overflow-hidden">
        <Image
          src="/Login.webp"
          alt="Wedding photography"
          fill
          className="object-cover"
          priority
          quality={90}
        />
      </div>

      {/* Right side: Form Panel */}
      <div className="flex items-center justify-center p-6 bg-background">
        <div className="mx-auto grid w-full max-w-[420px] gap-5">
          {/* Logo and Header */}
          <div className="grid gap-1 text-center">
            <h1 className="text-3xl font-bold tracking-tight font-audrey">Welcome Back</h1>
            <p className="text-muted-foreground text-sm">
              Sign in to your photographer account
            </p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="grid gap-3">
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="photographer@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-11"
              />
            </div>

            <div className="grid gap-2">
              <div className="flex items-center">
                <Label htmlFor="password">Password</Label>
                <Link
                  href="#"
                  className="ml-auto inline-block text-sm text-primary hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <PasswordInput
                id="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="h-11"
              />
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="remember"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="h-4 w-4 rounded border-input bg-background text-primary focus:ring-2 focus:ring-primary focus:ring-offset-2"
              />
              <label
                htmlFor="remember"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Remember me for 30 days
              </label>
            </div>

            <Button type="submit" className="w-full h-11" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Sign In
            </Button>
          </form>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Or
              </span>
            </div>
          </div>

          {/* Links */}
          <div className="text-center space-y-2">
            <p className="text-sm text-muted-foreground">
              Are you a client?{" "}
              <Link
                href="/client-login"
                className="font-semibold text-primary hover:text-primary/80 transition-colors underline underline-offset-4"
              >
                Sign in as client
              </Link>
            </p>
            <p className="text-sm text-muted-foreground">
              Don&apos;t have an account?{" "}
              <Link
                href="/register"
                className="font-semibold text-primary hover:text-primary/80 transition-colors underline underline-offset-4"
              >
                Create account
              </Link>
            </p>
          </div>

          {/* Footer */}
          <p className="text-center text-xs text-muted-foreground">
            By signing in, you agree to our{" "}
            <Link
              href="/terms"
              className="underline underline-offset-4 hover:text-primary"
            >
              Terms
            </Link>{" "}
            and{" "}
            <Link
              href="/privacy"
              className="underline underline-offset-4 hover:text-primary"
            >
              Privacy Policy
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  )
}
