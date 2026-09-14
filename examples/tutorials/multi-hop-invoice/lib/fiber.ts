import type { FiberBrowserNode } from '@fiber-pay/sdk/browser';

export const bottle = {
  pubkey: '0x02b6d4e3ab86a2ca2fad6fae0ecb2e1e559e0b911939872a90abdda6d20302be71' as const,
  address: '/dns4/bottle.fiber.channel/tcp/443/wss/p2p/QmXen3eUHhywmutEzydCsW4hXBoeVmdET2FJvMX69XJ1Eo',
};
const toHex = (bytes: Uint8Array) =>
  Array.from(bytes, (value) => value.toString(16).padStart(2, '0')).join('');
const fromHex = (value: string) =>
  Uint8Array.from(value.match(/.{2}/g) ?? [], (part) => Number.parseInt(part, 16));

function profile(role: 'sender' | 'receiver') {
  const key = `fiber-multihop-${role}-profile-v1`;
  const saved = localStorage.getItem(key);
  if (saved) {
    const value = JSON.parse(saved);
    return { fiberKey: fromHex(value.fiberKey), ckbKey: fromHex(value.ckbKey), identifier: value.identifier };
  }
  const value = {
    fiberKey: toHex(crypto.getRandomValues(new Uint8Array(32))),
    ckbKey: toHex(crypto.getRandomValues(new Uint8Array(32))),
    identifier: crypto.randomUUID(),
  };
  localStorage.setItem(key, JSON.stringify(value));
  return { fiberKey: fromHex(value.fiberKey), ckbKey: fromHex(value.ckbKey), identifier: value.identifier };
}

export async function startRole(role: 'sender' | 'receiver') {
  const { FiberBrowserNode, RawKeyCredentialProvider } = await import('@fiber-pay/sdk/browser');
  const keys = profile(role);
  const node = new FiberBrowserNode({
    network: 'testnet',
    credential: new RawKeyCredentialProvider(keys.fiberKey, keys.ckbKey, keys.identifier),
    nodeConfig: { bootnodes: [], logLevel: 'info' },
  });
  await node.start();
  return node;
}

export async function connectAndOpenRoleChannel(node: FiberBrowserNode) {
  await node.connectPeer(bottle);
  return node.openChannel({ pubkey: bottle.pubkey, funding_amount: '0xb9e0ab300', public: true });
}
