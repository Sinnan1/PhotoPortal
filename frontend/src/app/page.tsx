import { Button } from "@/components/ui/button";
import {
  Camera,
  Shield,
  Download,
  Users,
  Heart,
  ArrowRight,
  CheckCircle,
} from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#F5F5DC] dark:bg-[#121212]">
      {/* Hero Section */}
      <section
        className="pt-16 pb-20 px-6"
        style={{
          fontFamily:
            'Poppins, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        }}
      >
        <div className="max-w-7xl mx-auto">
          {/* Hero Card */}
          <div className="bg-white dark:bg-[#1E1E1E] border border-[#333b33]/20 dark:border-[#333333] rounded-[40px] p-16 md:p-12">
            {/* Intro eyebrow */}
            <div className="flex items-baseline gap-2 mb-6">
              <span className="text-xl" aria-hidden="true">
                🤍
              </span>
              <p className="text-[#333b33] dark:text-[#9CAF88] text-[15px] font-normal">
                Premium wedding photography galleries for discerning couples...
              </p>
            </div>

            {/* Headline */}
            <h1
              className="text-[#333b33] dark:text-white font-normal leading-[1.05] mb-8"
              style={{
                fontSize: "clamp(36px, 6vw, 68px)",
              }}
            >
              Preserving your most
              <br />
              precious moments with
              <br />
              professional elegance
            </h1>

            {/* Subtitle */}
            <p className="text-[#6B7C32] dark:text-[#9CAF88] text-lg max-w-2xl mb-12 leading-relaxed">
              Secure, private galleries where your wedding photography is
              curated and presented with the sophistication your special day
              deserves.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 items-start">
              <a href="/login">
                <Button className="bg-[#333b33] hover:bg-[#6B7C32] text-[#F5F5DC] px-8 py-3 rounded-full font-medium transition-all duration-150 shadow-lg">
                  <span className="flex items-center gap-2">
                    Access Your Gallery
                    <ArrowRight className="w-4 h-4" />
                  </span>
                </Button>
              </a>

              <a href="/client-login">
                <Button
                  variant="outline"
                  className="border-[#333b33] text-[#333b33] hover:bg-[#333b33] hover:text-[#F5F5DC] px-8 py-3 rounded-full font-medium transition-all duration-150"
                >
                  Client Login
                </Button>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Features Showcase */}
      <section className="py-20 px-6 bg-white dark:bg-[#121212]">
        <div className="max-w-6xl mx-auto">
          {/* Section Header */}
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 bg-[#333b33]/10 border border-[#333b33]/20 rounded-full px-4 py-2 mb-6">
              <Heart className="w-4 h-4 text-[#333b33]" />
              <span className="text-sm font-medium text-[#333b33]">
                Professional Excellence
              </span>
            </div>

            <h2
              className="text-[#333b33] dark:text-white text-4xl lg:text-6xl leading-tight mb-6"
              style={{
                fontFamily:
                  'Instrument Sans, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                fontWeight: 500,
              }}
            >
              Your memories deserve
              <br />
              the finest presentation
            </h2>

            <p className="text-[#6B7C32] dark:text-[#9CAF88] text-xl max-w-3xl mx-auto leading-relaxed">
              Every gallery is thoughtfully curated with professional-grade
              security, elegant presentation, and seamless access for you and
              your loved ones.
            </p>
          </div>

          {/* Feature Cards */}
          <div className="grid md:grid-cols-2 gap-8 mb-16">
            {/* Security Card */}
            <div className="bg-[#F5F5DC] dark:bg-[#1E1E1E] border border-[#333b33]/20 dark:border-[#333333] rounded-2xl p-8 hover:shadow-lg transition-all duration-300">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#333b33]/10 mb-6">
                <Shield className="h-6 w-6 text-[#333b33]" />
              </div>
              <h3 className="text-xl font-semibold mb-3 text-[#333b33] dark:text-white">
                Secure & Private
              </h3>
              <p className="text-[#6B7C32] dark:text-[#9CAF88] leading-relaxed">
                Bank-level security ensures your intimate moments remain
                private, accessible only to those you choose to invite.
              </p>
            </div>

            {/* Quality Card */}
            <div className="bg-[#F5F5DC] dark:bg-[#1E1E1E] border border-[#333b33]/20 dark:border-[#333333] rounded-2xl p-8 hover:shadow-lg transition-all duration-300">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#333b33]/10 mb-6">
                <Download className="h-6 w-6 text-[#333b33]" />
              </div>
              <h3 className="text-xl font-semibold mb-3 text-[#333b33] dark:text-white">
                Premium Quality
              </h3>
              <p className="text-[#6B7C32] dark:text-[#9CAF88] leading-relaxed">
                Download your photos in full resolution, perfectly optimized for
                printing and archival preservation.
              </p>
            </div>

            {/* Curation Card */}
            <div className="bg-[#F5F5DC] dark:bg-[#1E1E1E] border border-[#333b33]/20 dark:border-[#333333] rounded-2xl p-8 hover:shadow-lg transition-all duration-300">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#333b33]/10 mb-6">
                <Camera className="h-6 w-6 text-[#333b33]" />
              </div>
              <h3 className="text-xl font-semibold mb-3 text-[#333b33] dark:text-white">
                Expert Curation
              </h3>
              <p className="text-[#6B7C32] dark:text-[#9CAF88] leading-relaxed">
                Each image is carefully selected and arranged to tell your
                unique love story with artistic sophistication.
              </p>
            </div>

            {/* Sharing Card */}
            <div className="bg-[#F5F5DC] dark:bg-[#1E1E1E] border border-[#333b33]/20 dark:border-[#333333] rounded-2xl p-8 hover:shadow-lg transition-all duration-300">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#333b33]/10 mb-6">
                <Users className="h-6 w-6 text-[#333b33]" />
              </div>
              <h3 className="text-xl font-semibold mb-3 text-[#333b33] dark:text-white">
                Effortless Sharing
              </h3>
              <p className="text-[#6B7C32] dark:text-[#9CAF88] leading-relaxed">
                Share your joy with family and friends through elegant,
                password-protected galleries designed for seamless viewing.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 px-6 bg-[#F5F5DC] dark:bg-[#1E1E1E] border-t border-[#333b33]/20">
        <div className="max-w-4xl mx-auto text-center">
          <h2
            className="text-[#333b33] dark:text-white text-3xl lg:text-5xl leading-tight mb-12"
            style={{
              fontFamily:
                'Instrument Sans, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
              fontWeight: 500,
            }}
          >
            What our couples say
          </h2>

          <div className="bg-white dark:bg-[#2A2A2A] border border-[#333b33]/20 dark:border-[#404040] rounded-2xl p-8 lg:p-12">
            <blockquote className="text-[#333b33] dark:text-white text-lg lg:text-xl italic leading-relaxed mb-6">
              "The gallery was absolutely stunning. Every photo was presented
              beautifully, and sharing with our family was so elegant and
              simple. It truly felt like our love story was being honored with
              the care it deserved."
            </blockquote>
            <div className="flex items-center justify-center gap-4">
              <div className="w-12 h-12 bg-[#333b33] rounded-full flex items-center justify-center">
                <span className="text-white font-semibold">M&J</span>
              </div>
              <div className="text-left">
                <p className="text-[#333b33] dark:text-white font-medium">
                  Marcus & Julia
                </p>
                <p className="text-[#6B7C32] dark:text-[#9CAF88] text-sm">
                  Wedding, September 2024
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section
        className="relative rounded-[24px] mx-6 mb-6 overflow-hidden"
        style={{
          background:
            "radial-gradient(circle at bottom right, #333b33 0%, #6B7C32 30%, transparent 70%), #F5F5DC",
          paddingTop: "10vh",
          paddingBottom: "10vh",
          paddingLeft: "clamp(4vw, 8vw, 8vw)",
          paddingRight: "clamp(4vw, 8vw, 8vw)",
          fontFamily:
            'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        }}
      >
        {/* Dark mode overlay */}
        <div
          className="absolute inset-0 hidden dark:block"
          style={{
            background:
              "radial-gradient(circle at bottom right, #333b33 0%, #1E1E1E 30%, transparent 70%), #121212",
          }}
        ></div>

        <div className="relative z-10 text-center">
          {/* Main headline */}
          <h1
            className="text-[#333b33] dark:text-white leading-[0.9] mb-8"
            style={{
              fontFamily:
                'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
              fontSize: "clamp(2.5rem, 5vw, 4.5rem)",
              letterSpacing: "-0.04em",
              fontWeight: 800,
            }}
          >
            Ready to access your
            <br />
            private wedding gallery?
            <br />
            Your memories await ✨
          </h1>

          {/* Primary CTA Button */}
          <div className="mb-12">
            <a href="/login">
              <Button
                className="bg-[#333b33] dark:bg-white hover:bg-[#6B7C32] dark:hover:bg-[#F0F0F0] text-white dark:text-black px-8 py-4 rounded-full transition-all duration-150 shadow-lg hover:shadow-xl hover:scale-105"
                style={{
                  fontFamily:
                    'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                  fontWeight: 600,
                }}
              >
                Enter Your Gallery
              </Button>
            </a>
          </div>

          {/* Divider */}
          <div className="w-full h-px mb-8 bg-[#333b33]/30 dark:bg-[#9CAF88]/20"></div>

          {/* Information bar */}
          <div className="flex flex-col sm:flex-row justify-between items-center gap-8">
            {/* Left - Contact */}
            <div className="flex flex-col gap-2">
              <span
                className="text-[#333b33] dark:text-[#9CAF88] text-sm uppercase tracking-wider"
                style={{
                  fontFamily:
                    'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                  letterSpacing: "0.05em",
                  fontWeight: 500,
                }}
              >
                Contact
              </span>
              <a
                href="mailto:hello@yarrowweddings.com"
                className="text-[#333b33] dark:text-white hover:underline transition-all duration-150"
                style={{
                  fontFamily:
                    'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                }}
              >
                hello@yarrowweddings.com
              </a>
            </div>

            {/* Right - Support */}
            <div className="flex flex-col gap-2 items-end">
              <span
                className="text-[#333b33] dark:text-[#9CAF88] text-sm uppercase tracking-wider"
                style={{
                  fontFamily:
                    'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                  letterSpacing: "0.05em",
                  fontWeight: 500,
                }}
              >
                Support
              </span>
              <div className="flex items-center gap-2 text-[#333b33] dark:text-white">
                <CheckCircle className="w-4 h-4 text-[#6B7C32]" />
                <span className="text-sm">Available 24/7</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}



