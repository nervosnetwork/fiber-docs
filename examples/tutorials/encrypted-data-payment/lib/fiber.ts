import type { Channel, FiberBrowserNode } from '@fiber-pay/sdk/browser';

export const bottle = {
  pubkey: '0x02b6d4e3ab86a2ca2fad6fae0ecb2e1e559e0b911939872a90abdda6d20302be71' as const,
  address: '/dns4/bottle.fiber.channel/tcp/443/wss/p2p/QmXen3eUHhywmutEzydCsW4hXBoeVmdET2FJvMX69XJ1Eo',
};

const toHex = (bytes: Uint8Array) =>
  Array.from(bytes, (value) => value.toString(16).padStart(2, '0')).join('');
const fromHex = (value: string) =>
  Uint8Array.from(value.match(/.{2}/g) ?? [], (part) => Number.parseInt(part, 16));
const wait = (milliseconds: number) =>
  new Promise((resolve) => window.setTimeout(resolve, milliseconds));

function profile(role: 'buyer' | 'seller') {
  const storageKey = `fiber-encrypted-data-${role}-v1`;
  const saved = localStorage.getItem(storageKey);
  if (saved) {
    const value = JSON.parse(saved);
    return {
      fiberKey: fromHex(value.fiberKey),
      ckbKey: fromHex(value.ckbKey),
      identifier: value.identifier as string,
    };
  }
  const value = {
    fiberKey: toHex(crypto.getRandomValues(new Uint8Array(32))),
    ckbKey: toHex(crypto.getRandomValues(new Uint8Array(32))),
    identifier: crypto.randomUUID(),
  };
  localStorage.setItem(storageKey, JSON.stringify(value));
  return {
    fiberKey: fromHex(value.fiberKey),
    ckbKey: fromHex(value.ckbKey),
    identifier: value.identifier,
  };
}

export async function startRole(role: 'buyer' | 'seller') {
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

function ready(channel: Channel) {
  return channel.state.state_name.replace(/[^a-z0-9]/gi, '').toLowerCase() === 'channelready';
}

export async function connectAndOpenChannel(node: FiberBrowserNode) {
  await node.connectPeer(bottle);
  const existing = (await node.listChannels()).channels.find(
    (channel) => channel.pubkey.toLowerCase() === bottle.pubkey.toLowerCase(),
  );
  if (!existing) {
    await node.openChannel({
      pubkey: bottle.pubkey,
      funding_amount: '0xb9e0ab300', // 499 CKB
      public: true,
    });
  }
  for (let attempt = 0; attempt < 120; attempt += 1) {
    const channel = (await node.listChannels()).channels.find(
      (item) => item.pubkey.toLowerCase() === bottle.pubkey.toLowerCase(),
    );
    if (channel && ready(channel)) return channel;
    await wait(2_000);
  }
  throw new Error('Channel is still confirming. Retry after it reaches CHANNEL_READY.');
}

export async function prepareSellerInbound(node: FiberBrowserNode) {
  const submitted = await node.sendPayment({
    target_pubkey: bottle.pubkey,
    amount: '0x1dcd65000', // 5 CKB
    keysend: true,
  });
  return submitted.status === 'Success' || submitted.status === 'Failed'
    ? submitted
    : node.waitForPayment(submitted.payment_hash, { timeout: 60_000, interval: 1_000 });
}
