import type {
  BuildRouterResult,
  FiberBrowserNode,
} from '@fiber-pay/sdk/browser';
import { bottle, ckbToHex } from './fiber';

type OutPoint = { tx_hash: `0x${string}`; index: `0x${string}` };
type Pubkey = `0x${string}`;

const toHex = (value: Uint8Array) =>
  `0x${Array.from(value, (byte) => byte.toString(16).padStart(2, '0')).join('')}` as `0x${string}`;

export async function createHoldInvoice(node: FiberBrowserNode, amount: string) {
  const preimage = crypto.getRandomValues(new Uint8Array(32));
  const hash = new Uint8Array(await crypto.subtle.digest('SHA-256', preimage));
  const payment_hash = toHex(hash);
  const result = await node.newInvoice({
    amount: ckbToHex(amount),
    currency: 'Fibt',
    payment_hash,
    hash_algorithm: 'sha256',
    allow_trampoline_routing: true,
    expiry: '0xe10',
  });
  return { ...result, payment_hash, preimage: toHex(preimage) };
}

export async function prepareReceiverInbound(node: FiberBrowserNode) {
  const sent = await node.sendPayment({
    target_pubkey: bottle.pubkey,
    amount: ckbToHex('5'),
    keysend: true,
  });
  return sent.status === 'Success' || sent.status === 'Failed'
    ? sent
    : node.waitForPayment(sent.payment_hash, { timeout: 60_000, interval: 1_000 });
}

export function buildHoldRoute(
  node: FiberBrowserNode,
  amount: string,
  payerChannelOutpoint: OutPoint,
  receiverPubkey: Pubkey,
  receiverChannelOutpoint: OutPoint,
) {
  return node.buildRouter({
    amount: ckbToHex(amount),
    hops_info: [
      { pubkey: bottle.pubkey, channel_outpoint: payerChannelOutpoint },
      { pubkey: receiverPubkey, channel_outpoint: receiverChannelOutpoint },
    ],
  });
}

export function payHoldInvoice(
  node: FiberBrowserNode,
  invoice: string,
  route: BuildRouterResult,
) {
  return node.sendPaymentWithRouter({ invoice, router: route.router_hops });
}
