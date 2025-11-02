import type React from "react"
import type { Metadata } from "next"
import { Playfair_Display, Inter } from "next/font/google"
import "./globals.css"
import { AuthProvider } from "@/lib/auth-context"
import { ToastProvider } from "@/components/ui/toast"
import { Navigation } from "@/components/navigation"
import { ThemeProvider } from "@/components/theme-provider"
import { Footer } from "@/components/footer"

const playfair = Playfair_Display({ subsets: ["latin"], variable: "--font-playfair" })
const inter = Inter({ subsets: ["latin"], variable: "--font-inter" })

export const metadata: Metadata = {
  title: "Yarrow Weddings & Co.",
  description: "Private wedding galleries crafted exclusively for Yarrow Weddings & Co. clients. Timeless moments, beautifully preserved.",
  icons: {
    icon: [
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon.ico", sizes: "any" },
    ],
    shortcut: "/favicon.ico",
    apple: "/apple-touch-icon.png",
    other: [
      { rel: "android-chrome-192x192", url: "/android-chrome-192x192.png" },
      { rel: "android-chrome-512x512", url: "/android-chrome-512x512.png" },
    ],
  },
  manifest: "/site.webmanifest",
  generator: 'v0.dev',
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 5,
    userScalable: true,
  },
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#425146' },
    { media: '(prefers-color-scheme: dark)', color: '#2a3530' }
  ],
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Yarrow Weddings & Co.',
  },
  formatDetection: {
    telephone: false,
  },
  authors: [{ name: 'Yarrow Weddings & Co.' }],
  creator: 'Yarrow Weddings & Co.',
  publisher: 'Yarrow Weddings & Co.',
  openGraph: {
    title: 'Yarrow Weddings & Co.',
    description: 'Private wedding galleries crafted exclusively for our clients',
    type: 'website',
    locale: 'en_US',
    siteName: 'Yarrow Weddings & Co.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Yarrow Weddings & Co.',
    description: 'Private wedding galleries crafted exclusively for our clients',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${playfair.variable} ${inter.variable}`} suppressHydrationWarning>
      <body className="font-inter">
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
          <ToastProvider>
            <AuthProvider>
              <div className="flex min-h-screen flex-col">
                <Navigation />
                <main className="flex-1">{children}</main>
                <Footer />
              </div>
            </AuthProvider>
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}