'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  Channel,
  CkbInvoiceStatus,
  SendPaymentParams,
} from '@fiber-pay/sdk/browser';
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

type TutorialVariant = 'hold-invoice' | 'verified-agent-job';
type JobStatus =
  | 'Draft'
  | 'Funded'
  | 'Running'
  | 'Submitted'
  | 'Verified'
  | 'Rejected'
  | 'Settled';
type WorkerResult = { routeA: number; routeB: number; routeC: number };
type VerificationCheck = { label: string; passed: boolean };

const validWorkerResult: WorkerResult = { routeA: 120, routeB: 100, routeC: 80 };
const faultyWorkerResult: WorkerResult = { routeA: 150, routeB: 100, routeC: 50 };

function verifyWorkerResult(result: WorkerResult): VerificationCheck[] {
  const values = [result.routeA, result.routeB, result.routeC];
  return [
    {
      label: 'Result has exactly the required JSON fields',
      passed: Object.keys(result).sort().join(',') === 'routeA,routeB,routeC',
    },
    {
      label: 'Every allocation is a non-negative integer',
      passed: values.every((value) => Number.isInteger(value) && value >= 0),
    },
    { label: 'Route A stays within 120 CKB', passed: result.routeA <= 120 },
    { label: 'Route B stays within 100 CKB', passed: result.routeB <= 100 },
    { label: 'Route C stays within 80 CKB', passed: result.routeC <= 80 },
    {
      label: 'The three parts total exactly 300 CKB',
      passed: result.routeA + result.routeB + result.routeC === 300,
    },
  ];
}

function browserLastHop(channel: Channel) {
  return [{
    pubkey: bottlePeer.pubkey,
    channel_outpoint: channel.channel_outpoint,
    fee_rate: channel.tlc_fee_proportional_millionths,
    tlc_expiry_delta: channel.tlc_expiry_delta,
  }] as unknown as NonNullable<SendPaymentParams['hop_hints']>;
}

const holdCodeFiles: RoutingCodeFile[] = [
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

export async function submitHeldPayment(node, invoice, receiverChannel) {
  return node.sendPayment({
    invoice,
    hop_hints: [lastHopHint(receiverChannel)],
    max_fee_amount: ckbToHex('1'),
    max_parts: '0x1',
  });
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

const holdSectionCode: Record<string, RoutingCodeFocus> = {
  concept: { file: 'hold', start: 7, end: 18 },
  submit: { file: 'payment', start: 3, end: 10 },
  inspect: { file: 'payment', start: 25, end: 30 },
  decide: { file: 'hold', start: 19, end: 25 },
  react: { file: 'app', start: 4, end: 23 },
};

const verifiedJobCodeFiles: RoutingCodeFile[] = [
  {
    id: 'job',
    label: 'lib/job.ts',
    language: 'typescript',
    code: `export type WorkerResult = {
  routeA: number;
  routeB: number;
  routeC: number;
};

export const job = {
  amount: 300,
  limits: { routeA: 120, routeB: 100, routeC: 80 },
};

export function verifyResult(result: WorkerResult) {
  const values = [result.routeA, result.routeB, result.routeC];
  const checks = [
    Object.keys(result).sort().join(',') === 'routeA,routeB,routeC',
    values.every(value => Number.isInteger(value) && value >= 0),
    result.routeA <= job.limits.routeA,
    result.routeB <= job.limits.routeB,
    result.routeC <= job.limits.routeC,
    result.routeA + result.routeB + result.routeC === job.amount,
  ];
  return { checks, passed: checks.every(Boolean) };
}`,
  },
  {
    id: 'verifier',
    label: 'lib/verifier.ts',
    language: 'typescript',
    code: `import type { FiberBrowserNode } from '@fiber-pay/sdk/browser';

function toHex(bytes: Uint8Array) {
  return \`0x\${Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('')}\`;
}

export async function createVerifierLock() {
  const preimage = crypto.getRandomValues(new Uint8Array(32));
  const digest = await crypto.subtle.digest('SHA-256', preimage);
  return { preimage: toHex(preimage), paymentHash: toHex(new Uint8Array(digest)) };
}

export async function releaseSettlement(
  worker: FiberBrowserNode,
  paymentHash: \`0x\${string}\`,
  preimage: \`0x\${string}\`,
) {
  await worker.settleInvoice({ payment_hash: paymentHash, payment_preimage: preimage });
  return worker.waitForInvoiceStatus(paymentHash, 'Paid', {
    timeout: 30_000,
    interval: 500,
  });
}`,
  },
  {
    id: 'invoice',
    label: 'lib/job-invoice.ts',
    language: 'typescript',
    code: `export async function createJobInvoice(worker, paymentHash) {
  return worker.newInvoice({
    amount: ckbToHex('1'),
    currency: 'Fibt',
    payment_hash: paymentHash,
    hash_algorithm: 'sha256',
    allow_trampoline_routing: true,
    description: 'Verified agent job',
    expiry: '0xe10',
  });
}

export async function fundJob(requester, invoice, receiverChannel) {
  return requester.sendPayment({
    invoice,
    hop_hints: [lastHopHint(receiverChannel)],
    max_fee_amount: ckbToHex('1'),
    max_parts: '0x1',
  });
}`,
  },
  {
    id: 'app',
    label: 'app/verified-job/page.tsx',
    language: 'tsx',
    code: `'use client';

export default function VerifiedJobPage() {
  const [jobStatus, setJobStatus] = useState('Draft');
  const [result, setResult] = useState(null);

  async function verifyAndDecide() {
    const verification = verifyResult(result);
    setJobStatus(verification.passed ? 'Verified' : 'Rejected');
    if (verification.passed) {
      await releaseSettlement(worker, paymentHash, verifierPreimage);
      setJobStatus('Settled');
    } else {
      await worker.cancelInvoice({ payment_hash: paymentHash });
    }
  }

  return <JobWorkspace status={jobStatus} onVerify={verifyAndDecide} />;
}`,
  },
];

const verifiedJobSectionCode: Record<string, RoutingCodeFocus> = {
  contract: { file: 'job', start: 1, end: 10 },
  lock: { file: 'verifier', start: 3, end: 10 },
  fund: { file: 'invoice', start: 1, end: 24 },
  execute: { file: 'job', start: 12, end: 23 },
  verify: { file: 'app', start: 6, end: 17 },
  boundary: { file: 'verifier', start: 12, end: 24 },
};

function bytesToHex(bytes: Uint8Array) {
  return `0x${Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')}` as `0x${string}`;
}

function SetupNode({
  label, receiver, runtime, stage, setStage, addEvent,
}: {
  label: string;
  receiver?: boolean;
  runtime: ReturnType<typeof useFiberRoutingNode>;
  stage: ChannelProgressStage;
  setStage: (stage: ChannelProgressStage) => void;
  addEvent: (message: string) => void;
}) {
  const channel = findReusableChannel(runtime.channels, bottlePeer.pubkey);
  const ready = isChannelReady(channel);
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
    {!receiver && ready && <div className={styles.holdInboundRow}><div><span>Payer capacity</span><strong>{hexToCkb(channel?.local_balance)} CKB outbound</strong><small>This node can fund the held payment through Bottle.</small></div></div>}
    {receiver && ready && <div className={styles.holdInboundRow}><div><span>{inboundReady ? 'Receiver capacity' : 'Next step · Receiver capacity'}</span><strong>{inboundReady ? 'Inbound liquidity is ready' : 'Prepare inbound liquidity'}</strong><small>Remote balance: {hexToCkb(inboundLiquidity)} CKB. {inboundReady ? `${label} can receive the held payment.` : `Move ${inboundSeedAmount} Testnet CKB to Bottle's side before creating the Invoice.`}</small></div>{inboundReady ? <div className={styles.holdInboundReady}>✓ Inbound ready · {hexToCkb(inboundLiquidity)} CKB</div> : <button className={styles.paymentButton} disabled={Boolean(runtime.busy)} onClick={() => void prepareInbound()}>{runtime.busy === 'prepare inbound liquidity' ? 'Preparing 5 CKB…' : `Prepare ${inboundSeedAmount} CKB inbound`}</button>}</div>}
  </div>;
}

function FiberHoldInvoiceExperience({ variant }: { variant: TutorialVariant }) {
  const verifiedJob = variant === 'verified-agent-job';
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
  const [workerMode, setWorkerMode] = useState<'valid' | 'faulty'>('valid');
  const [jobStatus, setJobStatus] = useState<JobStatus>('Draft');
  const [workerResult, setWorkerResult] = useState<WorkerResult | null>(null);
  const [verificationChecks, setVerificationChecks] = useState<VerificationCheck[]>([]);
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
  const senderConnected = sender.peers.some((key) => samePubkey(key, bottlePeer.pubkey));
  const receiverConnected = receiver.peers.some((key) => samePubkey(key, bottlePeer.pubkey));
  const routeReady = Boolean(
    senderReady &&
    receiverReady &&
    senderConnected &&
    receiverConnected &&
    receiverChannel?.channel_outpoint,
  );

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
      description: verifiedJob ? 'Verified agent job tutorial' : 'Browser hold invoice tutorial',
      expiry: '0xe10',
    }));
    if (!result) return;
    setInvoice(result.invoice_address); setPasted(''); setPaymentHash(nextHash); setPreimage(nextPreimage);
    setInvoiceStatus('Open'); setPaymentStatus('Not sent');
    setJobStatus('Draft'); setWorkerResult(null); setVerificationChecks([]);
    try { await navigator.clipboard.writeText(result.invoice_address); addEvent(verifiedJob ? 'Verifier created the lock; Worker C copied the job Invoice' : 'Node C created and copied a hold invoice'); }
    catch { addEvent('Invoice created; copy it manually'); }
  }, [addEvent, amount, receiver, verifiedJob]);

  const pay = useCallback(async () => {
    if (!routeReady || !receiverChannel) return;
    const result = await sender.run('submit held payment', (node) => node.sendPayment({
      invoice: pasted.trim(),
      hop_hints: browserLastHop(receiverChannel),
      max_fee_amount: ckbToHex('1'),
      max_parts: '0x1',
    }));
    if (!result) return;
    setPaymentStatus(result.status);
    addEvent(`${verifiedJob ? 'Requester funding' : 'Sender payment'} · ${result.status}`);
  }, [addEvent, pasted, receiverChannel, routeReady, sender, verifiedJob]);

  const settle = useCallback(async () => {
    if (!paymentHash || !preimage) return;
    addEvent(verifiedJob ? 'Verifier V is releasing the settlement key…' : 'Receiver is releasing the preimage…');
    const result = await receiver.run('settle invoice', async (node) => {
      await node.settleInvoice({ payment_hash: paymentHash, payment_preimage: preimage });
      return node.waitForInvoiceStatus(paymentHash, 'Paid', { timeout: 30_000, interval: 500 });
    });
    if (!result) {
      addEvent('Settlement did not complete; check the error below');
      return;
    }
    setInvoiceStatus(result.status);
    if (verifiedJob) setJobStatus('Settled');
    addEvent(verifiedJob ? 'Verifier released the key; Worker Invoice · Paid' : 'Receiver Invoice · Paid');
  }, [addEvent, paymentHash, preimage, receiver, verifiedJob]);
  const cancel = useCallback(async () => {
    if (!paymentHash) return;
    const result = await receiver.run('cancel invoice', (node) => node.cancelInvoice({ payment_hash: paymentHash }));
    if (result) {
      setInvoiceStatus(result.status);
      addEvent(verifiedJob ? 'Verifier rejected the result; Worker cancelled the job Invoice' : 'Receiver cancelled the held payment');
    }
  }, [addEvent, paymentHash, receiver, verifiedJob]);

  const runWorker = useCallback(async () => {
    if (invoiceStatus !== 'Received') return;
    setJobStatus('Running');
    setWorkerResult(null);
    setVerificationChecks([]);
    addEvent(`Worker C started the ${workerMode} route-planning job`);
    await new Promise((resolve) => window.setTimeout(resolve, 650));
    const result = workerMode === 'valid' ? validWorkerResult : faultyWorkerResult;
    setWorkerResult(result);
    setJobStatus('Submitted');
    addEvent('Worker C submitted a structured JSON result');
  }, [addEvent, invoiceStatus, workerMode]);

  const runVerification = useCallback(() => {
    if (!workerResult) return;
    const checks = verifyWorkerResult(workerResult);
    const passed = checks.every((check) => check.passed);
    setVerificationChecks(checks);
    setJobStatus(passed ? 'Verified' : 'Rejected');
    addEvent(passed ? 'Verifier V passed every deterministic check' : 'Verifier V rejected the result; settlement key stays hidden');
  }, [addEvent, workerResult]);

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

  useEffect(() => {
    if (!verifiedJob || invoiceStatus !== 'Received' || jobStatus !== 'Draft') return;
    setJobStatus('Funded');
  }, [invoiceStatus, jobStatus, verifiedJob]);

  const holdArticle = <>
    <header className={styles.hero} data-tutorial-section="intro"><div className={styles.eyebrow}><span>Conditional payments</span><span className={styles.eyebrowRule}/><span>20 minute tutorial</span></div><h1>Build a Conditional Payment with a Hold Invoice</h1><p className={styles.lead}>Pause an Invoice payment at the receiver, inspect its pending state, then explicitly settle or cancel it.</p><div className={styles.heroMeta}><span>Hold Invoice</span><span>Settle</span><span>Cancel</span></div></header>
    <section className={styles.section} data-tutorial-section="concept"><div className={styles.stepLabel}><span>1</span> Separate hash from preimage</div><h2>Create an Invoice that cannot settle automatically</h2><p>Node C generates the preimage locally, publishes only its SHA-256 hash in the Invoice, and keeps the preimage outside the node until a business condition is satisfied. The Invoice explicitly sets <code>hash_algorithm: &apos;sha256&apos;</code> so settlement validates the preimage with the same algorithm.</p><small className={styles.fileReference}>lib/hold-invoice.ts · lines 7–18</small></section>
    <section className={styles.section} data-tutorial-section="submit"><div className={styles.stepLabel}><span>2</span> Submit the payment</div><h2>Prepare liquidity and supply the final hop</h2><p>A newly funded receiver channel starts with its balance on Receiver C&apos;s side. Receiver C first sends a small Testnet payment to Bottle, moving 5 CKB to the remote side. Payer A then submits the Invoice with a private last-hop hint for Bottle → C.</p><div className={styles.note}><strong>Channel Ready is not Payment Ready</strong><p>The Live Demo checks both channel liquidity and peer connections. Its last-hop hint removes the need to wait for the receiver channel to propagate through public gossip.</p></div><small className={styles.fileReference}>lib/payment.ts · lines 3–25</small></section>
    <section className={styles.section} data-tutorial-section="inspect"><div className={styles.stepLabel}><span>3</span> Observe the hold</div><h2>Poll both sides without blocking the UI</h2><p>Node C progresses from <code>Open</code> to <code>Received</code>, while Node A stays <code>Inflight</code>. This is the decision window.</p><small className={styles.fileReference}>lib/payment.ts · lines 27–32</small></section>
    <section className={styles.section} data-tutorial-section="decide"><div className={styles.stepLabel}><span>4</span> Decide</div><h2>Settle with the preimage or cancel</h2><p>Settle releases the secret and completes the payment atomically. Cancel rejects the held Invoice and releases its pending liquidity.</p><small className={styles.fileReference}>lib/hold-invoice.ts · lines 19–25</small></section>
    <section className={styles.section} data-tutorial-section="react"><div className={styles.stepLabel}><span>5</span> Wire React</div><h2>Expose the pending state as an explicit action</h2><p>The interface enables Settle and Cancel only after the receiver reports <code>Received</code>, preventing an accidental early decision.</p><small className={styles.fileReference}>app/hold/page.tsx · lines 4–23</small></section>
  </>;

  const verifiedJobArticle = <>
    <header className={styles.hero} data-tutorial-section="intro"><div className={styles.eyebrow}><span>Agent commerce</span><span className={styles.eyebrowRule}/><span>25 minute tutorial</span></div><h1>Settle a Verified Agent Job</h1><p className={styles.lead}>Fund an AI Worker with a real Fiber Hold Invoice, verify its structured result, and reveal the settlement key only after every rule passes.</p><div className={styles.heroMeta}><span>Agent job</span><span>Verifier</span><span>Conditional settlement</span></div></header>
    <section className={styles.section} data-tutorial-section="contract"><div className={styles.stepLabel}><span>1</span> Define a verifiable job</div><h2>Turn an open-ended request into deterministic checks</h2><p>The Requester asks a Worker to allocate 300 CKB across three routes. Each route has a hard capacity, the result has an exact JSON shape, and the allocations must total 300. These rules make acceptance reproducible.</p><small className={styles.fileReference}>lib/job.ts · lines 1–10</small></section>
    <section className={styles.section} data-tutorial-section="lock"><div className={styles.stepLabel}><span>2</span> Create the settlement lock</div><h2>Let the Verifier control the secret</h2><p>Verifier V generates a random preimage <code>K</code> and publishes only <code>SHA256(K)</code>. Worker C creates a Hold Invoice using that hash, so neither the Worker nor the Fiber node can settle before the Verifier releases <code>K</code>.</p><div className={styles.note}><strong>Who is the Verifier?</strong><p>In this tutorial it is transparent deterministic code running in your browser. In production it can be a TEE-attested service, an optimistic committee, a zk-proof verifier, or a domain-specific oracle.</p></div><small className={styles.fileReference}>lib/verifier.ts · lines 3–10</small></section>
    <section className={styles.section} data-tutorial-section="fund"><div className={styles.stepLabel}><span>3</span> Fund without settling</div><h2>Lock the Requester payment in flight</h2><p>Requester A pays the job Invoice through Bottle. Worker C reports <code>Received</code>, while the Requester payment remains <code>Inflight</code>. The funds are committed, but the Worker cannot collect them yet.</p><small className={styles.fileReference}>lib/job-invoice.ts · lines 1–24</small></section>
    <section className={styles.section} data-tutorial-section="execute"><div className={styles.stepLabel}><span>4</span> Execute the job</div><h2>Submit a machine-checkable result</h2><p>Choose the valid or faulty Worker path. Both return plausible JSON and both total 300 CKB, but the faulty result exceeds Route A&apos;s capacity. This demonstrates why verification must inspect constraints, not only totals.</p><small className={styles.fileReference}>lib/job.ts · lines 12–23</small></section>
    <section className={styles.section} data-tutorial-section="verify"><div className={styles.stepLabel}><span>5</span> Verify and decide</div><h2>Map the verdict to one settlement action</h2><p>If every check passes, Verifier V reveals <code>K</code> and Worker C settles the Invoice. If any check fails, the key remains hidden and the tutorial cancels the Invoice, returning the held liquidity.</p><small className={styles.fileReference}>app/verified-job/page.tsx · lines 6–17</small></section>
    <section className={styles.section} data-tutorial-section="boundary"><div className={styles.stepLabel}><span>6</span> Choose a trust model</div><h2>Keep payment atomic; make verification explicit</h2><p>Fiber guarantees that a valid preimage settles the held payment. It does not decide whether an AI result is correct. Your application must define who runs the Verifier, how evidence is authenticated, and how timeouts or disputes are handled.</p><div className={styles.note}><strong>Production boundary</strong><p>Do not keep the settlement key in frontend state for a real marketplace. Put it behind the chosen verifier&apos;s authenticated release policy and persist the job state server-side.</p></div><small className={styles.fileReference}>lib/verifier.ts · lines 12–24</small></section>
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
  const senderLabel = verifiedJob ? 'Requester A' : 'Payer A';
  const receiverLabel = verifiedJob ? 'Worker C' : 'Receiver C';
  const decisionReady = verifiedJob ? jobStatus === 'Verified' : canDecide;
  const rejectionReady = verifiedJob ? jobStatus === 'Rejected' : canDecide;
  const liveDemo = <>
    <div className={styles.panelHeader}><span><i className={styles.liveDot}/> {verifiedJob ? 'Verified Agent Job · Testnet' : 'Conditional Testnet flow'}</span><button className={styles.headerAction} onClick={() => { void sender.refresh(); void receiver.refresh(); }}>Refresh both</button></div>
    <div className={`${styles.previewStage} ${styles.paymentPreviewStage}`}>
      <div className={styles.paymentCard}>
        <div className={styles.routeStatusGrid}><div><span>{senderLabel}</span><strong>{sender.nodeState}</strong></div><div><span>{receiverLabel}</span><strong>{receiver.nodeState}</strong></div><div><span>Invoice</span><strong>{invoiceStatus}</strong></div><div><span>{verifiedJob ? 'Job' : 'Payment'}</span><strong>{verifiedJob ? jobStatus : paymentStatus}</strong></div></div>
        <SetupNode addEvent={addEvent} label={senderLabel} runtime={sender} setStage={setSenderStage} stage={senderStage}/>
        <SetupNode addEvent={addEvent} label={receiverLabel} receiver runtime={receiver} setStage={setReceiverStage} stage={receiverStage}/>
        {(senderReady && receiverReady) && <div className={`${styles.holdRouteRow} ${routeReady ? styles.holdRouteReady : ''}`} aria-live="polite"><div><span>Private last hop</span><strong>{routeReady ? 'Payment route ready' : 'Reconnect the selected peers'}</strong><small>{routeReady ? `${senderLabel} can route through Bottle to ${receiverLabel} with the receiver channel hint.` : 'Both channels have liquidity. Refresh or restart the nodes to reconnect them to Bottle.'}</small></div><div className={styles.holdRouteBadge}>{routeReady ? '✓ A → Bottle → C' : 'Waiting for peers'}</div></div>}
        {verifiedJob && <div className={styles.jobContract}>
          <div className={styles.jobContractHeader}><div><span>Job contract · Route allocation</span><strong>Allocate exactly 300 CKB</strong></div><code>deterministic-v1</code></div>
          <div className={styles.jobLimits}><div><span>Route A</span><strong>≤ 120</strong></div><div><span>Route B</span><strong>≤ 100</strong></div><div><span>Route C</span><strong>≤ 80</strong></div><div><span>Required total</span><strong>= 300</strong></div></div>
        </div>}
        <div className={styles.invoiceTransfer}><div className={styles.invoiceSide}><span>{receiverLabel} · {verifiedJob ? 'Job Invoice' : 'Hold'}</span><label><input disabled={!receiverReady} inputMode="decimal" onChange={(e) => setAmount(e.target.value)} value={amount}/><i>CKB</i></label><button disabled={!receiverReady || Boolean(receiver.busy)} onClick={() => void createInvoice()}>{receiver.busy === 'create hold invoice' ? 'Creating…' : verifiedJob ? 'Create locked job Invoice' : 'Create hold invoice & copy'}</button><textarea readOnly placeholder="Held Invoice appears here" value={invoice}/></div><div className={styles.invoiceTransferArrow}><span>Copy</span><b>→</b><span>Fund</span></div><div className={styles.invoiceSide}><span>{senderLabel} · {verifiedJob ? 'Fund' : 'Pay'}</span><textarea onChange={(e) => setPasted(e.target.value)} placeholder="Paste the hold Invoice" value={pasted}/><button disabled={!invoice} onClick={async () => { try { setPasted((await navigator.clipboard.readText()).trim()); } catch { /* manual paste remains available */ } }}>Paste from clipboard</button><button className={styles.paymentButton} disabled={!senderReady || !routeReady || !pasted.trim() || Boolean(sender.busy)} onClick={() => void pay()}>{sender.busy === 'submit held payment' ? 'Submitting…' : !routeReady ? 'Waiting for route…' : verifiedJob ? 'Fund agent job' : 'Submit held payment'}</button>{paymentStatus !== 'Not sent' && <div aria-live="polite" className={`${styles.holdPayerStatus} ${payerFinished ? styles.holdPayerSuccess : payerRejected ? styles.holdPayerRejected : ''}`}><i/><div><strong>{payerFinished ? 'Payment completed' : payerRejected ? 'Payment not completed' : verifiedJob ? 'Funding locked' : `Waiting for ${receiverLabel}`}</strong><span>{payerFinished ? `${receiverLabel} received the settlement preimage.` : payerRejected ? 'The Invoice was cancelled or expired.' : verifiedJob ? 'The Hold Invoice is waiting for a Verifier verdict.' : `Your payment is held. ${receiverLabel} must settle or cancel it.`}</span></div></div>}</div></div>
        {verifiedJob && <div className={styles.jobWorkspace}>
          <div className={styles.jobPanel}><div className={styles.jobPanelHeader}><div><span>Worker C · Execution</span><strong>{jobStatus === 'Running' ? 'Computing…' : workerResult ? 'Result submitted' : 'Awaiting funded job'}</strong></div><div className={styles.jobModeSelector}><button aria-pressed={workerMode === 'valid'} disabled={jobStatus === 'Running'} onClick={() => setWorkerMode('valid')}>Valid result</button><button aria-pressed={workerMode === 'faulty'} disabled={jobStatus === 'Running'} onClick={() => setWorkerMode('faulty')}>Faulty result</button></div></div><button className={styles.jobPrimaryAction} disabled={!canDecide || jobStatus === 'Running' || jobStatus === 'Settled'} onClick={() => void runWorker()}>{jobStatus === 'Running' ? 'Running Worker…' : 'Run Worker C'}</button><pre className={styles.jobResult}>{workerResult ? JSON.stringify(workerResult, null, 2) : '// Worker result will appear here'}</pre></div>
          <div className={styles.jobPanel}><div className={styles.jobPanelHeader}><div><span>Verifier V · Deterministic checks</span><strong>{jobStatus === 'Verified' ? 'Passed' : jobStatus === 'Rejected' ? 'Rejected' : 'Not evaluated'}</strong></div><code>K: {jobStatus === 'Verified' || jobStatus === 'Settled' ? `${preimage.slice(0, 12)}…` : 'hidden'}</code></div><button className={styles.jobPrimaryAction} disabled={jobStatus !== 'Submitted'} onClick={runVerification}>Run verification</button><div className={styles.jobChecks}>{verificationChecks.length ? verificationChecks.map((check) => <div className={check.passed ? styles.jobCheckPassed : styles.jobCheckFailed} key={check.label}><i>{check.passed ? '✓' : '×'}</i><span>{check.label}</span></div>) : <p>Checks unlock after Worker C submits a result.</p>}</div></div>
        </div>}
        <div className={styles.holdDecisionPanel}>
          <div><span>{verifiedJob ? 'Verifier V · Settlement policy' : `${receiverLabel} · Decision`}</span><strong>{verifiedJob ? jobStatus : receiverDecision}</strong><p>{verifiedJob ? jobStatus === 'Verified' ? 'Every rule passed. The settlement key can now be released to Worker C.' : jobStatus === 'Rejected' ? 'At least one rule failed. The key remains hidden; cancel the held Invoice.' : invoiceStatus === 'Paid' ? 'Worker C settled the verified job atomically.' : invoiceStatus === 'Cancelled' ? 'The rejected job was cancelled and held liquidity was released.' : 'Fund the Invoice, run the Worker, then execute the deterministic Verifier.' : canDecide ? 'The payment has arrived. Release the preimage to complete it, or cancel and return the pending liquidity.' : invoiceStatus === 'Paid' ? `The preimage was released and ${senderLabel} can verify success.` : invoiceStatus === 'Cancelled' ? `The held payment was rejected and ${senderLabel} can verify the failure.` : 'These actions unlock when the Invoice reaches Received.'}</p></div>
          <div className={styles.holdDecisionActions}><button className={styles.holdSettleButton} disabled={!decisionReady || Boolean(receiver.busy)} onClick={() => void settle()}>{receiver.busy === 'settle invoice' ? 'Settling…' : invoiceStatus === 'Paid' ? 'Settled ✓' : verifiedJob ? 'Release key & settle' : 'Settle payment'}</button><button className={styles.holdCancelButton} disabled={!rejectionReady || Boolean(receiver.busy)} onClick={() => void cancel()}>{receiver.busy === 'cancel invoice' ? 'Cancelling…' : invoiceStatus === 'Cancelled' ? 'Cancelled ✓' : verifiedJob ? 'Reject & cancel' : 'Cancel payment'}</button></div>
        </div>
        {(sender.error || receiver.error) && <div className={styles.paymentError}>{sender.error || receiver.error}</div>}
      </div>
      <div className={styles.eventPanel}><div className={styles.eventPanelHeader}><span>{verifiedJob ? 'Job, verification, and settlement events' : 'Hold events and results'}</span><i className={styles.liveDot}/></div><div aria-live="polite" className={styles.eventList}>{events.map((event, index) => <div key={`${event}-${index}`}><time>{String(index + 1).padStart(2, '0')}</time><code>{verifiedJob ? 'job' : 'hold'}</code><span>{event}</span></div>)}</div></div>
    </div>
  </>;

  return <RoutingTutorialFrame
    article={verifiedJob ? verifiedJobArticle : holdArticle}
    codeFiles={verifiedJob ? verifiedJobCodeFiles : holdCodeFiles}
    currentTutorialIndex={verifiedJob ? 6 : 4}
    defaultFile={verifiedJob ? 'job' : 'hold'}
    demoDescription={verifiedJob ? 'Fund a real Hold Invoice, verify the Worker result, then release or withhold the settlement key.' : 'Create a real Hold Invoice, observe the pending receiver state, then settle or cancel it.'}
    demoTitle={verifiedJob ? 'Run the Verified Agent Job' : 'Run the Hold Invoice Demo'}
    downloadHref={verifiedJob ? '/downloads/fiber-verified-agent-job.zip' : '/downloads/fiber-hold-invoice.zip'}
    liveDemo={liveDemo}
    nextHref={verifiedJob ? '/docs/build/rusd-payment' : '/docs/build/encrypted-data-payment'}
    previousHref={verifiedJob ? '/docs/build/encrypted-data-payment' : '/docs/build/unidirectional-channel'}
    sectionCode={verifiedJob ? verifiedJobSectionCode : holdSectionCode}
  />;
}

export function FiberHoldInvoiceTutorial() {
  return <FiberHoldInvoiceExperience variant="hold-invoice"/>;
}

export function FiberVerifiedAgentJobTutorial() {
  return <FiberHoldInvoiceExperience variant="verified-agent-job"/>;
}
