/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'randomuser.me' },
    ],
  },
  async rewrites() {
    return [
      // In production behind the same domain the /api/* proxy points at the
      // FastAPI backend. During local dev we proxy through Next → localhost:8001.
      {
        source: '/api/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_ORIGIN || 'http://localhost:8001'}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
