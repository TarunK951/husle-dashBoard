/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    const apiBase = process.env.NEXT_PUBLIC_API_URL || 'https://server.huslelifestyle.com/api';
    return {
      beforeFiles: [],
      // /api/* → backend. Pages under pages/api/* (e.g. /api/upload/model) take precedence.
      afterFiles: [
        {
          source: '/api/:path*',
          destination: `${apiBase.replace(/\/$/, '')}/:path*`,
        },
      ],
      fallback: [],
    };
  },
};

export default nextConfig;
