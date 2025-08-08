// next.config.js
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
        pathname: '/photo-gallery-sinnan/**',
      },
    ],
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
              "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
              "img-src 'self' data: blob: https: http: https://s3.us-east-005.backblazeb2.com",
              "style-src 'self' 'unsafe-inline'",
              "font-src 'self' data:",
              "connect-src 'self' https: http: ws: wss:",
              "media-src 'self' https: http:",
            ].join('; ')
          }
        ]
      }
    ]
  }
}

export default nextConfig;
