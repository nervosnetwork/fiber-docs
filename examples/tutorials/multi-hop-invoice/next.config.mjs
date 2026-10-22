/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@fiber-pay/sdk', '@nervosnetwork/fiber-js'],
  async redirects() {
    return [
      { source: '/docs/build/multi-hop-invoice', destination: '/', permanent: false },
      { source: '/docs/:path*', destination: 'https://www.fiber.world/docs/:path*', permanent: false },
      { source: '/downloads/:path*', destination: 'https://www.fiber.world/downloads/:path*', permanent: false },
    ];
  },
  async headers() {
    return [{ source: '/:path*', headers: [
      { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
      { key: 'Cross-Origin-Embedder-Policy', value: 'require-corp' },
    ] }];
  },
};
export default nextConfig;
