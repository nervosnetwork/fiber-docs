export function channelStateLabel(state?: string) {
  if (!state) return 'Not opened';
  return state.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toUpperCase();
}

const channelOpeningStates = [
  'NEGOTIATING_FUNDING',
  'COLLABORATING_FUNDING_TX',
  'SIGNING_COMMITMENT',
  'AWAITING_TX_SIGNATURES',
  'AWAITING_CHANNEL_READY',
  'CHANNEL_READY',
];

export function channelOpeningProgress(currentState?: string) {
  const current = channelOpeningStates.indexOf(channelStateLabel(currentState));
  return channelOpeningStates.map((state, index) => ({
    state,
    status: current === channelOpeningStates.length - 1 || index < current ? 'complete'
      : index === current ? 'current' : 'upcoming',
  }));
}

export function isMultiHopChannelReady(state: string) {
  return state.replace(/[^a-z0-9]/gi, '').toLowerCase() === 'channelready';
}

export function multiHopStep(state: {
  setupReady: boolean;
  hasInvoice: boolean;
  paymentStatus: string;
  invoiceStatus: string;
  paymentSubmitted: boolean;
}): number {
  if (state.paymentSubmitted || multiHopPaymentOutcome(state.paymentStatus, state.invoiceStatus) === 'success') return 3;
  if (state.hasInvoice) return 2;
  return state.setupReady ? 1 : 0;
}

export function multiHopPaymentOutcome(paymentStatus: string, invoiceStatus: string) {
  if (paymentStatus === 'Success' && invoiceStatus === 'Paid') return 'success';
  if (paymentStatus === 'Failed') return 'failed';
  return 'pending';
}

export function availableChannelBalance(balance: string | undefined, pending: string | undefined) {
  if (balance === undefined || pending === undefined) return undefined;
  const available = BigInt(balance) - BigInt(pending);
  return available > 0n ? available : 0n;
}

export function maximumInvoiceAmount(
  senderAvailable: string | bigint | undefined,
  receiverAvailable: string | bigint | undefined,
) {
  if (senderAvailable === undefined || receiverAvailable === undefined) return undefined;
  const senderMaximum = BigInt(senderAvailable) - 100_000_000n;
  const inboundMaximum = BigInt(receiverAvailable);
  const maximum = senderMaximum < inboundMaximum ? senderMaximum : inboundMaximum;
  return maximum > 0n ? maximum : 0n;
}

export function invoiceAmountError(
  amount: string,
  senderAvailable: string | bigint | undefined,
  receiverAvailable: string | bigint | undefined,
) {
  if (senderAvailable !== undefined && BigInt(senderAvailable) <= 0n) {
    return 'Sender A has no remaining liquidity to send payments to Bottle B. Replenish liquidity before creating another invoice.';
  }
  if (receiverAvailable !== undefined && BigInt(receiverAvailable) <= 0n) {
    return 'Bottle B has no remaining liquidity to forward payments to Receiver C. Replenish receiving liquidity before creating another invoice.';
  }
  if (senderAvailable !== undefined && BigInt(senderAvailable) <= 100_000_000n) {
    return 'Sender A has insufficient liquidity to send a payment to Bottle B while reserving 1 CKB for routing fees.';
  }
  const maximum = maximumInvoiceAmount(senderAvailable, receiverAvailable);
  if (maximum === undefined) return 'Wait for both channels’ liquidity to be available before creating an invoice.';
  const value = amount.trim();
  const invalidAmount = 'Enter a positive amount with up to 8 decimal places.';
  if (!/^\d+(\.\d{1,8})?$/.test(value)) return invalidAmount;
  const [whole, fraction = ''] = value.split('.');
  const shannons = BigInt(whole) * 100_000_000n + BigInt(fraction.padEnd(8, '0'));
  if (shannons <= 0n) return invalidAmount;
  if (shannons > maximum) {
    const decimals = (maximum % 100_000_000n).toString().padStart(8, '0').replace(/0+$/, '');
    const formattedMaximum = `${maximum / 100_000_000n}${decimals ? `.${decimals}` : ''}`;
    return `Enter no more than ${formattedMaximum} CKB. This limit accounts for both channels and leaves 1 CKB on Sender A’s side for routing fees.`;
  }
  return '';
}

export function paymentErrorDetail(error: unknown): string {
  if (error == null) return '';
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  try { return JSON.stringify(error) ?? String(error); } catch { return String(error); }
}

export function paymentFailureMessage(error: string) {
  const liquidity = error.match(/max outbound liquidity\s+(\d+)/i);
  if (liquidity) {
    const shannons = BigInt(liquidity[1]);
    const fraction = (shannons % 100_000_000n).toString().padStart(8, '0').replace(/0+$/, '');
    const available = `${shannons / 100_000_000n}${fraction ? `.${fraction}` : ''}`;
    return `Sender A's channel has ${available} CKB available to send. The payment amount plus routing fees must fit within this available liquidity. Create a smaller invoice and try again.`;
  }
  if (/insufficient.*(balance|liquidity)/i.test(error)) {
    return 'There is not enough available channel liquidity along this route. Create a smaller invoice or add liquidity before trying again.';
  }
  if (/expired|cancelled/i.test(error)) return 'This invoice is no longer payable. Create another invoice to continue.';
  if (/failed to build route|no route|path finding/i.test(error)) {
    return 'A payment route could not be found. Check that both channels are ready and have enough liquidity, then try again.';
  }
  return 'The payment could not be completed. Check the node connections and channel balances, then try again.';
}
