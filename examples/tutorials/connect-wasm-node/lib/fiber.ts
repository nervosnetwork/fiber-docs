import type { BrowserNodeState, FiberBrowserNode } from '@fiber-pay/sdk/browser';

export const router = '/dns4/bottle.fiber.channel/tcp/443/wss/p2p/QmXen3eUHhywmutEzydCsW4hXBoeVmdET2FJvMX69XJ1Eo';
export const routerPubkey = '0x02b6d4e3ab86a2ca2fad6fae0ecb2e1e559e0b911939872a90abdda6d20302be71';

export async function startFiber(onState: (state: BrowserNodeState) => void) {
  if (!crossOriginIsolated) throw new Error('This page must be cross-origin isolated.');
  const { FiberBrowserNode, RawKeyCredentialProvider } = await import('@fiber-pay/sdk/browser');
  const credential = new RawKeyCredentialProvider(
    crypto.getRandomValues(new Uint8Array(32)),
    crypto.getRandomValues(new Uint8Array(32)),
    crypto.randomUUID(),
  );
  const node = new FiberBrowserNode({
    network: 'testnet', credential,
    nodeConfig: { bootnodes: [], logLevel: 'info' },
  });
  node.on('stateChange', onState);
  await node.start();
  return node;
}

export async function connectToRouter(node: FiberBrowserNode) {
  await node.connectPeer({
    address: router,
    pubkey: routerPubkey,
  });
}
