// next.config.js
const isDev = process.env.NODE_ENV !== 'production'

// Derive API origin for CSP connect-src
let apiOrigin = 'http://localhost:5000'
try {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'
  const u = new URL(apiUrl)
  apiOrigin = `${u.protocol}//${u.host}`
} catch {}

const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    domains: ['s3.us-east-005.backblazeb2.com'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 's3.us-east-005.backblazeb2.com',
        pathname: '/**',
      },
    ],
    // Increase cache TTL to reduce repeated requests
    minimumCacheTTL: 300, // 5 minutes
    // Disable image optimization for external images to avoid timeout issues
    unoptimized: false,
    // Add loader configuration
    loader: 'default',
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''}`,
              "style-src 'self' 'unsafe-inline'",
              "font-src 'self' data:",
              `connect-src 'self' ${apiOrigin} https: http: ws: wss:`,
              "img-src 'self' data: blob: https: http: https://s3.us-east-005.backblazeb2.com",
              "media-src 'self' https: http:",
            ].join('; ')
          }
        ]
      }
    ]
  }
}

export default nextConfig;
