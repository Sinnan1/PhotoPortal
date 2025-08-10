import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Camera, Shield, Download, Users } from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-background dark:from-background dark:via-background">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 -z-10 opacity-40">
          <div className="absolute -top-24 left-1/2 -translate-x-1/2 h-96 w-[60rem] rounded-full bg-gradient-to-r from-blue-500/40 to-fuchsia-500/40 blur-3xl" />
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-fuchsia-600 dark:from-blue-400 dark:to-fuchsia-400">
              Professional Photo Galleries
            </h1>
            <p className="mt-4 text-lg md:text-xl text-muted-foreground">
              Create secure, beautiful galleries and share them effortlessly with clients.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/register">
                <Button size="lg" className="rounded-full px-8">
                  Get Started Free
                </Button>
              </Link>
              <Link href="/login">
                <Button size="lg" variant="outline" className="rounded-full px-8">
                  Sign In
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-3">
              Everything you need to share photos
            </h2>
            <p className="text-lg text-muted-foreground">
              Built for photographers who deliver exceptional client experiences
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="rounded-2xl border bg-card/60 backdrop-blur p-6 text-center hover:shadow-lg transition-shadow">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-blue-500/10">
                <Shield className="h-7 w-7 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold mb-1">Password Protected</h3>
              <p className="text-muted-foreground text-sm">Secure galleries with custom passwords</p>
            </div>

            <div className="rounded-2xl border bg-card/60 backdrop-blur p-6 text-center hover:shadow-lg transition-shadow">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-500/10">
                <Download className="h-7 w-7 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold mb-1">Easy Downloads</h3>
              <p className="text-muted-foreground text-sm">Download single photos or entire sets</p>
            </div>

            <div className="rounded-2xl border bg-card/60 backdrop-blur p-6 text-center hover:shadow-lg transition-shadow">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-purple-500/10">
                <Camera className="h-7 w-7 text-purple-600" />
              </div>
              <h3 className="text-lg font-semibold mb-1">Beautiful Galleries</h3>
              <p className="text-muted-foreground text-sm">Showcase your work with elegance</p>
            </div>

            <div className="rounded-2xl border bg-card/60 backdrop-blur p-6 text-center hover:shadow-lg transition-shadow">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-orange-500/10">
                <Users className="h-7 w-7 text-orange-600" />
              </div>
              <h3 className="text-lg font-semibold mb-1">Client Management</h3>
              <p className="text-muted-foreground text-sm">Control access and track engagement</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="rounded-3xl border bg-gradient-to-r from-blue-600 to-fuchsia-600 p-[1px]">
            <div className="rounded-3xl bg-background/80 p-10 text-center">
              <h2 className="text-3xl md:text-4xl font-bold mb-3 text-white/90">
                Ready to elevate your client experience?
              </h2>
              <p className="text-white/80 mb-8">
                Join photographers delivering their best with PhotoPortal
              </p>
              <Link href="/register">
                <Button size="lg" className="rounded-full px-8 bg-white text-blue-700 hover:bg-white/90">
                  Start Your Free Trial
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
