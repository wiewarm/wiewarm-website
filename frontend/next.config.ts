import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'www.wiewarm.ch', pathname: '/img/**' },
      { protocol: 'https', hostname: 'beta.wiewarm.ch', pathname: '/img/**' },
    ],
  },
};

export default nextConfig;
