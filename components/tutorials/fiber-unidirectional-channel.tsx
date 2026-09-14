'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Channel } from '@fiber-pay/sdk/browser';
import {
  type RoutingCodeFile,
  type RoutingCodeFocus,
  RoutingTutorialFrame,
} from './routing-tutorial-frame';
import {
  bottlePeer,
  ckbToHex,
  hexToCkb,
  isReusableChannel,
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
    code: `import type { FiberBrowserNode } from '@fiber-pay/sdk/browser';

export const bottle = {
  pubkey: '0x02b6d4e3...302be71' as const,
  address: '/dns4/bottle.fiber.channel/tcp/443/wss/p2p/QmXen3e...XJ1Eo',
};

export async function connectBottle(node: FiberBrowserNode) {
  await node.connectPeer(bottle);
}`,
  },
  {
    id: 'channel',
    label: 'lib/channel.ts',
    language: 'typescript',
    code: `import type { FiberBrowserNode } from '@fiber-pay/sdk/browser';
import { ckbToHex } from './amounts';

export async function openOneWayChannel(
  node: FiberBrowserNode,
  acceptorPubkey: \`0x\${string}\`,
) {
  return node.openChannel({
    pubkey: acceptorPubkey,
    funding_amount: ckbToHex('499'),
    public: false,
    one_way: true,
  });
}

export async function readOneWayChannel(
  node: FiberBrowserNode,
  acceptorPubkey: string,
) {
  const { channels } = await node.listChannels();
  return channels.find(
    (channel) =>
      channel.pubkey === acceptorPubkey && channel.is_one_way,
  );
}`,
  },
  {
    id: 'payment',
    label: 'lib/payment.ts',
    language: 'typescript',
    code: `import type { FiberBrowserNode } from '@fiber-pay/sdk/browser';
import { ckbToHex } from './amounts';

export async function sendOneWayPayment(
  node: FiberBrowserNode,
  acceptorPubkey: \`0x\${string}\`,
  amount: string,
) {
  const submitted = await node.sendPayment({
    target_pubkey: acceptorPubkey,
    amount: ckbToHex(amount),
    keysend: true,
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
    label: 'app/page.tsx',
    language: 'tsx',
    code: `'use client';

import { useRef, useState } from 'react';
import type { FiberBrowserNode } from '@fiber-pay/sdk/browser';
import { bottle, connectBottle } from '@/lib/fiber';
import { openOneWayChannel, readOneWayChannel } from '@/lib/channel';
import { sendOneWayPayment } from '@/lib/payment';

export default function OneWayChannelPage() {
  const node = useRef<FiberBrowserNode | null>(null);
  const [status, setStatus] = useState('Not opened');

  async function open() {
    if (!node.current) return;
    await connectBottle(node.current);
    await openOneWayChannel(node.current, bottle.pubkey);
    setStatus('Opening — wait for ChannelReady');
  }

  async function pay() {
    if (!node.current) return;
    const channel = await readOneWayChannel(node.current, bottle.pubkey);
    if (channel?.state.state_name !== 'CHANNEL_READY') return;
    const result = await sendOneWayPayment(node.current, bottle.pubkey, '1');
    setStatus(result.status);
  }

  return <main>
    <p>{status}</p>
    <button onClick={open}>Open one-way channel</button>
    <button onClick={pay}>Send 1 CKB</button>
  </main>;
}`,
  },
];

const sectionCode: Record<string, RoutingCodeFocus> = {
  model: { file: 'channel', start: 4, end: 14 },
  connect: { file: 'fiber', start: 3, end: 10 },
  inspect: { file: 'channel', start: 16, end: 25 },
  payment: { file: 'payment', start: 4, end: 22 },
  react: { file: 'app', start: 9, end: 29 },
};

function normalizedState(state: string) {
  return state.replace(/[^a-z0-9]/gi, '').toLowerCase();
}

function isReady(channel: Channel | undefined) {
  return Boolean(
    channel && normalizedState(channel.state.state_name) === 'channelready',
  );
}

function progressFromChannel(channel: Channel | undefined): ChannelProgressStage {
  if (!channel) return 'idle';
  const state = normalizedState(channel.state.state_name);
  if (state === 'channelready') return 'ready';
  if (state.includes('failed') || state.includes('aborted')) return 'error';
  if (state === 'awaitingchannelready') return 'confirming';
  return 'submitting';
}

function findOneWayChannel(channels: Channel[]) {
  const matches = channels.filter(
    (channel) =>
      samePubkey(channel.pubkey, bottlePeer.pubkey) &&
      channel.is_one_way &&
      isReusableChannel(channel),
  );
  return matches.find((channel) => isReady(channel)) ?? matches[0];
}

function Progress({ stage }: { stage: ChannelProgressStage }) {
  const current =
    stage === 'connecting'
      ? 0
      : stage === 'submitting'
        ? 1
        : stage === 'confirming'
          ? 2
          : stage === 'ready'
            ? 3
            : -1;
  const labels = ['Connect peer', 'Submit funding', 'Confirm on-chain', 'Channel ready'];

  return (
    <div className={styles.channelConnectionProgress}>
      <span>One-way channel progress</span>
      <div>
        {labels.map((label, index) => {
          const complete = stage === 'ready' || index < current;
          const active = index === current && stage !== 'error';
          return (
            <div
              className={
                complete
                  ? styles.channelProgressComplete
                  : active
                    ? styles.channelProgressActive
                    : undefined
              }
              key={label}
            >
              <i>{complete ? '✓' : index + 1}</i>
              <small>{label}</small>
              {index < labels.length - 1 && <b>→</b>}
            </div>
          );
        })}
      </div>
      {stage === 'confirming' && (
        <p>Funding is on-chain. The page keeps checking until the channel is ready.</p>
      )}
    </div>
  );
}

export function FiberUnidirectionalChannelTutorial() {
  const runtime = useFiberRoutingNode('fiber-docs:unidirectional-channel-v1');
  const [amount, setAmount] = useState('1');
  const [paymentStatus, setPaymentStatus] = useState('Not sent');
  const [events, setEvents] = useState<string[]>([]);
  const [channelProgress, setChannelProgress] =
    useState<ChannelProgressStage>('idle');
  const [beforeBalance, setBeforeBalance] = useState<bigint | null>(null);
  const [afterBalance, setAfterBalance] = useState<bigint | null>(null);

  const channel = useMemo(
    () => findOneWayChannel(runtime.channels),
    [runtime.channels],
  );
  const channelReady = isReady(channel);
  const peerConnected = runtime.peers.some((pubkey) =>
    samePubkey(pubkey, bottlePeer.pubkey),
  );
  const enoughToOpen = (runtime.balance ?? 0n) >= BigInt(ckbToHex(channelAmount));

  useEffect(() => {
    if (channel) setChannelProgress(progressFromChannel(channel));
  }, [channel]);

  const addEvent = useCallback((message: string) => {
    setEvents((current) => [...current.slice(-8), message]);
  }, []);

  const connectAndOpen = useCallback(async () => {
    const node = runtime.nodeRef.current;
    if (!node) return;
    runtime.setError('');
    setChannelProgress('connecting');
    addEvent('Connecting the payer to Bottle over WSS');

    const connected = peerConnected || (await runtime.connect(bottlePeer));
    if (!connected) {
      setChannelProgress('error');
      addEvent('Peer connection failed');
      return;
    }
    addEvent('Bottle connected');

    const latest = findOneWayChannel((await node.listChannels()).channels);
    if (latest) {
      setChannelProgress(progressFromChannel(latest));
      addEvent(`Existing one-way channel restored · ${latest.state.state_name}`);
      await runtime.refresh();
      return;
    }

    setChannelProgress('submitting');
    const opened = await runtime.run('open one-way channel', (current) =>
      current.openChannel({
        pubkey: bottlePeer.pubkey,
        funding_amount: ckbToHex(channelAmount),
        public: false,
        one_way: true,
      }),
    );
    if (!opened) {
      setChannelProgress('error');
      addEvent('One-way channel submission failed');
      return;
    }
    setChannelProgress('confirming');
    addEvent(`Private one-way channel submitted · ${shorten(opened.temporary_channel_id)}`);
    await runtime.refresh();
  }, [addEvent, peerConnected, runtime]);

  const sendPayment = useCallback(async () => {
    if (!runtime.nodeRef.current || !channel) return;
    setBeforeBalance(BigInt(channel.local_balance));
    setAfterBalance(null);
    setPaymentStatus('Sending');
    addEvent(`Sending ${amount} CKB from payer to acceptor`);

    const submitted = await runtime.run('send one-way payment', (node) =>
      node.sendPayment({
        target_pubkey: bottlePeer.pubkey,
        amount: ckbToHex(amount),
        keysend: true,
      }),
    );
    if (!submitted) {
      setPaymentStatus('Failed');
      return;
    }
    const result =
      submitted.status === 'Success' || submitted.status === 'Failed'
        ? submitted
        : await runtime.nodeRef.current.waitForPayment(submitted.payment_hash, {
            timeout: 60_000,
            interval: 1_000,
          });
    setPaymentStatus(result.status);
    addEvent(`${result.status} · ${shorten(result.payment_hash)}`);
    await runtime.refresh();
    const refreshed = findOneWayChannel(
      (await runtime.nodeRef.current.listChannels()).channels,
    );
    if (refreshed) setAfterBalance(BigInt(refreshed.local_balance));
  }, [addEvent, amount, channel, runtime]);

  const article = (
    <>
      <header className={styles.hero} data-tutorial-section="intro">
        <div className={styles.eyebrow}>
          <span>Channel model</span>
          <span className={styles.eyebrowRule} />
          <span>20 minute tutorial</span>
        </div>
        <h1>Open a Unidirectional Fiber Channel</h1>
        <p className={styles.lead}>
          Fund a private one-way channel, verify the payer and acceptor roles,
          and send a real Testnet payment in the permitted direction.
        </p>
        <div className={styles.heroMeta}>
          <span>One-way</span><span>Private channel</span><span>Keysend</span>
        </div>
      </header>

      <section className={styles.section} data-tutorial-section="model">
        <div className={styles.stepLabel}>The model</div>
        <h2>Only the initiator can send</h2>
        <p>
          The browser node opens and funds the channel, so it becomes the payer.
          Bottle accepts the channel and becomes the receiver. During the channel
          lifetime, payments can move from the initiator to the acceptor, but not back.
        </p>
        <div className={styles.routeDiagram}>
          <b>Browser payer</b><i>→</i><span>Private one-way channel</span><i>→</i><b>Bottle acceptor</b>
        </div>
        <small className={styles.fileReference}>lib/channel.ts · lines 4–14</small>
      </section>

      <section className={styles.section} data-tutorial-section="connect">
        <div className={styles.stepLabel}><span>1</span> Connect the acceptor</div>
        <h2>A public node can accept a private channel</h2>
        <p>
          Connect to Bottle over WSS before requesting a channel. Bottle is a public
          Fiber node, but this specific channel remains private and never appears in
          the public routing graph.
        </p>
        <div className={styles.note}>
          <strong>Public peer ≠ public channel</strong>
          <p>
            One-way channels must use <code>public: false</code>. Combining
            <code> one_way: true</code> with a public channel is rejected.
          </p>
        </div>
        <small className={styles.fileReference}>lib/fiber.ts · lines 3–10</small>
      </section>

      <section className={styles.section} data-tutorial-section="inspect">
        <div className={styles.stepLabel}><span>2</span> Open and inspect</div>
        <h2>Set one_way when funding the channel</h2>
        <p>
          Submit 499 Testnet CKB with <code>one_way: true</code> and wait for
          <code> ChannelReady</code>. The returned channel confirms
          <code> is_one_way: true</code>, <code>is_public: false</code>, and
          <code> is_acceptor: false</code> for this browser node.
        </p>
        <small className={styles.fileReference}>lib/channel.ts · lines 16–25</small>
      </section>

      <section className={styles.section} data-tutorial-section="payment">
        <div className={styles.stepLabel}><span>3</span> Pay forward</div>
        <h2>Send normally in the allowed direction</h2>
        <p>
          Once ready, the payer uses the ordinary <code>sendPayment()</code> API.
          The routing engine recognizes the channel direction, sends directly to
          Bottle, and rejects any attempt by the acceptor to pay back through it.
        </p>
        <small className={styles.fileReference}>lib/payment.ts · lines 4–22</small>
      </section>

      <section className={styles.section} data-tutorial-section="react">
        <div className={styles.stepLabel}><span>4</span> Show the result</div>
        <h2>Make the role and balance movement visible</h2>
        <p>
          The React page displays the channel flags alongside local and remote
          balances. After a successful payment, local payer balance decreases and
          remote acceptor balance increases without another on-chain transaction.
        </p>
        <small className={styles.fileReference}>app/page.tsx · lines 9–29</small>
      </section>
    </>
  );

  const localDelta =
    beforeBalance !== null && afterBalance !== null
      ? afterBalance - beforeBalance
      : null;
  const openButtonLabel = channelReady
    ? 'Channel ready'
    : channel
      ? channelProgress === 'confirming'
        ? 'Confirming…'
        : 'Opening…'
      : runtime.busy === 'open one-way channel'
        ? 'Opening…'
        : runtime.busy === `connect:${bottlePeer.name}`
          ? 'Connecting…'
          : peerConnected
            ? `Open ${channelAmount} CKB`
            : 'Connect & open';

  const liveDemo = (
    <>
      <div className={styles.panelHeader}>
        <span><i className={styles.liveDot} /> One-way Testnet flow</span>
        <button
          className={styles.headerAction}
          disabled={!runtime.nodeInfo}
          onClick={() => void runtime.refresh()}
        >
          Refresh
        </button>
      </div>
      <div className={`${styles.previewStage} ${styles.paymentPreviewStage}`}>
        <div className={styles.paymentCard}>
          <div className={styles.routeStatusGrid}>
            <div><span>Node</span><strong>{runtime.nodeState === 'running' ? 'Running' : 'Stopped'}</strong></div>
            <div><span>Peer</span><strong>{peerConnected ? 'Connected' : 'Offline'}</strong></div>
            <div><span>Channel</span><strong>{channelReady ? 'Ready' : channel?.state.state_name ?? 'Not opened'}</strong></div>
            <div><span>Payment</span><strong>{paymentStatus}</strong></div>
          </div>

          <div className={styles.routeDiagram}>
            <b>Browser payer</b><i>→</i><span>One-way private channel</span><i>→</i><b>Bottle acceptor</b>
          </div>

          <div className={styles.paymentFlow}>
            <div className={styles.paymentFlowNumber}>1</div>
            <div><strong>Start and fund the browser node</strong><span>Balance: {hexToCkb(runtime.balance)} CKB</span></div>
            <div className={styles.compactActions}>
              <button className={styles.startButton} disabled={Boolean(runtime.nodeInfo) || Boolean(runtime.busy)} onClick={runtime.start}>{runtime.busy === 'start' ? 'Starting…' : 'Start'}</button>
              <a className={styles.faucetButton} href="https://faucet.nervos.org" rel="noreferrer" target="_blank">Faucet ↗</a>
            </div>
          </div>

          {runtime.address && (
            <div className={styles.rebalanceAddress}>
              <code title={runtime.address}>{shorten(runtime.address, 16, 12)}</code>
              <button onClick={() => void navigator.clipboard.writeText(runtime.address)}>Copy</button>
            </div>
          )}

          <div className={styles.paymentFlow}>
            <div className={styles.paymentFlowNumber}>2</div>
            <div><strong>Connect and open a one-way channel</strong><span>499 CKB · private · initiator → acceptor</span></div>
            <button
              className={styles.paymentButton}
              disabled={!runtime.nodeInfo || !enoughToOpen || Boolean(channel) || Boolean(runtime.busy)}
              onClick={() => void connectAndOpen()}
            >
              {openButtonLabel}
            </button>
          </div>

          <Progress stage={channelProgress} />

          <div className={styles.oneWayChannelFacts}>
            <div><span>Direction</span><strong>Initiator → Acceptor</strong></div>
            <div><span>is_one_way</span><strong>{channel ? String(channel.is_one_way) : '—'}</strong></div>
            <div><span>is_public</span><strong>{channel ? String(channel.is_public) : '—'}</strong></div>
            <div><span>Your role</span><strong>{channel ? (channel.is_acceptor ? 'Acceptor' : 'Initiator') : '—'}</strong></div>
            <div><span>Local balance</span><strong>{hexToCkb(channel?.local_balance)} CKB</strong></div>
            <div><span>Remote balance</span><strong>{hexToCkb(channel?.remote_balance)} CKB</strong></div>
          </div>

          <div className={styles.paymentFlow}>
            <div className={styles.paymentFlowNumber}>3</div>
            <div className={styles.paymentFlowBody}>
              <strong>Send toward the acceptor</strong>
              <label><input aria-label="One-way payment amount in CKB" disabled={!channelReady || Boolean(runtime.busy)} inputMode="decimal" onChange={(event) => setAmount(event.target.value)} value={amount} /><span>CKB</span></label>
            </div>
            <button className={styles.paymentButton} disabled={!channelReady || Boolean(runtime.busy)} onClick={() => void sendPayment()}>{runtime.busy === 'send one-way payment' ? 'Sending…' : 'Send payment'}</button>
          </div>

          {beforeBalance !== null && (
            <div className={styles.balanceComparison}>
              <span>Payer local balance</span>
              <div>
                <b>Before → after</b>
                <code>{hexToCkb(beforeBalance)} → {hexToCkb(afterBalance)}</code>
                <i>{localDelta === null ? 'Pending' : `${localDelta > 0n ? '+' : ''}${hexToCkb(localDelta)} CKB`}</i>
              </div>
            </div>
          )}

          {runtime.error && <div className={styles.paymentError}>{runtime.error}</div>}
        </div>

        <div className={styles.eventPanel}>
          <div className={styles.eventPanelHeader}><span>Channel events and results</span><i className={styles.liveDot} /></div>
          <div className={styles.eventList}>
            {events.map((event, index) => (
              <div key={`${event}-${index}`}>
                <time>{String(index + 1).padStart(2, '0')}</time>
                <code>one_way</code>
                <span>{event}</span>
              </div>
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
      currentTutorialIndex={3}
      defaultFile="channel"
      demoDescription="Open a private one-way channel to Bottle, inspect its roles, and send a real Testnet payment forward."
      demoTitle="Run the Unidirectional Channel Demo"
      downloadHref="/downloads/fiber-unidirectional-channel.zip"
      liveDemo={liveDemo}
      nextHref="/docs/build/hold-invoice"
      previousHref="/docs/build/multi-hop-invoice"
      sectionCode={sectionCode}
    />
  );
}
