import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { AuthProvider } from "@/lib/auth-context"
import { ToastProvider } from "@/components/ui/toast"
import { Navigation } from "@/components/navigation"
import { ThemeProvider } from "@/components/theme-provider"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Yarrow Weddings & Co.",
  description: "Private wedding galleries crafted exclusively for Yarrow Weddings & Co. clients. Timeless moments, beautifully preserved.",
  icons: {
    icon: "/Logo-Main.png",
    shortcut: "/Logo-Main.png",
    apple: "/Logo-Main.png",
  },
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
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
          <ToastProvider>
            <AuthProvider>
              <Navigation />
              <main className="min-h-screen">{children}</main>
            </AuthProvider>
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}