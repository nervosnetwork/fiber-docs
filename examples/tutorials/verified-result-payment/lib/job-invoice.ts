import type { Channel, FiberBrowserNode, SendPaymentParams } from '@fiber-pay/sdk/browser';
import { bottle, ckbToHex } from './fiber';

export async function createResultInvoice(
  solver: FiberBrowserNode,
  paymentHash: `0x${string}`,
) {
  return solver.newInvoice({
    amount: ckbToHex('1'),
    currency: 'Fibt',
    payment_hash: paymentHash,
    hash_algorithm: 'sha256',
    allow_trampoline_routing: true,
    description: 'Verified route allocation',
    expiry: '0xe10',
  });
}

function lastHopHint(channel: Channel) {
  return [{
    pubkey: bottle.pubkey,
    channel_outpoint: channel.channel_outpoint,
    fee_rate: channel.tlc_fee_proportional_millionths,
    tlc_expiry_delta: channel.tlc_expiry_delta,
  }] as unknown as NonNullable<SendPaymentParams['hop_hints']>;
}

export function placePaymentOnHold(
  customer: FiberBrowserNode,
  invoice: string,
  solverChannel: Channel,
) {
  return customer.sendPayment({
    invoice,
    hop_hints: lastHopHint(solverChannel),
    max_fee_amount: ckbToHex('1'),
    max_parts: '0x1',
  });
}
