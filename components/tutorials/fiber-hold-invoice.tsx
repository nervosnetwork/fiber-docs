'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CkbInvoiceStatus } from '@fiber-pay/sdk/browser';
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
  shorten,
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
    payment_hash: toHex(hash), allow_trampoline_routing: true,
    description: 'Browser hold invoice', expiry: '0xe10',
  });
  return { ...result, paymentPreimage: toHex(preimage) };
}

export async function settleHoldInvoice(node: FiberBrowserNode, hash: \`0x\${string}\`, preimage: \`0x\${string}\`) {
  await node.settleInvoice({ payment_hash: hash, payment_preimage: preimage });
}

export async function cancelHoldInvoice(node: FiberBrowserNode, hash: \`0x\${string}\`) {
  return node.cancelInvoice({ payment_hash: hash });
}`,
  },
  {
    id: 'payment', label: 'lib/payment.ts', language: 'typescript',
    code: `export async function submitHeldPayment(node, invoice) {
  return node.sendPayment({
    invoice,
    trampoline_hops: [bottle.pubkey],
    max_fee_amount: ckbToHex('1'),
  });
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
    await settleHoldInvoice(receiver, paymentHash, paymentPreimage);
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
  concept: { file: 'hold', start: 7, end: 17 },
  submit: { file: 'payment', start: 1, end: 7 },
  inspect: { file: 'payment', start: 9, end: 15 },
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
  useEffect(() => { if (channel) setStage(progressFromChannelState(channel)); }, [channel, setStage]);
  return <div className={styles.multiHopNodeSetup}>
    <div className={styles.paymentFlow}>
      <div className={styles.paymentFlowNumber}>{label.slice(-1)}</div>
      <div><strong>{label}</strong><span>{runtime.address ? `${hexToCkb(runtime.balance)} CKB · ${shorten(runtime.address, 12, 9)}` : 'Start a separate browser identity.'}</span></div>
      <div className={styles.compactActions}>
        <button className={styles.startButton} disabled={Boolean(runtime.nodeInfo) || Boolean(runtime.busy)} onClick={runtime.start}>{runtime.busy === 'start' ? 'Starting…' : 'Start'}</button>
        <button className={styles.connectButton} disabled={!runtime.nodeInfo || !funded || Boolean(channel) || Boolean(runtime.busy)} onClick={() => void open()}>{ready ? 'Ready' : stage === 'connecting' ? 'Connecting…' : stage === 'submitting' ? 'Opening…' : stage === 'confirming' ? 'Confirming…' : 'Connect & open'}</button>
      </div>
    </div>
    {runtime.address && <div className={styles.rebalanceAddress}><code title={runtime.address}>{runtime.address}</code><button onClick={() => void navigator.clipboard.writeText(runtime.address)}>Copy</button><a className={styles.faucetButton} href="https://faucet.nervos.org" rel="noreferrer" target="_blank">Faucet ↗</a></div>}
    <ChannelProgress label={`${label} channel progress`} stage={stage} />
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
  const checking = useRef(false);
  const addEvent = useCallback((message: string) => setEvents((items) => [...items.slice(-10), message]), []);
  const senderReady = isChannelReady(findReusableChannel(sender.channels, bottlePeer.pubkey));
  const receiverReady = isChannelReady(findReusableChannel(receiver.channels, bottlePeer.pubkey));

  const createInvoice = useCallback(async () => {
    const node = receiver.nodeRef.current;
    if (!node) return;
    const rawPreimage = crypto.getRandomValues(new Uint8Array(32));
    const rawHash = new Uint8Array(await crypto.subtle.digest('SHA-256', rawPreimage));
    const nextPreimage = bytesToHex(rawPreimage);
    const nextHash = bytesToHex(rawHash);
    const result = await receiver.run('create hold invoice', (current) => current.newInvoice({
      amount: ckbToHex(amount), currency: 'Fibt', payment_hash: nextHash,
      description: 'Browser hold invoice tutorial', expiry: '0xe10', allow_trampoline_routing: true,
    }));
    if (!result) return;
    setInvoice(result.invoice_address); setPasted(''); setPaymentHash(nextHash); setPreimage(nextPreimage);
    setInvoiceStatus('Open'); setPaymentStatus('Not sent');
    try { await navigator.clipboard.writeText(result.invoice_address); addEvent('Node C created and copied a hold invoice'); }
    catch { addEvent('Invoice created; copy it manually'); }
  }, [addEvent, amount, receiver]);

  const pay = useCallback(async () => {
    const result = await sender.run('submit held payment', (node) => node.sendPayment({
      invoice: pasted.trim(), trampoline_hops: [bottlePeer.pubkey], max_fee_amount: ckbToHex('1'),
    }));
    if (!result) return;
    setPaymentStatus(result.status); addEvent(`Sender payment · ${result.status}`);
  }, [addEvent, pasted, sender]);

  const settle = useCallback(async () => {
    if (!paymentHash || !preimage) return;
    const result = await receiver.run('settle invoice', (node) => node.settleInvoice({ payment_hash: paymentHash, payment_preimage: preimage }));
    if (result !== undefined) addEvent('Receiver released the preimage');
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

  const article = <>
    <header className={styles.hero} data-tutorial-section="intro"><div className={styles.eyebrow}><span>Conditional payments</span><span className={styles.eyebrowRule}/><span>30 minute tutorial</span></div><h1>Build a Conditional Payment with a Hold Invoice</h1><p className={styles.lead}>Pause an Invoice payment at the receiver, inspect its pending state, then explicitly settle or cancel it.</p><div className={styles.heroMeta}><span>Hold Invoice</span><span>Conditional</span><span>Multi-hop</span></div></header>
    <section className={styles.section} data-tutorial-section="concept"><div className={styles.stepLabel}><span>1</span> Separate hash from preimage</div><h2>Create an Invoice that cannot settle automatically</h2><p>Node C generates the preimage locally, publishes only its SHA-256 hash in the Invoice, and keeps the preimage outside the node until a business condition is satisfied.</p><small className={styles.fileReference}>lib/hold-invoice.ts · lines 7–17</small></section>
    <section className={styles.section} data-tutorial-section="submit"><div className={styles.stepLabel}><span>2</span> Submit the payment</div><h2>Let the payment reach the receiver</h2><p>Node A pays through Bottle. The final TLC arrives at Node C, but no preimage is released, so the payment remains pending instead of completing immediately.</p><small className={styles.fileReference}>lib/payment.ts · lines 1–7</small></section>
    <section className={styles.section} data-tutorial-section="inspect"><div className={styles.stepLabel}><span>3</span> Observe the hold</div><h2>Poll both sides without blocking the UI</h2><p>Node C progresses from <code>Open</code> to <code>Received</code>, while Node A stays <code>Inflight</code>. This is the decision window.</p><small className={styles.fileReference}>lib/payment.ts · lines 9–15</small></section>
    <section className={styles.section} data-tutorial-section="decide"><div className={styles.stepLabel}><span>4</span> Decide</div><h2>Settle with the preimage or cancel</h2><p>Settle releases the secret and completes the payment atomically. Cancel rejects the held Invoice and returns the locked liquidity to the route.</p><small className={styles.fileReference}>lib/hold-invoice.ts · lines 19–25</small></section>
    <section className={styles.section} data-tutorial-section="react"><div className={styles.stepLabel}><span>5</span> Wire React</div><h2>Expose the pending state as an explicit action</h2><p>The interface enables Settle and Cancel only after the receiver reports <code>Received</code>, preventing an accidental early decision.</p><small className={styles.fileReference}>app/hold/page.tsx · lines 4–23</small></section>
  </>;

  const canDecide = invoiceStatus === 'Received';
  const liveDemo = <><div className={styles.panelHeader}><span><i className={styles.liveDot}/> Conditional Testnet flow</span><button className={styles.headerAction} onClick={() => { void sender.refresh(); void receiver.refresh(); }}>Refresh both</button></div><div className={`${styles.previewStage} ${styles.paymentPreviewStage}`}><div className={styles.paymentCard}>
    <div className={styles.routeStatusGrid}><div><span>Node A</span><strong>{sender.nodeState}</strong></div><div><span>Node C</span><strong>{receiver.nodeState}</strong></div><div><span>Invoice</span><strong>{invoiceStatus}</strong></div><div><span>Payment</span><strong>{paymentStatus}</strong></div></div>
    <div className={styles.routeDiagram}><b>Node A</b><i>→</i><span>Bottle · public node</span><i>→</i><b>Node C</b></div>
    <SetupNode addEvent={addEvent} label="Node A" runtime={sender} setStage={setSenderStage} stage={senderStage}/>
    <SetupNode addEvent={addEvent} label="Node C" runtime={receiver} setStage={setReceiverStage} stage={receiverStage}/>
    <div className={styles.invoiceTransfer}><div className={styles.invoiceSide}><span>Node C · Hold</span><label><input disabled={!receiverReady} inputMode="decimal" onChange={(e) => setAmount(e.target.value)} value={amount}/><i>CKB</i></label><button disabled={!receiverReady || Boolean(receiver.busy)} onClick={() => void createInvoice()}>{receiver.busy === 'create hold invoice' ? 'Creating…' : 'Create hold invoice & copy'}</button><textarea readOnly placeholder="Held Invoice appears here" value={invoice}/><div className={styles.compactActions}><button disabled={!canDecide || Boolean(receiver.busy)} onClick={() => void settle()}>Settle</button><button disabled={!canDecide || Boolean(receiver.busy)} onClick={() => void cancel()}>Cancel</button></div></div><div className={styles.invoiceTransferArrow}><span>Copy</span><b>→</b><span>Paste</span></div><div className={styles.invoiceSide}><span>Node A · Pay</span><textarea onChange={(e) => setPasted(e.target.value)} placeholder="Paste the hold Invoice" value={pasted}/><button disabled={!invoice} onClick={async () => { try { setPasted((await navigator.clipboard.readText()).trim()); } catch { /* manual paste remains available */ } }}>Paste from clipboard</button><button className={styles.paymentButton} disabled={!senderReady || !pasted.trim() || Boolean(sender.busy)} onClick={() => void pay()}>{sender.busy === 'submit held payment' ? 'Submitting…' : 'Submit held payment'}</button></div></div>
    {(sender.error || receiver.error) && <div className={styles.paymentError}>{sender.error || receiver.error}</div>}
  </div><div className={styles.eventPanel}><div className={styles.eventPanelHeader}><span>Hold events and results</span><i className={styles.liveDot}/></div><div className={styles.eventList}>{events.map((event, index) => <div key={`${event}-${index}`}><time>{String(index + 1).padStart(2, '0')}</time><code>hold</code><span>{event}</span></div>)}</div></div></div></>;

  return <RoutingTutorialFrame article={article} codeFiles={codeFiles} currentTutorialIndex={4} defaultFile="hold" demoDescription="Create a real hold Invoice, pay it through Bottle, then settle or cancel from the receiver." demoTitle="Run the Hold Invoice Demo" downloadHref="/downloads/fiber-hold-invoice.zip" liveDemo={liveDemo} nextHref="/docs/build/streaming-payments" previousHref="/docs/build/unidirectional-channel" sectionCode={sectionCode}/>;
}
