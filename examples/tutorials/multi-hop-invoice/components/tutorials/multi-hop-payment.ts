import type { FiberBrowserNode, CkbInvoiceStatus } from '@fiber-pay/sdk/browser';

export type ForwardPayment = {
  hash: `0x${string}`;
  invoice: string;
  amount: string;
  submitted: boolean;
  status: string;
  invoiceStatus: CkbInvoiceStatus;
  detail: string;
  attempt: string;
  route?: string[];
  fee?: `0x${string}`;
};
const pending = (record: ForwardPayment) => record.submitted && record.status !== 'Failed'
  && !(record.status === 'Success' && record.invoiceStatus === 'Paid');

// Store the payment identity before submission. Recovery only reads that identity.
export function createForwardPayment(options: {
  payer: Pick<FiberBrowserNode, 'sendPayment' | 'getPayment'>;
  payee: Pick<FiberBrowserNode, 'getInvoice'>;
  bottle: `0x${string}`;
  key: string;
  storage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
  onChange: (record: ForwardPayment | null) => void;
}) {
  const read = (): ForwardPayment | null => {
    try {
      const raw = options.storage.getItem(options.key);
      if (!raw) return null;
      const value = JSON.parse(raw);
      if (!value || !/^0x[0-9a-f]+$/i.test(value.hash) || typeof value.invoice !== 'string'
        || !value.invoice || typeof value.amount !== 'string' || !/^\d+(\.\d{1,8})?$/.test(value.amount)
        || typeof value.submitted !== 'boolean' || typeof value.attempt !== 'string'
        || !['Not sent','Sending','Created','Inflight','Success','Failed'].includes(value.status)
        || !['Open','Received','Paid','Cancelled','Expired'].includes(value.invoiceStatus)
        || typeof value.detail !== 'string'
        || (value.fee !== undefined && (typeof value.fee !== 'string' || !/^0x[0-9a-f]+$/i.test(value.fee)))
        || (value.route !== undefined && (!Array.isArray(value.route) || !value.route.every((hop: unknown) => typeof hop === 'string')))) throw Error();
      return value;
    } catch {
      throw Error('Unable to read the saved payment. Keep this node profile and check its payment history before sending again.');
    }
  };
  let record = read();
  let disposed = false;
  let sending = false;
  let checking = false;
  const save = (next: ForwardPayment, replace = false) => {
    if (!replace) {
      const latest = read();
      if (!latest || latest.attempt !== next.attempt
        || (latest.status === 'Success' && next.status !== 'Success')
        || (latest.status === 'Failed' && !['Success','Failed'].includes(next.status))) return;
      next.fee ??= latest.fee;
      if (latest.invoiceStatus === 'Paid') next = { ...next, invoiceStatus: 'Paid' };
    }
    options.storage.setItem(options.key, JSON.stringify(next));
    record = next;
    if (!disposed) options.onChange(next);
  };
  const check = async () => {
    if (disposed || checking || !record) return;
    checking = true;
    const attempt = record;
    try {
      const [invoice, payment] = await Promise.allSettled([
        options.payee.getInvoice({ payment_hash: attempt.hash }),
        attempt.submitted ? options.payer.getPayment({ payment_hash: attempt.hash }) : Promise.resolve(null),
      ]);
      if (disposed || record !== attempt) return;
      const result = payment.status === 'fulfilled' ? payment.value : null;
      save({ ...attempt,
        invoiceStatus: invoice.status === 'fulfilled' ? invoice.value.status : attempt.invoiceStatus,
        status: result?.status ?? attempt.status,
        fee: result?.status === 'Success' ? result.fee ?? attempt.fee : attempt.fee,
        route: result?.routers?.[0]?.nodes.map(node => node.pubkey) ?? attempt.route,
        detail: result ? result.failed_error || '' : attempt.detail,
      });
    } finally { checking = false; }
  };
  return {
    current: () => record,
    dispose: () => { disposed = true; },
    check,
    setInvoice(invoice: Pick<ForwardPayment, 'hash' | 'invoice' | 'amount'>) {
      if (disposed || sending || (record && pending(record))) throw Error('A payment is pending. Check it before creating another invoice.');
      save({ ...invoice, amount: invoice.amount.trim(), submitted: false, status: 'Not sent', invoiceStatus: 'Open', detail: '', attempt: crypto.randomUUID() }, true);
    },
    clear() {
      if (disposed || sending || (record && pending(record))) throw Error('A payment is pending. Check its status before starting again.');
      options.storage.removeItem(options.key); record = null; options.onChange(null);
    },
    async send() {
      if (disposed || sending || !record || record.submitted || record.invoiceStatus !== 'Open') return;
      sending = true;
      try {
        const attempt = { ...record, submitted: true, status: 'Sending', detail: '', attempt: crypto.randomUUID() };
        save(attempt, true);
        try {
          const result = await options.payer.sendPayment({ invoice: attempt.invoice, trampoline_hops: [options.bottle], max_fee_amount: '0x5f5e100' });
          save({ ...attempt, status: result.status, fee: result.status === 'Success' ? result.fee : undefined, detail: result.failed_error || '', route: result.routers?.[0]?.nodes.map(node => node.pubkey) ?? attempt.route });
        } catch (error) {
          const detail = error instanceof Error ? error.message : String(error);
          save({ ...attempt, status: /Send payment error: Failed to build route/i.test(detail) ? 'Failed' : 'Sending', detail });
        }
      } finally { sending = false; }
    },
  };
}
