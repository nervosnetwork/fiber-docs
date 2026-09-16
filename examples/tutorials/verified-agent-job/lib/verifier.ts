import type { FiberBrowserNode } from '@fiber-pay/sdk/browser';

const toHex = (value: Uint8Array) =>
  `0x${Array.from(value, (byte) => byte.toString(16).padStart(2, '0')).join('')}` as `0x${string}`;

export async function createVerifierLock() {
  const preimage = crypto.getRandomValues(new Uint8Array(32));
  const digest = await crypto.subtle.digest('SHA-256', preimage);
  return { preimage: toHex(preimage), paymentHash: toHex(new Uint8Array(digest)) };
}

export async function releaseSettlement(
  worker: FiberBrowserNode,
  paymentHash: `0x${string}`,
  preimage: `0x${string}`,
) {
  await worker.settleInvoice({ payment_hash: paymentHash, payment_preimage: preimage });
  return worker.waitForInvoiceStatus(paymentHash, 'Paid', { timeout: 30_000, interval: 500 });
}
