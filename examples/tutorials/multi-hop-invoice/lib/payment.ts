import type { FiberBrowserNode } from '@fiber-pay/sdk/browser';
import { bottle } from './fiber';
import { ckbToHex } from './amounts';

export async function payMultiHopInvoice(node: FiberBrowserNode, invoice: string) {
  const submitted = await node.sendPayment({
    invoice,
    trampoline_hops: [bottle.pubkey],
    max_fee_amount: ckbToHex('1'),
  });
  if (submitted.status === 'Success' || submitted.status === 'Failed') return submitted;
  return node.waitForPayment(submitted.payment_hash, { timeout: 60_000, interval: 1_000 });
}
