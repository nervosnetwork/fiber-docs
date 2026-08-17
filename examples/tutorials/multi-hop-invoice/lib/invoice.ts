import type { FiberBrowserNode } from '@fiber-pay/sdk/browser';
import { ckbToHex } from './amounts';

export async function createReceiverInvoice(
  node: FiberBrowserNode,
  amount: string,
) {
  return node.newInvoice({
    amount: ckbToHex(amount),
    currency: 'Fibt',
    description: 'Browser multi-hop tutorial',
    expiry: '0xe10',
    allow_trampoline_routing: true,
  });
}

export async function readInvoiceStatus(
  node: FiberBrowserNode,
  paymentHash: `0x${string}`,
) {
  return node.getInvoice({ payment_hash: paymentHash });
}
