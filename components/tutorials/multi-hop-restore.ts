import type { FiberBrowserNode } from '@fiber-pay/sdk/browser';

type Payer = Pick<FiberBrowserNode, 'sendPayment' | 'getPayment'>;
type Payee = Pick<FiberBrowserNode, 'newInvoice' | 'getInvoice'>;
export type LiquidityReturn = {
  hash: `0x${string}`;
  invoice: string;
  amount: string;
  phase: 'pending' | 'failed' | 'success';
  detail?: string;
};

// A separate payment identity keeps recovery independent of the tutorial receipt.
export function createLiquidityRestore(options: {
  payer: Payer;
  payee: Payee;
  bottle: `0x${string}`;
  key: string;
  storage: Pick<Storage, 'getItem' | 'setItem'>;
  readLiquidity: () => Promise<[bigint | undefined, bigint | undefined]>;
  onChange: (record: LiquidityReturn) => void;
}) {
  const saved = options.storage.getItem(options.key);
  let record: LiquidityReturn | null = saved ? JSON.parse(saved) : null;
  if (record && (!/^0x[0-9a-f]+$/i.test(record.hash) || typeof record.invoice !== 'string'
    || typeof record.amount !== 'string' || !['pending', 'failed', 'success'].includes(record.phase))) {
    throw new Error('Unable to read the saved return payment. Keep this node profile and check its payment history before sending again.');
  }
  let sending = false;
  let checking = false;
  let disposed = false;
  const save = (next: LiquidityReturn, newAttempt = false) => {
    if (!newAttempt) {
      const current = options.storage.getItem(options.key);
      const persisted: LiquidityReturn | null = current ? JSON.parse(current) : null;
      // A disposed controller's delayed RPC must not replace a newer return or
      // downgrade a terminal result already observed by its replacement.
      if (!persisted || persisted.hash !== next.hash
        || (persisted.phase !== 'pending' && next.phase === 'pending')
        || (persisted.phase === 'success' && next.phase !== 'success')) return;
    }
    // Persist before notifying React, and especially before submitting any funds.
    options.storage.setItem(options.key, JSON.stringify(next));
    record = next;
    if (!disposed) options.onChange(next);
  };
  const check = async () => {
    if (!record || record.phase !== 'pending' || checking) return;
    checking = true;
    const attempt = record;
    try {
      const [payment, invoice] = await Promise.all([
        options.payer.getPayment({ payment_hash: attempt.hash }),
        options.payee.getInvoice({ payment_hash: attempt.hash }),
      ]);
      // A newer controller may have reconciled this payment and started another.
      const latest = options.storage.getItem(options.key);
      if (record !== attempt || !latest || JSON.parse(latest).hash !== attempt.hash) return;
      if (payment.status === 'Success' && invoice.status === 'Paid') {
        save({ ...attempt, phase: 'success', detail: undefined });
      } else if (payment.status === 'Failed' && invoice.status !== 'Paid') {
        save({ ...attempt, phase: 'failed', detail: payment.failed_error || 'The return payment failed. Check the channels and try again.' });
      }
    } catch {
      // A read failure cannot establish whether a submitted payment settled.
    } finally {
      checking = false;
    }
  };
  return {
    current: () => record,
    dispose: () => { disposed = true; },
    check,
    async send(amount: string) {
      if (disposed || sending || record?.phase === 'pending') return;
      sending = true;
      try {
        if (!/^\d+(\.\d{1,8})?$/.test(amount.trim())) throw new Error('Enter a positive return amount with up to 8 decimal places.');
        const [whole, fraction = ''] = amount.trim().split('.');
        const shannons = BigInt(whole) * 100_000_000n + BigInt(fraction.padEnd(8, '0'));
        if (shannons <= 0n) throw new Error('Enter a positive return amount.');
        const [outbound, inbound] = await options.readLiquidity();
        if (disposed) return;
        if (outbound === undefined || inbound === undefined) throw new Error('Wait for both channels’ liquidity before sending back to A.');
        const maximum = outbound - 100_000_000n < inbound ? outbound - 100_000_000n : inbound;
        if (maximum <= 0n) throw new Error('The reverse route has insufficient liquidity for a return payment and the 1 CKB routing-fee allowance.');
        if (shannons > maximum) {
          const fraction = (maximum % 100_000_000n).toString().padStart(8, '0').replace(/0+$/, '');
          throw new Error(`Return no more than ${maximum / 100_000_000n}${fraction ? `.${fraction}` : ''} CKB with the current liquidity.`);
        }
        const invoice = await options.payee.newInvoice({
          amount: `0x${shannons.toString(16)}`, currency: 'Fibt', expiry: '0xe10',
          description: 'Restore multi-hop tutorial receiving liquidity', allow_trampoline_routing: true,
        });
        if (disposed) return;
        const attempt: LiquidityReturn = { hash: invoice.invoice.data.payment_hash, invoice: invoice.invoice_address, amount: amount.trim(), phase: 'pending' };
        save(attempt, true);
        try {
          const payment = await options.payer.sendPayment({ invoice: attempt.invoice, trampoline_hops: [options.bottle], max_fee_amount: '0x5f5e100' });
          if (payment.status === 'Failed') save({ ...attempt, phase: 'failed', detail: payment.failed_error || 'The return payment failed.' });
        } catch (error) {
          // Retain the identity even if the submission response was lost. Never
          // automatically resend: subsequent checks reconcile this same hash.
          const detail = error instanceof Error ? error.message : String(error);
          // Fiber's explicit route-building rejection occurs before any TLC is sent.
          const rejected = /Send payment error: Failed to build route/i.test(detail);
          save({ ...attempt, phase: rejected ? 'failed' : 'pending', detail });
        }
        await check();
      } finally {
        sending = false;
      }
    },
  };
}
