"use client"

import type React from "react"
import { useState } from "react"
import Link from "next/link"
import { useAuth } from "@/lib/auth-context"
import { useToast } from "@/components/ui/toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Loader2, Mail, Lock, User } from "lucide-react"

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "PHOTOGRAPHER" as "PHOTOGRAPHER" | "CLIENT",
  })
  const [loading, setLoading] = useState(false)
  const { register } = useAuth()
  const { showToast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      await register(formData)
      showToast("Account created successfully!", "success")
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Registration failed", "error")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative min-h-[calc(100vh-4rem)] overflow-hidden">
      {/* Olive gradient backdrop */}
      <div
        className="absolute inset-0"
        aria-hidden="true"
        style={{
          background:
            "radial-gradient(1200px 600px at 50% -200px, rgba(63,79,70,0.40), transparent 60%), linear-gradient(180deg, #1f2622 0%, #2b352f 35%, #3f4f46 100%)",
        }}
      />
      {/* Star field */}
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden="true"
        style={{
          backgroundImage:
            "radial-gradient(1px 1px at 20% 30%, rgba(255,255,255,0.35) 0, transparent 60%), radial-gradient(1px 1px at 80% 20%, rgba(255,255,255,0.25) 0, transparent 60%), radial-gradient(1.2px 1.2px at 60% 70%, rgba(255,255,255,0.22) 0, transparent 60%), radial-gradient(0.8px 0.8px at 30% 80%, rgba(255,255,255,0.18) 0, transparent 60%)",
        }}
      />
      {/* Subtle olive icon watermark (uses provided Source URL) */}
      <img
        src="/ICON-01.png"
        alt=""
        aria-hidden="true"
        className="select-none pointer-events-none absolute -right-10 -bottom-10 w-[420px] opacity-10"
      />

      {/* Centered card */}
      <div className="relative z-10 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          {/* Brand */}
          <div className="mb-8 flex items-center justify-center">
            {/* Provided Source URL per your instruction */}
            <img
              src="/LOGO-02.png"
              alt="Yarrow Weddings & Co"
              className="h-14 md:h-20"
            />
          </div>

          <Card className="rounded-3xl border border-white/15 bg-white/[0.06] backdrop-blur-md shadow-[0_10px_40px_-10px_rgba(0,0,0,0.6)] ring-1 ring-black/5">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl text-white">Create your account</CardTitle>
              <CardDescription className="text-white/70">Set up access to your private gallery</CardDescription>
            </CardHeader>

            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-5">
                {/* Name */}
                <div>
                  <Label htmlFor="name" className="text-white">
                    Full Name
                  </Label>
                  <div className="relative mt-1">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/60" />
                    <Input
                      id="name"
                      type="text"
                      placeholder="Jane & John"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                      className="pl-9 rounded-full bg-white/10 border-white/15 text-white placeholder:text-white/60 focus-visible:ring-white/30"
                    />
                  </div>
                </div>

                {/* Email */}
                <div>
                  <Label htmlFor="email" className="text-white">
                    Email
                  </Label>
                  <div className="relative mt-1">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/60" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                      className="pl-9 rounded-full bg-white/10 border-white/15 text-white placeholder:text-white/60 focus-visible:ring-white/30"
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <Label htmlFor="password" className="text-white">
                    Password
                  </Label>
                  <div className="relative mt-1">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/60" />
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      required
                      className="pl-9 rounded-full bg-white/10 border-white/15 text-white placeholder:text-white/60 focus-visible:ring-white/30"
                    />
                  </div>
                </div>

                {/* Role (keeps existing logic, styled as a subtle pill) */}
                <div className="space-y-2">
                  <Label className="text-white">Account type</Label>
                  <div className="rounded-full border border-white/15 bg-white/10 p-1 inline-flex">
                    <RadioGroup
                      value={formData.role}
                      onValueChange={(value) =>
                        setFormData({
                          ...formData,
                          role: value as "PHOTOGRAPHER" | "CLIENT",
                        })
                      }
                      className="flex items-center gap-2"
                    >
                      <label
                        htmlFor="photographer"
                        className={`cursor-pointer rounded-full px-4 py-1.5 text-sm transition-colors ${
                          formData.role === "PHOTOGRAPHER" ? "bg-white/20 text-white" : "text-white/80 hover:text-white"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <RadioGroupItem value="PHOTOGRAPHER" id="photographer" className="sr-only" />
                          <span>Photographer</span>
                        </div>
                      </label>
                      {/* If you later enable CLIENT, it will adopt the same style automatically */}
                    </RadioGroup>
                  </div>
                </div>
              </CardContent>

              <CardFooter className="flex flex-col space-y-4">
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-full bg-[#3f4f46] text-white hover:bg-[#35443c] mt-2"
                >
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create account
                </Button>
                <p className="text-center text-sm text-white/80">
                  Already have an account?{" "}
                  <Link href="/login" className="text-white hover:underline font-medium">
                    Sign in
                  </Link>
                </p>
              </CardFooter>
            </form>
          </Card>

          {/* Subtle caption under the card */}
          <div className="mt-6 flex items-center justify-center text-xs text-white/60">
            <span>By continuing you agree to our Terms & Privacy Policy</span>
          </div>
        </div>
      </div>
    </div>
  )
}
