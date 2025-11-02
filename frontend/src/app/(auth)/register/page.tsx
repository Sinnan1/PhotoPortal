"use client"

import type React from "react"
import { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { useAuth } from "@/lib/auth-context"
import { useToast } from "@/components/ui/toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, Camera } from "lucide-react"

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  })
  const [loading, setLoading] = useState(false)
  const { register } = useAuth()
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
    
    // Validate passwords match
    if (formData.password !== formData.confirmPassword) {
      showToast("Passwords do not match", "error")
      return
    }

    setLoading(true)

    try {
      const { confirmPassword, ...registerData } = formData
      // Add PHOTOGRAPHER role (backend also defaults to this)
      await register({ ...registerData, role: "PHOTOGRAPHER" })
      showToast("Account created successfully!", "success")
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Registration failed", "error")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed left-0 right-0 bottom-0 top-16 lg:grid lg:grid-cols-2 overflow-hidden">
      {/* Left side: Image Panel */}
      <div className="hidden bg-muted lg:block relative overflow-hidden">
        <Image
          src="/Login.jpg"
          alt="Wedding photography"
          fill
          className="object-cover"
          priority
          quality={90}
        />
      </div>

      {/* Right side: Form Panel */}
      <div className="flex items-center justify-center p-4 bg-background">
        <div className="mx-auto grid w-full max-w-[420px] gap-3">
          {/* Logo and Header */}
          <div className="grid gap-0.5 text-center">
            <h1 className="text-2xl font-bold tracking-tight font-audrey">Create Account</h1>
            <p className="text-muted-foreground text-xs">
              Get started by filling out the form below
            </p>
          </div>

          {/* Registration Form */}
          <form onSubmit={handleSubmit} className="grid gap-2">
            <div className="grid gap-1">
              <Label htmlFor="name" className="text-sm">Full Name</Label>
              <Input
                id="name"
                type="text"
                placeholder="Jane & John"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                className="h-10"
              />
            </div>

            <div className="grid gap-1">
              <Label htmlFor="email" className="text-sm">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="name@example.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                className="h-10"
              />
            </div>

            <div className="grid gap-1">
              <Label htmlFor="password" className="text-sm">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
                minLength={8}
                className="h-10"
              />
            </div>

            <div className="grid gap-1">
              <Label htmlFor="confirmPassword" className="text-sm">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                required
                className="h-10"
              />
            </div>

            <Button type="submit" className="w-full h-10 mt-2" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Account
            </Button>
          </form>

          {/* Links */}
          <p className="text-center text-xs text-muted-foreground">
            Already have an account?{" "}
            <Link
              href="/login"
              className="font-semibold text-primary hover:text-primary/80 transition-colors underline underline-offset-4"
            >
              Sign in
            </Link>
          </p>

          {/* Footer */}
          <p className="text-center text-xs text-muted-foreground">
            By creating an account, you agree to our{" "}
            <Link href="/terms" className="underline underline-offset-4 hover:text-primary">Terms</Link>
            {" "}and{" "}
            <Link href="/privacy" className="underline underline-offset-4 hover:text-primary">Privacy</Link>.
          </p>
        </div>
      </div>
    </div>
  )
}
