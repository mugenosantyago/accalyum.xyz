/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  webpack: (config) => {
    // This allows importing JSON files without json-loader
    config.module.rules.push({
      test: /\.json$/,
      type: 'json',
    })
    
    return config
  },
  // Use the correct property name for Next.js 15
  serverExternalPackages: ['pino-pretty'],
  // Disable static optimization for not-found page
  experimental: {
    // Disable static optimization for problematic pages
    disableOptimizedLoading: true,
  }
}

export default nextConfig
