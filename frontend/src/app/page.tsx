import Link from "next/link";
import Image from "next/image";
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
        <div className="pointer-events-none absolute -z-10 right-[-10rem] bottom-[-6rem] opacity-20">
          <Image src="/ICONS-01.png" alt="" width={600} height={600} className="select-none" />
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight">
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-emerald-700 to-green-500 dark:from-emerald-400 dark:to-green-300">
                Yarrow Weddings & Co.
              </span>
            </h1>
            <p className="mt-3 text-xl text-muted-foreground">Private Wedding Galleries</p>
            <p className="mt-4 text-lg md:text-xl text-muted-foreground">
              Elegant, secure, and timeless galleries designed exclusively for Yarrow Weddings & Co. couples.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/login">
                <Button size="lg" className="rounded-full px-10 bg-emerald-700 hover:bg-emerald-800">
                  Access Your Gallery
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
            <h2 className="text-3xl md:text-4xl font-bold mb-3">Crafted for Your Love Story</h2>
            <p className="text-lg text-muted-foreground">
              A private experience to view, relive, and share your wedding day with those who matter most.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="rounded-2xl border bg-card/60 backdrop-blur p-6 text-center hover:shadow-lg transition-shadow">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10">
                <Shield className="h-7 w-7 text-emerald-600" />
              </div>
              <h3 className="text-lg font-semibold mb-1">Private Access</h3>
              <p className="text-muted-foreground text-sm">Personalized, password-protected galleries</p>
            </div>

            <div className="rounded-2xl border bg-card/60 backdrop-blur p-6 text-center hover:shadow-lg transition-shadow">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10">
                <Download className="h-7 w-7 text-emerald-600" />
              </div>
              <h3 className="text-lg font-semibold mb-1">High-Res Downloads</h3>
              <p className="text-muted-foreground text-sm">Download your memories in full quality</p>
            </div>

            <div className="rounded-2xl border bg-card/60 backdrop-blur p-6 text-center hover:shadow-lg transition-shadow">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10">
                <Camera className="h-7 w-7 text-emerald-600" />
              </div>
              <h3 className="text-lg font-semibold mb-1">Timeless Presentation</h3>
              <p className="text-muted-foreground text-sm">Curated layouts that honor every moment</p>
            </div>

            <div className="rounded-2xl border bg-card/60 backdrop-blur p-6 text-center hover:shadow-lg transition-shadow">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10">
                <Users className="h-7 w-7 text-emerald-600" />
              </div>
              <h3 className="text-lg font-semibold mb-1">Share with Loved Ones</h3>
              <p className="text-muted-foreground text-sm">Invite family and friends to view your favorites</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="rounded-3xl border bg-gradient-to-r from-emerald-700 to-green-600 p-[1px]">
            <div className="rounded-3xl bg-background/80 p-10 text-center">
              <h2 className="text-3xl md:text-4xl font-bold mb-3 text-white/90">Your Day, Beautifully Preserved</h2>
              <p className="text-white/80 mb-8">Access your gallery and begin reliving the moments.</p>
              <Link href="/register">
                <Button size="lg" className="rounded-full px-8 bg-white text-emerald-800 hover:bg-white/90">
                  Sign In to View Gallery
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
