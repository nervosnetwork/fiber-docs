'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
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
import styles from './fiber-wasm-quickstart.module.css';

const channelAmount = '499';

type ChannelProgressStage =
  | 'idle'
  | 'connecting'
  | 'submitting'
  | 'confirming'
  | 'ready'
  | 'error';

const codeFiles: RoutingCodeFile[] = [
  {
    id: 'fiber',
    label: 'lib/fiber.ts',
    language: 'typescript',
    code: `import {
  FiberBrowserNode,
  RawKeyCredentialProvider,
} from '@fiber-pay/sdk/browser';

export const bottle = {
  pubkey: '0x02b6d4e3...302be71',
  address: '/dns4/bottle.fiber.channel/tcp/443/wss/p2p/QmXen3e...XJ1Eo',
};

export async function startRole(
  role: 'sender' | 'receiver',
  credential: RawKeyCredentialProvider,
) {
  const node = new FiberBrowserNode({
    network: 'testnet',
    credential,
    nodeConfig: { bootnodes: [], logLevel: 'info' },
  });
  await node.start();
  await node.connectPeer(bottle);
  return node;
}`,
  },
  {
    id: 'invoice',
    label: 'lib/invoice.ts',
    language: 'typescript',
    code: `import type { FiberBrowserNode } from '@fiber-pay/sdk/browser';
import { ckbToHex } from './amounts';

export async function createReceiverInvoice(
  node: FiberBrowserNode,
  amount: string,
) {
  return node.newInvoice({
    amount: ckbToHex(amount),
    currency: 'Fibt',
    description: 'Browser multi-hop tutorial',
    expiry: '0xe10',
    allow_trampoline_routing: true,
  });
}

export async function readInvoiceStatus(
  node: FiberBrowserNode,
  paymentHash: \`0x\${string}\`,
) {
  return node.getInvoice({ payment_hash: paymentHash });
}`,
  },
  {
    id: 'transfer',
    label: 'lib/invoice-transfer.ts',
    language: 'typescript',
    code: `export async function copyInvoice(invoice: string) {
  await navigator.clipboard.writeText(invoice);
}

export async function pasteInvoice() {
  const invoice = (await navigator.clipboard.readText()).trim();
  if (!invoice) throw new Error('The clipboard is empty');
  return invoice;
}

// The encoded invoice can also travel through a QR code,
// chat message, email, or any other text transport.`,
  },
  {
    id: 'payment',
    label: 'lib/payment.ts',
    language: 'typescript',
    code: `import type { FiberBrowserNode } from '@fiber-pay/sdk/browser';
import { bottle } from './fiber';
import { ckbToHex } from './amounts';

export async function payMultiHopInvoice(
  node: FiberBrowserNode,
  invoice: string,
) {
  const submitted = await node.sendPayment({
    invoice,
    trampoline_hops: [bottle.pubkey],
    max_fee_amount: ckbToHex('1'),
  });

  if (submitted.status === 'Success' || submitted.status === 'Failed') {
    return submitted;
  }
  return node.waitForPayment(submitted.payment_hash, {
    timeout: 60_000,
    interval: 1_000,
  });
}`,
  },
  {
    id: 'app',
    label: 'app/multi-hop/page.tsx',
    language: 'tsx',
    code: `'use client';

import { useRef, useState } from 'react';
import { createReceiverInvoice } from '@/lib/invoice';
import { copyInvoice, pasteInvoice } from '@/lib/invoice-transfer';
import { payMultiHopInvoice } from '@/lib/payment';

export default function MultiHopPage() {
  const sender = useRef(null);
  const receiver = useRef(null);
  const [generatedInvoice, setGeneratedInvoice] = useState('');
  const [senderInvoice, setSenderInvoice] = useState('');
  const [status, setStatus] = useState('Waiting');

  async function createInvoice() {
    if (!receiver.current) return;
    const result = await createReceiverInvoice(receiver.current, '1');
    setGeneratedInvoice(result.invoice_address);
    await copyInvoice(result.invoice_address);
  }

  async function pasteForSender() {
    setSenderInvoice(await pasteInvoice());
  }

  async function pay() {
    if (!sender.current || !senderInvoice) return;
    const result = await payMultiHopInvoice(sender.current, senderInvoice);
    setStatus(result.status);
  }

  return <main>
    <button onClick={createInvoice}>Create invoice and copy</button>
    <button onClick={pasteForSender}>Paste into Node A</button>
    <button onClick={pay}>Pay invoice</button>
    <p>{status}</p>
  </main>;
}`,
  },
];

const sectionCode: Record<string, RoutingCodeFocus> = {
  roles: { file: 'fiber', start: 11, end: 24 },
  invoice: { file: 'invoice', start: 4, end: 14 },
  status: { file: 'invoice', start: 16, end: 22 },
  transfer: { file: 'transfer', start: 1, end: 13 },
  route: { file: 'payment', start: 5, end: 14 },
  result: { file: 'payment', start: 16, end: 22 },
  react: { file: 'app', start: 8, end: 30 },
};

function isReadyState(state: string) {
  return state.toLowerCase().includes('ready');
}

function progressFromChannelState(state: string): ChannelProgressStage {
  const normalized = state.replace(/[^a-z0-9]/gi, '').toLowerCase();
  if (normalized === 'channelready') return 'ready';
  if (normalized === 'awaitingchannelready') return 'confirming';
  return 'submitting';
}

function CopyValue({ value, label = 'Copy' }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      disabled={!value}
      onClick={async () => {
        await navigator.clipboard.writeText(value);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1_500);
      }}
      type="button"
    >
      {copied ? 'Copied' : label}
    </button>
  );
}

function NodeSetup({
  number,
  title,
  peerName,
  runtime,
  channelState,
  channelExists,
  progressStage,
  onConnectAndOpen,
}: {
  number: string;
  title: string;
  peerName: string;
  runtime: ReturnType<typeof useFiberRoutingNode>;
  channelState: string;
  channelExists: boolean;
  progressStage: ChannelProgressStage;
  onConnectAndOpen: () => Promise<void>;
}) {
  const hasFunding = (runtime.balance ?? 0n) >= BigInt(ckbToHex(channelAmount));
  const connected = runtime.peers.some((pubkey) =>
    samePubkey(pubkey, bottlePeer.pubkey),
  );
  const channelReady = isReadyState(channelState);
  const channelActionPending =
    progressStage === 'connecting' ||
    progressStage === 'submitting' ||
    progressStage === 'confirming' ||
    progressStage === 'ready';
  const progress = [
    {
      label: 'Connect peer',
      complete: connected,
      active: progressStage === 'connecting',
    },
    {
      label: 'Submit funding',
      complete: channelExists || progressStage === 'confirming' || channelReady,
      active: progressStage === 'submitting',
    },
    {
      label: 'Confirm on-chain',
      complete: channelReady,
      active: progressStage === 'confirming',
    },
    {
      label: 'Channel ready',
      complete: channelReady,
      active: false,
    },
  ];
  return (
    <div className={styles.multiHopNodeSetup}>
      <div className={styles.paymentFlow}>
        <div className={styles.paymentFlowNumber}>{number}</div>
        <div>
          <strong>{title}</strong>
          <span>Start locally, then fund and open a channel to {peerName}.</span>
        </div>
        <div className={styles.compactActions}>
          <button
            className={styles.startButton}
            disabled={Boolean(runtime.nodeInfo) || Boolean(runtime.busy)}
            onClick={runtime.start}
          >
            {runtime.busy === 'start' ? 'Starting…' : 'Start'}
          </button>
          <button
            className={styles.connectButton}
            disabled={
              !runtime.nodeInfo ||
              channelExists ||
              channelActionPending ||
              !hasFunding ||
              Boolean(runtime.busy)
            }
            onClick={() => void onConnectAndOpen()}
          >
            {progressStage === 'connecting' || runtime.busy.startsWith('connect')
              ? 'Connecting…'
              : progressStage === 'submitting' || runtime.busy === 'open channel'
                ? 'Opening…'
                : progressStage === 'confirming'
                  ? 'Confirming…'
                  : progressStage === 'ready' || channelReady
                    ? 'Channel ready'
                    : channelExists
                      ? 'Channel submitted'
                      : connected
                        ? `Open ${channelAmount} CKB`
                        : 'Connect & open'}
          </button>
        </div>
      </div>
      <div className={styles.multiHopFunding}>
        <div>
          <span>Funding address</span>
          <code title={runtime.address}>{shorten(runtime.address, 13, 10)}</code>
          <CopyValue value={runtime.address} />
        </div>
        <div>
          <span>On-chain balance</span>
          <strong>{hexToCkb(runtime.balance)} CKB</strong>
          <a href="https://faucet.nervos.org" rel="noreferrer" target="_blank">Faucet ↗</a>
        </div>
        <div>
          <span>Public channel</span>
          <strong>{channelState}</strong>
          <small>{channelAmount} CKB capacity</small>
        </div>
      </div>
      <div className={styles.channelConnectionProgress}>
        <span>Channel progress</span>
        <div>
          {progress.map((step, index) => (
            <div
              className={`${step.complete ? styles.channelProgressComplete : ''} ${step.active ? styles.channelProgressActive : ''}`}
              key={step.label}
            >
              <i>{step.complete ? '✓' : index + 1}</i>
              <small>{step.label}</small>
              {index < progress.length - 1 && <b aria-hidden="true">→</b>}
            </div>
          ))}
        </div>
        {progressStage === 'confirming' && (
          <p>
            Funding submitted. The node may retry while CKB confirms and indexes
            the transaction. Keep this page open and do not submit again.
          </p>
        )}
      </div>
      {runtime.error && (
        <div className={styles.nodeChannelError}>{runtime.error}</div>
      )}
    </div>
  );
}

export function FiberMultiHopInvoiceTutorial() {
  const sender = useFiberRoutingNode('fiber-docs:multi-hop-sender-v1');
  const receiver = useFiberRoutingNode('fiber-docs:multi-hop-receiver-v1');
  const [amount, setAmount] = useState('1');
  const [generatedInvoice, setGeneratedInvoice] = useState('');
  const [invoiceCopied, setInvoiceCopied] = useState(false);
  const [invoiceCopyError, setInvoiceCopyError] = useState('');
  const [senderInvoice, setSenderInvoice] = useState('');
  const [paymentHash, setPaymentHash] = useState<`0x${string}` | ''>('');
  const [invoiceStatus, setInvoiceStatus] = useState<CkbInvoiceStatus | 'None'>('None');
  const [paymentStatus, setPaymentStatus] = useState('Not sent');
  const [route, setRoute] = useState<string[]>([]);
  const [events, setEvents] = useState<string[]>([]);
  const [transferError, setTransferError] = useState('');
  const [senderChannelProgress, setSenderChannelProgress] =
    useState<ChannelProgressStage>('idle');
  const [receiverChannelProgress, setReceiverChannelProgress] =
    useState<ChannelProgressStage>('idle');
  const invoiceChecking = useRef(false);

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
          `${label} restored · ${existing.state.state_name}`,
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
      const nextProgress = await openChannel(runtime, bottlePeer.pubkey, label);
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
    setInvoiceCopied(false);
    setInvoiceCopyError('');
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
    setGeneratedInvoice(result.invoice_address);
    setPaymentHash(result.invoice.data.payment_hash);
    setInvoiceStatus('Open');
    setSenderInvoice('');
    setTransferError('');
    try {
      await navigator.clipboard.writeText(result.invoice_address);
      setInvoiceCopied(true);
      window.setTimeout(() => setInvoiceCopied(false), 1_500);
      addEvent(`Node C created and copied ${amount} CKB invoice`);
    } catch {
      setInvoiceCopyError(
        'Invoice created, but automatic copying was blocked. Select the invoice text and copy it manually.',
      );
      addEvent(`Node C created ${amount} CKB invoice`);
    }
  }, [addEvent, amount, receiver]);

  useEffect(() => {
    if (!paymentHash || !receiver.nodeInfo) return;
    const check = async () => {
      if (invoiceChecking.current || !receiver.nodeRef.current) return;
      invoiceChecking.current = true;
      try {
        const result = await receiver.nodeRef.current.getInvoice({
          payment_hash: paymentHash,
        });
        setInvoiceStatus((current) => {
          if (current !== result.status) addEvent(`Invoice · ${result.status}`);
          return result.status;
        });
      } finally {
        invoiceChecking.current = false;
      }
    };
    void check();
    const timer = window.setInterval(() => void check(), 2_000);
    return () => window.clearInterval(timer);
  }, [addEvent, paymentHash, receiver.nodeInfo, receiver.nodeRef]);

  const pasteInvoice = useCallback(async () => {
    setTransferError('');
    try {
      const value = (await navigator.clipboard.readText()).trim();
      if (!value) throw new Error('The clipboard is empty.');
      setSenderInvoice(value);
      addEvent('Invoice pasted into Node A');
    } catch (error) {
      setTransferError(
        error instanceof Error
          ? `${error.message} You can paste directly into the field.`
          : 'Unable to read the clipboard. Paste directly into the field.',
      );
    }
  }, [addEvent]);

  const payInvoice = useCallback(async () => {
    const invoice = senderInvoice.trim();
    if (!invoice) return;
    setPaymentStatus('Sending');
    addEvent('Node A submitted the pasted invoice');
    const submitted = await sender.run('send payment', (node) =>
      node.sendPayment({
        invoice,
        trampoline_hops: [bottlePeer.pubkey],
        max_fee_amount: ckbToHex('1'),
      }),
    );
    if (!submitted) {
      setPaymentStatus('Failed');
      return;
    }
    const result =
      submitted.status === 'Success' || submitted.status === 'Failed'
        ? submitted
        : await sender.nodeRef.current!.waitForPayment(submitted.payment_hash, {
            timeout: 60_000,
            interval: 1_000,
          });
    setPaymentStatus(result.status);
    setRoute(result.routers?.[0]?.nodes.map((node) => node.pubkey) ?? []);
    addEvent(`${result.status} · ${shorten(result.payment_hash)}`);
  }, [addEvent, sender, senderInvoice]);

  const article = (
    <>
      <header className={styles.hero} data-tutorial-section="intro">
        <div className={styles.eyebrow}>
          <span>Routing</span>
          <span className={styles.eyebrowRule} />
          <span>25 minute tutorial</span>
        </div>
        <h1>Send a Multi-Hop Invoice Payment</h1>
        <p className={styles.lead}>
          Run sender and receiver Fiber nodes in one React page, copy the Invoice
          created by Node C, and paste it into Node A before paying through one
          public Fiber node.
        </p>
        <div className={styles.heroMeta}>
          <span>Invoice</span><span>Multi-hop</span><span>Copy and paste</span>
        </div>
      </header>

      <section className={styles.section} data-tutorial-section="roles">
        <div className={styles.stepLabel}><span>1</span> Start two roles</div>
        <h2>Keep Node A and Node C as separate identities</h2>
        <p>
          The page starts two independent Fiber WASM nodes with different local keys
          and storage identifiers. Node A and Node C each connect to Bottle, but
          they open separate public channels and do not share private node state.
        </p>
        <div className={styles.routeDiagram}>
          <b>Node A</b><i>→</i><span>Bottle · Public node</span><i>→</i><b>Node C</b>
        </div>
        <small className={styles.fileReference}>lib/fiber.ts · lines 11–24</small>
      </section>

      <section className={styles.section} data-tutorial-section="invoice">
        <div className={styles.stepLabel}><span>2</span> Create the invoice</div>
        <h2>Let the receiver own the payment hash and preimage</h2>
        <p>
          After Node C has a ready public channel, call <code>newInvoice()</code>.
          Node C stores the invoice state and the secret required to settle the final
          TLC. The encoded Invoice is safe to hand to the payer.
        </p>
        <small className={styles.fileReference}>lib/invoice.ts · lines 4–14</small>
      </section>

      <section className={styles.section} data-tutorial-section="transfer">
        <div className={styles.stepLabel}><span>3</span> Transfer the invoice</div>
        <h2>Copy from Node C, then paste into Node A</h2>
        <p>
          Copying makes the boundary explicit: an Invoice is portable text, not a
          privileged server message. The same value could be delivered by QR code,
          chat, email, or another application without changing the Fiber payment.
        </p>
        <div className={styles.note}>
          <strong>No coordination backend</strong>
          <p>
            This tutorial keeps both nodes on one page for convenience, but transfers
            only the encoded Invoice through the clipboard. Production applications
            may choose any transport appropriate for their users.
          </p>
        </div>
        <small className={styles.fileReference}>lib/invoice-transfer.ts · lines 1–13</small>
      </section>

      <section className={styles.section} data-tutorial-section="status">
        <div className={styles.stepLabel}><span>4</span> Observe invoice state</div>
        <h2>Poll the node that created the invoice</h2>
        <p>
          Node C calls <code>getInvoice()</code> and displays
          <code> Open → Received → Paid</code>. Cancelled and Expired are terminal
          outcomes too.
        </p>
        <small className={styles.fileReference}>lib/invoice.ts · lines 16–22</small>
      </section>

      <section className={styles.section} data-tutorial-section="route">
        <div className={styles.stepLabel}><span>5</span> Route the payment</div>
        <h2>Use Bottle as the single public intermediary</h2>
        <p>
          Node A submits the pasted Invoice with Bottle as its trampoline hop.
          Bottle receives through the A–Bottle channel and forwards through the
          separate Bottle–C channel. A fee cap prevents an unexpectedly expensive route.
        </p>
        <small className={styles.fileReference}>lib/payment.ts · lines 5–14</small>
      </section>

      <section className={styles.section} data-tutorial-section="result">
        <div className={styles.stepLabel}><span>6</span> Confirm both ends</div>
        <h2>Sender success and a paid Invoice complete the flow</h2>
        <p>
          Wait for Node A&apos;s payment to become terminal, then confirm that Node C
          reports <code>Paid</code>. The payment result also exposes the route that
          carried the transfer.
        </p>
        <small className={styles.fileReference}>lib/payment.ts · lines 16–22</small>
      </section>

      <section className={styles.section} data-tutorial-section="react">
        <div className={styles.stepLabel}><span>7</span> Wire React</div>
        <h2>Keep generated and pasted values separate</h2>
        <p>
          Node C owns <code>generatedInvoice</code>; Node A pays
          <code> senderInvoice</code>. Keeping two state values prevents the UI from
          silently transferring the Invoice behind the user&apos;s back.
        </p>
        <small className={styles.fileReference}>app/multi-hop/page.tsx · lines 8–30</small>
      </section>
    </>
  );

  const liveDemo = (
    <>
      <div className={styles.panelHeader}>
        <span><i className={styles.liveDot} /> Manual Invoice transfer</span>
        <button
          className={styles.headerAction}
          disabled={!sender.nodeInfo && !receiver.nodeInfo}
          onClick={() => {
            void sender.refresh();
            void receiver.refresh();
          }}
        >
          Refresh both
        </button>
      </div>
      <div className={`${styles.previewStage} ${styles.paymentPreviewStage}`}>
        <div className={`${styles.paymentCard} ${styles.multiHopPaymentCard}`}>
          <div className={styles.routeStatusGrid}>
            <div><span>Node A</span><strong>{sender.nodeState === 'running' ? 'Running' : 'Stopped'}</strong></div>
            <div><span>Node C</span><strong>{receiver.nodeState === 'running' ? 'Running' : 'Stopped'}</strong></div>
            <div><span>Invoice</span><strong>{invoiceStatus}</strong></div>
            <div><span>Payment</span><strong>{paymentStatus}</strong></div>
          </div>

          <div className={styles.routeDiagram} aria-label="Multi-hop route">
            <b>Node A</b><i>→</i><span>Bottle · Public node</span><i>→</i><b>Node C</b>
          </div>

          <NodeSetup
            channelExists={Boolean(senderChannel)}
            channelState={senderChannel?.state.state_name ?? 'Not opened'}
            number="A"
            onConnectAndOpen={() =>
              connectAndOpen(
                sender,
                'Node A channel',
                setSenderChannelProgress,
              )
            }
            peerName="Bottle"
            runtime={sender}
            progressStage={senderChannelProgress}
            title="Prepare sender Node A"
          />

          <NodeSetup
            channelExists={Boolean(receiverChannel)}
            channelState={receiverChannel?.state.state_name ?? 'Not opened'}
            number="C"
            onConnectAndOpen={() =>
              connectAndOpen(
                receiver,
                'Node C channel',
                setReceiverChannelProgress,
              )
            }
            peerName="Bottle"
            runtime={receiver}
            progressStage={receiverChannelProgress}
            title="Prepare receiver Node C"
          />

          <div className={styles.invoiceTransfer}>
            <div className={styles.invoiceSide}>
              <span>Node C · Create</span>
              <label>
                <input
                  aria-label="Invoice amount in CKB"
                  disabled={!receiverReady || Boolean(receiver.busy)}
                  inputMode="decimal"
                  onChange={(event) => setAmount(event.target.value)}
                  value={amount}
                />
                <i>CKB</i>
              </label>
              <button
                disabled={!receiverReady || Boolean(receiver.busy)}
                onClick={() => void createInvoice()}
              >
                {receiver.busy === 'create invoice'
                  ? 'Creating and copying…'
                  : invoiceCopied
                    ? 'Invoice copied'
                    : 'Create invoice and copy'}
              </button>
              <textarea
                aria-label="Invoice generated by Node C"
                readOnly
                placeholder="Node C invoice appears here"
                value={generatedInvoice}
              />
              {invoiceCopyError && <small>{invoiceCopyError}</small>}
            </div>

            <div className={styles.invoiceTransferArrow} aria-hidden="true">
              <span>Copy</span><b>→</b><span>Paste</span>
            </div>

            <div className={styles.invoiceSide}>
              <span>Node A · Pay</span>
              <textarea
                aria-label="Invoice pasted into Node A"
                onChange={(event) => setSenderInvoice(event.target.value)}
                placeholder="Paste the Invoice here"
                value={senderInvoice}
              />
              <button disabled={!generatedInvoice} onClick={() => void pasteInvoice()}>
                Paste from clipboard
              </button>
              <button
                className={styles.paymentButton}
                disabled={!senderReady || !senderInvoice.trim() || Boolean(sender.busy)}
                onClick={() => void payInvoice()}
              >
                {sender.busy === 'send payment' ? 'Sending…' : 'Pay pasted invoice'}
              </button>
              {transferError && <small>{transferError}</small>}
            </div>
          </div>

        </div>

        <div className={styles.eventPanel}>
          <div className={styles.eventPanelHeader}><span>Route events and results</span><i className={styles.liveDot} /></div>
          <div className={styles.eventList}>
            <div><time>A</time><code>sender_channel</code><span>{senderChannel?.state.state_name ?? 'Not opened'}</span></div>
            <div><time>C</time><code>receiver_channel</code><span>{receiverChannel?.state.state_name ?? 'Not opened'}</span></div>
            <div><time>INV</time><code>invoice_status</code><span>{invoiceStatus}</span></div>
            {route.map((pubkey, index) => (
              <div key={`${pubkey}-${index}`}><time>H{index + 1}</time><code>route_hop</code><span>{shorten(pubkey)}</span></div>
            ))}
            {events.map((event, index) => (
              <div key={`${event}-${index}`}><time>{String(index + 1).padStart(2, '0')}</time><code>event</code><span>{event}</span></div>
            ))}
          </div>
        </div>
      </div>
    </>
  );

  return (
    <RoutingTutorialFrame
      article={article}
      codeFiles={codeFiles}
      currentTutorialIndex={2}
      defaultFile="invoice"
      demoDescription="Run two independent browser nodes, manually transfer the Invoice, and pay through one public Bottle node."
      demoTitle="Run the Multi-Hop Demo"
      downloadHref="/downloads/fiber-multi-hop-invoice.zip"
      liveDemo={liveDemo}
      nextHref="/docs/build/unidirectional-channel"
      previousHref="/docs/build/open-channel-payment"
      sectionCode={sectionCode}
    />
  );
}
