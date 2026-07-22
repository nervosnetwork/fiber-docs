import type { Metadata } from 'next';
import { BrowserNodeLab } from '@/components/labs/browser-node-lab';

export const metadata: Metadata = {
  title: 'Browser Node Lab | Fiber Network',
  description: 'Start a real Fiber WASM node and connect it to a Router over WSS.',
};

export default function BrowserNodeLabPage() {
  const configuredAddress = process.env.NEXT_PUBLIC_FIBER_LAB_ROUTER_WS_ADDRESS;
  const configuredPubkey = process.env.NEXT_PUBLIC_FIBER_LAB_ROUTER_PUBKEY;

  return (
    <BrowserNodeLab
      defaultRouterAddress={configuredAddress ?? '/dns4/bottle.fiber.channel/tcp/443/wss/p2p/QmXen3eUHhywmutEzydCsW4hXBoeVmdET2FJvMX69XJ1Eo'}
      defaultRouterPubkey={configuredAddress ? (configuredPubkey ?? '') : '02b6d4e3ab86a2ca2fad6fae0ecb2e1e559e0b911939872a90abdda6d20302be71'}
    />
  );
}
