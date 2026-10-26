'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
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
import { channelOpeningProgress, channelStateLabel, isMultiHopChannelReady as isReadyState, multiHopStep, multiHopPaymentOutcome, paymentFailureMessage, paymentErrorDetail, invoiceAmountError, maximumInvoiceAmount, availableChannelBalance } from './multi-hop-progress';
import { participantStatusLabel } from '../../examples/tutorials/verified-result-payment/lib/job';
import { ExplainedTerm } from './explained-term';
import { createForwardPayment, type ForwardPayment } from './multi-hop-payment';
import { CopyValue } from './multi-hop-copy-value';
import { RestoreLiquidityPanel } from './multi-hop-restore-panel';
import styles from './fiber-wasm-quickstart.module.css';
import tutorialSource from './multi-hop-code.generated.json';
import { detectMultiHopProfiles, defaultSenderKey, receiverKey, senderChoiceKey, receiverChoiceKey, profileSetupLabel, type NodeProfileChoice } from './multi-hop-setup';

const channelAmount = '499';
const steps = ['Set up', 'Create invoice', 'Pay invoice', 'Outcome'];

type ChannelProgressStage =
  | 'idle'
  | 'connecting'
  | 'submitting'
  | 'confirming'
  | 'ready'
  | 'error';

// Source snapshot displayed by the article’s code panel.
const codeFiles: RoutingCodeFile[] = tutorialSource.codeFiles;
const sectionCode: Record<string, RoutingCodeFocus> = tutorialSource.sectionCode;

function sourceReference(section: string) {
  const focus = sectionCode[section];
  const file = codeFiles.find((file) => file.id === focus.file)!;
  return `${file.label} · lines ${focus.start}–${focus.end}`;
}

function progressFromChannelState(state: string): ChannelProgressStage {
  const normalized = state.replace(/[^a-z0-9]/gi, '').toLowerCase();
  if (normalized === 'channelready') return 'ready';
  if (normalized === 'awaitingchannelready') return 'confirming';
  return 'submitting';
}

function ChannelLiquidity({ left, right, leftAmount, rightAmount, leftDirection, rightDirection }: {
  left: string;
  right: string;
  leftAmount: bigint | undefined;
  rightAmount: bigint | undefined;
  leftDirection: string;
  rightDirection: string;
}) {
  const known = leftAmount !== undefined && rightAmount !== undefined;
  const total = (leftAmount ?? 0n) + (rightAmount ?? 0n);
  const share = known && total > 0n ? Number(leftAmount * 10_000n / total) / 100 : 0;
  return (
    <div className={styles.multiHopLiquidityChannel} role="group" aria-label={`${left}-${right} channel liquidity`}>
      <div className={styles.multiHopLiquidityTrack} aria-hidden="true">
        <b>{left}</b>
        <div className={styles.multiHopLiquidityBar} data-known={known}>
          <span style={{ width: `${share}%` }} />
        </div>
        <b>{right}</b>
      </div>
      <div className={styles.multiHopLiquidityLabels}>
        <div data-empty={leftAmount === 0n}><span>{leftDirection}</span><strong>{hexToCkb(leftAmount)} CKB</strong></div>
        <div><span>{rightDirection}</span><strong>{hexToCkb(rightAmount)} CKB</strong></div>
      </div>
    </div>
  );
}


function NodeSetup({
  number, title, profile, runtime, channelState, channelExists, progressStage,
  expanded, locked, onToggle, onConnectAndOpen,
}: {
  number: string;
  title: string;
  profile: NodeProfileChoice | null;
  runtime: ReturnType<typeof useFiberRoutingNode>;
  channelState: string;
  channelExists: boolean;
  progressStage: ChannelProgressStage;
  expanded: boolean;
  locked: boolean;
  onToggle: () => void;
  onConnectAndOpen: () => Promise<void>;
}) {
  const [openingRequested, setOpeningRequested] = useState(false);
  const hasFunding = (runtime.balance ?? 0n) >= BigInt(ckbToHex(channelAmount));
  const channelReady = isReadyState(channelState);
  const lifecycle = channelOpeningProgress(channelExists ? channelState : undefined);
  const pending = ['connecting', 'submitting', 'confirming'].includes(progressStage);
  const inAnotherTab = runtime.error.includes('another tutorial tab');
  const status = inAnotherTab ? 'In use in another tab' : channelExists ? channelStateLabel(channelState)
    : progressStage === 'error' ? 'Try again'
    : pending ? 'Waiting for channel state'
    : runtime.busy === 'start' ? 'Starting node…'
    : runtime.nodeInfo ? 'Node running' : 'Waiting for nodes';
  const tone = inAnotherTab ? 'error' : channelReady || (runtime.nodeInfo && !pending && progressStage !== 'error')
    ? 'success' : pending || runtime.busy === 'start' ? 'waiting' : 'idle';
  const channelRequirement = !runtime.nodeInfo ? 'Prepare the browser node first.'
    : !runtime.address ? 'Wait for the funding address.'
    : channelReady ? null
    : pending || channelExists ? 'Wait for CHANNEL_READY before paying.'
    : !hasFunding ? 'Not enough Testnet CKB to open this channel.'
    : runtime.busy ? 'Wait for the current action to finish.' : null;
  const channelAction = (
    <button
      className={`${styles.channelButton} ${styles.demoAction} ${hasFunding && !channelExists && !pending ? styles.demoPrimaryAction : ''}`}
      disabled={!runtime.nodeInfo || !runtime.address || channelExists || pending || !hasFunding || Boolean(runtime.busy)}
      onClick={() => {
        setOpeningRequested(true);
        void onConnectAndOpen();
      }}
      type="button"
    >
      {channelReady ? 'CHANNEL_READY' : 'Open channel'}
    </button>
  );

  return (
    <section className={styles.verifiedSetupDisclosure} data-expanded={expanded}>
      <button
        aria-controls={`multi-hop-node-${number}`}
        aria-expanded={expanded}
        className={styles.verifiedSetupDisclosureHeader}
        disabled={locked}
        onClick={onToggle}
        type="button"
      >
        <span className={styles.verifiedSetupDisclosureNumber}>{number}</span>
        <span className={styles.verifiedSetupDisclosureTitle}>
          <strong>{title}</strong>
          <small>{profile ? profileSetupLabel(profile, Boolean(runtime.nodeInfo)) : 'Checking saved profile…'}
            {runtime.nodeInfo ? channelReady ? ' · Channel is ready.' : channelExists ? ' · Channel opening; wait for confirmation.' : hasFunding ? ' · Funded; open a channel with Bottle.' : ' · Fund this node, then open a channel.' : profile?.saved ? ' · Start to check its funding and channel liquidity.' : ' · A separate identity will be created when you start.'}</small>
        </span>
        <span className={styles.verifiedSetupDisclosureStatus} data-tone={tone}>
          <i className={`${styles.statusDot} ${tone === 'success' ? styles.statusSuccess : tone === 'waiting' ? styles.statusWaiting : tone === 'error' ? styles.statusError : styles.statusIdle}`} />
          <b>{status}</b>
        </span>
        <i aria-hidden="true" className={styles.verifiedSetupChevron} />
      </button>
      {expanded && <div className={styles.verifiedSetupDisclosureBody} id={`multi-hop-node-${number}`}>
        <div className={styles.verifiedSetupTask}>
          <div className={styles.paymentFlowBody}>
            <strong>Fund the Testnet address</strong>
            {number === "3" && <span>C needs on-chain CKB to open its channel. Receiving payments also requires liquidity on Bottle’s side of that channel.</span>}
            <div className={styles.addressLine}>
              <code title={runtime.address}>{shorten(runtime.address)}</code>
              <CopyValue value={runtime.address} label="Copy address" iconOnly />
            </div>
            <span>On-chain balance: <b>{hexToCkb(runtime.balance)} CKB</b>. Allow more than 499 CKB for funding and fees.</span>
          </div>
          <div className={styles.fundingActions}>
            <a className={`${styles.faucetButton} ${styles.demoAction} ${!hasFunding ? styles.demoPrimaryAction : ''}`} href="https://faucet.nervos.org" rel="noreferrer" target="_blank">Get CKB ↗</a>
            <button className={`${styles.refreshButton} ${styles.demoAction}`} disabled={Boolean(runtime.busy)} onClick={() => void runtime.run('refresh', () => runtime.refresh())} type="button">Refresh</button>
          </div>
        </div>
        <div className={styles.verifiedSetupTask}>
          <div className={styles.paymentFlowBody}>
            <strong>Open a{' '}<ExplainedTerm explanation="The selected public peer requires at least 499 CKB to open a channel. Keep extra Testnet CKB available for the transaction fee." id={`multi-hop-channel-minimum-${number}`}>499 CKB</ExplainedTerm>{' '}channel</strong>
            <label>
              <input aria-label={`${title} channel funding amount in CKB`} disabled readOnly value={channelAmount} />
              <span>CKB</span>
            </label>
          </div>
          {channelRequirement ? <ExplainedTerm ariaLabel="Open channel" className={styles.disabledActionHint} explanation={channelRequirement} id={`multi-hop-channel-requirement-${number}`}>{channelAction}</ExplainedTerm> : channelAction}
        </div>
        {openingRequested && <div className={`${styles.channelTimeline} ${styles.multiHopLifecycle}`}>
          <span>Opening Channel <small>(This may take up to 1 min)</small></span>
          <div>
            {lifecycle.map(({ state, status }, index) => <span aria-current={status === 'current' ? 'step' : undefined} aria-label={`${state}: ${status}`} data-state={status} key={state}>{index > 0 && <i aria-hidden="true">→</i>}<b>{status === 'complete' && <i aria-hidden="true">✓ </i>}{state}</b></span>)}
          </div>
        </div>}
      </div>}
      {runtime.error && <div role="alert" className={styles.nodeChannelError}>{runtime.error}</div>}
    </section>
  );
}

export function FiberMultiHopInvoiceTutorial() {
  const [profiles, setProfiles] = useState<ReturnType<typeof detectMultiHopProfiles> | null>(null);
  const [freshStartRequested, setFreshStartRequested] = useState(false);
  const selectionEdited = useRef(false);
  const preparingRef = useRef(false);
  const sender = useFiberRoutingNode(profiles?.sender.key ?? defaultSenderKey);
  const receiver = useFiberRoutingNode(profiles?.receiver.key ?? receiverKey);
  const [amount, setAmount] = useState('1');
  const [restoreBlocked, setRestoreBlocked] = useState(true);
  const [generatedInvoice, setGeneratedInvoice] = useState('');
  const [paymentHash, setPaymentHash] = useState<`0x${string}` | ''>('');
  const [invoiceStatus, setInvoiceStatus] = useState<CkbInvoiceStatus | 'None'>('None');
  const [paymentFee, setPaymentFee] = useState<`0x${string}` | undefined>();
  const [paymentStatus, setPaymentStatus] = useState('Not sent');
  const [route, setRoute] = useState<string[]>([]);
  const [events, setEvents] = useState<string[]>([]);
  const [preparingNodes, setPreparingNodes] = useState(false);
  const [expandedRole, setExpandedRole] = useState<'sender' | 'receiver' | null>(null);
  const [reviewStep, setReviewStep] = useState<number | null>(null);
  const [invoiceAmount, setInvoiceAmount] = useState('1');
  const [paymentSubmitted, setPaymentSubmitted] = useState(false);
  const [paymentError, setPaymentError] = useState('');
  const [paymentErrorDetails, setPaymentErrorDetails] = useState('');
  const [mobileEventsExpanded, setMobileEventsExpanded] = useState(false);
  const [senderChannelProgress, setSenderChannelProgress] =
    useState<ChannelProgressStage>('idle');
  const [receiverChannelProgress, setReceiverChannelProgress] =
    useState<ChannelProgressStage>('idle');
  const forwardPayment = useRef<ReturnType<typeof createForwardPayment> | null>(null);
  const [paymentRecoveryReady, setPaymentRecoveryReady] = useState(false);
  const [paymentRecoveryError, setPaymentRecoveryError] = useState('');
  const [paymentRecovered, setPaymentRecovered] = useState(false);
  const paymentAttempting = useRef(false);
  const stageRef = useRef<HTMLElement | null>(null);
  const previousStep = useRef(0);

  const senderChannel = findReusableChannel(
    sender.channels,
    bottlePeer.pubkey,
  );
  const receiverChannel = findReusableChannel(
    receiver.channels,
    bottlePeer.pubkey,
  );
  const senderReady = Boolean(
    senderChannel && isReadyState(senderChannel.state.state_name),
  );
  const receiverReady = Boolean(
    receiverChannel && isReadyState(receiverChannel.state.state_name),
  );
  const nodesPrepared = Boolean(sender.nodeInfo && receiver.nodeInfo);
  const currentStep = multiHopStep({
    setupReady: senderReady && receiverReady,
    hasInvoice: Boolean(generatedInvoice),
    paymentStatus,
    invoiceStatus,
    paymentSubmitted,
  });
  const displayedStep = reviewStep !== null && reviewStep < currentStep ? reviewStep : currentStep;
  const reviewing = displayedStep < currentStep;
  const paymentOutcome = multiHopPaymentOutcome(paymentStatus, invoiceStatus);
  const paymentComplete = paymentOutcome === 'success';
  const rawPaymentError = paymentErrorDetails || (paymentSubmitted ? sender.error : '');
  const paymentPending = paymentSubmitted && paymentOutcome === 'pending';
  const invoiceExpired = invoiceStatus === 'Expired' || invoiceStatus === 'Cancelled';
  const invoiceStatusTone = invoiceStatus === 'Paid' ? styles.statusSuccess
    : invoiceExpired ? styles.statusError
    : invoiceStatus === 'Open' || invoiceStatus === 'Received' ? styles.statusWaiting
    : styles.statusIdle;
  const senderAvailable = availableChannelBalance(senderChannel?.local_balance, senderChannel?.offered_tlc_balance);
  const bottleSenderAvailable = availableChannelBalance(senderChannel?.remote_balance, senderChannel?.received_tlc_balance);
  // C's remote balance belongs to Bottle, which forwards the payment to C.
  const receiverAvailable = availableChannelBalance(receiverChannel?.remote_balance, receiverChannel?.received_tlc_balance);
  const receiverLocalAvailable = availableChannelBalance(receiverChannel?.local_balance, receiverChannel?.offered_tlc_balance);
  const maximumInvoice = maximumInvoiceAmount(senderAvailable, receiverAvailable);
  const amountError = invoiceAmountError(amount, senderAvailable, receiverAvailable);
  const amountValid = !amountError;

  useEffect(() => {
    if (previousStep.current === displayedStep) return;
    previousStep.current = displayedStep;
    stageRef.current?.focus({ preventScroll: true });
    if ((stageRef.current?.getBoundingClientRect().top ?? 0) < 80) {
      stageRef.current?.scrollIntoView({ block: 'start' });
    }
  }, [displayedStep]);

  useEffect(() => {
    if (!nodesPrepared) return;
    setExpandedRole(senderReady ? receiverReady ? null : 'receiver' : 'sender');
  }, [nodesPrepared, senderReady, receiverReady]);

  useEffect(() => {
    const inspect = () => {
      if (sender.nodeInfo || preparingRef.current || selectionEdited.current) return;
      const detected = detectMultiHopProfiles(window.localStorage);
      setProfiles(detected);
    };
    inspect();
    window.addEventListener('storage', inspect);
    return () => window.removeEventListener('storage', inspect);
  }, [sender.nodeInfo]);

  const startFreshNodes = () => {
    if (!profiles || preparingRef.current || sender.nodeInfo || receiver.nodeInfo) return;
    selectionEdited.current = true;
    sender.setError('');
    receiver.setError('');
    const id = crypto.randomUUID();
    setProfiles({
      sender: { key: `${defaultSenderKey}:fresh:${id}`, saved: false, source: 'new' },
      receiver: { key: `${receiverKey}:fresh:${id}`, saved: false, source: 'new' },
    });
    setFreshStartRequested(true);
  };

  const prepareNodes = async () => {
    if (!profiles || preparingRef.current) return;
    preparingRef.current = true;
    setPreparingNodes(true);
    try {
      window.localStorage.setItem(senderChoiceKey, profiles.sender.key);
      window.localStorage.setItem(receiverChoiceKey, profiles.receiver.key);
      await sender.start();
      if (!sender.nodeRef.current?.isRunning) return;
      await receiver.start();
    } catch (error) {
      sender.setError(error instanceof Error ? error.message : 'Unable to prepare the browser nodes.');
    } finally {
      preparingRef.current = false;
      setPreparingNodes(false);
    }
  };

  // Start after the new profile keys have reached both runtime hooks.
  useEffect(() => {
    if (!freshStartRequested) return;
    setFreshStartRequested(false);
    void prepareNodes();
  }, [freshStartRequested, prepareNodes]);

  useEffect(() => {
    if (senderChannel) {
      setSenderChannelProgress(
        progressFromChannelState(senderChannel.state.state_name),
      );
    }
  }, [senderChannel, senderReady]);

  useEffect(() => {
    if (receiverChannel) {
      setReceiverChannelProgress(
        progressFromChannelState(receiverChannel.state.state_name),
      );
    }
  }, [receiverChannel, receiverReady]);

  const addEvent = useCallback((message: string) => {
    setEvents((current) => [...current.slice(-8), message]);
  }, []);

  const openChannel = useCallback(
    async (
      runtime: ReturnType<typeof useFiberRoutingNode>,
      pubkey: `0x${string}`,
      label: string,
    ) => {
      const node = runtime.nodeRef.current;
      if (!node) return false;
      const latestChannels = (await node.listChannels()).channels;
      const existing = findReusableChannel(latestChannels, pubkey);
      if (existing) {
        addEvent(
          `${label} restored · ${channelStateLabel(existing.state.state_name)}`,
        );
        await runtime.refresh();
        return progressFromChannelState(existing.state.state_name);
      }

      const result = await runtime.run('open channel', (node) =>
        node.openChannel({
          pubkey,
          funding_amount: ckbToHex(channelAmount),
          public: true,
        }),
      );
      if (!result) return null;
      addEvent(`${label} submitted · ${shorten(result.temporary_channel_id)}`);
      await runtime.refresh();
      return 'confirming' as const;
    },
    [addEvent],
  );

  const connectAndOpen = useCallback(
    async (
      runtime: ReturnType<typeof useFiberRoutingNode>,
      label: string,
      setProgress: (stage: ChannelProgressStage) => void,
    ) => {
      runtime.setError('');
      setProgress('connecting');
      addEvent(`${label} · connecting to Bottle`);
      const alreadyConnected = runtime.peers.some((pubkey) =>
        samePubkey(pubkey, bottlePeer.pubkey),
      );
      const connected =
        alreadyConnected || (await runtime.connect(bottlePeer));
      if (!connected) {
        setProgress('error');
        addEvent(`${label} · connection failed`);
        return;
      }
      addEvent(`${label} · Bottle connected`);
      setProgress('submitting');
      let nextProgress: ChannelProgressStage | false | null;
      try {
        nextProgress = await openChannel(runtime, bottlePeer.pubkey, label);
      } catch (error) {
        runtime.setError(error instanceof Error ? error.message : 'Unable to open the channel.');
        setProgress('error');
        return;
      }
      if (!nextProgress) {
        setProgress('error');
        addEvent(`${label} · funding submission failed`);
        return;
      }
      setProgress(nextProgress);
      if (nextProgress === 'ready') {
        addEvent(`${label} · existing ready channel reused`);
      } else {
        addEvent(`${label} · existing or new channel is still progressing`);
      }
    },
    [addEvent, openChannel],
  );

  const createInvoice = useCallback(async () => {
    if (!paymentRecoveryReady || !amountValid || restoreBlocked || !senderReady || !receiverReady || receiver.busy) return;
    const result = await receiver.run('create invoice', (node) =>
      node.newInvoice({
        amount: ckbToHex(amount),
        currency: 'Fibt',
        description: 'Browser multi-hop tutorial',
        expiry: '0xe10',
        allow_trampoline_routing: true,
      }),
    );
    if (!result) return;
    try {
      forwardPayment.current?.setInvoice({ amount, invoice: result.invoice_address, hash: result.invoice.data.payment_hash });
      setPaymentRecovered(false);
      setReviewStep(null);
      addEvent(`Node C created ${amount} CKB invoice`);
    } catch (error) { setPaymentRecoveryError(paymentErrorDetail(error)); }
  }, [addEvent, amount, amountValid, restoreBlocked, paymentRecoveryReady, receiver, receiverReady, senderReady]);

  useEffect(() => {
    const payer = sender.nodeRef.current;
    const payee = receiver.nodeRef.current;
    if (!payer || !payee || !sender.nodeInfo || !receiver.nodeInfo) return;
    const apply = (record: ForwardPayment | null) => {
      setGeneratedInvoice(record?.invoice ?? '');
      setPaymentHash(record?.hash ?? '');
      setInvoiceAmount(record?.amount ?? '1');
      setPaymentFee(record?.fee);
      setPaymentStatus(record?.status ?? 'Not sent');
      setInvoiceStatus(record?.invoiceStatus ?? 'None');
      setPaymentSubmitted(record?.submitted ?? false);
      setRoute(record?.route ?? []);
      setPaymentErrorDetails(record?.detail ?? '');
      setPaymentError(record?.status === 'Failed' ? paymentFailureMessage(record.detail)
        : record?.detail ? 'Submission could not be confirmed. We are checking the saved payment; no second payment will be sent.' : '');
    };
    setPaymentRecoveryReady(false);
    setPaymentRecoveryError('');
    try {
      const flow = createForwardPayment({ payer, payee, bottle: bottlePeer.pubkey,
        key: `fiber-docs:forward-payment:${sender.nodeInfo.pubkey}:${receiver.nodeInfo.pubkey}`,
        storage: window.localStorage, onChange: apply });
      forwardPayment.current = flow;
      apply(flow.current());
      setPaymentRecovered(Boolean(flow.current()));
      setPaymentRecoveryReady(true);
      const check = () => void flow.check().catch(error => setPaymentRecoveryError(paymentErrorDetail(error)));
      check();
      const timer = window.setInterval(check, 2_000);
      return () => { flow.dispose(); forwardPayment.current = null; window.clearInterval(timer); };
    } catch (error) { setPaymentRecoveryError(paymentErrorDetail(error)); }
  }, [sender.nodeInfo?.pubkey, receiver.nodeInfo?.pubkey, sender.nodeRef, receiver.nodeRef]);

  const payInvoice = useCallback(async () => {
    if (!paymentRecoveryReady || !forwardPayment.current || paymentPending || paymentAttempting.current || sender.busy) return;
    paymentAttempting.current = true;
    setReviewStep(null);
    setPaymentRecoveryError('');
    try {
      await forwardPayment.current.send();
      addEvent('Checking the payment from Node A to Node C');
    } catch (error) { setPaymentRecoveryError(paymentErrorDetail(error)); }
    finally { paymentAttempting.current = false; }
  }, [addEvent, sender.busy, paymentPending, paymentRecoveryReady]);

  const checkPayment = async () => {
    try { await forwardPayment.current?.check(); }
    catch (error) { setPaymentRecoveryError(paymentErrorDetail(error)); }
  };

  const resetInvoice = () => {
    if (paymentPending || paymentAttempting.current || sender.busy || receiver.busy) return;
    try { forwardPayment.current?.clear(); }
    catch (error) { setPaymentRecoveryError(paymentErrorDetail(error)); return; }
    setPaymentRecovered(false);
    setAmount('1');
    setGeneratedInvoice('');
    setPaymentHash('');
    setInvoiceStatus('None');
    setPaymentFee(undefined);
    setPaymentStatus('Not sent');
    setPaymentSubmitted(false);
    setPaymentError('');
    setPaymentErrorDetails('');
    setReviewStep(null);
    setRoute([]);
    sender.setError('');
    receiver.setError('');
  };

  const article = (
    <>
      <section className={styles.section} data-tutorial-section="intro">
        <div className={styles.stepLabel}>How it works</div>
        <h2>Why use multi-hop payments?</h2>
        <p>
          Imagine paying a shop for the first time or using a paid service you have
          never connected to before. Opening and funding a new channel with every
          recipient would tie up funds and require waiting for on-chain confirmation.
          Multi-hop payments let you reach a recipient through existing channels,
          provided the route has enough available liquidity.
        </p>
        <p className={styles.followupParagraph}>
          In this tutorial, Sender A pays Receiver C through Bottle B. C creates an
          invoice requesting a specified amount of CKB, A submits it for payment,
          and Bottle forwards it. The payment redistributes liquidity across two channels
          without requiring a direct A–C channel or a new on-chain transaction for
          each payment. The sections below explain the code behind each operation.
        </p>
      </section>

      <section className={styles.section} data-tutorial-section="roles">
        <div className={styles.stepLabel}><span>1</span> Start two nodes</div>
        <h2>Start a separate node for the sender and receiver</h2>
        <p>
          <code>useFiberRoutingNode()</code> creates a runtime for each node, and
          <code> prepareNodes()</code> starts both nodes. Each node has its own
          identity, keys, and storage; A and C do not share private node state.
          If saved profiles are detected, the tutorial reuses those identities.
        </p>
        <p className={styles.followupParagraph}>
          A and C each open a separate public channel with Bottle. A public channel
          can be announced to the network for routing; it does not make the node’s
          private keys or secret payment data public. Connecting to Bottle and
          opening a channel are separate operations. <code>connectAndOpen()</code>
          connects the selected node to Bottle, and <code>openChannel()</code> reuses an existing channel from a saved node profile, if available,
          or opens a new public channel funded with the specified amount of CKB.
          The runtime also reconnects known peers when restoring channels.
        </p>
        <div className={styles.routeDiagram}>
          <b>Sender A</b><i>→</i><span>Bottle B · Public node</span><i>→</i><b>Receiver C</b>
        </div>
        <div className={styles.note}>
          <strong>Channel setup and liquidity</strong>
          <p>
            Both channels must reach <code>CHANNEL_READY</code> before paying.
            A needs enough available liquidity toward Bottle, and Bottle needs enough
            available liquidity toward C. Funding C’s side does not automatically
            provide Bottle with the liquidity needed to forward a payment to C.
            For funding, opening a channel, and understanding its lifecycle, see{' '}
            <a className={styles.inlineDownloadLink} href="/docs/build/open-channel-payment">
              Open a channel and send a payment
            </a>.
          </p>
        </div>
        <small className={styles.fileReference}>{sourceReference('roles')}</small>
      </section>

      <section className={styles.section} data-tutorial-section="liquidity">
        <div className={styles.stepLabel}><span>2</span> Manage liquidity</div>
        <h2>Choose an amount the route can carry</h2>
        <p className={styles.followupParagraph}>
          <code>invoiceAmountError()</code> checks for a positive amount with at
          most eight decimal places. The invoice limit is the smaller of A’s
          available liquidity minus the 1 CKB routing-fee budget, and Bottle’s
          available liquidity toward C (the remote side of C’s channel). Pending outgoing
          transfers on A and incoming transfers on C are excluded.
          However, these liquidity checks do not guarantee route availability at
          payment time. Liquidity and node connectivity can change before the
          payment is sent.
        </p>
        <p className={styles.followupParagraph}>
          If receiving liquidity runs low, <strong>Restore receiving liquidity</strong> lets C return funds through Bottle to A using the same channels.
          This increases Bottle’s liquidity toward C, allowing C to receive more payments.
        </p>
        <div className={`${styles.note} ${styles.noteInfo}`}>
          <strong>Restoring liquidity moves existing funds</strong>
          <p>The return amount defaults to 1 CKB for this campaign and can be changed.</p>
          <p>Returning funds incurs routing fees and redistributes liquidity between the existing channels. It does not add new funds.</p>
        </div>
        <small className={styles.fileReference}>{sourceReference('liquidity')}</small>
      </section>

      <section className={styles.section} data-tutorial-section="invoice">
        <div className={styles.stepLabel}><span>3</span> Create the invoice</div>
        <h2>Create the invoice on Receiver C</h2>
        <p>
          <code>createInvoice()</code> uses the amount entered in the form and
          calls <code>newInvoice()</code> through Receiver C’s runtime. The response
          contains the encoded payment request in <code>invoice_address</code>.
          The component saves it in <code>generatedInvoice</code> and saves its
          payment hash for status checks.
        </p>
        <p className={styles.followupParagraph}>
          <code>invoice_address</code> contains the long <code>fibt...</code> string
          shown in the tutorial. The prefix <code>fibt</code>
          identifies a Fiber Testnet invoice. Note that <code>invoice_address</code> is not a CKB wallet address.
          It encodes payment details, including the amount,
          expiry, and payment hash, for the sender to use.
        </p>
        <p className={styles.followupParagraph}>
          <code>ckbToHex(amount)</code> converts CKB to an amount in shannons,
          encoded as hexadecimal for the SDK (1 CKB = 100,000,000 shannons). <code>currency: 'Fibt'</code> selects Testnet,{' '}
          <code>expiry: '0xe10'</code> sets a one-hour expiry, and{' '}
          <code>allow_trampoline_routing: true</code> allows trampoline routing:
          the sender delegates onward route finding to another node. Here, that
          node is Bottle B. Creating an invoice requests payment; it does not
          transfer funds. The tutorial then opens the payment review step for A.
        </p>
        <div className={styles.note}>
          <strong>Payment hash and preimage</strong>
          <p>
            C keeps a secret called the preimage. Its hash is included in the
            invoice, while the secret itself is not. Conditional transfers along
            the route use this hash and timeouts to coordinate settlement or
            recovery if payment cannot complete. C reveals the preimage to settle
            the payment.
          </p>
        </div>
        <small className={styles.fileReference}>{sourceReference('invoice')}</small>
      </section>

      <section className={styles.section} data-tutorial-section="transfer">
        <div className={styles.stepLabel}><span>4</span> Transfer the invoice</div>
        <h2>Pass the generated invoice to Sender A</h2>
        <p>
          The review screen displays <code>generatedInvoice</code> as read-only
          text alongside the payment amount and maximum routing fee. The tutorial
          passes C’s invoice directly to A; no paste step is needed.
        </p>
        <p className={styles.followupParagraph}>
          <code>createForwardPayment()</code> creates the tutorial’s payment
          controller, which saves payment state and resumes status checks after a
          reload. When Send payment is clicked, <code>payInvoice()</code> asks this
          controller to submit the saved invoice.
        </p>
        <p className={styles.followupParagraph}>
          The invoice carries the payment request between the nodes; it does not
          move funds by itself. Applications with separate sender and receiver
          interfaces can deliver the same encoded request through a QR code, chat,
          or another text transport.
        </p>
        <small className={styles.fileReference}>{sourceReference('transfer')}</small>
      </section>

      <section className={styles.section} data-tutorial-section="route">
        <div className={styles.stepLabel}><span>5</span> Route the payment</div>
        <h2>Use Bottle as the single public intermediary</h2>
        <p>
          A selects Bottle B as its trampoline node to route the payment to C
          across the two channels.
        </p>
        <p className={styles.followupParagraph}>
          <code>payInvoice()</code> asks the payment controller to call <code>sendPayment()</code> on A with C’s saved invoice.{' '}
          <code>trampoline_hops: [bottlePeer.pubkey]</code> asks Bottle to
          handle onward routing through the A–Bottle and Bottle–C channels.{' '}
          <code>max_fee_amount: '0x5f5e100'</code> sets a routing-fee budget of
          1 CKB in addition to the invoice amount. Trampoline routing can use the
          full budget. The RPC result’s <code>fee</code> field reports the actual
          charge shown beside the maximum fee after a successful payment.
        </p>
        <p className={styles.followupParagraph}>
          In A–Bottle, A’s liquidity decreases and Bottle’s increases. In Bottle–C,
          Bottle’s liquidity decreases and C’s increases by the invoice amount.
          Bottle uses its own liquidity to forward the payment, and A covers any
          routing fee in addition to the amount C receives.
        </p>
        <small className={styles.fileReference}>{sourceReference('route')}</small>
      </section>

      <section className={styles.section} data-tutorial-section="status">
        <div className={styles.stepLabel}><span>6</span> Observe invoice state</div>
        <h2>Poll the node that created the invoice</h2>
        <p>
          Once an invoice exists, the payment controller polls Receiver C with
          <code> getInvoice()</code> every two seconds, using the payment hash to
          identify the invoice. The response updates <code>invoiceStatus</code>
          in the live demo and runtime panel. Polling begins before payment so
          the tutorial can also detect an expired invoice. A brief{' '}
          <code>Received</code> state may occur between checks.
        </p>
        <table className={styles.invoiceStatusTable} aria-label="Invoice statuses">
          <thead>
            <tr><th scope="col">Status</th><th scope="col">Meaning</th></tr>
          </thead>
          <tbody>
            <tr><th scope="row"><code>Open</code></th><td>The invoice is awaiting payment and can be paid.</td></tr>
            <tr><th scope="row"><code>Received</code></th><td>A payment has arrived but has not settled yet.</td></tr>
            <tr><th scope="row"><code>Paid</code></th><td>The payment has settled and the invoice is paid.</td></tr>
            <tr><th scope="row"><code>Cancelled</code></th><td>The invoice has been cancelled and can no longer be paid.</td></tr>
            <tr><th scope="row"><code>Expired</code></th><td>The invoice’s expiry time has passed. Create a new invoice to request payment.</td></tr>
          </tbody>
        </table>
        <small className={styles.fileReference}>{sourceReference('status')}</small>
      </section>

      <section className={styles.section} data-tutorial-section="result">
        <div className={styles.stepLabel}><span>7</span> Confirm both ends</div>
        <h2>Sender success and a paid invoice complete the flow</h2>
        <p>
          <code>multiHopPaymentOutcome()</code> reports success only when A’s
          payment status is <code>Success</code> and C’s invoice status is{' '}
          <code>Paid</code>. A sender status of <code>Failed</code> produces a failed
          outcome; otherwise the outcome stays pending. This keeps sender
          submission separate from confirmed receipt.
        </p>
        <p className={styles.followupParagraph}>
          Before submitting the payment, the controller saves its invoice,
          amount, payment hash, and submitted state. After a reload, restore the
          same browser nodes to resume status checks. The controller never
          automatically submits the saved payment again. An uncertain submission
          remains pending until its status can be confirmed.
        </p>
        <p className={styles.followupParagraph}>
          The payment hash identifies the payment for lookup; it is not standalone
          proof of receipt. <code>getPayment()</code> on A confirms the sender’s
          status, while <code>getInvoice()</code> on C confirms receipt. The
          Check payment status action runs these checks on demand.
        </p>
        <div className={styles.note}>
          <strong>If the payment does not complete</strong>
          <p>
            If the route has insufficient liquidity, try a smaller amount; either
            channel can limit the payment. If the invoice has expired, create
            another one. If waiting times out, check the existing payment’s status
            before submitting another payment: a timeout alone does not establish
            that the payment failed.
          </p>
        </div>
        <small className={styles.fileReference}>{sourceReference('result')}</small>
      </section>

      <section className={styles.section} data-tutorial-section="react">
        <div className={styles.stepLabel}><span>8</span> Wire React</div>
        <h2>Wire the two runtimes into React</h2>
        <p>
          <code>FiberMultiHopInvoiceTutorial()</code> owns both runtimes and the
          payment state. <code>amount</code> tracks the editable form value, while{' '}
          <code>invoiceAmount</code> preserves the amount used when the invoice was
          created. <code>generatedInvoice</code> holds the exact request paid by A.
          <code> paymentStatus</code> and <code>invoiceStatus</code> track each end
          independently.
        </p>
        <p className={styles.followupParagraph}>
          <code>multiHopStep()</code> selects the visible stage from channel
          readiness, invoice creation, and payment submission.{' '}
          <code>multiHopPaymentOutcome()</code> determines the result. Reviewing
          an earlier stage changes <code>reviewStep</code> without resetting the
          payment. <code>resetInvoice()</code> clears the invoice and result only
          when no payment is pending, allowing another invoice to be created.
        </p>
        <small className={styles.fileReference}>{sourceReference('react')}</small>
      </section>

      <section className={styles.section} data-tutorial-section="download">
        <div className={styles.stepLabel}>Optional local setup</div>
        <h2>Run the complete project locally</h2>
        <p>
          <a
            className={styles.inlineDownloadLink}
            download
            href="/downloads/fiber-multi-hop-invoice.zip"
          >
            Download the complete project
          </a>
          . The archive contains this live tutorial’s React component, runtime,
          styles, article, and code panel in a standalone Next.js application,
          with the required browser headers. After extracting it,
          open the <code>multi-hop-invoice</code> directory and run:
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
    </>
  );

  const liveDemo = (
    <div className={`${styles.channelDemoSurface} ${styles.multiHopDemo}`}>
      <div className={styles.paymentPreviewStage}>
        <div className={styles.paymentCard}>
          <div className={`${styles.paymentStatusGrid} ${styles.verifiedStatusGrid}`} aria-live="polite">
            {[
              { label: 'Sender A', value: participantStatusLabel({ nodeRunning: Boolean(sender.nodeInfo), roleReady: senderReady }), tone: sender.nodeInfo ? styles.statusSuccess : styles.statusIdle },
              { label: 'Receiver C', value: participantStatusLabel({ nodeRunning: Boolean(receiver.nodeInfo), roleReady: receiverReady }), tone: receiver.nodeInfo ? styles.statusSuccess : styles.statusIdle },
              { label: 'Invoice', value: invoiceStatus, tone: invoiceStatus === 'Paid' ? styles.statusSuccess : invoiceStatus === 'Cancelled' ? styles.statusError : invoiceStatus === 'Received' ? styles.statusWaiting : styles.statusIdle },
              { label: 'Result', value: paymentComplete ? 'Paid' : paymentStatus === 'Failed' ? 'Failed' : paymentPending ? 'Submitted' : '—', tone: paymentComplete ? styles.statusSuccess : paymentStatus === 'Failed' ? styles.statusError : paymentPending ? styles.statusWaiting : styles.statusIdle },
            ].map(({ label, value, tone }) => <div key={label}>
              <span>{label}</span>
              <strong className={styles.verifiedStatusValue}><i className={`${styles.statusDot} ${tone}`} /><b className={styles.verifiedStatusText}>{value}</b></strong>
            </div>)}
          </div>

          <ol className={styles.verifiedResultProgress} aria-label="Tutorial progress">
            {steps.map((label, index) => <li data-state={index < currentStep ? 'done' : index === currentStep ? 'current' : 'upcoming'} data-viewing={index === displayedStep} key={label}>
              <button aria-current={index === displayedStep ? 'step' : undefined} disabled={index > currentStep || (displayedStep === 1 && restoreBlocked)} onClick={() => setReviewStep(index < currentStep ? index : null)} type="button">
                <i>{index < currentStep ? '✓' : index + 1}</i><span>{label}</span>
              </button>
            </li>)}
          </ol>

          {reviewing && <div className={styles.verifiedReviewBar}>
            <span>Reviewing: {steps[displayedStep]}</span>
            <button onClick={() => setReviewStep(null)} type="button">Return to current step</button>
          </div>}

          <section className={`${styles.verifiedResultStage} ${styles.multiHopStage} ${displayedStep === 0 && !reviewing ? styles.verifiedSetupStage : ''}`} aria-label={steps[displayedStep]} ref={stageRef} tabIndex={-1}>
            {displayedStep === 0 && (reviewing ? <div className={styles.verifiedReviewSummary}>
              <span>Set up complete</span>
              <div className={styles.verifiedSetupReviewGrid}>
                {[
                  { label: 'Sender Node A', runtime: sender, channel: senderChannel },
                  { label: 'Receiver Node C', runtime: receiver, channel: receiverChannel },
                ].map(({ label, runtime, channel }) => <section key={label}>
                  <header><span>{label}</span><strong className={styles.verifiedStatusValue}><i className={`${styles.statusDot} ${channel && isReadyState(channel.state.state_name) ? styles.statusSuccess : styles.statusIdle}`} /><b className={styles.verifiedStatusText}>{channelStateLabel(channel?.state.state_name)}</b></strong></header>
                  <dl><div><dt>On-chain balance</dt><dd>{hexToCkb(runtime.balance)} CKB</dd></div><div><dt>Local channel liquidity</dt><dd>{hexToCkb(channel?.local_balance)} CKB</dd></div><div><dt>Remote channel liquidity</dt><dd>{hexToCkb(channel?.remote_balance)} CKB</dd></div></dl>
                </section>)}
              </div>
            </div> : <div className={styles.verifiedSetupNode}>
              <div className={styles.paymentFlow}>
                <div className={styles.paymentFlowNumber}>1</div>
                <div className={styles.paymentFlowBody}>
                  <strong>{!profiles ? 'Checking saved profiles…' : profiles.sender.saved || profiles.receiver.saved ? 'Continue with your existing browser nodes' : 'Set up your sender and receiver'}</strong>
                  <span>{profiles?.sender.source === 'earlier'
                    ? 'We found your browser node from an earlier tutorial. Reuse it as Sender A; Receiver C has a separate identity.'
                    : profiles?.sender.saved || profiles?.receiver.saved
                      ? 'Saved profiles found. Start the nodes to check their funding and channel liquidity.'
                      : 'Sender A sends the payment. Receiver C creates the invoice and receives it. Start to create their separate identities.'}</span>
                </div>
                <div className={styles.multiHopSetupActions}>
                <button
                  className={`${styles.startButton} ${styles.demoAction} ${!nodesPrepared ? styles.demoPrimaryAction : ''}`}
                  disabled={!profiles || preparingNodes || freshStartRequested || nodesPrepared}
                  onClick={sender.isolationReady === false || receiver.isolationReady === false ? () => window.location.reload() : () => void prepareNodes()}
                  type="button"
                >{preparingNodes ? 'Starting nodes…' : sender.isolationReady === false || receiver.isolationReady === false ? 'Reload to enable WASM' : nodesPrepared ? 'Nodes running' : sender.error || receiver.error ? 'Retry setup' : profiles?.sender.saved || profiles?.receiver.saved ? 'Restore nodes' : 'Prepare nodes'}</button>
                {(profiles?.sender.saved || profiles?.receiver.saved) && !sender.nodeInfo && !receiver.nodeInfo && <button
                  className={styles.demoAction}
                  disabled={preparingNodes || freshStartRequested}
                  onClick={startFreshNodes}
                  type="button"
                >Start fresh nodes</button>}
                </div>
              </div>
              <div className={styles.verifiedSetupDisclosures}>
                <NodeSetup
                  channelExists={Boolean(senderChannel)} channelState={senderChannel?.state.state_name ?? 'Not opened'}
                  expanded={expandedRole === 'sender'} locked={!nodesPrepared} number="2"
                  onToggle={() => setExpandedRole((role) => role === 'sender' ? null : 'sender')}
                  onConnectAndOpen={() => connectAndOpen(sender, 'Node A channel', setSenderChannelProgress)}
                  profile={profiles?.sender ?? null} progressStage={senderChannelProgress} runtime={sender} title="Sender A"
                />
                <NodeSetup
                  channelExists={Boolean(receiverChannel)} channelState={receiverChannel?.state.state_name ?? 'Not opened'}
                  expanded={expandedRole === 'receiver'} locked={!nodesPrepared} number="3"
                  onToggle={() => setExpandedRole((role) => role === 'receiver' ? null : 'receiver')}
                  onConnectAndOpen={() => connectAndOpen(receiver, 'Node C channel', setReceiverChannelProgress)}
                  profile={profiles?.receiver ?? null} progressStage={receiverChannelProgress} runtime={receiver} title="Receiver C"
                />
              </div>
            </div>)}

            {displayedStep === 1 && <div className={styles.multiHopForm}>
              {reviewing ? <>
                <div className={styles.verifiedReviewState}><span>Invoice amount</span><strong>{invoiceAmount} CKB</strong></div>
                <div className={styles.multiHopField}>
                  <span>Invoice created by Node C</span>
                  <div className={styles.multiHopInvoiceText}>
                    <code title={generatedInvoice}>{generatedInvoice}</code>
                    <CopyValue value={generatedInvoice} label="Copy invoice" iconOnly />
                  </div>
                </div>
                <button className={styles.verifiedPrimaryAction} disabled={paymentPending || Boolean(sender.busy) || Boolean(receiver.busy)} onClick={resetInvoice} type="button">Create another invoice</button>
                {paymentPending && <p className={styles.multiHopHelp}>Wait for this payment to finish before creating another invoice.</p>}
              </> : <>
                <label className={styles.multiHopField}>
                  <span>Enter an invoice amount for Receiver C <span className={styles.multiHopExpiryNote}>(Expires after one hour)</span></span>
                  <span className={styles.multiHopAmountInput}>
                    <input aria-invalid={!amountValid} aria-describedby={`invoice-amount-help${amountError ? ' invoice-amount-error' : ''}`} inputMode="decimal" onChange={(event) => setAmount(event.target.value)} value={amount} disabled={!paymentRecoveryReady || Boolean(paymentRecoveryError) || restoreBlocked || Boolean(receiver.busy)} />
                    <span>CKB</span>
                  </span>
                </label>
                {amountError && <p role="alert" className={styles.multiHopError} id="invoice-amount-error">{amountError}</p>}
                <div className={styles.multiHopLiquidity}>
                  <ChannelLiquidity left="A" right="B" leftAmount={senderAvailable} rightAmount={bottleSenderAvailable} leftDirection="Outbound from A" rightDirection="Inbound to A" />
                  <ChannelLiquidity left="B" right="C" leftAmount={receiverAvailable} rightAmount={receiverLocalAvailable} leftDirection="Inbound to C" rightDirection="Outbound from C" />
                </div>
                <p className={styles.multiHopHelp} id="invoice-amount-help">
                  Maximum invoice: <strong>{hexToCkb(maximumInvoice)} CKB</strong>
                  {maximumInvoice !== undefined && maximumInvoice > 0n && ' · 1 CKB reserved for routing fees'}
                </p>
                <details className={styles.multiHopLiquidityExplanation}>
                  <summary>How is available liquidity calculated?</summary>
                  <p>A new channel funded with 499 CKB normally reserves 99 CKB for on-chain settlement, leaving 400 CKB for payments before transfers and fees. Another 1 CKB is reserved for the maximum routing fee.</p>
                </details>
                <button className={`${styles.verifiedPrimaryAction} ${styles.multiHopInvoiceAction}`} disabled={!paymentRecoveryReady || Boolean(paymentRecoveryError) || restoreBlocked || !senderReady || !receiverReady || !amountValid || Boolean(receiver.busy)} onClick={() => void createInvoice()} type="button">{receiver.busy === 'create invoice' ? 'Creating invoice…' : 'Create invoice'}</button>
                {paymentRecoveryReady && !paymentRecoveryError && <RestoreLiquidityPanel sender={sender} receiver={receiver} onBlocked={setRestoreBlocked} onRestored={() => { setAmount('1'); addEvent('Receiving liquidity restored · C → Bottle B → A'); }} />}
              </>}
            </div>}

            {displayedStep === 2 && <div className={styles.multiHopForm}>
              <dl className={styles.multiHopPaymentDetails}>
                <div className={styles.multiHopPaymentAmount}>
                  <dt>Payment amount</dt>
                  <dd>{invoiceAmount} <span>CKB</span></dd>
                </div>
                <div>
                  <dt>Max. routing fee</dt>
                  <dd>1 CKB</dd>
                </div>
                {paymentComplete && <div><dt>Actual routing fee</dt><dd>{paymentFee !== undefined ? `${hexToCkb(paymentFee)} CKB` : 'Unavailable'}</dd></div>}
                <div>
                  <dt>Invoice generated by Receiver C</dt>
                  <dd className={styles.multiHopInvoiceText}><code title={generatedInvoice}>{generatedInvoice}</code></dd>
                </div>
              </dl>
              {!reviewing && <>
                <div className={styles.multiHopActions}>
                  {!invoiceExpired && <button className={styles.verifiedPrimaryAction} disabled={!paymentRecoveryReady || Boolean(paymentRecoveryError) || !senderReady || !receiverReady || !generatedInvoice || paymentPending || Boolean(sender.busy)} onClick={() => void payInvoice()} type="button">Send payment</button>}
                </div>
                {(invoiceExpired || paymentStatus === 'Failed') && !paymentPending && <div className={styles.verifiedReviewState}><strong>{invoiceExpired ? `This invoice is ${invoiceStatus.toLowerCase()}.` : 'Need to change the amount?'}</strong><p>Create a new request to continue with a different amount.</p><button disabled={Boolean(sender.busy) || Boolean(receiver.busy)} onClick={resetInvoice} type="button">Create a new invoice</button></div>}
              </>}
              {reviewing && <p className={styles.multiHopHelp}>View the payment status in Outcome.</p>}
            </div>}

            {displayedStep === 3 && <div className={styles.multiHopOutcome} aria-live="polite" data-outcome={paymentComplete ? 'paid' : paymentOutcome}>
              <header className={styles.multiHopOutcomeHeader}>
                <i className={styles.multiHopOutcomeMark} aria-hidden="true">
                  {paymentComplete ? '✓' : paymentOutcome === 'failed' ? '!' : <span className={styles.multiHopPendingDots}><i /><i /><i /></span>}
                </i>
                <h2>{paymentComplete ? 'Payment completed' : paymentOutcome === 'failed' ? 'Payment failed' : 'Payment pending'}</h2>
              </header>
              {!paymentComplete && <p className={styles.multiHopHelp}>{paymentError || (paymentStatus === 'Success' ? 'Sender A has sent the payment. Waiting for Receiver C to confirm receipt.' : 'Your payment is being routed to Receiver C. Keep this page open while we check its status.')}</p>}
              {!paymentComplete && rawPaymentError && <p className={styles.multiHopError}><strong>Fiber error: </strong>{rawPaymentError}</p>}
              <dl className={styles.multiHopOutcomeFacts}>
                <div className={styles.multiHopOutcomeAmount}><dt>{paymentComplete ? 'Amount received' : 'Payment amount'}</dt><dd>{invoiceAmount} <span>CKB</span></dd></div>
                <div><dt>Routing fee</dt><dd>Actual: {paymentComplete ? paymentFee !== undefined ? `${hexToCkb(paymentFee)} CKB` : 'Unavailable' : paymentOutcome === 'failed' ? 'Unavailable' : 'Pending'} · Maximum: 1 CKB</dd></div>
                <div><dt>Payment flow</dt><dd className={styles.multiHopOutcomeFlow}><span>Sender A</span><i aria-hidden="true">→</i><span>Bottle B</span><i aria-hidden="true">→</i><span>Receiver C</span></dd></div>
                <div><dt>Invoice status</dt><dd className={styles.multiHopOutcomeInvoice}><i aria-hidden="true" className={`${styles.statusDot} ${invoiceStatusTone}`} />{invoiceStatus}</dd></div>
              </dl>
              {paymentComplete && <div className={styles.multiHopField}>
                <span id="payment-proof-label">Payment hash</span>
                <div className={styles.multiHopProofValue}>
                  <code aria-labelledby="payment-proof-label" className={styles.multiHopHash}>{paymentHash}</code>
                  <CopyValue value={paymentHash} label="Copy payment hash" iconOnly />
                </div>
              </div>}
              {paymentPending && <button disabled={Boolean(sender.busy)} onClick={() => void checkPayment()} type="button">Check payment status</button>}
              {paymentOutcome === 'failed' && <p className={styles.multiHopHelp}>Create another invoice to try again with a new payment hash.</p>}
              {!paymentPending && <button disabled={Boolean(sender.busy) || Boolean(receiver.busy)} onClick={resetInvoice} type="button">Create another invoice</button>}
            </div>}
            {paymentRecovered && generatedInvoice && <p className={styles.multiHopHelp}>Restored your saved {paymentSubmitted ? 'payment' : 'invoice'}. {paymentPending ? 'Checking its status; no new payment has been sent.' : 'Its current status is shown above.'}</p>}
            {paymentRecoveryError && <p role="alert" className={styles.multiHopError}>{paymentRecoveryError}</p>}
            {displayedStep !== 0 && (receiver.error || (sender.error && !paymentSubmitted)) && <div className={styles.multiHopError} role="alert">{receiver.error || sender.error}</div>}
          </section>
        </div>

        <aside className={`${styles.eventPanel} ${styles.multiHopEvents}`} aria-label="Runtime events and results">
          <div className={`${styles.eventPanelHeader} ${styles.multiHopDesktopEventHeader}`}><span>Runtime events and results</span><i className={styles.liveDot} /></div>
          <button aria-controls="multi-hop-event-body" aria-expanded={mobileEventsExpanded} className={`${styles.eventPanelHeader} ${styles.mobileEventToggle}`} onClick={() => setMobileEventsExpanded((expanded) => !expanded)} type="button">
            <span>Runtime events and results</span><span aria-hidden="true">{mobileEventsExpanded ? '−' : '+'}</span>
          </button>
          <div className={styles.multiHopEventBody} data-expanded={mobileEventsExpanded} id="multi-hop-event-body">
          <div className={styles.multiHopRoute} aria-label="Channels connecting Node A to Bottle and Bottle to Node C"><b>Node A</b><span className={styles.multiHopChannelConnector} aria-hidden="true" /><b>Bottle</b><span className={styles.multiHopChannelConnector} aria-hidden="true" /><b>Node C</b></div>
          <div className={styles.eventList} aria-live="polite">
            <div className={sender.nodeInfo ? styles.eventConnected : undefined}><time>A</time><code>sender</code><span>{sender.nodeInfo ? sender.nodeState : 'Node not started'}</span></div>
            <div className={receiver.nodeInfo ? styles.eventConnected : undefined}><time>C</time><code>receiver</code><span>{receiver.nodeInfo ? receiver.nodeState : 'Node not started'}</span></div>
            <div><time>A</time><code>A-B channel</code><span>{channelStateLabel(senderChannel?.state.state_name)}</span></div>
            <div><time>C</time><code>C-B channel</code><span>{channelStateLabel(receiverChannel?.state.state_name)}</span></div>
            <div><time>INV</time><code>invoice</code><span>{invoiceStatus}</span></div>
            <div className={paymentStatus === 'Success' ? styles.eventConnected : paymentStatus === 'Failed' ? styles.eventError : undefined}><time>PAY</time><code>payment</code><span>{paymentStatus}</span></div>
            {route.map((pubkey, index) => <div key={`${pubkey}-${index}`}><time>H{index + 1}</time><code>route_hop</code><span>{shorten(pubkey)}</span></div>)}
            {events.map((event, index) => <div key={`${event}-${index}`}><time>{String(index + 1).padStart(2, '0')}</time><code>event</code><span>{event}</span></div>)}
            {(sender.error || receiver.error || paymentError) && <div className={styles.eventError}><time>!</time><code>error</code><span>{paymentError || receiver.error || (paymentSubmitted ? paymentFailureMessage(sender.error) : sender.error)}</span></div>}
            {!paymentComplete && rawPaymentError && <div className={styles.eventError}><time>!</time><code>fiber_error</code><span>{rawPaymentError}</span></div>}
          </div>
          </div>
        </aside>
      </div>
    </div>
  );

  return (
    <RoutingTutorialFrame
      article={article}
      codeFiles={codeFiles}
      currentTutorialIndex={2}
      defaultFile="demo"
      demoDescription="You control Sender A and Receiver C in this browser. Bottle B is the public node that forwards payments between them."
      demoTitle="Send a Multi-Hop Invoice Payment"
      demoFirst
      walkthroughDescription="Follow the live source that prepares two nodes, creates an invoice, and confirms a payment through Bottle."
      downloadHref="/downloads/fiber-multi-hop-invoice.zip"
      liveDemo={liveDemo}
      nextHref="/docs/build/unidirectional-channel"
      previousHref="/docs/build/open-channel-payment"
      sectionCode={sectionCode}
    />
  );
}
