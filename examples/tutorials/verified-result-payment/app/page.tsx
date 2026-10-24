'use client';

import { type ReactNode, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  scriptToAddress,
  type Channel,
  type CkbInvoiceStatus,
  type FiberBrowserNode,
} from '@fiber-pay/sdk/browser';
import {
  bottle,
  connectAndOpenChannel,
  prepareSolverInbound,
  startRole,
} from '../lib/fiber';
import {
  createResultInvoice,
  placePaymentOnHold,
} from '../lib/job-invoice';
import {
  appendObservedChannelState,
  channelActionState,
  channelFundingReady,
  type AllocationResult,
  groupVerificationChecks,
  nextObservedChannelState,
  nextSetupRole,
  paymentDecision,
  paymentRecoveryState,
  paymentReceipt,
  prepareSetupRolesInOrder,
  rolesToPrepare,
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
  type ResultStatus,
  type VerificationSampleId,
  type VerificationCheck,
  verifyResult,
  verificationSimulationNotice,
  verificationSamples,
  verifiedResultStep,
  updateOpeningRoles,
} from '../lib/job';
import { formatCkb, queryCkbBalance } from '../lib/funding';
import { createVerifierLock, releasePayment } from '../lib/verifier';

type Role = 'customer' | 'solver';
type RoleFunding = { address: string; balance: bigint | null };
const progressSteps = ['Set up', 'Hold payment', 'Verify result', 'Outcome'];

const ready = (channel: Channel | null) =>
  channel?.state.state_name.replace(/[^a-z0-9]/gi, '').toLowerCase() ===
  'channelready';

function ActionHint({ children, id, label, reason }: { children: ReactNode; id: string; label: string; reason: string | null }) {
  const triggerRef = useRef<HTMLSpanElement | null>(null);
  const tooltipRef = useRef<HTMLSpanElement | null>(null);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<{ left: number; top: number } | null>(null);

  const updatePosition = useCallback(() => {
    const trigger = triggerRef.current;
    const tooltip = tooltipRef.current;
    if (!trigger || !tooltip) return;
    const margin = 12;
    const gap = 10;
    const triggerBox = trigger.getBoundingClientRect();
    const tooltipBox = tooltip.getBoundingClientRect();
    const centeredLeft = triggerBox.left + triggerBox.width / 2 - tooltipBox.width / 2;
    const left = Math.min(Math.max(centeredLeft, margin), window.innerWidth - tooltipBox.width - margin);
    const roomAbove = triggerBox.top - gap - tooltipBox.height;
    const preferredTop = roomAbove >= margin ? roomAbove : triggerBox.bottom + gap;
    const top = Math.min(Math.max(preferredTop, margin), window.innerHeight - tooltipBox.height - margin);
    setPosition({ left, top });
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [open, updatePosition]);

  if (!reason) return <>{children}</>;
  const show = () => {
    if (!open) setPosition(null);
    setOpen(true);
  };
  return <><span aria-describedby={open ? id : undefined} aria-label={label} className="action-hint" onBlur={() => setOpen(false)} onFocus={show} onKeyDown={(event) => { if (event.key === 'Escape') setOpen(false); }} onMouseEnter={show} onMouseLeave={() => { if (document.activeElement !== triggerRef.current) setOpen(false); }} ref={triggerRef} tabIndex={0}>{children}</span>{open && createPortal(<span className="action-tooltip" data-positioned={Boolean(position)} id={id} ref={tooltipRef} role="tooltip" style={{ left: position?.left ?? 0, top: position?.top ?? 0 }}>{reason}</span>, document.body)}</>;
}

export default function Page() {
  const customer = useRef<FiberBrowserNode | null>(null);
  const solver = useRef<FiberBrowserNode | null>(null);
  const [started, setStarted] = useState<Record<Role, boolean>>({
    customer: false,
    solver: false,
  });
  const [funding, setFunding] = useState<Record<Role, RoleFunding>>({
    customer: { address: '', balance: null },
    solver: { address: '', balance: null },
  });
  const [preparingNodes, setPreparingNodes] = useState(false);
  const [preparingSetupRole, setPreparingSetupRole] = useState<Role | null>(null);
  const [openingRoles, setOpeningRoles] = useState<Record<Role, boolean>>({
    customer: false,
    solver: false,
  });
  const [expandedSetupRole, setExpandedSetupRole] = useState<Role | null>(null);
  const [paymentAttempting, setPaymentAttempting] = useState(false);
  const [paymentAttemptError, setPaymentAttemptError] = useState('');
  const [status, setStatus] = useState('Prepare Customer A and Solver C');
  const [customerChannel, setCustomerChannel] = useState<Channel | null>(null);
  const [solverChannel, setSolverChannel] = useState<Channel | null>(null);
  const [invoice, setInvoice] = useState('');
  const [paymentHash, setPaymentHash] = useState<`0x${string}` | ''>('');
  const [preimage, setPreimage] = useState<`0x${string}` | ''>('');
  const [invoiceStatus, setInvoiceStatus] =
    useState<CkbInvoiceStatus | 'None'>('None');
  const [paymentStatus, setPaymentStatus] = useState('Not sent');
  const [resultStatus, setResultStatus] = useState<ResultStatus>('Draft');
  const [selectedSampleId, setSelectedSampleId] = useState<VerificationSampleId>('within-limits');
  const [reviewStep, setReviewStep] = useState<number | null>(null);
  const [submittingDecision, setSubmittingDecision] = useState(false);
  const [result, setResult] = useState<AllocationResult | null>(null);
  const [checks, setChecks] = useState<VerificationCheck[]>([]);
  const selectedSample = verificationSamples.find((sample) => sample.id === selectedSampleId) ?? verificationSamples[0];

  async function refreshFunding(role: Role, node: FiberBrowserNode) {
    const info = await node.nodeInfo();
    const address = scriptToAddress(info.default_funding_lock_script, 'testnet');
    setFunding((current) => ({
      ...current,
      [role]: { address, balance: current[role].balance },
    }));
    try {
      const balance = await queryCkbBalance(info.default_funding_lock_script);
      setFunding((current) => ({ ...current, [role]: { address, balance } }));
    } catch {
      // Keep the address visible; the five-second refresh will retry the balance query.
    }
  }

  async function prepareNodes() {
    const roles = rolesToPrepare({
      customerRunning: started.customer,
      solverRunning: started.solver,
    });
    setPreparingNodes(true);
    setStatus('Preparing Customer A and Solver C…');
    try {
      await prepareSetupRolesInOrder(['customer', 'solver'], async (role) => {
        setPreparingSetupRole(role);
        const existing = role === 'customer' ? customer.current : solver.current;
        const node = existing ?? await startRole(role);
        if (role === 'customer') customer.current = node;
        else solver.current = node;
        const connected = (await node.listPeers()).peers.some(
          (peer) => peer.pubkey.toLowerCase() === bottle.pubkey.toLowerCase(),
        );
        if (!connected) await node.connectPeer(bottle);
        await refreshFunding(role, node);
        setStarted((current) => ({ ...current, [role]: true }));
        return true;
      });
      setStatus('Customer A and Solver C are running');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : `Could not prepare ${roles[0] === 'solver' ? 'Solver C' : 'Customer A'}`);
    } finally {
      setPreparingSetupRole(null);
      setPreparingNodes(false);
    }
  }

  async function prepare(role: Role) {
    const node = role === 'customer' ? customer.current : solver.current;
    if (!node || !channelFundingReady(funding[role].balance)) return;
    setOpeningRoles((current) => updateOpeningRoles(current, role, true));
    try {
      setStatus('Opening a 499 CKB Testnet channel. Confirmation can take a few minutes…');
      const channel = await connectAndOpenChannel(node);
      if (role === 'customer') setCustomerChannel(channel);
      else setSolverChannel(channel);
      setStatus(`${role === 'customer' ? 'Customer' : 'Solver'} channel is ready`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : String(error));
    } finally {
      setOpeningRoles((current) => updateOpeningRoles(current, role, false));
    }
  }

  async function prepareInbound() {
    if (!solver.current) return;
    setStatus('Preparing Solver C to receive the held payment…');
    const payment = await prepareSolverInbound(solver.current);
    const channel = (await solver.current.listChannels()).channels.find(
      (item) => item.pubkey.toLowerCase() === bottle.pubkey.toLowerCase(),
    );
    setSolverChannel(channel ?? null);
    setStatus(
      payment.status === 'Success'
        ? 'Solver C can receive the held payment'
        : `Inbound payment: ${payment.status}`,
    );
  }

  async function createInvoice() {
    if (!solver.current) return;
    const lock = await createVerifierLock();
    const created = await createResultInvoice(solver.current, lock.paymentHash);
    setPaymentHash(lock.paymentHash);
    setPreimage(lock.preimage);
    setInvoice(created.invoice_address);
    setInvoiceStatus('Open');
    setPaymentStatus('Not sent');
    setPaymentAttemptError('');
    setResultStatus('Draft');
    setSelectedSampleId('within-limits');
    setResult(null);
    setChecks([]);
    setStatus('The 1 CKB payment request is ready');
  }

  async function fund() {
    const customerNode = customer.current;
    const solverNode = solver.current;
    if (!customerNode || !solverNode || !paymentHash || !invoice || paymentAttempting) return;

    setPaymentAttempting(true);
    setPaymentAttemptError('');
    setStatus('Refreshing the route through Bottle…');
    try {
      const currentInvoice = await solverNode.getInvoice({ payment_hash: paymentHash });
      setInvoiceStatus(currentInvoice.status);
      const currentRecovery = paymentRecoveryState(currentInvoice.status);
      if (currentRecovery.action === 'continue') {
        setStatus(currentRecovery.message ?? 'The payment is already on hold.');
        return;
      }
      if (currentRecovery.action === 'recreate') {
        setPaymentAttemptError(currentRecovery.message ?? 'Create a new payment request to continue.');
        setStatus(currentRecovery.message ?? 'Create a new payment request to continue.');
        return;
      }

      const ensureBottleConnection = async (node: FiberBrowserNode) => {
        const connected = (await node.listPeers()).peers.some(
          (peer) => peer.pubkey.toLowerCase() === bottle.pubkey.toLowerCase(),
        );
        if (!connected) await node.connectPeer(bottle);
      };
      await Promise.all([
        ensureBottleConnection(customerNode),
        ensureBottleConnection(solverNode),
      ]);

      const [customerChannels, solverChannels] = await Promise.all([
        customerNode.listChannels(),
        solverNode.listChannels(),
      ]);
      const latestCustomerChannel = customerChannels.channels.find(
        (channel) => channel.pubkey.toLowerCase() === bottle.pubkey.toLowerCase(),
      ) ?? null;
      const latestSolverChannel = solverChannels.channels.find(
        (channel) => channel.pubkey.toLowerCase() === bottle.pubkey.toLowerCase(),
      ) ?? null;
      setCustomerChannel(latestCustomerChannel);
      setSolverChannel(latestSolverChannel);
      if (
        !latestCustomerChannel ||
        !latestSolverChannel ||
        !ready(latestCustomerChannel) ||
        !ready(latestSolverChannel) ||
        BigInt(latestCustomerChannel.local_balance) < 100_000_000n ||
        BigInt(latestSolverChannel.remote_balance) < 100_000_000n
      ) {
        throw new Error('The refreshed route is not ready yet. Wait a moment, then try again.');
      }

      const payment = await placePaymentOnHold(customerNode, invoice, latestSolverChannel);
      setPaymentStatus(payment.status);
      setStatus('Placing 1 CKB on hold…');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      let latestStatus = invoiceStatus;
      try {
        latestStatus = (await solverNode.getInvoice({ payment_hash: paymentHash })).status;
        setInvoiceStatus(latestStatus);
      } catch {
        // Keep the last known Invoice state when the solver cannot be queried.
      }
      const recovery = paymentRecoveryState(latestStatus, message);
      setPaymentStatus('Not sent');
      setPaymentAttemptError(recovery.message ?? message);
      setStatus(recovery.message ?? message);
    } finally {
      setPaymentAttempting(false);
    }
  }

  async function verifyAndComplete(sampleResult: AllocationResult) {
    if (invoiceStatus !== 'Received') return;
    const nextResult = { ...sampleResult };
    const nextChecks = verifyResult(nextResult);
    const passed = nextChecks.every((check) => check.passed);
    setResult(nextResult);
    setChecks(nextChecks);
    setResultStatus(passed ? 'Verified' : 'Rejected');
    if (!solver.current || !paymentHash) return;

    setSubmittingDecision(true);
    try {
      if (passed) {
        if (!preimage) return;
        setStatus('Result verified. Releasing 1 CKB to Solver C…');
        const paid = await releasePayment(solver.current, paymentHash, preimage);
        setInvoiceStatus(paid.status);
        setResultStatus('Paid');
        setStatus('1 CKB was released to Solver C');
        return;
      }

      setStatus('Result rejected. Cancelling the held payment…');
      const cancelled = await solver.current.cancelInvoice({ payment_hash: paymentHash });
      setInvoiceStatus(cancelled.status);
      setStatus('Payment cancelled. 1 CKB is available to Customer A again');
    } finally {
      setSubmittingDecision(false);
    }
  }

  function resetPayment() {
    setInvoice('');
    setPaymentHash('');
    setPreimage('');
    setInvoiceStatus('None');
    setPaymentStatus('Not sent');
    setPaymentAttemptError('');
    setResultStatus('Draft');
    setSelectedSampleId('within-limits');
    setReviewStep(null);
    setResult(null);
    setChecks([]);
    setStatus('Ready to create another payment request');
  }

  useEffect(() => {
    const refresh = async () => {
      if (customer.current) {
        const channels = (await customer.current.listChannels()).channels;
        setCustomerChannel(
          channels.find(
            (item) => item.pubkey.toLowerCase() === bottle.pubkey.toLowerCase(),
          ) ?? null,
        );
        await refreshFunding('customer', customer.current);
      }
      if (solver.current) {
        const channels = (await solver.current.listChannels()).channels;
        setSolverChannel(
          channels.find(
            (item) => item.pubkey.toLowerCase() === bottle.pubkey.toLowerCase(),
          ) ?? null,
        );
        await refreshFunding('solver', solver.current);
      }
    };
    void refresh();
    const timer = window.setInterval(() => void refresh(), 5_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!paymentHash) return;
    let checking = false;
    const poll = async () => {
      if (checking) return;
      checking = true;
      try {
        if (solver.current) {
          setInvoiceStatus(
            (await solver.current.getInvoice({ payment_hash: paymentHash })).status,
          );
        }
        if (customer.current && shouldPollPaymentSession(paymentStatus)) {
          setPaymentStatus(
            (await customer.current.getPayment({ payment_hash: paymentHash })).status,
          );
        }
      } finally {
        checking = false;
      }
    };
    void poll();
    const timer = window.setInterval(() => void poll(), 2_000);
    return () => window.clearInterval(timer);
  }, [paymentHash, paymentStatus]);

  useEffect(() => {
    if (invoiceStatus === 'Received' && resultStatus === 'Draft') {
      setResultStatus('Funded');
      setStatus('1 CKB is on hold. Choose a result to verify.');
    }
  }, [invoiceStatus, resultStatus]);

  const customerReady = ready(customerChannel);
  const solverReady = ready(solverChannel);
  const solverInbound = BigInt(solverChannel?.remote_balance ?? '0x0');
  const canReceive = solverReady && solverInbound >= 100_000_000n;
  const nodesPrepared = started.customer && started.solver;
  const participantLocks = setupParticipantLocks(nodesPrepared);
  const setupRole = nextSetupRole({
    customerReady,
    solverReady: canReceive,
  });
  const activeSetupDisclosure = setupDisclosureRole({
    nodesPrepared,
    customerReady,
    solverReady,
  });
  useEffect(() => {
    setExpandedSetupRole(activeSetupDisclosure);
  }, [activeSetupDisclosure]);
  const receipt = invoiceStatus === 'Paid' || invoiceStatus === 'Cancelled'
    ? paymentReceipt(invoiceStatus)
    : null;
  const groupedChecks = groupVerificationChecks(checks);
  const selectedChecks = verifyResult({ ...selectedSample.result });
  const selectedGroupedChecks = groupVerificationChecks(selectedChecks);
  const selectedDecision = paymentDecision({ ...selectedSample.result });
  const paymentRecovery = paymentRecoveryState(invoiceStatus, paymentAttemptError);
  const inboundRequirement = setupInboundActionRequirement({
    channelReady: solverReady,
    inboundReady: canReceive,
    busy: openingRoles.customer || openingRoles.solver,
  });
  const setupReviewParticipants = [
    setupParticipantSummary({
      role: 'customer',
      onChainBalance: funding.customer.balance,
      localBalance: BigInt(customerChannel?.local_balance ?? '0x0'),
      remoteBalance: BigInt(customerChannel?.remote_balance ?? '0x0'),
      channelReady: customerReady,
    }),
    setupParticipantSummary({
      role: 'solver',
      onChainBalance: funding.solver.balance,
      localBalance: BigInt(solverChannel?.local_balance ?? '0x0'),
      remoteBalance: BigInt(solverChannel?.remote_balance ?? '0x0'),
      channelReady: solverReady,
    }),
  ];
  const step = verifiedResultStep({
    setupReady: setupRole === 'complete',
    hasPaymentRequest: Boolean(invoice),
    invoiceStatus,
  });
  const displayedStep = reviewStep !== null && reviewStep < step ? reviewStep : step;
  const reviewing = displayedStep < step;
  const chooseStep = (requestedStep: number) => {
    const selectedStep = selectReviewStep(step, requestedStep);
    setReviewStep(selectedStep < step ? selectedStep : null);
  };
  useEffect(() => {
    setReviewStep((current) => current !== null && current >= step ? null : current);
  }, [step]);
  const chooseVerificationSample = (requestedId: VerificationSampleId) => {
    const nextId = selectVerificationSample(selectedSampleId, requestedId);
    setSelectedSampleId(nextId);
  };

  return <main>
    <header><span className="eyebrow">Fiber · Verified result payment</span><h1>Pay for a Verified Result</h1><p>Place a 1 CKB Testnet payment on hold, verify a sample 300 CKB route allocation, and release or cancel payment from the result.</p></header>
    <ol className="progress" aria-label="Tutorial progress">{progressSteps.map((label, index) => <li className={index < step ? 'done' : index === step ? 'current' : ''} data-viewing={index === displayedStep ? 'true' : 'false'} key={label}><button aria-current={index === displayedStep ? 'step' : undefined} disabled={index > step} onClick={() => chooseStep(index)} type="button"><i>{index < step ? '✓' : index + 1}</i><span>{label}</span></button></li>)}</ol>
    <p className="status" aria-live="polite">{status}</p>
    {reviewing && <div className="review-bar"><span>Reviewing: {progressSteps[displayedStep]}</span><button onClick={() => setReviewStep(null)} type="button">Return to current step</button></div>}

    <section className={`stage ${displayedStep === 0 && !reviewing ? 'setup-stage' : displayedStep === 1 ? 'payment-stage' : ''}`}>
      {reviewing ? <ReviewSummary checks={groupedChecks} invoiceStatus={invoiceStatus} participants={setupReviewParticipants} result={result} step={displayedStep}/> : <>
      {step === 0 && <div className="setup-sequence">
        <div className="setup-row">
          <i>1</i>
          <div><strong>Start Customer A and Solver C</strong><span>Starts two local browser nodes and connects both to Bottle.</span></div>
          <button className={!nodesPrepared ? 'primary' : ''} disabled={preparingNodes || nodesPrepared} onClick={() => void prepareNodes()} type="button">{preparingNodes ? 'Preparing…' : nodesPrepared ? 'Nodes running' : 'Prepare nodes'}</button>
        </div>
        <div className="setup-disclosures">
          <SetupParticipant channel={customerChannel} expanded={expandedSetupRole === 'customer'} funding={funding.customer} label="Customer A" locked={participantLocks.customer} nodeRunning={started.customer} nodeStarting={preparingNodes && preparingSetupRole === 'customer'} onOpen={() => void prepare('customer')} onRefresh={() => customer.current && void refreshFunding('customer', customer.current)} onToggle={() => setExpandedSetupRole((current) => current === 'customer' ? null : 'customer')} opening={openingRoles.customer} ready={customerReady} role="customer"/>
          <SetupParticipant channel={solverChannel} expanded={expandedSetupRole === 'solver'} funding={funding.solver} label="Solver C" locked={participantLocks.solver} nodeRunning={started.solver} nodeStarting={preparingNodes && preparingSetupRole === 'solver'} onOpen={() => void prepare('solver')} onRefresh={() => solver.current && void refreshFunding('solver', solver.current)} onToggle={() => setExpandedSetupRole((current) => current === 'solver' ? null : 'solver')} opening={openingRoles.solver} ready={solverReady} role="solver"/>
        </div>
        <div className="setup-row">
          <i>4</i>
          <div><strong>Prepare Solver C to receive</strong><span>{canReceive ? `${formatCkb(solverInbound)} is available on Bottle's side.` : 'Move 5 CKB to Bottle’s side so Solver C has inbound liquidity.'}</span></div>
          <ActionHint id="verified-inbound-requirement" label="Move funds requirements" reason={inboundRequirement}><button className={solverReady && !canReceive ? 'primary' : ''} disabled={!solverReady || canReceive || openingRoles.customer || openingRoles.solver} onClick={() => void prepareInbound()} type="button">{canReceive ? 'Ready to receive' : 'Move funds'}</button></ActionHint>
        </div>
      </div>}

      {step === 1 && <><Agreement/><div className="payment-lock"><code>K</code><div><strong>The release key stays private</strong><span>Once placed on hold, Customer A&apos;s 1 CKB stays pending. A passing result reveals K; a failing result cancels the payment.</span></div></div><div className="testnet"><strong>Testnet CKB</strong><span>This payment uses 1 Testnet CKB.</span></div>{!invoice ? <button className="primary" onClick={() => void createInvoice()}>Create payment request</button> : paymentStatus === 'Not sent' ? <div className="payment-attempt">{paymentRecovery.message && <div aria-live="polite" className="payment-recovery"><strong>{paymentRecovery.action === 'recreate' ? 'New request required' : 'Payment not submitted'}</strong><span>{paymentRecovery.message}</span></div>}<button className="primary" disabled={paymentAttempting} onClick={() => void (paymentRecovery.action === 'recreate' ? createInvoice() : fund())}>{paymentAttempting ? paymentRecovery.action === 'retry' ? 'Refreshing route…' : 'Placing 1 CKB on hold…' : paymentRecovery.actionLabel}</button></div> : <p className="waiting">Waiting for 1 CKB to be held · Customer A: {paymentStatus} · Payment request: {invoiceStatus}</p>}</>}

      {step === 2 && <><div className="testnet"><strong>Demo simulation</strong><span>{verificationSimulationNotice}</span></div><VerificationSampleCards onSelect={chooseVerificationSample} selectedId={selectedSampleId}/><VerificationCriteria checks={selectedGroupedChecks}/><button className={selectedDecision.passed ? 'primary' : 'cancel'} disabled={submittingDecision} onClick={() => void verifyAndComplete({ ...selectedSample.result })} type="button">{submittingDecision ? selectedDecision.passed ? 'Releasing 1 CKB…' : 'Cancelling payment…' : selectedDecision.actionLabel}</button></>}

      {receipt && <div aria-live="polite" className="receipt" data-outcome={invoiceStatus.toLowerCase()}><i className="receipt-mark">{invoiceStatus === 'Paid' ? '✓' : '↩'}</i><span>{receipt.statusLabel}</span><h2>{receipt.title}</h2><p>{receipt.description}</p><dl><div><dt>Result</dt><dd>{receipt.result}</dd></div><div><dt>Invoice</dt><dd>{invoiceStatus}</dd></div><div><dt>Final payment</dt><dd>{receipt.payment}</dd></div></dl><button onClick={resetPayment} type="button">Start another payment</button></div>}
      </>}
    </section>
  </main>;
}

function VerificationSampleCards({ onSelect, selectedId }: { onSelect: (id: VerificationSampleId) => void; selectedId: VerificationSampleId }) {
  return <div aria-label="Result examples" className="verification-sample-cards" role="group">{verificationSamples.map((sample) => <label className="verification-sample-card" data-selected={selectedId === sample.id ? 'true' : 'false'} key={sample.id}><input checked={selectedId === sample.id} name="verification-sample" onChange={() => onSelect(sample.id)} type="radio" value={sample.id}/><span><strong>{sample.label}</strong><small>{selectedId === sample.id ? 'Selected' : 'Select'}</small></span><span className="verification-sample-values">{Object.entries(sample.result).map(([route, value]) => <span key={route}><small>{route.replace('route', 'Route ')}</small><b>{value} CKB</b></span>)}</span></label>)}</div>;
}

function VerificationCriteria({ checks }: { checks: ReturnType<typeof groupVerificationChecks> }) {
  return <div aria-label="Selected result verification" className="verification-criteria">{checks.map((check) => <div data-passed={check.passed ? 'true' : 'false'} key={check.label}><i aria-hidden="true">{check.passed ? '✓' : '×'}</i><span>{check.label}</span><strong>{check.rule}</strong></div>)}</div>;
}

function ReviewSummary({ checks, invoiceStatus, participants, result, step }: { checks: ReturnType<typeof groupVerificationChecks>; invoiceStatus: CkbInvoiceStatus | 'None'; participants: ReturnType<typeof setupParticipantSummary>[]; result: AllocationResult | null; step: number }) {
  if (step === 0) return <div className="review-summary"><span className="eyebrow">Set up</span><h2>Payment route ready</h2><p>Customer A and Solver C each have a ready channel with Bottle.</p><div className="setup-review-grid">{participants.map((participant) => <section key={participant.label}><header><span>{participant.label}</span><strong className="ready-status"><i/>{participant.status}</strong></header><dl><div><dt>On-chain balance</dt><dd>{formatCkb(participant.onChainBalance)}</dd></div><div><dt>Channel with Bottle</dt><dd>{formatCkb(participant.channelBalance)}</dd></div><div><dt>{participant.liquidityLabel}</dt><dd>{formatCkb(participant.liquidityBalance)}</dd></div></dl></section>)}</div></div>;
  if (step === 1) return <><Agreement/><div className="review-state"><span>Payment request</span><strong>{invoiceStatus}</strong><p>The 1 CKB payment request was created and submitted before the result was accepted.</p></div></>;
  return <div className="review-summary"><span className="eyebrow">Customer A · Verification</span><h2>Verified route allocation</h2><p>Customer A evaluated this result against every acceptance rule.</p>{result && <div className="submitted">{Object.entries(result).map(([route, value]) => <div key={route}><span>{route.replace('route', 'Route ')}</span><strong>{value} CKB</strong></div>)}</div>}<VerificationCriteria checks={checks}/></div>;
}

function SetupParticipant({ channel, expanded, funding, label, locked, nodeRunning, nodeStarting, onOpen, onRefresh, onToggle, opening, ready: channelReady, role }: { channel: Channel | null; expanded: boolean; funding: RoleFunding; label: string; locked: boolean; nodeRunning: boolean; nodeStarting: boolean; onOpen: () => void; onRefresh: () => void; onToggle: () => void; opening: boolean; ready: boolean; role: Role }) {
  const [channelHistory, setChannelHistory] = useState<string[]>([]);
  const canOpen = channelFundingReady(funding.balance);
  const actionLabels = setupActionLabels(role);
  const actionState = channelActionState({
    stage: channelReady ? 'ready' : opening ? 'confirming' : 'idle',
    busy: opening,
  });
  const participantState = setupParticipantState({
    nodeRunning,
    nodeStarting,
  });
  const channelRequirement = setupChannelActionRequirement({
    role,
    nodePrepared: nodeRunning,
    fundingReady: canOpen,
    actionPending: opening,
    channelReady,
  });
  const currentChannelState = channel?.state.state_name;
  const expectedChannelState = currentChannelState
    ? nextObservedChannelState(currentChannelState)
    : null;

  useEffect(() => {
    if (!currentChannelState) return;
    setChannelHistory((states) =>
      appendObservedChannelState(states, currentChannelState),
    );
  }, [currentChannelState]);

  return <section className="setup-disclosure" data-expanded={expanded ? 'true' : 'false'} data-ready={channelReady ? 'true' : 'false'}>
    <button aria-expanded={expanded} className="setup-disclosure-header" disabled={locked} onClick={onToggle} type="button">
      <i>{role === 'customer' ? '2' : '3'}</i>
      <span><strong>{label}</strong><small>{role === 'customer' ? 'Fund the payer and open its outbound channel.' : 'Fund the recipient and open its channel.'}</small></span>
      <b className="setup-disclosure-status" data-tone={participantState.tone}><i/>{participantState.label}</b>
      <em aria-hidden="true"/>
    </button>
    {expanded && <div className="setup-disclosure-body">
      <div className="setup-task"><div className="funding"><span>{actionLabels.fund}</span><div><code title={funding.address}>{funding.address || 'Preparing address…'}</code><button disabled={!funding.address} onClick={() => funding.address && void navigator.clipboard.writeText(funding.address)} type="button">Copy</button></div><small>{!canOpen && 'Testnet funds required · '}Balance: {formatCkb(funding.balance)} · auto-checks every 5s</small></div><div className="setup-actions"><a className={!canOpen ? 'primary' : ''} href="https://faucet.nervos.org" rel="noreferrer" target="_blank">Get Testnet CKB ↗</a><button onClick={onRefresh} type="button">Refresh</button></div></div>
      <div className="setup-task"><div><strong>{actionLabels.open}</strong><small>499 CKB</small></div><ActionHint id={`verified-${role}-channel-requirement`} label={`Open ${label} channel requirements`} reason={channelRequirement}><button className={canOpen && !actionState.disabled ? 'primary' : ''} disabled={locked || !canOpen || actionState.disabled} onClick={onOpen} type="button">{actionState.label}</button></ActionHint></div>
      {channelHistory.length > 0 && <div className="channel-timeline"><span>Observed channel lifecycle</span><div>{channelHistory.map((state, index) => <span key={`${state}-${index}`}>{index > 0 && <i aria-hidden="true">→</i>}<b>{state}</b></span>)}{expectedChannelState && <span aria-label={`Waiting for ${expectedChannelState}`} className="pending"><i aria-hidden="true">→</i><b>{expectedChannelState}</b></span>}</div></div>}
    </div>}
  </section>;
}

function Agreement() {
  return <div className="contract"><div><span className="eyebrow">Job title</span><h3>Allocate exactly 300 CKB</h3></div><span className="criteria-label">Verification criteria</span><div className="limits"><span>A ≤ 120</span><span>B ≤ 100</span><span>C ≤ 80</span><span>Total = 300</span></div></div>;
}
