import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { AuthProvider } from "@/lib/auth-context"
import { ToastProvider } from "@/components/ui/toast"
import { Navigation } from "@/components/navigation"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "PhotoPortal - Professional Photo Gallery",
  description: "Create and share password-protected photo galleries with clients",
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ToastProvider>
          <AuthProvider>
            <Navigation />
            <main className="min-h-screen bg-gray-50">{children}</main>
          </AuthProvider>
        </ToastProvider>
      </body>
    </html>
  )
}
