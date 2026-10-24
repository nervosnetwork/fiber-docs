'use client';

import Image from 'next/image';
import { type ReactNode, useCallback, useEffect, useRef, useState } from 'react';
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
import { ExplainedTerm } from './explained-term';
import {
  appendObservedChannelState,
  channelActionState,
  groupVerificationChecks,
  paymentDecision,
  peerConnectionRecoveryMessage,
  paymentRecoveryState,
  paymentReceipt,
  participantStatusLabel,
  prepareSetupRolesInOrder,
  nextObservedChannelState,
  rolesToPrepare,
  resultStatusLabel,
  selectReviewStep,
  selectVerificationSample,
  setupActionLabels,
  setupChannelActionRequirement,
  setupDisclosureRole,
  setupInboundActionRequirement,
  setupParticipantLocks,
  setupParticipantState,
  setupParticipantSummary,
  shouldPollPaymentSession,
  type ResultStatus as JobStatus,
  type SetupRole,
  type TutorialVariant,
  tutorialNodeConfiguration,
  type VerificationSampleId,
  verificationSimulationNotice,
  verificationSamples,
  verifiedResultStep,
} from '../../examples/tutorials/verified-result-payment/lib/job';

const channelAmount = '499';
const inboundSeedAmount = '5';

type AllocationResult = { routeA: number; routeB: number; routeC: number };
type VerificationCheck = { label: string; passed: boolean };

const verifiedResultSteps = ['Set up', 'Hold payment', 'Verify result', 'Outcome'];

function SetupActionHint({
  children,
  id,
  label,
  reason,
}: {
  children: ReactNode;
  id: string;
  label: string;
  reason: string | null;
}) {
  if (!reason) return <>{children}</>;
  return <ExplainedTerm ariaLabel={label} className={styles.disabledActionHint} explanation={reason} id={id}>{children}</ExplainedTerm>;
}

function verifyAllocationResult(result: AllocationResult): VerificationCheck[] {
  return [
    {
      label: 'Result has exactly the required JSON fields',
      passed: Object.keys(result).sort().join(',') === 'routeA,routeB,routeC',
    },
    { label: 'Route A stays within 120 CKB', passed: result.routeA <= 120 },
    { label: 'Route B stays within 100 CKB', passed: result.routeB <= 100 },
    { label: 'Route C stays within 80 CKB', passed: result.routeC <= 80 },
    {
      label: 'The allocations total exactly 300 CKB',
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

const verifiedResultCodeFiles: RoutingCodeFile[] = [
  {
    id: 'job',
    label: 'lib/job.ts',
    language: 'typescript',
    code: `export type AllocationResult = {
  routeA: number;
  routeB: number;
  routeC: number;
};

export const job = {
  amount: 300,
  limits: { routeA: 120, routeB: 100, routeC: 80 },
};

export const verificationSamples = [
  { id: 'within-limits', result: { routeA: 120, routeB: 100, routeC: 80 } },
  { id: 'over-route-a', result: { routeA: 150, routeB: 100, routeC: 50 } },
];

export function verifyResult(result: AllocationResult) {
  return [
    { label: 'Exact result shape', passed: Object.keys(result).sort().join(',') === 'routeA,routeB,routeC' },
    { label: 'Route A within 120', passed: result.routeA <= job.limits.routeA },
    { label: 'Route B within 100', passed: result.routeB <= job.limits.routeB },
    { label: 'Route C within 80', passed: result.routeC <= job.limits.routeC },
    { label: 'Total equals 300', passed: result.routeA + result.routeB + result.routeC === job.amount },
  ];
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

export async function releasePayment(
  solver: FiberBrowserNode,
  paymentHash: \`0x\${string}\`,
  preimage: \`0x\${string}\`,
) {
  await solver.settleInvoice({ payment_hash: paymentHash, payment_preimage: preimage });
  return solver.waitForInvoiceStatus(paymentHash, 'Paid', {
    timeout: 30_000,
    interval: 500,
  });
}`,
  },
  {
    id: 'invoice',
    label: 'lib/job-invoice.ts',
    language: 'typescript',
    code: `export async function createResultInvoice(solver, paymentHash) {
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

export async function placePaymentOnHold(customer, invoice, receiverChannel) {
  return customer.sendPayment({
    invoice,
    hop_hints: [lastHopHint(receiverChannel)],
    max_fee_amount: ckbToHex('1'),
    max_parts: '0x1',
  });
}`,
  },
  {
    id: 'app',
    label: 'app/page.tsx',
    language: 'tsx',
    code: `'use client';

export default function VerifiedResultPage() {
  const [invoiceStatus, setInvoiceStatus] = useState('Open');
  const [paymentStatus, setPaymentStatus] = useState('Not sent');
  const [resultStatus, setResultStatus] = useState('Draft');
  const [selected, setSelected] = useState(verificationSamples[0]);
  const decision = paymentDecision(selected.result);

  async function holdPayment() {
    const payment = await placePaymentOnHold(customer, invoice, solverChannel);
    setPaymentStatus(payment.status); // Inflight
    const received = await solver.waitForInvoiceStatus(paymentHash, 'Received');
    setInvoiceStatus(received.status);
  }

  async function verifyAndComplete() {
    if (invoiceStatus !== 'Received') return;
    if (decision.action === 'release') {
      setResultStatus('Verified');
      await releasePayment(solver, paymentHash, preimage);
      setResultStatus('Paid');
    } else {
      setResultStatus('Rejected');
      await solver.cancelInvoice({ payment_hash: paymentHash });
    }
  }

  return <>
    <ResultChoices samples={verificationSamples} onSelect={setSelected} />
    <CheckPreview result={selected.result} status={resultStatus} />
    <button onClick={verifyAndComplete}>
      {decision.actionLabel}
    </button>
  </>;
}`,
  },
];

const verifiedResultSectionCode: Record<string, RoutingCodeFocus> = {
  contract: { file: 'job', start: 1, end: 10 },
  lock: { file: 'verifier', start: 3, end: 11 },
  invoice: { file: 'invoice', start: 1, end: 10 },
  fund: { file: 'invoice', start: 13, end: 20 },
  lifecycle: { file: 'app', start: 4, end: 15 },
  verify: { file: 'job', start: 12, end: 25 },
  decide: { file: 'app', start: 17, end: 27 },
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

function RefreshIcon() {
  return <svg aria-hidden="true" className={styles.refreshIcon} fill="none" viewBox="0 0 16 16"><path d="M13 5V2m0 0h-3m3 0-2.1 2.1A5 5 0 1 0 13 9"/></svg>;
}

function VerificationSampleCards({
  onSelect,
  selectedId,
}: {
  onSelect: (id: VerificationSampleId) => void;
  selectedId: VerificationSampleId;
}) {
  return <div aria-label="Result examples" className={styles.verificationSampleCards} role="group">
    {verificationSamples.map((sample) => <label className={styles.verificationSampleCard} data-selected={selectedId === sample.id ? 'true' : 'false'} key={sample.id}><input checked={selectedId === sample.id} name="verification-sample" onChange={() => onSelect(sample.id)} type="radio" value={sample.id}/><span><strong>{sample.label}</strong><small>{selectedId === sample.id ? 'Selected' : 'Select'}</small></span><span className={styles.verificationSampleValues}>{Object.entries(sample.result).map(([route, value]) => <span key={route}><small>{route.replace('route', 'Route ')}</small><b>{value} CKB</b></span>)}</span></label>)}
  </div>;
}

function VerificationCriteria({
  checks,
}: {
  checks: ReturnType<typeof groupVerificationChecks>;
}) {
  return <div aria-label="Selected result verification" className={styles.verificationCriteria}>
    {checks.map((check) => <div data-passed={check.passed ? 'true' : 'false'} key={check.label}><i aria-hidden="true">{check.passed ? '✓' : '×'}</i><span>{check.label}</span><strong>{check.rule}</strong></div>)}
  </div>;
}

function VerifiedSetupParticipant({
  addEvent,
  expanded,
  label,
  locked,
  nodeStarting,
  onToggle,
  runtime,
  setStage,
  stage,
}: {
  addEvent: (message: string) => void;
  expanded: boolean;
  label: 'Customer A' | 'Solver C';
  locked?: boolean;
  nodeStarting: boolean;
  onToggle: () => void;
  runtime: ReturnType<typeof useFiberRoutingNode>;
  setStage: (stage: ChannelProgressStage) => void;
  stage: ChannelProgressStage;
}) {
  const channel = findReusableChannel(runtime.channels, bottlePeer.pubkey);
  const [channelHistory, setChannelHistory] = useState<string[]>([]);
  const role: SetupRole = label === 'Solver C' ? 'solver' : 'customer';
  const actionLabels = setupActionLabels(role);
  const channelReady = isChannelReady(channel);
  const peerConnected = runtime.peers.some((key) => samePubkey(key, bottlePeer.pubkey));
  const nodePrepared = Boolean(runtime.nodeInfo && peerConnected);
  const fundingReady = (runtime.balance ?? 0n) >= BigInt(ckbToHex(channelAmount));
  const actionState = channelActionState({
    stage,
    busy: runtime.busy === 'open channel',
  });
  const participantState = setupParticipantState({
    nodeRunning: nodePrepared,
    nodeStarting,
  });
  const channelRequirement = setupChannelActionRequirement({
    role,
    nodePrepared,
    fundingReady,
    actionPending: actionState.pending,
    channelReady,
  });
  const currentChannelState = channel?.state.state_name;
  const expectedChannelState = currentChannelState
    ? nextObservedChannelState(currentChannelState)
    : null;

  const open = async () => {
    const node = runtime.nodeRef.current;
    if (!node) return;
    setStage('connecting');
    const connected = runtime.peers.some((key) => samePubkey(key, bottlePeer.pubkey)) || await runtime.connect(bottlePeer);
    if (!connected) {
      setStage('error');
      return;
    }
    const existing = findReusableChannel((await node.listChannels()).channels, bottlePeer.pubkey);
    if (existing) {
      setStage(progressFromChannelState(existing));
      addEvent(`${label} reused ${existing.state.state_name}`);
      await runtime.refresh();
      return;
    }
    setStage('submitting');
    const result = await runtime.run('open channel', (current) => current.openChannel({
      pubkey: bottlePeer.pubkey,
      funding_amount: ckbToHex(channelAmount),
      public: true,
    }));
    if (!result) {
      setStage('error');
      return;
    }
    setStage('confirming');
    addEvent(`${label} channel funding submitted`);
    await runtime.refresh();
  };

  useEffect(() => {
    if (channel) setStage(progressFromChannelState(channel));
  }, [channel, setStage]);

  useEffect(() => {
    if (!currentChannelState) return;
    setChannelHistory((states) =>
      appendObservedChannelState(states, currentChannelState),
    );
  }, [currentChannelState]);

  return <section className={styles.verifiedSetupDisclosure} data-expanded={expanded ? 'true' : 'false'} data-ready={channelReady ? 'true' : 'false'}>
    <button aria-expanded={expanded} className={styles.verifiedSetupDisclosureHeader} disabled={locked} onClick={onToggle} type="button">
      <span className={styles.verifiedSetupDisclosureNumber}>{role === 'customer' ? '2' : '3'}</span>
      <span className={styles.verifiedSetupDisclosureTitle}><strong>{label}</strong><small>{role === 'customer' ? 'Fund the payer and open its outbound channel.' : 'Fund the recipient and open its channel.'}</small></span>
      <span className={styles.verifiedSetupDisclosureStatus} data-tone={participantState.tone}><i className={`${styles.statusDot} ${participantState.tone === 'success' ? styles.statusSuccess : participantState.tone === 'waiting' ? styles.statusWaiting : styles.statusIdle}`}/><b>{participantState.label}</b></span>
      <i aria-hidden="true" className={styles.verifiedSetupChevron}/>
    </button>
    {expanded && <div className={styles.verifiedSetupDisclosureBody}>
      <div className={styles.verifiedSetupTask}>
        <div className={styles.paymentFlowBody}><strong>{actionLabels.fund}</strong><div className={styles.addressLine}><code title={runtime.address}>{shorten(runtime.address)}</code><button aria-label={`Copy ${label} funding address`} className={`${styles.demoAction} ${styles.addressCopyButton}`} disabled={!runtime.address} onClick={() => runtime.address && void navigator.clipboard.writeText(runtime.address)} type="button"><Image alt="" aria-hidden="true" height={15} src="/icon-copy.svg" width={15}/></button></div><span>{!fundingReady && 'Testnet funds required · '}Balance: <b>{hexToCkb(runtime.balance)} CKB</b> · auto-checks every 5s</span></div>
        <div className={styles.fundingActions}>{runtime.address ? <a className={`${styles.faucetButton} ${styles.demoAction} ${!fundingReady ? styles.demoPrimaryAction : ''}`} href="https://faucet.nervos.org" rel="noreferrer" target="_blank">Get Testnet CKB ↗</a> : <button className={`${styles.faucetButton} ${styles.demoAction}`} disabled type="button">Get Testnet CKB ↗</button>}<button className={`${styles.refreshButton} ${styles.demoAction}`} disabled={!runtime.nodeInfo || Boolean(runtime.busy)} onClick={() => void runtime.refresh()} type="button"><RefreshIcon/>Refresh</button></div>
      </div>
      <div className={styles.verifiedSetupTask}>
        <div className={styles.paymentFlowBody}><strong>{actionLabels.open}</strong><label><input aria-label={`${label} channel funding amount in CKB`} disabled readOnly value={channelAmount}/><span>CKB</span></label></div>
        <SetupActionHint id={`verified-${role}-channel-requirement`} label={`Open ${label} channel requirements`} reason={channelRequirement}><button className={`${styles.channelButton} ${styles.demoAction} ${nodePrepared && fundingReady && !actionState.disabled ? styles.demoPrimaryAction : ''}`} disabled={locked || !nodePrepared || !fundingReady || actionState.disabled} onClick={() => void open()} type="button">{actionState.label}</button></SetupActionHint>
      </div>
      {channelHistory.length > 0 && <div className={styles.channelTimeline}><span>Observed channel lifecycle</span><div>{channelHistory.map((state, index) => <span key={`${state}-${index}`}>{index > 0 && <i aria-hidden="true">→</i>}<b>{state}</b></span>)}{expectedChannelState && <span aria-label={`Waiting for ${expectedChannelState}`} className={styles.pendingChannelState}><i aria-hidden="true">→</i><b>{expectedChannelState}</b></span>}</div></div>}
    </div>}
  </section>;
}

function VerifiedInboundSetup({
  addEvent,
  channelReady,
  runtime,
}: {
  addEvent: (message: string) => void;
  channelReady: boolean;
  runtime: ReturnType<typeof useFiberRoutingNode>;
}) {
  const channel = findReusableChannel(runtime.channels, bottlePeer.pubkey);
  const inboundLiquidity = channel ? BigInt(channel.remote_balance) : 0n;
  const inboundReady = inboundLiquidity >= BigInt(ckbToHex(inboundSeedAmount));
  const inboundRequirement = setupInboundActionRequirement({
    channelReady,
    inboundReady,
    busy: Boolean(runtime.busy),
  });
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
    if (result?.status === 'Success') addEvent(`${inboundSeedAmount} CKB moved to Bottle's side for Solver C`);
    await runtime.refresh();
  };

  return <div className={styles.paymentFlow}>
    <div className={styles.paymentFlowNumber}>4</div>
    <div className={styles.paymentFlowBody}><strong>Prepare Solver C to receive</strong><span>{inboundReady ? `${hexToCkb(inboundLiquidity)} CKB is available on Bottle's side.` : `Move ${inboundSeedAmount} CKB to Bottle's side so Solver C has inbound liquidity.`}</span></div>
    <SetupActionHint id="verified-inbound-requirement" label="Move funds requirements" reason={inboundRequirement}><button className={`${styles.paymentButton} ${styles.demoAction} ${channelReady && !inboundReady ? styles.demoPrimaryAction : ''}`} disabled={!channelReady || inboundReady || Boolean(runtime.busy)} onClick={() => void prepareInbound()} type="button">{runtime.busy === 'prepare inbound liquidity' ? 'Moving funds…' : inboundReady ? 'Ready to receive' : 'Move funds'}</button></SetupActionHint>
  </div>;
}

function VerifiedSetupReview({
  participants,
}: {
  participants: ReturnType<typeof setupParticipantSummary>[];
}) {
  return <div className={styles.verifiedReviewSummary}>
    <span>Set up</span>
    <h2>Payment route ready</h2>
    <p>Customer A and Solver C each have a ready channel with Bottle.</p>
    <div className={styles.verifiedSetupReviewGrid}>
      {participants.map((participant) => <section key={participant.label}>
        <header><span>{participant.label}</span><strong className={styles.verifiedStatusValue}><i className={`${styles.statusDot} ${participant.status === 'Ready' ? styles.statusSuccess : styles.statusIdle}`}/><b className={styles.verifiedStatusText}>{participant.status}</b></strong></header>
        <dl>
          <div><dt>On-chain balance</dt><dd>{hexToCkb(participant.onChainBalance)} CKB</dd></div>
          <div><dt>Channel with Bottle</dt><dd>{hexToCkb(participant.channelBalance)} CKB</dd></div>
          <div><dt>{participant.liquidityLabel}</dt><dd>{hexToCkb(participant.liquidityBalance)} CKB</dd></div>
        </dl>
      </section>)}
    </div>
  </div>;
}

function FiberHoldInvoiceExperience({ variant }: { variant: TutorialVariant }) {
  const verifiedResult = variant === 'verified-result-payment';
  const senderConfiguration = tutorialNodeConfiguration(variant, 'customer');
  const receiverConfiguration = tutorialNodeConfiguration(variant, 'solver');
  const sender = useFiberRoutingNode(
    senderConfiguration.profileKey,
    senderConfiguration.transport,
  );
  const receiver = useFiberRoutingNode(
    receiverConfiguration.profileKey,
    receiverConfiguration.transport,
  );
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
  const [jobStatus, setJobStatus] = useState<JobStatus>('Draft');
  const [selectedSampleId, setSelectedSampleId] = useState<VerificationSampleId>('within-limits');
  const [reviewStep, setReviewStep] = useState<number | null>(null);
  const [expandedSetupRole, setExpandedSetupRole] = useState<SetupRole | null>(null);
  const [preparingNodes, setPreparingNodes] = useState(false);
  const [preparingSetupRole, setPreparingSetupRole] = useState<SetupRole | null>(null);
  const [paymentAttempting, setPaymentAttempting] = useState(false);
  const [paymentAttemptError, setPaymentAttemptError] = useState('');
  const [allocationResult, setAllocationResult] = useState<AllocationResult | null>(null);
  const [verificationChecks, setVerificationChecks] = useState<VerificationCheck[]>([]);
  const selectedSample = verificationSamples.find((sample) => sample.id === selectedSampleId) ?? verificationSamples[0];
  const checking = useRef(false);
  const loggedPaymentResult = useRef('');
  const addEvent = useCallback((message: string) => setEvents((items) => [...items.slice(-10), message]), []);
  const senderChannel = findReusableChannel(sender.channels, bottlePeer.pubkey);
  const receiverChannel = findReusableChannel(receiver.channels, bottlePeer.pubkey);
  const paymentAmount = (() => {
    try { return BigInt(ckbToHex(amount)); }
    catch { return 0n; }
  })();
  const senderChannelReady = isChannelReady(senderChannel) && BigInt(senderChannel?.local_balance ?? '0x0') >= paymentAmount;
  const receiverChannelReady = isChannelReady(receiverChannel) && BigInt(receiverChannel?.remote_balance ?? '0x0') >= paymentAmount;
  const senderConnected = sender.peers.some((key) => samePubkey(key, bottlePeer.pubkey));
  const receiverConnected = receiver.peers.some((key) => samePubkey(key, bottlePeer.pubkey));
  const senderReady = senderChannelReady && senderConnected;
  const receiverReady = receiverChannelReady && receiverConnected;
  const routeReady = Boolean(
    senderReady &&
    receiverReady &&
    receiverChannel?.channel_outpoint,
  );
  const nodesPrepared = Boolean(
    sender.nodeInfo && receiver.nodeInfo && senderConnected && receiverConnected,
  );
  const participantLocks = setupParticipantLocks(nodesPrepared);

  const prepareVerifiedNodes = useCallback(async () => {
    if (sender.isolationReady === false || receiver.isolationReady === false) {
      window.location.reload();
      return;
    }
    setPreparingNodes(true);
    try {
      const roles = rolesToPrepare({
        customerRunning: Boolean(sender.nodeRef.current),
        solverRunning: Boolean(receiver.nodeRef.current),
      });
      setPreparingSetupRole(roles[0] ?? null);
      await Promise.all(roles.map((role) => role === 'customer' ? sender.start() : receiver.start()));
      const participants = [
        { label: 'Customer A', runtime: sender, setStage: setSenderStage },
        { label: 'Solver C', runtime: receiver, setStage: setReceiverStage },
      ] as const;
      const connections = await prepareSetupRolesInOrder(['customer', 'solver'], async (role) => {
        setPreparingSetupRole(role);
        const { label, runtime, setStage } = role === 'customer' ? participants[0] : participants[1];
        if (!runtime.nodeRef.current) return false;
        const currentPeers = (await runtime.nodeRef.current.listPeers()).peers;
        const alreadyConnected = currentPeers.some((peer) => samePubkey(peer.pubkey, bottlePeer.pubkey));
        if (alreadyConnected) {
          await runtime.refresh();
          return true;
        }
        setStage('connecting');
        const connected = await runtime.connect(bottlePeer);
        setStage(connected ? 'idle' : 'error');
        if (connected) {
          addEvent(`${label} connected to Bottle`);
        } else {
          runtime.setError(peerConnectionRecoveryMessage(bottlePeer.name));
        }
        await runtime.refresh();
        return connected;
      });
      if (connections.every(({ ready }) => ready)) {
        addEvent('Customer A and Solver C are running and connected');
      }
    } finally {
      setPreparingSetupRole(null);
      setPreparingNodes(false);
    }
  }, [addEvent, receiver, sender]);

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
      description: verifiedResult ? 'Verified route allocation tutorial' : 'Browser hold invoice tutorial',
      expiry: '0xe10',
    }));
    if (!result) return;
    setInvoice(result.invoice_address); setPasted(verifiedResult ? result.invoice_address : ''); setPaymentHash(nextHash); setPreimage(nextPreimage);
    setInvoiceStatus('Open'); setPaymentStatus('Not sent');
    setPaymentAttemptError('');
    setJobStatus('Draft'); setAllocationResult(null); setVerificationChecks([]);
    setSelectedSampleId('within-limits');
    try { await navigator.clipboard.writeText(result.invoice_address); addEvent(verifiedResult ? 'Solver C created the held payment request' : 'Node C created and copied a hold invoice'); }
    catch { addEvent('Invoice created; copy it manually'); }
  }, [addEvent, amount, receiver, verifiedResult]);

  const pay = useCallback(async () => {
    const senderNode = sender.nodeRef.current;
    const receiverNode = receiver.nodeRef.current;
    if (!senderNode || !receiverNode || !paymentHash || !pasted.trim() || paymentAttempting) return;

    setPaymentAttempting(true);
    setPaymentAttemptError('');
    sender.setError('');
    receiver.setError('');
    try {
      const currentInvoice = await receiverNode.getInvoice({ payment_hash: paymentHash });
      setInvoiceStatus(currentInvoice.status);
      const currentRecovery = paymentRecoveryState(currentInvoice.status);
      if (currentRecovery.action === 'continue') {
        addEvent('The payment is already on hold; continuing to verification');
        return;
      }
      if (currentRecovery.action === 'recreate') {
        setPaymentAttemptError(currentRecovery.message ?? 'Create a new payment request to continue.');
        return;
      }

      const ensureBottleConnection = async (node: typeof senderNode) => {
        const connected = (await node.listPeers()).peers.some(
          (peer) => samePubkey(peer.pubkey, bottlePeer.pubkey),
        );
        if (!connected) await node.connectPeer(bottlePeer);
      };
      await Promise.all([
        ensureBottleConnection(senderNode),
        ensureBottleConnection(receiverNode),
      ]);
      await Promise.all([sender.refresh(), receiver.refresh()]);

      const latestReceiverChannel = findReusableChannel(
        (await receiverNode.listChannels()).channels,
        bottlePeer.pubkey,
      );
      if (
        !isChannelReady(latestReceiverChannel) ||
        BigInt(latestReceiverChannel?.remote_balance ?? '0x0') < paymentAmount
      ) {
        throw new Error('The refreshed route is not ready yet. Wait a moment, then try again.');
      }

      const attempt = await sender.run('submit held payment', async (node) => {
        try {
          return {
            payment: await node.sendPayment({
              invoice: pasted.trim(),
              hop_hints: browserLastHop(latestReceiverChannel),
              max_fee_amount: ckbToHex('1'),
              max_parts: '0x1',
            }),
          };
        } catch (error) {
          return { error: error instanceof Error ? error.message : String(error) };
        }
      });
      if (!attempt) return;
      if ('payment' in attempt && attempt.payment) {
        setPaymentStatus(attempt.payment.status);
        addEvent(`${verifiedResult ? 'Customer payment' : 'Sender payment'} · ${attempt.payment.status}`);
        return;
      }

      const latestInvoice = await receiverNode.getInvoice({ payment_hash: paymentHash });
      setInvoiceStatus(latestInvoice.status);
      const recovery = paymentRecoveryState(latestInvoice.status, attempt.error);
      if (recovery.action === 'continue') {
        addEvent('The payment reached Solver C; continuing to verification');
        return;
      }
      setPaymentStatus('Not sent');
      setPaymentAttemptError(recovery.message ?? 'The payment was not submitted. Try again.');
      addEvent(recovery.action === 'recreate' ? 'The payment request must be recreated' : 'Payment route unavailable; retry is ready');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      let latestStatus = invoiceStatus;
      try {
        latestStatus = (await receiverNode.getInvoice({ payment_hash: paymentHash })).status;
        setInvoiceStatus(latestStatus);
      } catch {
        // Keep the last known Invoice state when the receiver cannot be queried.
      }
      const recovery = paymentRecoveryState(latestStatus, message);
      setPaymentStatus('Not sent');
      setPaymentAttemptError(recovery.message ?? message);
      addEvent(recovery.action === 'recreate' ? 'The payment request must be recreated' : 'Payment route unavailable; retry is ready');
    } finally {
      setPaymentAttempting(false);
    }
  }, [addEvent, invoiceStatus, pasted, paymentAmount, paymentAttempting, paymentHash, receiver, sender, verifiedResult]);

  const settle = useCallback(async () => {
    if (!paymentHash || !preimage) return;
    addEvent(verifiedResult ? 'The verification key is being released…' : 'Receiver is releasing the preimage…');
    const result = await receiver.run('settle invoice', async (node) => {
      await node.settleInvoice({ payment_hash: paymentHash, payment_preimage: preimage });
      return node.waitForInvoiceStatus(paymentHash, 'Paid', { timeout: 30_000, interval: 500 });
    });
    if (!result) {
      addEvent(verifiedResult ? 'Payment release did not complete; check the error below' : 'Settlement did not complete; check the error below');
      return;
    }
    setInvoiceStatus(result.status);
    if (verifiedResult) setJobStatus('Paid');
    addEvent(verifiedResult ? 'Payment released to Solver C' : 'Receiver Invoice · Paid');
  }, [addEvent, paymentHash, preimage, receiver, verifiedResult]);
  const cancel = useCallback(async () => {
    if (!paymentHash) return;
    const result = await receiver.run('cancel invoice', (node) => node.cancelInvoice({ payment_hash: paymentHash }));
    if (result) {
      setInvoiceStatus(result.status);
      addEvent(verifiedResult ? 'Payment cancelled; 1 CKB is available to Customer A again' : 'Receiver cancelled the held payment');
    }
  }, [addEvent, paymentHash, receiver, verifiedResult]);

  const verifyAndComplete = useCallback(async (sampleResult: AllocationResult) => {
    if (invoiceStatus !== 'Received') return;
    const result = { ...sampleResult };
    const checks = verifyAllocationResult(result);
    const passed = checks.every((check) => check.passed);
    setAllocationResult(result);
    setVerificationChecks(checks);
    setJobStatus(passed ? 'Verified' : 'Rejected');
    addEvent(passed ? 'Result verified; releasing 1 CKB to Solver C' : 'Result rejected; cancelling the held payment');
    if (passed) await settle();
    else await cancel();
  }, [addEvent, cancel, invoiceStatus, settle]);

  useEffect(() => {
    if (!paymentHash) return;
    const check = async () => {
      if (checking.current) return; checking.current = true;
      try {
        if (receiver.nodeRef.current) setInvoiceStatus((await receiver.nodeRef.current.getInvoice({ payment_hash: paymentHash })).status);
        if (sender.nodeRef.current && shouldPollPaymentSession(paymentStatus)) setPaymentStatus((await sender.nodeRef.current.getPayment({ payment_hash: paymentHash })).status);
      } catch { /* The sender may not know the payment until it is submitted. */ }
      finally { checking.current = false; }
    };
    void check(); const timer = window.setInterval(() => void check(), 2_000);
    return () => window.clearInterval(timer);
  }, [paymentHash, paymentStatus, receiver.nodeRef, sender.nodeRef]);

  useEffect(() => {
    if (paymentStatus !== 'Success' && paymentStatus !== 'Failed') return;
    if (loggedPaymentResult.current === paymentStatus) return;
    loggedPaymentResult.current = paymentStatus;
    addEvent(`Payer payment · ${paymentStatus}`);
  }, [addEvent, paymentStatus]);

  useEffect(() => {
    if (!verifiedResult || invoiceStatus !== 'Received' || jobStatus !== 'Draft') return;
    setJobStatus('Funded');
  }, [invoiceStatus, jobStatus, verifiedResult]);

  const holdArticle = <>
    <header className={styles.hero} data-tutorial-section="intro"><div className={styles.eyebrow}><span>Conditional payments</span><span className={styles.eyebrowRule}/><span>20 minute tutorial</span></div><h1>Build a Conditional Payment with a Hold Invoice</h1><p className={styles.lead}>Pause an Invoice payment at the receiver, inspect its pending state, then explicitly settle or cancel it.</p><div className={styles.heroMeta}><span>Hold Invoice</span><span>Settle</span><span>Cancel</span></div></header>
    <section className={styles.section} data-tutorial-section="concept"><div className={styles.stepLabel}><span>1</span> Separate hash from preimage</div><h2>Create an Invoice that cannot settle automatically</h2><p>Node C generates the preimage locally, publishes only its SHA-256 hash in the Invoice, and keeps the preimage outside the node until a business condition is satisfied. The Invoice explicitly sets <code>hash_algorithm: &apos;sha256&apos;</code> so settlement validates the preimage with the same algorithm.</p><small className={styles.fileReference}>lib/hold-invoice.ts · lines 7–18</small></section>
    <section className={styles.section} data-tutorial-section="submit"><div className={styles.stepLabel}><span>2</span> Submit the payment</div><h2>Prepare liquidity and supply the final hop</h2><p>A newly funded receiver channel starts with its balance on Receiver C&apos;s side. Receiver C first sends a small Testnet payment to Bottle, moving 5 CKB to the remote side. Payer A then submits the Invoice with a private last-hop hint for Bottle → C.</p><div className={styles.note}><strong>Channel Ready is not Payment Ready</strong><p>The Live Demo checks both channel liquidity and peer connections. Its last-hop hint removes the need to wait for the receiver channel to propagate through public gossip.</p></div><small className={styles.fileReference}>lib/payment.ts · lines 3–25</small></section>
    <section className={styles.section} data-tutorial-section="inspect"><div className={styles.stepLabel}><span>3</span> Observe the hold</div><h2>Poll both sides without blocking the UI</h2><p>Node C progresses from <code>Open</code> to <code>Received</code>, while Node A stays <code>Inflight</code>. This is the decision window.</p><small className={styles.fileReference}>lib/payment.ts · lines 27–32</small></section>
    <section className={styles.section} data-tutorial-section="decide"><div className={styles.stepLabel}><span>4</span> Decide</div><h2>Settle with the preimage or cancel</h2><p>Settle releases the secret and completes the payment atomically. Cancel rejects the held Invoice and releases its pending liquidity.</p><small className={styles.fileReference}>lib/hold-invoice.ts · lines 19–25</small></section>
    <section className={styles.section} data-tutorial-section="react"><div className={styles.stepLabel}><span>5</span> Wire React</div><h2>Expose the pending state as an explicit action</h2><p>The interface enables Settle and Cancel only after the receiver reports <code>Received</code>, preventing an accidental early decision.</p><small className={styles.fileReference}>app/hold/page.tsx · lines 4–23</small></section>
  </>;

  const verifiedResultArticle = <>
    <section className={styles.section} data-tutorial-section="intro">
      <div className={styles.stepLabel}>How it works</div>
      <h2>Pay for a result your application can verify</h2>
      <p>A customer needs exactly 300 CKB allocated across three routes. The payment is placed on hold before Solver C submits an answer. Deterministic code checks the answer, then the application either releases the payment or cancels it.</p>
      <div className={styles.note}><strong>What happens in the demo?</strong><p>The 1 CKB Hold Invoice payment runs on Fiber Testnet. The 300 CKB allocation is a simulated work result; no 300 CKB transfer occurs.</p></div>
    </section>
    <section className={styles.section} data-tutorial-section="contract">
      <div className={styles.stepLabel}><span>1</span> Define the acceptance rules</div>
      <h2>Make the result unambiguous</h2>
      <p>The result must contain the three required route amounts. Route A can receive at most 120 CKB, Route B at most 100 CKB, and Route C at most 80 CKB. Together they must equal 300 CKB.</p>
      <p>These constraints matter more than the kind of software or person producing the result. Any solver can participate as long as it returns the agreed structure.</p>
      <small className={styles.fileReference}>lib/job.ts · lines 1–10</small>
    </section>
    <section className={styles.section} data-tutorial-section="lock">
      <div className={styles.stepLabel}><span>2</span> Create the payment lock</div>
      <h2>Keep the release key outside the Invoice</h2>
      <p>The application generates a random preimage <code>K</code> and puts only <code>SHA256(K)</code> in the Hold Invoice. Solver C can see that a 1 CKB payment is waiting, but cannot claim it without the key.</p>
      <small className={styles.fileReference}>lib/verifier.ts · lines 3–11</small>
    </section>
    <section className={styles.section} data-tutorial-section="invoice">
      <div className={styles.stepLabel}><span>3</span> Create the Hold Invoice</div>
      <h2>Encode the payment condition</h2>
      <p><code>createResultInvoice()</code> requests 1 CKB and includes the payment hash, <code>sha256</code> algorithm, one-hour expiry, and trampoline-routing support. Because the preimage stays in the application, the Invoice can reach <code>Received</code> but cannot settle automatically.</p>
      <small className={styles.fileReference}>lib/job-invoice.ts · lines 1–10</small>
    </section>
    <section className={styles.section} data-tutorial-section="fund">
      <div className={styles.stepLabel}><span>4</span> Route the held payment</div>
      <h2>Commit the payment before accepting work</h2>
      <p>Customer A submits the Invoice with a private Bottle → Solver C last-hop hint. This lets the browser nodes use the newly opened receiver channel without waiting for public gossip, while <code>max_parts: &apos;0x1&apos;</code> keeps the example to one payment part.</p>
      <small className={styles.fileReference}>lib/job-invoice.ts · lines 13–20</small>
    </section>
    <section className={styles.section} data-tutorial-section="lifecycle">
      <div className={styles.stepLabel}><span>5</span> Track the held state</div>
      <h2>Keep payment and result states separate</h2>
      <p>The receiver Invoice becomes <code>Received</code> while Customer A&apos;s payment remains <code>Inflight</code>. That combination proves the payment is committed; it does not say whether the result is valid. The application therefore tracks the result independently and unlocks a decision only after the Invoice reaches <code>Received</code>.</p>
      <small className={styles.fileReference}>app/page.tsx · lines 4–15</small>
    </section>
    <section className={styles.section} data-tutorial-section="verify">
      <div className={styles.stepLabel}><span>6</span> Verify the result</div>
      <h2>Keep work delivery separate from payment transport</h2>
      <p>Solver C returns the route values through the application; Fiber carries only the payment. Customer A runs <code>verifyResult()</code> against the selected values, and the interface groups those checks into result format, route limits, and required total. Result #1 and Result #2 are hard-coded samples rather than output from a live solver.</p>
      <small className={styles.fileReference}>lib/job.ts · lines 12–25</small>
    </section>
    <section className={styles.section} data-tutorial-section="decide">
      <div className={styles.stepLabel}><span>7</span> Release or cancel payment</div>
      <h2>Map the verdict to one payment action</h2>
      <p>The handler first requires the Invoice to be <code>Received</code>. When every check passes, it reveals <code>K</code> and releases 1 CKB to Solver C; when any check fails, it cancels the Invoice and makes the held 1 CKB available to Customer A again. The final Outcome step is a read-only receipt.</p>
      <div className={styles.note}><strong>Fiber does not judge the result</strong><p>Fiber validates the Invoice and preimage. Your application defines the rules, authenticates the submitted result, and decides when the preimage may be released.</p></div>
      <small className={styles.fileReference}>app/page.tsx · lines 17–27</small>
    </section>
    <section className={styles.section} data-tutorial-section="use-cases">
      <div className={styles.stepLabel}>More ways to use it</div>
      <h2>Where verified-result payments fit</h2>
      <p>This pattern works when acceptance can be decided from explicit evidence:</p>
      <ul className={styles.scenarioList}>
        <li><strong>Computation:</strong> release payment when an output matches a reproducible calculation or proof.</li>
        <li><strong>Automated quality checks:</strong> pay after a build, test suite, or data-validation job passes.</li>
        <li><strong>Milestone delivery:</strong> release a tranche after signed artifacts and required checks arrive.</li>
        <li><strong>Oracle-backed outcomes:</strong> pay when an authenticated data source confirms the agreed condition.</li>
      </ul>
      <p>It is a poor fit for work that is mainly subjective unless the parties also define a reviewer, dispute process, and timeout policy.</p>
    </section>
    <section className={styles.section} data-tutorial-section="local">
      <div className={styles.stepLabel}>Optional local setup</div>
      <h2>Run the complete project locally</h2>
      <p>
        Select <strong>Download project</strong> in the top-right corner, or{' '}
        <a
          className={styles.inlineDownloadLink}
          download
          href="/downloads/fiber-verified-result-payment.zip"
        >
          download here
        </a>
        . The archive already contains the Next.js application, Fiber integration,
        browser headers, and interface shown here. After extracting it, open the
        project directory and run:
      </p>
      <div className={styles.setupCodeBlock}>
        <div className={styles.setupCodeHeader}><span>Terminal</span></div>
        <pre><code>{`npm install
npm run dev`}</code></pre>
      </div>
      <p className={styles.followupParagraph}>
        Then open <code>http://localhost:3000</code> in your browser.
      </p>
    </section>
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
  const receipt = invoiceStatus === 'Paid' || invoiceStatus === 'Cancelled'
    ? paymentReceipt(invoiceStatus)
    : null;
  const resultStep = verifiedResultStep({
    setupReady: routeReady,
    hasPaymentRequest: Boolean(invoice),
    invoiceStatus,
  });
  const displayedResultStep = reviewStep !== null && reviewStep < resultStep
    ? reviewStep
    : resultStep;
  const reviewingPreviousStep = displayedResultStep < resultStep;
  const chooseResultStep = (requestedStep: number) => {
    const selectedStep = selectReviewStep(resultStep, requestedStep);
    setReviewStep(selectedStep < resultStep ? selectedStep : null);
  };
  useEffect(() => {
    setReviewStep((current) => current !== null && current >= resultStep ? null : current);
  }, [resultStep]);
  const activeSetupDisclosure = setupDisclosureRole({
    nodesPrepared,
    customerReady: senderReady,
    solverReady: isChannelReady(receiverChannel),
  });
  useEffect(() => {
    setExpandedSetupRole(activeSetupDisclosure);
  }, [activeSetupDisclosure]);
  const setupReviewParticipants = [
    setupParticipantSummary({
      role: 'customer',
      onChainBalance: sender.balance,
      localBalance: BigInt(senderChannel?.local_balance ?? '0x0'),
      remoteBalance: BigInt(senderChannel?.remote_balance ?? '0x0'),
      channelReady: isChannelReady(senderChannel),
    }),
    setupParticipantSummary({
      role: 'solver',
      onChainBalance: receiver.balance,
      localBalance: BigInt(receiverChannel?.local_balance ?? '0x0'),
      remoteBalance: BigInt(receiverChannel?.remote_balance ?? '0x0'),
      channelReady: isChannelReady(receiverChannel),
    }),
  ];
  const groupedVerificationChecks = groupVerificationChecks(verificationChecks);
  const selectedVerificationChecks = verifyAllocationResult({ ...selectedSample.result });
  const selectedGroupedChecks = groupVerificationChecks(selectedVerificationChecks);
  const selectedDecision = paymentDecision({ ...selectedSample.result });
  const paymentRecovery = paymentRecoveryState(invoiceStatus, paymentAttemptError);
  const chooseVerificationSample = (requestedId: VerificationSampleId) => {
    const nextId = selectVerificationSample(selectedSampleId, requestedId);
    setSelectedSampleId(nextId);
  };
  const resetVerifiedResult = () => {
    setInvoice('');
    setPasted('');
    setPaymentHash('');
    setPreimage('');
    setInvoiceStatus('None');
    setPaymentStatus('Not sent');
    setPaymentAttemptError('');
    setJobStatus('Draft');
    setAllocationResult(null);
    setVerificationChecks([]);
    setSelectedSampleId('within-limits');
    setReviewStep(null);
  };

  const verifiedLiveDemo = <div className={styles.channelDemoSurface}>
    <div className={styles.paymentPreviewStage}>
      <div className={styles.paymentCard}>
        <div className={`${styles.paymentStatusGrid} ${styles.verifiedStatusGrid}`}>
          <div><span>Customer A</span><strong className={styles.verifiedStatusValue}><i className={`${styles.statusDot} ${sender.nodeInfo ? styles.statusSuccess : styles.statusIdle}`}/><b className={styles.verifiedStatusText}>{participantStatusLabel({ nodeRunning: Boolean(sender.nodeInfo), roleReady: senderReady })}</b></strong></div>
          <div><span>Solver C</span><strong className={styles.verifiedStatusValue}><i className={`${styles.statusDot} ${receiver.nodeInfo ? styles.statusSuccess : styles.statusIdle}`}/><b className={styles.verifiedStatusText}>{participantStatusLabel({ nodeRunning: Boolean(receiver.nodeInfo), roleReady: receiverReady })}</b></strong></div>
          <div><span>Invoice</span><strong className={styles.verifiedStatusValue}><i className={`${styles.statusDot} ${invoiceStatus === 'Paid' ? styles.statusSuccess : invoiceStatus === 'Cancelled' ? styles.statusError : invoiceStatus === 'Received' ? styles.statusWaiting : styles.statusIdle}`}/><b className={styles.verifiedStatusText}>{invoiceStatus}</b></strong></div>
          <div><span>Result</span><strong className={styles.verifiedStatusValue}><i className={`${styles.statusDot} ${jobStatus === 'Verified' || jobStatus === 'Paid' ? styles.statusSuccess : jobStatus === 'Rejected' ? styles.statusError : jobStatus === 'Submitted' ? styles.statusWaiting : styles.statusIdle}`}/><b className={styles.verifiedStatusText}>{resultStatusLabel(jobStatus)}</b></strong></div>
        </div>

        <ol className={styles.verifiedResultProgress} aria-label="Tutorial progress">
          {verifiedResultSteps.map((label, index) => <li data-state={index < resultStep ? 'done' : index === resultStep ? 'current' : 'upcoming'} data-viewing={index === displayedResultStep ? 'true' : 'false'} key={label}><button aria-current={index === displayedResultStep ? 'step' : undefined} disabled={index > resultStep} onClick={() => chooseResultStep(index)} type="button"><i>{index < resultStep ? '✓' : index + 1}</i><span>{label}</span></button></li>)}
        </ol>

        {reviewingPreviousStep && <div className={styles.verifiedReviewBar}><span>Reviewing: {verifiedResultSteps[displayedResultStep]}</span><button onClick={() => setReviewStep(null)} type="button">Return to current step</button></div>}

        <section className={`${styles.verifiedResultStage} ${displayedResultStep === 0 && !reviewingPreviousStep ? styles.verifiedSetupStage : ''} ${displayedResultStep === 1 ? styles.verifiedPaymentStage : ''}`}>
          {displayedResultStep === 0 && <>
            {reviewingPreviousStep ? <VerifiedSetupReview participants={setupReviewParticipants}/> : <>
              <div className={styles.verifiedSetupNode}>
                <div className={styles.paymentFlow}>
                  <div className={styles.paymentFlowNumber}>1</div>
                  <div className={styles.paymentFlowBody}><strong>Start Customer A and Solver C</strong><span>Starts two local browser nodes and connects both to Bottle.</span></div>
                  <button className={`${styles.startButton} ${styles.demoAction} ${!nodesPrepared ? styles.demoPrimaryAction : ''}`} disabled={preparingNodes || nodesPrepared} onClick={sender.isolationReady === false || receiver.isolationReady === false ? () => window.location.reload() : () => void prepareVerifiedNodes()} type="button">{preparingNodes ? 'Preparing…' : sender.isolationReady === false || receiver.isolationReady === false ? 'Reload to enable WASM' : nodesPrepared ? 'Nodes running' : 'Prepare nodes'}</button>
                </div>
                <div className={styles.verifiedSetupDisclosures}>
                  <VerifiedSetupParticipant addEvent={addEvent} expanded={expandedSetupRole === 'customer'} label="Customer A" locked={participantLocks.customer} nodeStarting={preparingNodes && preparingSetupRole === 'customer'} onToggle={() => setExpandedSetupRole((current) => current === 'customer' ? null : 'customer')} runtime={sender} setStage={setSenderStage} stage={senderStage}/>
                  <VerifiedSetupParticipant addEvent={addEvent} expanded={expandedSetupRole === 'solver'} label="Solver C" locked={participantLocks.solver} nodeStarting={preparingNodes && preparingSetupRole === 'solver'} onToggle={() => setExpandedSetupRole((current) => current === 'solver' ? null : 'solver')} runtime={receiver} setStage={setReceiverStage} stage={receiverStage}/>
                </div>
                <VerifiedInboundSetup addEvent={addEvent} channelReady={isChannelReady(receiverChannel)} runtime={receiver}/>
              </div>
            </>}
          </>}
          {displayedResultStep === 1 && <>
            <div className={styles.verifiedAgreement}><div><span>Job title</span><strong>Allocate exactly 300 CKB</strong></div><span className={styles.verifiedCriteriaLabel}>Verification criteria</span><dl><div><dt>Route A</dt><dd>≤ 120</dd></div><div><dt>Route B</dt><dd>≤ 100</dd></div><div><dt>Route C</dt><dd>≤ 80</dd></div><div><dt>Total</dt><dd>= 300</dd></div></dl></div>
            <div className={styles.verifiedHoldExplanation}><code>K</code><div><strong>The release key stays private</strong><span>Once placed on hold, Customer A&apos;s 1 CKB stays pending. A passing result reveals K; a failing result cancels the payment.</span></div></div>
            <div className={`${styles.testnetNotice} ${styles.verifiedPaymentNotice}`}><strong>Testnet CKB</strong><span>This payment uses 1 Testnet CKB.</span></div>
            {reviewingPreviousStep ? <div className={styles.verifiedReviewState}><span>Payment request</span><strong>{invoiceStatus === 'None' ? 'Created and funded' : invoiceStatus}</strong><p>The 1 CKB payment request was created and submitted before the result was accepted.</p></div> : !invoice ? <button className={styles.verifiedPrimaryAction} disabled={Boolean(receiver.busy)} onClick={() => void createInvoice()}>{receiver.busy === 'create hold invoice' ? 'Creating payment request…' : 'Create payment request'}</button> : paymentStatus === 'Not sent' ? <div className={styles.verifiedActionBlock}><div><span>Payment request ready</span><code title={invoice}>{invoice.slice(0, 32)}…</code></div>{paymentRecovery.message && <div aria-live="polite" className={styles.verifiedPaymentRecovery}><strong>{paymentRecovery.action === 'recreate' ? 'New request required' : 'Payment not submitted'}</strong><span>{paymentRecovery.message}</span></div>}<button className={styles.verifiedPrimaryAction} disabled={paymentAttempting || Boolean(sender.busy) || Boolean(receiver.busy)} onClick={() => void (paymentRecovery.action === 'recreate' ? createInvoice() : pay())}>{paymentAttempting || sender.busy === 'submit held payment' ? paymentRecovery.action === 'retry' ? 'Refreshing route…' : 'Placing 1 CKB on hold…' : paymentRecovery.actionLabel}</button></div> : <div className={styles.verifiedWaiting}><i className={styles.liveDot}/><div><strong>Waiting for 1 CKB to be held</strong><span>Customer A: {paymentStatus} · Payment request: {invoiceStatus}</span></div></div>}
          </>}
          {displayedResultStep === 2 && <>
            {reviewingPreviousStep && allocationResult ? <><div className={styles.submittedAllocation}>{Object.entries(allocationResult).map(([route, value]) => <div key={route}><span>{route.replace('route', 'Route ')}</span><strong>{value} CKB</strong></div>)}</div><VerificationCriteria checks={groupedVerificationChecks}/></> : <><div className={`${styles.testnetNotice} ${styles.verifiedPaymentNotice}`}><strong>Demo simulation</strong><span>{verificationSimulationNotice}</span></div><VerificationSampleCards onSelect={chooseVerificationSample} selectedId={selectedSampleId}/><VerificationCriteria checks={selectedGroupedChecks}/><button className={selectedDecision.passed ? styles.verifiedPrimaryAction : styles.verifiedCancelAction} disabled={Boolean(receiver.busy)} onClick={() => void verifyAndComplete({ ...selectedSample.result })} type="button">{receiver.busy ? selectedDecision.passed ? 'Releasing 1 CKB…' : 'Cancelling payment…' : selectedDecision.actionLabel}</button></>}
          </>}
          {displayedResultStep === 3 && receipt && <div aria-live="polite" className={styles.verifiedReceipt} data-outcome={invoiceStatus.toLowerCase()}><i className={styles.verifiedReceiptMark}>{invoiceStatus === 'Paid' ? '✓' : '↩'}</i><span>{receipt.statusLabel}</span><h2>{receipt.title}</h2><p>{receipt.description}</p><dl><div><dt>Result</dt><dd>{receipt.result}</dd></div><div><dt>Invoice</dt><dd>{invoiceStatus}</dd></div><div><dt>Final payment</dt><dd>{receipt.payment}</dd></div></dl><button onClick={resetVerifiedResult}>Start another payment</button></div>}
        </section>
        {(sender.error || receiver.error) && <div className={styles.paymentError}>{sender.error || receiver.error}</div>}
      </div>

      <div className={styles.eventPanel}>
        <div className={styles.eventPanelHeader}><span>Runtime events and results</span><i className={styles.liveDot}/></div>
        <div aria-live="polite" className={styles.eventList}>
          <div className={sender.nodeInfo ? styles.eventConnected : undefined}><time>A</time><code>customer</code><span>{senderReady ? 'Payment channel ready' : sender.nodeInfo ? sender.nodeState : 'Node not started'}</span></div>
          <div className={receiver.nodeInfo ? styles.eventConnected : undefined}><time>C</time><code>solver</code><span>{receiverReady ? 'Inbound liquidity ready' : receiver.nodeInfo ? receiver.nodeState : 'Node not started'}</span></div>
          <div><time>INV</time><code>invoice</code><span>{invoiceStatus}</span></div>
          <div><time>PAY</time><code>payment</code><span>{paymentStatus}</span></div>
          {events.length === 0 && !sender.error && !receiver.error && <div className={styles.eventEmpty}><span>Node, channel, result, and payment events will appear here.</span></div>}
          {events.map((event, index) => <div key={`${event}-${index}`}><time>{String(index + 1).padStart(2, '0')}</time><code>flow</code><span>{event}</span></div>)}
          {(sender.error || receiver.error) && <div className={styles.eventError}><time>!</time><code>error</code><span>{sender.error || receiver.error}</span></div>}
        </div>
      </div>
    </div>
  </div>;

  const holdLiveDemo = <>
    <div className={styles.panelHeader}><span><i className={styles.liveDot}/> Conditional Testnet flow</span><button className={styles.headerAction} onClick={() => { void sender.refresh(); void receiver.refresh(); }}>Refresh both</button></div>
    <div className={`${styles.previewStage} ${styles.paymentPreviewStage}`}>
      <div className={styles.paymentCard}>
        <div className={styles.routeStatusGrid}><div><span>Payer A</span><strong>{sender.nodeState}</strong></div><div><span>Receiver C</span><strong>{receiver.nodeState}</strong></div><div><span>Invoice</span><strong>{invoiceStatus}</strong></div><div><span>Payment</span><strong>{paymentStatus}</strong></div></div>
        <SetupNode addEvent={addEvent} label="Payer A" runtime={sender} setStage={setSenderStage} stage={senderStage}/>
        <SetupNode addEvent={addEvent} label="Receiver C" receiver runtime={receiver} setStage={setReceiverStage} stage={receiverStage}/>
        {(senderReady && receiverReady) && <div className={`${styles.holdRouteRow} ${routeReady ? styles.holdRouteReady : ''}`} aria-live="polite"><div><span>Private last hop</span><strong>{routeReady ? 'Payment route ready' : 'Reconnect the selected peers'}</strong><small>{routeReady ? 'Payer A can route through Bottle to Receiver C with the receiver channel hint.' : 'Both channels have liquidity. Refresh or restart the nodes to reconnect them to Bottle.'}</small></div><div className={styles.holdRouteBadge}>{routeReady ? '✓ A → Bottle → C' : 'Waiting for peers'}</div></div>}
        <div className={styles.invoiceTransfer}><div className={styles.invoiceSide}><span>Receiver C · Hold</span><label><input disabled={!receiverReady} inputMode="decimal" onChange={(e) => setAmount(e.target.value)} value={amount}/><i>CKB</i></label><button disabled={!receiverReady || Boolean(receiver.busy)} onClick={() => void createInvoice()}>{receiver.busy === 'create hold invoice' ? 'Creating…' : 'Create hold invoice & copy'}</button><textarea readOnly placeholder="Held Invoice appears here" value={invoice}/></div><div className={styles.invoiceTransferArrow}><span>Copy</span><b>→</b><span>Fund</span></div><div className={styles.invoiceSide}><span>Payer A · Pay</span><textarea onChange={(e) => setPasted(e.target.value)} placeholder="Paste the hold Invoice" value={pasted}/><button disabled={!invoice} onClick={async () => { try { setPasted((await navigator.clipboard.readText()).trim()); } catch { /* manual paste remains available */ } }}>Paste from clipboard</button><button className={styles.paymentButton} disabled={!senderReady || !routeReady || !pasted.trim() || Boolean(sender.busy)} onClick={() => void pay()}>{sender.busy === 'submit held payment' ? 'Submitting…' : !routeReady ? 'Waiting for route…' : 'Submit held payment'}</button>{paymentStatus !== 'Not sent' && <div aria-live="polite" className={`${styles.holdPayerStatus} ${payerFinished ? styles.holdPayerSuccess : payerRejected ? styles.holdPayerRejected : ''}`}><i/><div><strong>{payerFinished ? 'Payment completed' : payerRejected ? 'Payment not completed' : 'Waiting for Receiver C'}</strong><span>{payerFinished ? 'Receiver C received the settlement preimage.' : payerRejected ? 'The Invoice was cancelled or expired.' : 'Your payment is held. Receiver C must settle or cancel it.'}</span></div></div>}</div></div>
        <div className={styles.holdDecisionPanel}><div><span>Receiver C · Decision</span><strong>{receiverDecision}</strong><p>{canDecide ? 'The payment has arrived. Release the preimage to complete it, or cancel and return the pending liquidity.' : invoiceStatus === 'Paid' ? 'The preimage was released and Payer A can verify success.' : invoiceStatus === 'Cancelled' ? 'The held payment was rejected and Payer A can verify the failure.' : 'These actions unlock when the Invoice reaches Received.'}</p></div><div className={styles.holdDecisionActions}><button className={styles.holdSettleButton} disabled={!canDecide || Boolean(receiver.busy)} onClick={() => void settle()}>{receiver.busy === 'settle invoice' ? 'Settling…' : invoiceStatus === 'Paid' ? 'Settled ✓' : 'Settle payment'}</button><button className={styles.holdCancelButton} disabled={!canDecide || Boolean(receiver.busy)} onClick={() => void cancel()}>{receiver.busy === 'cancel invoice' ? 'Cancelling…' : invoiceStatus === 'Cancelled' ? 'Cancelled ✓' : 'Cancel payment'}</button></div></div>
        {(sender.error || receiver.error) && <div className={styles.paymentError}>{sender.error || receiver.error}</div>}
      </div>
      <div className={styles.eventPanel}><div className={styles.eventPanelHeader}><span>Hold events and results</span><i className={styles.liveDot}/></div><div aria-live="polite" className={styles.eventList}>{events.map((event, index) => <div key={`${event}-${index}`}><time>{String(index + 1).padStart(2, '0')}</time><code>hold</code><span>{event}</span></div>)}</div></div>
    </div>
  </>;

  return <RoutingTutorialFrame
    article={verifiedResult ? verifiedResultArticle : holdArticle}
    codeFiles={verifiedResult ? verifiedResultCodeFiles : holdCodeFiles}
    currentTutorialIndex={verifiedResult ? 6 : 4}
    defaultFile={verifiedResult ? 'job' : 'hold'}
    demoDescription={verifiedResult ? 'Place a 1 CKB Testnet payment on hold, verify a sample 300 CKB route allocation, and release or cancel payment from the result.' : 'Create a real Hold Invoice, observe the pending receiver state, then settle or cancel it.'}
    demoFirst={verifiedResult}
    demoTitle={verifiedResult ? 'Pay for a Verified Result' : 'Run the Hold Invoice Demo'}
    downloadHref={verifiedResult ? '/downloads/fiber-verified-result-payment.zip' : '/downloads/fiber-hold-invoice.zip'}
    liveDemo={verifiedResult ? verifiedLiveDemo : holdLiveDemo}
    nextHref={verifiedResult ? '/docs/build/rusd-payment' : '/docs/build/encrypted-data-payment'}
    previousHref={verifiedResult ? '/docs/build/encrypted-data-payment' : '/docs/build/unidirectional-channel'}
    sectionCode={verifiedResult ? verifiedResultSectionCode : holdSectionCode}
  />;
}

export function FiberHoldInvoiceTutorial() {
  return <FiberHoldInvoiceExperience variant="hold-invoice"/>;
}

export function FiberVerifiedResultPaymentTutorial() {
  return <FiberHoldInvoiceExperience variant="verified-result-payment"/>;
}
