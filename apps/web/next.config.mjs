/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // Keep lint as a separate CI step (`pnpm lint`) to avoid blocking production builds.
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
  },
};

export default nextConfig;
