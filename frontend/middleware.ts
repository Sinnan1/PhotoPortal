import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function middleware(request: NextRequest) {
  const token = request.cookies.get("auth-token")?.value
  const { pathname } = request.nextUrl

  // Protected routes that require authentication
  const protectedRoutes = ["/dashboard", "/galleries"]
  const isProtectedRoute = protectedRoutes.some((route) => pathname.startsWith(route))

  // Redirect to login if accessing protected route without token
  if (isProtectedRoute && !token) {
    return NextResponse.redirect(new URL("/login", request.url))
  }

  // Redirect to dashboard if accessing auth pages with valid token
  if ((pathname.startsWith("/login") || pathname.startsWith("/register")) && token) {
    return NextResponse.redirect(new URL("/dashboard", request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/dashboard/:path*", "/galleries/:path*", "/login", "/register"],
}
