/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // Keep lint as a separate CI step (`pnpm lint`) to avoid blocking production builds.
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
