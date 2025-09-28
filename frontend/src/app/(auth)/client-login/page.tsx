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
import { Loader2, Download, Heart, ShieldCheck } from "lucide-react"

export default function ClientLoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const { clientLogin } = useAuth()
  const { showToast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      await clientLogin(email, password)
      showToast("Successfully logged in!", "success")
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Login failed", "error")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-[hsl(var(--primary))] via-[hsl(var(--primary)/0.97)] to-[hsl(var(--primary)/0.90)] text-primary-foreground flex items-center justify-center px-4 py-10">
      {/* Olive depth gradient (translucent so olive base shows through) */}
      <div
        aria-hidden
        className="absolute inset-0 -z-20 bg-gradient-to-b from-primary/30 via-primary/15 to-transparent"
      />
      {/* Subtle radial accent */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-20 opacity-30"
        style={{
          backgroundImage: "radial-gradient(60% 50% at 20% 10%, hsl(var(--primary) / 0.18) 0%, transparent 60%)",
        }}
      />
      {/* Soft dotted pattern for depth */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-20 opacity-20 [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]"
        style={{
          backgroundImage: "radial-gradient(circle at 1px 1px, hsl(var(--primary) / 0.25) 1px, transparent 1px)",
          backgroundSize: "22px 22px",
        }}
      />
      {/* Oversized brand icon watermark (Source URL) */}
      <img
        aria-hidden
        src="/ICON-01.png"
        alt=""
        className="pointer-events-none absolute -z-10 right-[-5%] top-1/2 -translate-y-1/2 w-[440px] md:w-[560px] lg:w-[640px] opacity-10"
      />

      <div className="w-full max-w-2xl space-y-6">
        {/* Brand */}
        <div className="text-center">
          {/* Provided Source URL per your instruction */}
          <img
            src="/LOGO-02.png"
            alt="Yarrow Weddings & Co"
            className="mx-auto h-20 md:h-24"
          />
          <h2 className="mt-4 text-3xl md:text-4xl font-bold text-balance">Client Lounge</h2>
          <p className="mt-2 text-sm text-muted-foreground">Access your private galleries</p>
        </div>

        {/* Mini gallery strip to differentiate client page */}
        <div className="grid grid-cols-3 gap-3">
          <img
            src="/placeholder.svg"
            alt="Gallery preview 1"
            className="h-24 w-full rounded-xl object-cover ring-1 ring-primary/20"
          />
          <img
            src="/placeholder.svg"
            alt="Gallery preview 2"
            className="h-24 w-full rounded-xl object-cover ring-1 ring-primary/20"
          />
          <img
            src="/placeholder.svg"
            alt="Gallery preview 3"
            className="h-24 w-full rounded-xl object-cover ring-1 ring-primary/20"
          />
        </div>

        {/* Glassmorphism card */}
        <Card className="rounded-3xl border border-primary/30 bg-background/8 supports-[backdrop-filter]:bg-background/5 backdrop-blur-3xl backdrop-saturate-200 bg-clip-padding shadow-2xl ring-1 ring-primary/25">
          <CardHeader>
            <CardTitle className="text-2xl text-primary">Welcome Back</CardTitle>
            <CardDescription className="text-muted-foreground">
              Enter your client credentials to access your galleries
            </CardDescription>
          </CardHeader>

          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-5">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="mt-1 mb-2"
                />
              </div>
            </CardContent>

            <CardFooter className="flex flex-col space-y-5">
              <Button type="submit" className="w-full rounded-full" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Sign In as Client
              </Button>

              {/* Benefits row for the client experience */}
              <ul className="flex flex-wrap items-center justify-center gap-3 text-xs text-muted-foreground">
                <li className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-background/60 px-3 py-1">
                  <Download className="h-3.5 w-3.5 text-primary" aria-hidden />
                  Download originals
                </li>
                <li className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-background/60 px-3 py-1">
                  <Heart className="h-3.5 w-3.5 text-primary" aria-hidden />
                  Favorites
                </li>
                <li className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-background/60 px-3 py-1">
                  <ShieldCheck className="h-3.5 w-3.5 text-primary" aria-hidden />
                  Secure access
                </li>
              </ul>

              <div className="text-center text-sm text-muted-foreground">
                <p>Are you a photographer?</p>
                <Link href="/login" className="text-primary font-medium hover:underline">
                  Sign in as photographer
                </Link>
              </div>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  )
}
