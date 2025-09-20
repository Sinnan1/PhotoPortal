import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check if the request is for admin routes (except login, setup, and activate pages)
  if (pathname.startsWith('/admin') && 
      pathname !== '/admin/login' && 
      pathname !== '/admin/setup' && 
      pathname !== '/admin/activate') {
    // Get the auth token from cookies
    const token = request.cookies.get('auth-token')?.value;

    if (!token) {
      // No token, redirect to admin login
      const loginUrl = new URL('/admin/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }

    // For admin routes, we need to verify the user has admin role
    // Since we can't easily decode JWT in middleware without additional setup,
    // we'll let the AdminLayout component handle the role check
    // and redirect if necessary
  }

  // Redirect admin login if already authenticated
  if (pathname === '/admin/login') {
    const token = request.cookies.get('auth-token')?.value;
    if (token) {
      // Let the login page component handle the redirect based on role
      return NextResponse.next();
    }
  }

  // Protect regular user routes from admin access
  if (pathname.startsWith('/dashboard') && !pathname.startsWith('/dashboard/client')) {
    const token = request.cookies.get('auth-token')?.value;
    if (token) {
      // Let the component handle role-based access
      return NextResponse.next();
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/dashboard/:path*',
  ],
};