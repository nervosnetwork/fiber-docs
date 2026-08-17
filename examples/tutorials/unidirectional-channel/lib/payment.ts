import type { FiberBrowserNode } from '@fiber-pay/sdk/browser';
import { ckbToHex } from './amounts';

export async function sendOneWayPayment(
  node: FiberBrowserNode,
  acceptorPubkey: `0x${string}`,
  amount: string,
) {
  const submitted = await node.sendPayment({
    target_pubkey: acceptorPubkey,
    amount: ckbToHex(amount),
    keysend: true,
  });
  if (submitted.status === 'Success' || submitted.status === 'Failed') {
    return submitted;
  }
  return node.waitForPayment(submitted.payment_hash, {
    timeout: 60_000,
    interval: 1_000,
  });
}
