/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'https://server.huslelifestyle.com/api/:path*',
      },
    ];
  },
};

export default nextConfig;
