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
        '/docs/build/encrypted-data-payment',
        '/docs/build/verified-result-payment',
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
      { source: "/:path*", has: [{ type: "host", value: "fiber.world" }], destination: "https://www.fiber.world/:path*", permanent: true },
      {"source": "/docs/api-reference/channel", "destination": "/docs/api-reference/channels/channel", "permanent": true},
      {"source": "/docs/api-reference/payment", "destination": "/docs/api-reference/payments/payment", "permanent": true},
      {"source": "/docs/api-reference/dev", "destination": "/docs/api-reference/dev-tooling/dev", "permanent": true},
      {"source": "/docs/api-reference/watchtower", "destination": "/docs/api-reference/dev-tooling/watchtower", "permanent": true},
      {"source": "/docs/api-reference/peer", "destination": "/docs/api-reference/node/peer", "permanent": true},
      {"source": "/docs/api-reference/cch", "destination": "/docs/api-reference/cross-chain/cch", "permanent": true},
      {"source": "/docs/build/ffi", "destination": "/docs/build/ffi/ffi-user-guide", "permanent": true},
      {"source": "/docs/guide/node-operator/backup", "destination": "/docs/operate/backup", "permanent": true},
      {"source": "/docs/guide/node-operator/config-reference", "destination": "/docs/operate/config-reference", "permanent": true},
      {"source": "/docs/res/network-resources", "destination": "/docs/quick-start/network-resources", "permanent": true},
      {
        source: '/docs/build/verified-agent-job',
        destination: '/docs/build/verified-result-payment',
        permanent: true,
      },
      {
        source: '/downloads/fiber-verified-agent-job.zip',
        destination: '/downloads/fiber-verified-result-payment.zip',
        permanent: true,
      },
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
        source: '/docs/res/liquidity',
        destination: '/docs/concept/liquidity/overview',
        permanent: true,
      },
      {
        source: '/docs/build/directional-liquidity',
        destination: '/docs/concept/liquidity/directional-liquidity',
        permanent: true,
      },
      {
        source: '/docs/build/route-liquidity',
        destination: '/docs/concept/liquidity/route-liquidity',
        permanent: true,
      },
      {
        source: '/docs/build/rebalance-liquidity',
        destination: '/docs/concept/liquidity/rebalance-liquidity',
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
