/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Allow serving generated media from /media via a rewrite to an API route.
  async rewrites() {
    return [{ source: '/media/:path*', destination: '/api/media/:path*' }];
  },
};
export default nextConfig;
