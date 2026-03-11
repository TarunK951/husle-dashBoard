/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return {
      // beforeFiles runs before filesystem checks — leave empty
      beforeFiles: [],
      // afterFiles runs after filesystem/API route checks
      // Local API routes (pages/api/*) always win over afterFiles rewrites,
      // so /api/upload/model will be handled locally, not proxied.
      afterFiles: [
        {
          source: '/api/:path*',
          destination: 'https://server.huslelifestyle.com/api/:path*',
        },
      ],
      // fallback rewrites
      fallback: [],
    };
  },
};

export default nextConfig;
