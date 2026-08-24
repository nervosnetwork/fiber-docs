'use client';

import { useEffect, useRef, useState } from 'react';
import type { BuildRouterResult, Channel, CkbInvoiceStatus, FiberBrowserNode } from '@fiber-pay/sdk/browser';
import { bottle, prepareChannel, startFiber } from '../lib/fiber';
import { buildHoldRoute, createHoldInvoice, payHoldInvoice, prepareReceiverInbound } from '../lib/hold';

export default function Page() {
  const sender = useRef<FiberBrowserNode | null>(null);
  const receiver = useRef<FiberBrowserNode | null>(null);
  const [status, setStatus] = useState('Start both nodes');
  const [invoice, setInvoice] = useState('');
  const [pasted, setPasted] = useState('');
  const [hash, setHash] = useState<`0x${string}` | ''>('');
  const [preimage, setPreimage] = useState<`0x${string}` | ''>('');
  const [invoiceStatus, setInvoiceStatus] = useState<CkbInvoiceStatus | 'None'>('None');
  const [paymentStatus, setPaymentStatus] = useState('Not sent');
  const [senderChannel, setSenderChannel] = useState<Channel | null>(null);
  const [receiverChannel, setReceiverChannel] = useState<Channel | null>(null);
  const [route, setRoute] = useState<BuildRouterResult | null>(null);
  const [routeStatus, setRouteStatus] = useState('Waiting for both channels');

  async function start(role: 'sender' | 'receiver') {
    const node = await startFiber(`hold-${role}-v1`);
    if (role === 'sender') sender.current = node;
    else receiver.current = node;
    setStatus(`${role === 'sender' ? 'Payer A' : 'Receiver C'} is running`);
  }

  async function prepare(role: 'sender' | 'receiver') {
    const node = role === 'sender' ? sender.current : receiver.current;
    if (!node) return;
    setStatus(`${role === 'sender' ? 'Payer A' : 'Receiver C'} is connecting and opening a channel`);
    await prepareChannel(node);
    setStatus('Wait for both channels to become CHANNEL_READY');
  }

  async function prepareInbound() {
    if (!receiver.current) return;
    setStatus('Receiver C is preparing 5 CKB of inbound liquidity');
    const result = await prepareReceiverInbound(receiver.current);
    setStatus(result.status === 'Success' ? 'Receiver C can now receive the held payment' : `Inbound preparation ${result.status}`);
    const channels = (await receiver.current.listChannels()).channels;
    setReceiverChannel(channels.find((channel) => channel.pubkey === bottle.pubkey) ?? null);
  }

  async function create() {
    if (!receiver.current) return;
    const result = await createHoldInvoice(receiver.current, '1');
    setInvoice(result.invoice_address);
    setHash(result.payment_hash);
    setPreimage(result.preimage);
    setInvoiceStatus('Open');
    setPaymentStatus('Not sent');
    await navigator.clipboard.writeText(result.invoice_address);
    setStatus('Receiver C created and copied the Hold Invoice');
  }

  async function pay() {
    if (!sender.current || !route) return;
    const result = await payHoldInvoice(sender.current, pasted, route);
    setPaymentStatus(result.status);
    setStatus('Payment submitted. Receiver C must now settle or cancel it.');
  }

  async function settle() {
    if (!receiver.current || !hash || !preimage) return;
    setStatus('Receiver C is releasing the preimage…');
    await receiver.current.settleInvoice({ payment_hash: hash, payment_preimage: preimage });
    const result = await receiver.current.waitForInvoiceStatus(hash, 'Paid', {
      timeout: 30_000,
      interval: 500,
    });
    setInvoiceStatus(result.status);
    setStatus('Receiver Invoice is Paid');
  }

  async function cancel() {
    if (!receiver.current || !hash) return;
    const result = await receiver.current.cancelInvoice({ payment_hash: hash });
    setInvoiceStatus(result.status);
    setStatus('Receiver C cancelled the held payment');
  }

  useEffect(() => {
    const refreshChannels = async () => {
      if (sender.current) {
        const channels = (await sender.current.listChannels()).channels;
        setSenderChannel(channels.find((channel) => channel.pubkey === bottle.pubkey) ?? null);
      }
      if (receiver.current) {
        const channels = (await receiver.current.listChannels()).channels;
        setReceiverChannel(channels.find((channel) => channel.pubkey === bottle.pubkey) ?? null);
      }
    };
    void refreshChannels();
    const timer = window.setInterval(() => void refreshChannels(), 5_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!hash) return;
    let checking = false;
    const check = async () => {
      if (checking) return;
      checking = true;
      try {
        if (receiver.current) {
          const result = await receiver.current.getInvoice({ payment_hash: hash });
          setInvoiceStatus(result.status);
        }
        if (sender.current) {
          try {
            const result = await sender.current.getPayment({ payment_hash: hash });
            setPaymentStatus(result.status);
          } catch {
            // The payer does not know this payment until it has been submitted.
          }
        }
      } finally {
        checking = false;
      }
    };
    void check();
    const timer = window.setInterval(() => void check(), 2_000);
    return () => window.clearInterval(timer);
  }, [hash]);

  const canDecide = invoiceStatus === 'Received';
  const payerFinished = paymentStatus === 'Success' || invoiceStatus === 'Paid';
  const payerRejected =
    paymentStatus === 'Failed' || invoiceStatus === 'Cancelled' || invoiceStatus === 'Expired';
  const paymentSubmitted = paymentStatus !== 'Not sent';
  const receiverInbound = BigInt(receiverChannel?.remote_balance ?? '0x0');
  const senderOutbound = BigInt(senderChannel?.local_balance ?? '0x0');
  const senderChannelReady = senderChannel?.state.state_name.replace(/[^a-z0-9]/gi, '').toLowerCase() === 'channelready';
  const receiverChannelReady = receiverChannel?.state.state_name.replace(/[^a-z0-9]/gi, '').toLowerCase() === 'channelready';
  const senderCanPay = senderChannelReady && senderOutbound >= BigInt('100000000');
  const receiverCanReceive = receiverChannelReady && receiverInbound >= BigInt('100000000');

  useEffect(() => {
    if (
      !sender.current ||
      !receiver.current ||
      !senderCanPay ||
      !receiverCanReceive ||
      !senderChannel?.channel_outpoint ||
      !receiverChannel?.channel_outpoint
    ) {
      setRoute(null);
      setRouteStatus('Waiting for both channels and payment liquidity');
      return;
    }

    let cancelled = false;
    let checkingRoute = false;
    const checkRoute = async () => {
      if (checkingRoute) return;
      checkingRoute = true;
      if (!cancelled) setRouteStatus('Waiting for the receiver channel announcement');
      try {
        const receiverInfo = await receiver.current!.nodeInfo();
        const built = await buildHoldRoute(
          sender.current!,
          '1',
          senderChannel.channel_outpoint!,
          receiverInfo.pubkey,
          receiverChannel.channel_outpoint!,
        );
        if (!cancelled) {
          setRoute(built);
          setRouteStatus('Route ready: Payer A → Bottle → Receiver C');
        }
      } catch {
        if (!cancelled) setRoute(null);
      } finally {
        checkingRoute = false;
      }
    };

    void checkRoute();
    const timer = window.setInterval(() => void checkRoute(), 5_000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [receiverCanReceive, receiverChannel, senderCanPay, senderChannel]);

  return <main>
    <h1>Hold Invoice</h1>
    <p className="status" aria-live="polite">{status}</p>

    <div className="grid">
      {(['sender', 'receiver'] as const).map((role) => <section className="card" key={role}>
        <span className="eyebrow">{role === 'sender' ? 'Payer A' : 'Receiver C'}</span>
        <h2>{role === 'sender' ? 'Prepare the payer' : 'Prepare the receiver'}</h2>
        <div className="row">
          <button onClick={() => void start(role)}>Start local node</button>
          <button onClick={() => void prepare(role)}>Connect &amp; open 499 CKB</button>
        </div>
        {role === 'sender' && senderChannel && <p className="liquidity">Outbound: {Number(BigInt(senderChannel.local_balance)) / 100_000_000} CKB</p>}
        {role === 'receiver' && receiverChannel && <div className="liquidity"><span>Inbound: {Number(receiverInbound) / 100_000_000} CKB</span>{receiverInbound >= BigInt('500000000') ? <strong className="liquidity-ready">✓ Inbound ready</strong> : <button disabled={!receiverChannelReady} onClick={() => void prepareInbound()}>Prepare 5 CKB inbound</button>}</div>}
      </section>)}
    </div>

    <p className="status" aria-live="polite">{routeStatus}</p>

    <div className="grid">
      <section className="card">
        <span className="eyebrow">Receiver C · Hold</span>
        <button disabled={!receiverCanReceive} onClick={() => void create()}>Create Hold Invoice &amp; copy</button>
        <textarea readOnly placeholder="Held Invoice appears here" value={invoice}/>
      </section>

      <section className="card">
        <span className="eyebrow">Payer A · Pay</span>
        <textarea
          onChange={(event) => setPasted(event.target.value)}
          placeholder="Paste the Hold Invoice"
          value={pasted}
        />
        <button disabled={!senderCanPay || !route || !pasted.trim()} onClick={() => void pay()}>{route ? 'Submit held payment' : 'Waiting for route…'}</button>
        {paymentSubmitted && <div
          className={`payer-notice ${payerFinished ? 'success' : payerRejected ? 'rejected' : ''}`}
          aria-live="polite"
        >
          <i/>
          <div>
            <strong>{payerFinished ? 'Payment completed' : payerRejected ? 'Payment not completed' : 'Waiting for Receiver C'}</strong>
            <span>{payerFinished
              ? 'Receiver C released the preimage.'
              : payerRejected
                ? 'Receiver C cancelled the Invoice or it expired.'
                : 'The payment is held until Receiver C settles or cancels it.'}</span>
          </div>
        </div>}
      </section>
    </div>

    <section className="decision">
      <div>
        <span className="eyebrow">Receiver C · Decision</span>
        <h2>{canDecide ? 'Action required' : invoiceStatus === 'Paid' ? 'Settled' : invoiceStatus === 'Cancelled' ? 'Cancelled' : 'Waiting for payment'}</h2>
        <p>{canDecide
          ? 'The payment has arrived. Complete it by releasing the preimage, or cancel it.'
          : invoiceStatus === 'Paid'
            ? 'The preimage was released and Payer A can verify success.'
            : invoiceStatus === 'Cancelled'
              ? 'The held payment was rejected and Payer A can verify the failure.'
              : 'These actions unlock when the Invoice reaches Received.'}</p>
      </div>
      <div className="decision-actions">
        <button className="settle" disabled={!canDecide} onClick={() => void settle()}>{invoiceStatus === 'Paid' ? 'Settled ✓' : 'Settle payment'}</button>
        <button className="cancel" disabled={!canDecide} onClick={() => void cancel()}>{invoiceStatus === 'Cancelled' ? 'Cancelled ✓' : 'Cancel payment'}</button>
      </div>
    </section>
  </main>;
}
