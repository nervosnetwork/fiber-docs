import type { FiberBrowserNode, SendPaymentParams } from '@fiber-pay/sdk/browser';
import type { EncryptedOffer } from './offer';

export async function payForOffer(
  buyer: FiberBrowserNode,
  offer: EncryptedOffer,
) {
  const submitted = await buyer.sendPayment({
    invoice: offer.invoice,
    // SDK 0.3.1 declares a structured OutPoint, but fiber-js/WASM expects the
    // packed hexadecimal channel_outpoint returned by list_channels.
    hop_hints: [offer.lastHop] as unknown as NonNullable<SendPaymentParams['hop_hints']>,
    max_fee_amount: '0x5f5e100', // 1 CKB maximum fee
    max_parts: '0x1',
  });
  const result = submitted.status === 'Success' || submitted.status === 'Failed'
    ? submitted
    : await buyer.waitForPayment(submitted.payment_hash, { timeout: 60_000, interval: 1_000 });
  if (result.status !== 'Success' || !result.payment_preimage) {
    throw new Error(result.failed_error ?? 'Payment did not reveal its preimage.');
  }
  return result.payment_preimage;
}
