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
  description: "Private wedding galleries crafted exclusively for Yarrow Weddings & Co. clients.",
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
  themeColor: '#425146',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Yarrow Weddings',
  },
  formatDetection: {
    telephone: false,
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
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
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
