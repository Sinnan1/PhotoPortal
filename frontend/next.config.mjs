/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    domains: ['localhost', 'your-api-domain.com', 's3.us-east-005.backblazeb2.com'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 's3.us-east-005.backblazeb2.com',
        port: '',
        pathname: '/photo-gallery-sinnan/**',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '5000',
      },
    ],
    unoptimized: true,
  },
}

export default nextConfig
