import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  images: {
    // In local development the browser loads images from the local PHP server.
    unoptimized: process.env.NODE_ENV === 'development',
    remotePatterns: [
      { protocol: 'https', hostname: 'www.wiewarm.ch', pathname: '/img/**' },
      { protocol: 'https', hostname: 'beta.wiewarm.ch', pathname: '/img/**' },
    ],
  },
};

export default nextConfig;
