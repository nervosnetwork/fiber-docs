import type { FiberBrowserNode } from '@fiber-pay/sdk/browser';
import { ckbToHex } from './amounts';
export async function sendKeysend(node: FiberBrowserNode, peer: `0x${string}`, amount: string) {
  const submitted = await node.sendPayment({ target_pubkey: peer, amount: ckbToHex(amount), keysend: true });
  return submitted.status === 'Success' || submitted.status === 'Failed' ? submitted : node.waitForPayment(submitted.payment_hash, { timeout: 30_000, interval: 1_000 });
}
