'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { CkbInvoiceStatus, FiberBrowserNode } from '@fiber-pay/sdk/browser';
import {
  type RoutingCodeFile,
  type RoutingCodeFocus,
  RoutingTutorialFrame,
} from './routing-tutorial-frame';
import {
  bottlePeer,
  ckbToHex,
  findReusableChannel,
  hexToCkb,
  samePubkey,
  useFiberRoutingNode,
} from './fiber-routing-runtime';
import {
  ChannelProgress,
  type ChannelProgressStage,
  isChannelReady,
  progressFromChannelState,
} from './fiber-tutorial-utils';
import styles from './fiber-wasm-quickstart.module.css';

const channelAmount = '499';
const inboundSeedAmount = '5';

type PaymentRoute = Awaited<ReturnType<FiberBrowserNode['buildRouter']>>['router_hops'];

function outpointKey(outpoint: { tx_hash: string; index: string } | null | undefined) {
  return outpoint ? `${outpoint.tx_hash}:${outpoint.index}` : '';
}

const codeFiles: RoutingCodeFile[] = [
  {
    id: 'hold', label: 'lib/hold-invoice.ts', language: 'typescript',
    code: `import type { FiberBrowserNode } from '@fiber-pay/sdk/browser';

function toHex(bytes: Uint8Array) {
  return \`0x\${Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('')}\`;
}

export async function createHoldInvoice(node: FiberBrowserNode, amount: string) {
  const preimage = crypto.getRandomValues(new Uint8Array(32));
  const hash = new Uint8Array(await crypto.subtle.digest('SHA-256', preimage));
  const result = await node.newInvoice({
    amount: ckbToHex(amount), currency: 'Fibt',
    payment_hash: toHex(hash),
    hash_algorithm: 'sha256',
    allow_trampoline_routing: true,
    description: 'Browser hold invoice', expiry: '0xe10',
  });
  return { ...result, paymentPreimage: toHex(preimage) };
}

export async function settleHoldInvoice(node: FiberBrowserNode, hash: \`0x\${string}\`, preimage: \`0x\${string}\`) {
  await node.settleInvoice({ payment_hash: hash, payment_preimage: preimage });
  return node.waitForInvoiceStatus(hash, 'Paid', { timeout: 30_000, interval: 500 });
}

export async function cancelHoldInvoice(node: FiberBrowserNode, hash: \`0x\${string}\`) {
  return node.cancelInvoice({ payment_hash: hash });
}`,
  },
  {
    id: 'payment', label: 'lib/payment.ts', language: 'typescript',
    code: `import { bottlePeer } from './fiber';

export async function buildHoldRoute(node, amount, payerChannelOutpoint, receiverPubkey, receiverChannelOutpoint) {
  return node.buildRouter({
    amount: ckbToHex(amount),
    hops_info: [
      { pubkey: bottlePeer.pubkey, channel_outpoint: payerChannelOutpoint },
      { pubkey: receiverPubkey, channel_outpoint: receiverChannelOutpoint },
    ],
  });
}

export async function submitHeldPayment(node, invoice, route) {
  return node.sendPaymentWithRouter({ invoice, router: route.router_hops });
}

export async function prepareReceiverInbound(node) {
  const submitted = await node.sendPayment({
    target_pubkey: bottlePeer.pubkey,
    amount: ckbToHex('${inboundSeedAmount}'),
    keysend: true,
  });
  if (submitted.status === 'Success' || submitted.status === 'Failed') return submitted;
  return node.waitForPayment(submitted.payment_hash, { timeout: 60_000, interval: 1_000 });
}

export async function readHeldPayment(node, paymentHash) {
  return node.getPayment({ payment_hash: paymentHash });
}

// Do not waitForPayment before the receiver settles or cancels.
// Poll both the sender payment and receiver invoice instead.`,
  },
  {
    id: 'app', label: 'app/hold/page.tsx', language: 'tsx',
    code: `'use client';

export default function HoldInvoicePage() {
  const [invoiceStatus, setInvoiceStatus] = useState('None');
  const [paymentStatus, setPaymentStatus] = useState('Not sent');

  async function pay() {
    const submitted = await submitHeldPayment(sender, pastedInvoice);
    setPaymentStatus(submitted.status); // normally Inflight
  }

  async function settle() {
    const result = await settleHoldInvoice(receiver, paymentHash, paymentPreimage);
    setInvoiceStatus(result.status);
  }

  async function cancel() {
    await cancelHoldInvoice(receiver, paymentHash);
  }

  useEffect(() => pollInvoiceAndPayment(), [paymentHash]);
  return <HoldInvoiceControls onPay={pay} onSettle={settle} onCancel={cancel} />;
}`,
  },
];

const sectionCode: Record<string, RoutingCodeFocus> = {
  concept: { file: 'hold', start: 7, end: 18 },
  submit: { file: 'payment', start: 3, end: 25 },
  inspect: { file: 'payment', start: 27, end: 32 },
  decide: { file: 'hold', start: 19, end: 25 },
  react: { file: 'app', start: 4, end: 23 },
};

function bytesToHex(bytes: Uint8Array) {
  return `0x${Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')}` as `0x${string}`;
}

function SetupNode({
  label, runtime, stage, setStage, addEvent,
}: {
  label: string;
  runtime: ReturnType<typeof useFiberRoutingNode>;
  stage: ChannelProgressStage;
  setStage: (stage: ChannelProgressStage) => void;
  addEvent: (message: string) => void;
}) {
  const channel = findReusableChannel(runtime.channels, bottlePeer.pubkey);
  const ready = isChannelReady(channel);
  const receiver = label === 'Receiver C';
  const inboundLiquidity = channel ? BigInt(channel.remote_balance) : 0n;
  const inboundReady = inboundLiquidity >= BigInt(ckbToHex(inboundSeedAmount));
  const funded = (runtime.balance ?? 0n) >= BigInt(ckbToHex(channelAmount));
  const open = async () => {
    const node = runtime.nodeRef.current;
    if (!node) return;
    setStage('connecting');
    const connected = runtime.peers.some((key) => samePubkey(key, bottlePeer.pubkey)) || await runtime.connect(bottlePeer);
    if (!connected) return setStage('error');
    const existing = findReusableChannel((await node.listChannels()).channels, bottlePeer.pubkey);
    if (existing) {
      setStage(progressFromChannelState(existing));
      addEvent(`${label} reused ${existing.state.state_name}`);
      return void runtime.refresh();
    }
    setStage('submitting');
    const result = await runtime.run('open channel', (current) => current.openChannel({
      pubkey: bottlePeer.pubkey, funding_amount: ckbToHex(channelAmount), public: true,
    }));
    if (!result) return setStage('error');
    setStage('confirming');
    addEvent(`${label} funding submitted`);
    await runtime.refresh();
  };
  const prepareInbound = async () => {
    const result = await runtime.run('prepare inbound liquidity', async (node) => {
      const submitted = await node.sendPayment({
        target_pubkey: bottlePeer.pubkey,
        amount: ckbToHex(inboundSeedAmount),
        keysend: true,
      });
      if (submitted.status === 'Success' || submitted.status === 'Failed') return submitted;
      return node.waitForPayment(submitted.payment_hash, { timeout: 60_000, interval: 1_000 });
    });
    if (!result) return;
    if (result.status === 'Success') addEvent(`${label} prepared ${inboundSeedAmount} CKB inbound liquidity`);
    await runtime.refresh();
  };
  useEffect(() => { if (channel) setStage(progressFromChannelState(channel)); }, [channel, setStage]);
  return <div className={styles.multiHopNodeSetup}>
    <div className={styles.paymentFlow}>
      <div className={styles.paymentFlowNumber}>{label.slice(-1)}</div>
      <div><strong>{label}</strong><span>{runtime.address ? channel ? `${hexToCkb(channel.local_balance)} CKB local · ${hexToCkb(channel.remote_balance)} CKB remote` : `${hexToCkb(runtime.balance)} CKB on-chain · opens a ${channelAmount} CKB channel` : 'Start a separate browser identity.'}</span></div>
      <div className={styles.compactActions}>
        <button className={styles.startButton} disabled={Boolean(runtime.nodeInfo) || Boolean(runtime.busy)} onClick={runtime.start}>{runtime.busy === 'start' ? 'Starting node…' : 'Start local node'}</button>
        <button className={styles.connectButton} disabled={!runtime.nodeInfo || !funded || Boolean(channel) || Boolean(runtime.busy)} onClick={() => void open()}>{ready ? 'Channel ready' : stage === 'connecting' ? 'Connecting…' : stage === 'submitting' ? 'Opening…' : stage === 'confirming' ? 'Confirming…' : `Connect & open ${channelAmount} CKB`}</button>
      </div>
    </div>
    {runtime.address && <div className={styles.rebalanceAddress}><code title={runtime.address}>{runtime.address}</code><button onClick={() => void navigator.clipboard.writeText(runtime.address)}>Copy</button><a className={styles.faucetButton} href="https://faucet.nervos.org" rel="noreferrer" target="_blank">Faucet ↗</a></div>}
    <ChannelProgress label={`${label} channel progress`} stage={stage} />
    {!receiver && ready && <div className={styles.holdInboundRow}><div><span>Payer capacity</span><strong>{hexToCkb(channel?.local_balance)} CKB outbound</strong><small>This is the balance Payer A can send through the channel.</small></div></div>}
    {receiver && ready && <div className={styles.holdInboundRow}><div><span>{inboundReady ? 'Receiver capacity' : 'Next step · Receiver capacity'}</span><strong>{inboundReady ? 'Inbound liquidity is ready' : 'Prepare inbound liquidity'}</strong><small>Remote balance: {hexToCkb(inboundLiquidity)} CKB. {inboundReady ? 'Receiver C can create and receive the held payment.' : `Move ${inboundSeedAmount} Testnet CKB to Bottle's side before creating the Invoice.`}</small></div>{inboundReady ? <div className={styles.holdInboundReady}>✓ Inbound ready · {hexToCkb(inboundLiquidity)} CKB</div> : <button className={styles.paymentButton} disabled={Boolean(runtime.busy)} onClick={() => void prepareInbound()}>{runtime.busy === 'prepare inbound liquidity' ? 'Preparing 5 CKB…' : `Prepare ${inboundSeedAmount} CKB inbound`}</button>}</div>}
  </div>;
}

export function FiberHoldInvoiceTutorial() {
  const sender = useFiberRoutingNode('fiber-docs:multi-hop-sender-v1');
  const receiver = useFiberRoutingNode('fiber-docs:multi-hop-receiver-v1');
  const [senderStage, setSenderStage] = useState<ChannelProgressStage>('idle');
  const [receiverStage, setReceiverStage] = useState<ChannelProgressStage>('idle');
  const [amount, setAmount] = useState('1');
  const [invoice, setInvoice] = useState('');
  const [pasted, setPasted] = useState('');
  const [paymentHash, setPaymentHash] = useState<`0x${string}` | ''>('');
  const [preimage, setPreimage] = useState<`0x${string}` | ''>('');
  const [invoiceStatus, setInvoiceStatus] = useState<CkbInvoiceStatus | 'None'>('None');
  const [paymentStatus, setPaymentStatus] = useState('Not sent');
  const [events, setEvents] = useState<string[]>([]);
  const [routePlan, setRoutePlan] = useState<{ key: string; hops: PaymentRoute } | null>(null);
  const [routeState, setRouteState] = useState<'idle' | 'checking' | 'ready'>('idle');
  const checking = useRef(false);
  const loggedPaymentResult = useRef('');
  const addEvent = useCallback((message: string) => setEvents((items) => [...items.slice(-10), message]), []);
  const senderChannel = findReusableChannel(sender.channels, bottlePeer.pubkey);
  const receiverChannel = findReusableChannel(receiver.channels, bottlePeer.pubkey);
  const paymentAmount = (() => {
    try { return BigInt(ckbToHex(amount)); }
    catch { return 0n; }
  })();
  const senderReady = isChannelReady(senderChannel) && BigInt(senderChannel?.local_balance ?? '0x0') >= paymentAmount;
  const receiverReady = isChannelReady(receiverChannel) && BigInt(receiverChannel?.remote_balance ?? '0x0') >= paymentAmount;
  const senderOutpointKey = outpointKey(senderChannel?.channel_outpoint);
  const receiverOutpointKey = outpointKey(receiverChannel?.channel_outpoint);
  const receiverPubkey = receiver.nodeInfo?.pubkey ?? '';
  const routeKey = `${paymentAmount}:${senderOutpointKey}:${receiverOutpointKey}:${receiverPubkey}`;
  const routeReady = routePlan?.key === routeKey;

  useEffect(() => {
    const node = sender.nodeRef.current;
    const senderOutpoint = senderChannel?.channel_outpoint;
    const receiverOutpoint = receiverChannel?.channel_outpoint;
    if (!node || !senderReady || !receiverReady || !receiverPubkey || !senderOutpoint || !receiverOutpoint) {
      setRoutePlan(null);
      setRouteState('idle');
      return;
    }

    let cancelled = false;
    let checkingRoute = false;
    const checkRoute = async () => {
      if (checkingRoute) return;
      checkingRoute = true;
      if (!cancelled) setRouteState('checking');
      try {
        const built = await node.buildRouter({
          amount: ckbToHex(amount),
          hops_info: [
            { pubkey: bottlePeer.pubkey, channel_outpoint: senderOutpoint },
            { pubkey: receiverPubkey, channel_outpoint: receiverOutpoint },
          ],
        });
        if (!cancelled) {
          setRoutePlan({ key: routeKey, hops: built.router_hops });
          setRouteState('ready');
        }
      } catch {
        if (!cancelled) {
          setRoutePlan(null);
          setRouteState('checking');
        }
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
  }, [amount, receiverOutpointKey, receiverPubkey, receiverReady, routeKey, senderOutpointKey, senderReady, sender.nodeRef]);

  const createInvoice = useCallback(async () => {
    const node = receiver.nodeRef.current;
    if (!node) return;
    const rawPreimage = crypto.getRandomValues(new Uint8Array(32));
    const rawHash = new Uint8Array(await crypto.subtle.digest('SHA-256', rawPreimage));
    const nextPreimage = bytesToHex(rawPreimage);
    const nextHash = bytesToHex(rawHash);
    const result = await receiver.run('create hold invoice', (current) => current.newInvoice({
      amount: ckbToHex(amount), currency: 'Fibt', payment_hash: nextHash,
      hash_algorithm: 'sha256',
      allow_trampoline_routing: true,
      description: 'Browser hold invoice tutorial', expiry: '0xe10',
    }));
    if (!result) return;
    setInvoice(result.invoice_address); setPasted(''); setPaymentHash(nextHash); setPreimage(nextPreimage);
    setInvoiceStatus('Open'); setPaymentStatus('Not sent');
    try { await navigator.clipboard.writeText(result.invoice_address); addEvent('Node C created and copied a hold invoice'); }
    catch { addEvent('Invoice created; copy it manually'); }
  }, [addEvent, amount, receiver]);

  const pay = useCallback(async () => {
    if (!routeReady || !routePlan) return;
    const result = await sender.run('submit held payment', (node) => node.sendPaymentWithRouter({
      invoice: pasted.trim(),
      router: routePlan.hops,
    }));
    if (!result) return;
    setPaymentStatus(result.status); addEvent(`Sender payment · ${result.status}`);
  }, [addEvent, pasted, routePlan, routeReady, sender]);

  const settle = useCallback(async () => {
    if (!paymentHash || !preimage) return;
    addEvent('Receiver is releasing the preimage…');
    const result = await receiver.run('settle invoice', async (node) => {
      await node.settleInvoice({ payment_hash: paymentHash, payment_preimage: preimage });
      return node.waitForInvoiceStatus(paymentHash, 'Paid', { timeout: 30_000, interval: 500 });
    });
    if (!result) {
      addEvent('Settlement did not complete; check the error below');
      return;
    }
    setInvoiceStatus(result.status);
    addEvent('Receiver Invoice · Paid');
  }, [addEvent, paymentHash, preimage, receiver]);
  const cancel = useCallback(async () => {
    if (!paymentHash) return;
    const result = await receiver.run('cancel invoice', (node) => node.cancelInvoice({ payment_hash: paymentHash }));
    if (result) { setInvoiceStatus(result.status); addEvent('Receiver cancelled the held payment'); }
  }, [addEvent, paymentHash, receiver]);

  useEffect(() => {
    if (!paymentHash) return;
    const check = async () => {
      if (checking.current) return; checking.current = true;
      try {
        if (receiver.nodeRef.current) setInvoiceStatus((await receiver.nodeRef.current.getInvoice({ payment_hash: paymentHash })).status);
        if (sender.nodeRef.current) setPaymentStatus((await sender.nodeRef.current.getPayment({ payment_hash: paymentHash })).status);
      } catch { /* The sender may not know the payment until it is submitted. */ }
      finally { checking.current = false; }
    };
    void check(); const timer = window.setInterval(() => void check(), 2_000);
    return () => window.clearInterval(timer);
  }, [paymentHash, receiver.nodeRef, sender.nodeRef]);

  useEffect(() => {
    if (paymentStatus !== 'Success' && paymentStatus !== 'Failed') return;
    if (loggedPaymentResult.current === paymentStatus) return;
    loggedPaymentResult.current = paymentStatus;
    addEvent(`Payer payment · ${paymentStatus}`);
  }, [addEvent, paymentStatus]);

  const article = <>
    <header className={styles.hero} data-tutorial-section="intro"><div className={styles.eyebrow}><span>Conditional payments</span><span className={styles.eyebrowRule}/><span>20 minute tutorial</span></div><h1>Build a Conditional Payment with a Hold Invoice</h1><p className={styles.lead}>Pause an Invoice payment at the receiver, inspect its pending state, then explicitly settle or cancel it.</p><div className={styles.heroMeta}><span>Hold Invoice</span><span>Settle</span><span>Cancel</span></div></header>
    <section className={styles.section} data-tutorial-section="concept"><div className={styles.stepLabel}><span>1</span> Separate hash from preimage</div><h2>Create an Invoice that cannot settle automatically</h2><p>Node C generates the preimage locally, publishes only its SHA-256 hash in the Invoice, and keeps the preimage outside the node until a business condition is satisfied. The Invoice explicitly sets <code>hash_algorithm: &apos;sha256&apos;</code> so settlement validates the preimage with the same algorithm.</p><small className={styles.fileReference}>lib/hold-invoice.ts · lines 7–18</small></section>
    <section className={styles.section} data-tutorial-section="submit"><div className={styles.stepLabel}><span>2</span> Submit the payment</div><h2>Prepare liquidity and verify the route</h2><p>A newly funded receiver channel starts with its balance on Receiver C&apos;s side. Receiver C first sends a small Testnet payment to Bottle, moving 5 CKB to the remote side. Payer A then waits until the public channel announcement is visible and builds the exact A → Bottle → C route before submitting the Invoice.</p><div className={styles.note}><strong>Channel Ready is not Route Ready</strong><p>The Live Demo checks channel liquidity and calls <code>buildRouter()</code> every five seconds. Payment stays disabled until the complete route can be built.</p></div><small className={styles.fileReference}>lib/payment.ts · lines 3–25</small></section>
    <section className={styles.section} data-tutorial-section="inspect"><div className={styles.stepLabel}><span>3</span> Observe the hold</div><h2>Poll both sides without blocking the UI</h2><p>Node C progresses from <code>Open</code> to <code>Received</code>, while Node A stays <code>Inflight</code>. This is the decision window.</p><small className={styles.fileReference}>lib/payment.ts · lines 27–32</small></section>
    <section className={styles.section} data-tutorial-section="decide"><div className={styles.stepLabel}><span>4</span> Decide</div><h2>Settle with the preimage or cancel</h2><p>Settle releases the secret and completes the payment atomically. Cancel rejects the held Invoice and releases its pending liquidity.</p><small className={styles.fileReference}>lib/hold-invoice.ts · lines 19–25</small></section>
    <section className={styles.section} data-tutorial-section="react"><div className={styles.stepLabel}><span>5</span> Wire React</div><h2>Expose the pending state as an explicit action</h2><p>The interface enables Settle and Cancel only after the receiver reports <code>Received</code>, preventing an accidental early decision.</p><small className={styles.fileReference}>app/hold/page.tsx · lines 4–23</small></section>
  </>;

  const canDecide = invoiceStatus === 'Received';
  const payerFinished = paymentStatus === 'Success' || invoiceStatus === 'Paid';
  const payerRejected =
    paymentStatus === 'Failed' ||
    invoiceStatus === 'Cancelled' ||
    invoiceStatus === 'Expired';
  const receiverDecision = canDecide
    ? 'Action required'
    : invoiceStatus === 'Paid'
      ? 'Settled'
      : invoiceStatus === 'Cancelled'
        ? 'Cancelled'
        : 'Waiting for payment';
  const liveDemo = <><div className={styles.panelHeader}><span><i className={styles.liveDot}/> Conditional Testnet flow</span><button className={styles.headerAction} onClick={() => { void sender.refresh(); void receiver.refresh(); }}>Refresh both</button></div><div className={`${styles.previewStage} ${styles.paymentPreviewStage}`}><div className={styles.paymentCard}>
    <div className={styles.routeStatusGrid}><div><span>Payer A</span><strong>{sender.nodeState}</strong></div><div><span>Receiver C</span><strong>{receiver.nodeState}</strong></div><div><span>Invoice</span><strong>{invoiceStatus}</strong></div><div><span>Payment</span><strong>{paymentStatus}</strong></div></div>
    <SetupNode addEvent={addEvent} label="Payer A" runtime={sender} setStage={setSenderStage} stage={senderStage}/>
    <SetupNode addEvent={addEvent} label="Receiver C" runtime={receiver} setStage={setReceiverStage} stage={receiverStage}/>
    {(senderReady && receiverReady) && <div className={`${styles.holdRouteRow} ${routeReady ? styles.holdRouteReady : ''}`} aria-live="polite"><div><span>Payment route</span><strong>{routeReady ? 'Route ready' : 'Waiting for route announcement'}</strong><small>{routeReady ? 'Payer A verified A → Bottle → Receiver C with the two selected channels.' : 'Both channels are ready. Payer A is learning Receiver C’s public channel and retries every 5 seconds.'}</small></div><div className={styles.holdRouteBadge}>{routeReady ? '✓ A → Bottle → C' : routeState === 'checking' ? 'Checking route…' : 'Waiting for channels'}</div></div>}
    <div className={styles.invoiceTransfer}><div className={styles.invoiceSide}><span>Receiver C · Hold</span><label><input disabled={!receiverReady} inputMode="decimal" onChange={(e) => setAmount(e.target.value)} value={amount}/><i>CKB</i></label><button disabled={!receiverReady || Boolean(receiver.busy)} onClick={() => void createInvoice()}>{receiver.busy === 'create hold invoice' ? 'Creating…' : 'Create hold invoice & copy'}</button><textarea readOnly placeholder="Held Invoice appears here" value={invoice}/></div><div className={styles.invoiceTransferArrow}><span>Copy</span><b>→</b><span>Paste</span></div><div className={styles.invoiceSide}><span>Payer A · Pay</span><textarea onChange={(e) => setPasted(e.target.value)} placeholder="Paste the hold Invoice" value={pasted}/><button disabled={!invoice} onClick={async () => { try { setPasted((await navigator.clipboard.readText()).trim()); } catch { /* manual paste remains available */ } }}>Paste from clipboard</button><button className={styles.paymentButton} disabled={!senderReady || !routeReady || !pasted.trim() || Boolean(sender.busy)} onClick={() => void pay()}>{sender.busy === 'submit held payment' ? 'Submitting…' : !routeReady ? 'Waiting for route…' : 'Submit held payment'}</button>{paymentStatus !== 'Not sent' && <div aria-live="polite" className={`${styles.holdPayerStatus} ${payerFinished ? styles.holdPayerSuccess : payerRejected ? styles.holdPayerRejected : ''}`}><i/><div><strong>{payerFinished ? 'Payment completed' : payerRejected ? 'Payment not completed' : 'Waiting for Receiver C'}</strong><span>{payerFinished ? 'Receiver C released the preimage.' : payerRejected ? 'Receiver C cancelled the Invoice or it expired.' : 'Your payment is held. Receiver C must settle or cancel it.'}</span></div></div>}</div></div>
    <div className={styles.holdDecisionPanel}>
      <div><span>Receiver C · Decision</span><strong>{receiverDecision}</strong><p>{canDecide ? 'The payment has arrived. Release the preimage to complete it, or cancel and return the pending liquidity.' : invoiceStatus === 'Paid' ? 'The preimage was released and Payer A can verify success.' : invoiceStatus === 'Cancelled' ? 'The held payment was rejected and Payer A can verify the failure.' : 'These actions unlock when the Invoice reaches Received.'}</p></div>
      <div className={styles.holdDecisionActions}><button className={styles.holdSettleButton} disabled={!canDecide || Boolean(receiver.busy)} onClick={() => void settle()}>{receiver.busy === 'settle invoice' ? 'Settling…' : invoiceStatus === 'Paid' ? 'Settled ✓' : 'Settle payment'}</button><button className={styles.holdCancelButton} disabled={!canDecide || Boolean(receiver.busy)} onClick={() => void cancel()}>{receiver.busy === 'cancel invoice' ? 'Cancelling…' : invoiceStatus === 'Cancelled' ? 'Cancelled ✓' : 'Cancel payment'}</button></div>
    </div>
    {(sender.error || receiver.error) && <div className={styles.paymentError}>{sender.error || receiver.error}</div>}
  </div><div className={styles.eventPanel}><div className={styles.eventPanelHeader}><span>Hold events and results</span><i className={styles.liveDot}/></div><div aria-live="polite" className={styles.eventList}>{events.map((event, index) => <div key={`${event}-${index}`}><time>{String(index + 1).padStart(2, '0')}</time><code>hold</code><span>{event}</span></div>)}</div></div></div></>;

  return <RoutingTutorialFrame article={article} codeFiles={codeFiles} currentTutorialIndex={4} defaultFile="hold" demoDescription="Create a real Hold Invoice, observe the pending receiver state, then settle or cancel it." demoTitle="Run the Hold Invoice Demo" downloadHref="/downloads/fiber-hold-invoice.zip" liveDemo={liveDemo} nextHref="/docs/build/rusd-payment" previousHref="/docs/build/unidirectional-channel" sectionCode={sectionCode}/>;
}
