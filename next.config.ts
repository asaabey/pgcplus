import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '100mb', // Allow large file uploads
    },
  },
  // Ensure proper output for Netlify deployment
  output: 'standalone',
};

export default nextConfig;
