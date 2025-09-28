"use client"

import type React from "react"
import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { useAuth } from "@/lib/auth-context"
import { useToast } from "@/components/ui/toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, Mail, Lock } from "lucide-react"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const { showToast } = useToast()

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
    <div className="relative min-h-[calc(100vh-4rem)] overflow-hidden">
      {/* Background: olive night gradient */}
      <div className="pointer-events-none absolute inset-0">
        {/* Gradient base (analogous olive tones) */}
        <div className="absolute inset-0 bg-[linear-gradient(180deg,#33423a_0%,#2a3831_40%,#1f2823_100%)]" />
        {/* Star field (subtle dotted radial pattern) */}
        <div className="absolute inset-0 opacity-50 [background-image:radial-gradient(2px_2px_at_20%_30%,rgba(255,255,255,0.10),transparent_55%),radial-gradient(2px_2px_at_60%_10%,rgba(255,255,255,0.08),transparent_55%),radial-gradient(1.5px_1.5px_at_80%_60%,rgba(255,255,255,0.08),transparent_55%),radial-gradient(2px_2px_at_35%_75%,rgba(255,255,255,0.06),transparent_55%)] [background-size:1200px_800px,1000px_700px,900px_600px,1100px_700px]" />
        {/* Oversized watermark icon for depth */}
        <div className="absolute inset-0 flex items-center justify-center">
          <Image
            src="/ICON-01.png" // ICON-01.png (Source URL)
            alt=""
            width={900}
            height={1800}
            className="opacity-[0.06] -rotate-6"
            priority
          />
        </div>
        {/* Soft vignette */}
        <div className="absolute inset-0 bg-[radial-gradient(closest-side,transparent_60%,rgba(0,0,0,0.25)_100%)]" />
      </div>

      {/* Foreground content */}
      <div className="relative z-10 mx-auto flex min-h-screen max-w-7xl items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">
          {/* Brand mark */}
          <div className="mb-8 flex items-center justify-center">
            <Image
              src="/LOGO-02.png" // LOGO-02.png (transparent for light-on-olive)
              alt="Yarrow Weddings & Co"
              width={220}
              height={60}
              className="drop-shadow-sm"
              priority
            />
          </div>

          {/* Glassmorphism panel */}
          <div className="relative">
            {/* glow ring */}
            <div className="absolute -inset-[1px] rounded-3xl bg-white/10 blur-sm" aria-hidden="true" />
            <Card className="relative rounded-3xl border border-white/20 bg-white/10 p-4 backdrop-blur-xl shadow-[0_10px_30px_rgba(0,0,0,0.35)]">
              <CardHeader className="pb-2 text-center">
                <CardTitle className="text-2xl text-white">Login</CardTitle>
                <CardDescription className="text-white/80">
                  Enter your credentials to access your gallery
                </CardDescription>
              </CardHeader>

              <form onSubmit={handleSubmit}>
                <CardContent className="space-y-5">
                  <div>
                    <Label htmlFor="email" className="text-white/80">
                      Email
                    </Label>
                    <div className="relative mt-1">
                      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/60">
                        <Mail size={18} />
                      </span>
                      <Input
                        id="email"
                        type="email"
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="h-11 rounded-2xl border-white/30 bg-white/15 pl-10 text-white placeholder:text-white/50 focus:border-white/40 focus:ring-white/30"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="password" className="text-white/80">
                      Password
                    </Label>
                    <div className="relative mt-1">
                      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/60">
                        <Lock size={18} />
                      </span>
                      <Input
                        id="password"
                        type="password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        className="h-11 rounded-2xl border-white/30 bg-white/15 pl-10 text-white placeholder:text-white/50 focus:border-white/40 focus:ring-white/30"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <label className="inline-flex items-center gap-2 text-white/80">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-white/30 bg-white/10 text-white accent-white/90"
                      />
                      Remember me
                    </label>
                    <Link href="#" className="text-white hover:text-white/90 underline-offset-4 hover:underline">
                      Forgot password?
                    </Link>
                  </div>
                </CardContent>

                <CardFooter className="flex flex-col gap-4">
                  <Button
                    type="submit"
                    className="h-11 w-full rounded-full bg-[#3f4f46] text-white hover:bg-[#3a4a41] focus-visible:ring-white/40"
                    disabled={loading}
                  >
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Login
                  </Button>

                  <p className="text-center text-sm text-white/80">
                    Are you a client?{" "}
                    <Link href="/client-login" className="font-medium text-white underline-offset-4 hover:underline">
                      Sign in as client
                    </Link>
                  </p>

                  <p className="text-center text-sm text-white/80">
                    Don&apos;t have an account?{" "}
                    <Link href="/register" className="font-medium text-white underline-offset-4 hover:underline">
                      Register
                    </Link>
                  </p>
                </CardFooter>
              </form>
            </Card>
          </div>

          {/* Discreet footer note */}
          <p className="mt-6 text-center text-xs text-white/70">
            By continuing you agree to our Terms &amp; Privacy Policy
          </p>
        </div>
      </div>
    </div>
  )
}
