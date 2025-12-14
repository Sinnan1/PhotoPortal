"use client";

import { Button } from "@/components/ui/button";
import { Mail } from "lucide-react";
import Image from "next/image";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export default function HomePage() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="relative h-screen min-h-[600px] bg-[#EAE8E0] dark:bg-[#1a1e1b] flex flex-col overflow-hidden selection:bg-[#333b33] selection:text-white dark:selection:bg-[#9CAF88]">
      {/* 
        LUXURY AESTHETIC LAYER 
        1. Noise Texture for "Paper" / "Film" feel
        2. Subtle Vignette
      */}
      <div className="fixed inset-0 pointer-events-none z-0 mix-blend-multiply opacity-[0.03] dark:opacity-[0.05] dark:mix-blend-overlay bg-[url('https://grainy-gradients.vercel.app/noise.svg')] bg-repeat"></div>

      <div className="fixed inset-0 pointer-events-none z-0 bg-[radial-gradient(circle_at_50%_50%,transparent_0%,rgba(0,0,0,0.03)_100%)] dark:bg-[radial-gradient(circle_at_50%_50%,transparent_0%,rgba(0,0,0,0.4)_100%)]"></div>

      {/* CLASSIC & CREATIVE THEME TOGGLE */}
      <div className="absolute top-6 right-6 z-50 animate-in fade-in duration-1000 delay-500">
        {mounted && (
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="group flex items-center gap-3 text-[10px] md:text-xs uppercase tracking-[0.25em] text-[#333b33] dark:text-[#E0E0E0] hover:text-[#6B7C32] dark:hover:text-[#9CAF88] transition-colors duration-500"
            aria-label="Toggle Theme"
          >
            <span className={`transition-opacity duration-500 ${theme === 'dark' ? 'opacity-50' : 'opacity-100 font-medium'}`}>Light</span>
            <div className="w-6 md:w-8 h-[1px] bg-current relative overflow-hidden">
              <div className={`absolute inset-0 bg-current transition-transform duration-500 ${theme === 'dark' ? 'translate-x-4' : '-translate-x-4'}`}></div>
            </div>
            <span className={`transition-opacity duration-500 ${theme === 'dark' ? 'opacity-100 font-medium' : 'opacity-50'}`}>Dark</span>
          </button>
        )}
      </div>

      {/* Main Content - Centered vertically in visible area */}
      <main className="flex-1 flex flex-col items-center justify-center relative z-10 w-full px-6">

        <div className="w-full max-w-5xl mx-auto flex flex-col items-center animate-in fade-in slide-in-from-bottom-4 duration-[1500ms] ease-out">

          {/* LOGO AREA - Compact spacing */}
          <div className="relative w-[180px] h-[80px] md:w-[250px] md:h-[110px] mb-6 md:mb-8 opacity-90 hover:opacity-100 transition-opacity duration-500">
            <Image
              src="/WHITE-NoBack2.png"
              alt="Yarrow Weddings Symbol"
              fill
              className="object-contain invert dark:invert-0"
              priority
            />
          </div>

          {/* BRAND TYPOGRAPHY */}
          <h1 className="text-[#1A1A1A] dark:text-[#F0F0F0] text-center font-audrey tracking-[0.3em] md:tracking-[0.5em] text-2xl md:text-5xl lg:text-6xl leading-tight mb-6 font-medium uppercase border-y border-transparent transition-all duration-700 hover:tracking-[0.55em]">
            Yarrow Weddings & Co.
          </h1>

          {/* DIVIDER */}
          <div className="w-12 h-[1px] bg-[#333b33] dark:bg-[#9CAF88] opacity-30 mb-6"></div>

          {/* STATUS TEXT */}
          <p className="text-[#333b33] dark:text-[#A0A0A0] text-base md:text-xl font-serif italic tracking-wide mb-8 md:mb-12 opacity-80">
            A curated digital experience. Coming soon.
          </p>

          {/* ACTIONS */}
          <div className="flex flex-col md:flex-row gap-4 md:gap-6 w-full max-w-sm md:max-w-md justify-center">
            <a href="/client-login" className="w-full group">
              <Button className="w-full bg-[#1A1A1A] dark:bg-[#F0F0F0] text-[#EAE8E0] dark:text-[#1a1e1b] hover:bg-[#333b33] dark:hover:bg-white rounded-none px-6 py-5 md:py-6 uppercase tracking-[0.2em] text-[10px] md:text-xs transition-all duration-500 hover:shadow-[0_0_20px_rgba(0,0,0,0.1)] dark:hover:shadow-[0_0_20px_rgba(255,255,255,0.1)] border border-transparent">
                Client Portal
              </Button>
            </a>

            <a href="/login" className="w-full group">
              <Button
                variant="outline"
                className="w-full bg-transparent border-[#1A1A1A] dark:border-[#505050] text-[#1A1A1A] dark:text-[#9CAF88] hover:bg-[#1A1A1A] hover:text-[#EAE8E0] dark:hover:bg-[#1E1E1E] dark:hover:border-[#1E1E1E] dark:hover:text-white rounded-none px-6 py-5 md:py-6 uppercase tracking-[0.2em] text-[10px] md:text-xs transition-all duration-500"
              >
                Photographer
              </Button>
            </a>
          </div>

          <p className="mt-8 text-[#333b33]/40 dark:text-[#A0A0A0]/40 text-[9px] uppercase tracking-[0.3em]">
            Access Your Gallery
          </p>

        </div>
      </main>

      {/* FOOTER */}
      <footer className="w-full py-4 text-center relative z-10 shrink-0">
        <div className="flex flex-col items-center gap-2">
          <a
            href="mailto:support@yarrowweddings.com"
            className="flex items-center gap-2 text-[#333b33]/60 dark:text-[#9CAF88]/60 hover:text-[#333b33] dark:hover:text-[#9CAF88] transition-colors duration-300 group"
          >
            <span className="text-[9px] md:text-[10px] uppercase tracking-[0.2em] border-b border-transparent group-hover:border-[#333b33]/40 dark:group-hover:border-[#9CAF88]/40 pb-1">
              Contact Support
            </span>
          </a>
          <p className="text-[#333b33]/20 dark:text-white/10 text-[8px] md:text-[9px] uppercase tracking-[0.3em]">
            © {new Date().getFullYear()} Yarrow Weddings
          </p>
        </div>
      </footer>
    </div>
  );
}
