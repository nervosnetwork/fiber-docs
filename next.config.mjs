import { createMDX } from 'fumadocs-mdx/next';

const withMDX = createMDX();

/** @type {import('next').NextConfig} */
const config = {
  reactStrictMode: true,
  transpilePackages: ['@fiber-pay/sdk', '@nervosnetwork/fiber-js'],
  async headers() {
    return [
      {
        source: '/labs/browser-node',
        headers: [
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
          { key: 'Cross-Origin-Embedder-Policy', value: 'require-corp' },
        ],
      },
      {
        source: '/docs/build/connect-wasm-node',
        headers: [
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
          { key: 'Cross-Origin-Embedder-Policy', value: 'require-corp' },
        ],
      },
      {
        source: '/docs/build/open-channel-payment',
        headers: [
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
          { key: 'Cross-Origin-Embedder-Policy', value: 'require-corp' },
        ],
      },
      {
        source: '/docs/build/multi-hop-invoice',
        headers: [
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
          { key: 'Cross-Origin-Embedder-Policy', value: 'require-corp' },
        ],
      },
      {
        source: '/docs/build/unidirectional-channel',
        headers: [
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
          { key: 'Cross-Origin-Embedder-Policy', value: 'require-corp' },
        ],
      },
      ...[
        '/docs/build/hold-invoice',
        '/docs/build/rusd-payment',
        '/docs/build/close-channel',
      ].map((source) => ({
        source,
        headers: [
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
          { key: 'Cross-Origin-Embedder-Policy', value: 'require-corp' },
        ],
      })),
    ];
  },
  async redirects() {
    return [
      {
        source: '/docs/build/channel-rebalancing',
        destination: '/docs/build/unidirectional-channel',
        permanent: false,
      },
      {
        source: '/docs/build/wasm-dapp',
        destination: '/docs/build/connect-wasm-node',
        permanent: false,
      },
      {
        // Moved under Build -> Gaming
        source: '/docs/build/simple-game',
        destination: '/docs/build/gaming/simple-game',
        permanent: true,
      },
      {
        source: '/docs/res/fiber-js-browser-extension',
        destination: '/docs/build/browser-extension',
        permanent: true,
      },
      {
        // Preserve links from before the documentation restructure.
        source: '/docs/tech-explanation/high-level',
        destination: '/docs/res/high-level',
        permanent: true,
      },
      {
        // Preserve links from before the documentation restructure.
        source: '/docs/tech-explanation/invoice-protocol',
        destination: '/docs/res/invoice-protocol',
        permanent: true,
      },
      {
        // This archived devlog predates the current rolling API window.
        source: '/blog/d/3fa6fcf8f94a1aa6',
        destination: 'https://github.com/nervosnetwork/fiber/discussions/735',
        permanent: true,
      },
      {
        // Keep the Devlog linked from Pulse 01 reachable from old bookmarks.
        source: '/blog/d/1994384f43a636e5',
        destination: 'https://github.com/nervosnetwork/fiber/discussions/1170',
        permanent: true,
      },
      {
        source: '/contact',
        destination: '/',
        permanent: true,
      },
    ];
  },
};

export default withMDX(config);
