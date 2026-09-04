'use client';

import { useEffect, useRef, useState } from 'react';
import {
  scriptToAddress,
  type BrowserNodeState,
  type FiberBrowserNode,
} from '@fiber-pay/sdk/browser';
import { ckbToHex } from '../../lib/amounts';
import { queryCkbBalance, watchCkbBalance } from '../../lib/balance';
import { openCkbChannel, watchChannelStates } from '../../lib/channel';
import { connectToRouter, routerPubkey, startFiber } from '../../lib/fiber';
import { sendKeysend } from '../../lib/payment';

const shannonsPerCkb = 100_000_000n;

type Receipt = {
  amount: string;
  channelId: string;
  hash: string;
  localBalanceAfter: bigint | null;
  localBalanceBefore: bigint | null;
  status: string;
};

type EventRow = {
  label: string;
  name: string;
  value: string;
};

function friendlyState(state: BrowserNodeState) {
  if (state === 'running') return 'Node running';
  if (state === 'starting') return 'Starting WASM';
  if (state === 'stopping') return 'Stopping';
  if (state === 'error') return 'Connection issue';
  return 'Ready to start';
}

function isChannelReady(state: string) {
  return state.replace(/[^a-z0-9]/gi, '').toLowerCase() === 'channelready';
}

function shorten(value?: string) {
  if (!value) return '—';
  return value.length > 28 ? `${value.slice(0, 14)}…${value.slice(-10)}` : value;
}

function formatCkb(value: bigint | null) {
  if (value === null) return '—';
  const whole = value / shannonsPerCkb;
  const fraction = (value % shannonsPerCkb).toString().padStart(8, '0').replace(/0+$/, '');
  return `${whole.toLocaleString()}${fraction ? `.${fraction}` : ''} CKB`;
}

export default function PayPage() {
  const node = useRef<FiberBrowserNode | null>(null);
  const stopBalanceWatcher = useRef<(() => void) | null>(null);
  const stopChannelWatcher = useRef<(() => void) | null>(null);
  const [nodeState, setNodeState] = useState<BrowserNodeState>('idle');
  const [connected, setConnected] = useState(false);
  const [address, setAddress] = useState('');
  const [balance, setBalance] = useState<bigint | null>(null);
  const [channelAmount, setChannelAmount] = useState('499');
  const [channelState, setChannelState] = useState('Not opened');
  const [channelReady, setChannelReady] = useState(false);
  const [channelHistory, setChannelHistory] = useState<string[]>([]);
  const [paymentAmount, setPaymentAmount] = useState('1');
  const [paymentStatus, setPaymentStatus] = useState('Not sent');
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [busy, setBusy] = useState<'prepare' | 'refresh' | 'channel' | 'payment' | null>(null);
  const [error, setError] = useState('');

  useEffect(() => () => {
    stopBalanceWatcher.current?.();
    stopChannelWatcher.current?.();
    void node.current?.stop();
  }, []);

  function addEvent(name: string, value: string) {
    setEvents((current) => [
      ...current.slice(-7),
      { label: new Date().toLocaleTimeString([], { hour12: false }), name, value },
    ]);
  }

  function applyChannels(channels: Awaited<ReturnType<FiberBrowserNode['listChannels']>>['channels']) {
    const latest = channels.at(-1);
    if (!latest) return;
    const nextState = latest.state.state_name;
    setChannelState(nextState);
    setChannelReady(isChannelReady(nextState));
    setChannelHistory((current) => current.at(-1) === nextState ? current : [...current, nextState].slice(-6));
    addEvent('channel_state', nextState);
  }

  async function prepare() {
    if (busy || (node.current?.isRunning && connected)) return;
    setBusy('prepare');
    setError('');
    try {
      const fiber = node.current?.isRunning ? node.current : await startFiber(setNodeState);
      node.current = fiber;
      const info = await fiber.getNodeInfo();
      const fundingAddress = scriptToAddress(info.default_funding_lock_script, 'testnet');
      setAddress(fundingAddress);
      setBalance(await queryCkbBalance(info.default_funding_lock_script));
      await connectToRouter(fiber);
      setConnected(true);
      addEvent('peer_connection', 'Connected');

      stopBalanceWatcher.current?.();
      stopBalanceWatcher.current = watchCkbBalance(info.default_funding_lock_script, setBalance);
      stopChannelWatcher.current?.();
      stopChannelWatcher.current = watchChannelStates(fiber, applyChannels);
    } catch (prepareError) {
      setError(prepareError instanceof Error ? prepareError.message : 'Unable to prepare the browser node.');
    } finally {
      setBusy(null);
    }
  }

  async function refresh() {
    if (!node.current || busy) return;
    setBusy('refresh');
    setError('');
    try {
      const info = await node.current.getNodeInfo();
      const [{ peers }, { channels }, nextBalance] = await Promise.all([
        node.current.listPeers(),
        node.current.listChannels(),
        queryCkbBalance(info.default_funding_lock_script),
      ]);
      setConnected(peers.length > 0);
      setBalance(nextBalance);
      applyChannels(channels);
    } catch (refreshError) {
      setError(refreshError instanceof Error ? refreshError.message : 'Unable to refresh the live state.');
    } finally {
      setBusy(null);
    }
  }

  async function open() {
    if (!node.current || !connected || busy) return;
    setBusy('channel');
    setError('');
    try {
      const temporaryId = await openCkbChannel(node.current, routerPubkey, channelAmount);
      setChannelState(`Opening ${shorten(temporaryId)}`);
      addEvent('channel_opening', shorten(temporaryId));
    } catch (channelError) {
      setChannelState('Open failed');
      setError(channelError instanceof Error ? channelError.message : 'Unable to open the Testnet channel.');
    } finally {
      setBusy(null);
    }
  }

  async function pay() {
    if (!node.current || !channelReady || busy) return;
    const submittedAmount = paymentAmount;
    setBusy('payment');
    setError('');
    setPaymentStatus('Sending');
    setReceipt(null);
    try {
      const beforeChannels = (await node.current.listChannels()).channels;
      const readyChannel = beforeChannels.find((channel) => isChannelReady(channel.state.state_name));
      const result = await sendKeysend(node.current, routerPubkey, submittedAmount);
      const afterChannels = (await node.current.listChannels()).channels;
      const updatedChannel = afterChannels.find((channel) => channel.channel_id === readyChannel?.channel_id);
      setPaymentStatus(result.status);
      setReceipt({
        amount: submittedAmount,
        channelId: readyChannel?.channel_id ?? '',
        hash: result.payment_hash,
        localBalanceBefore: readyChannel ? BigInt(readyChannel.local_balance) : null,
        localBalanceAfter: updatedChannel ? BigInt(updatedChannel.local_balance) : null,
        status: result.status,
      });
      addEvent('payment', `${result.status} · ${submittedAmount} CKB`);
    } catch (paymentError) {
      setPaymentStatus('Failed');
      setError(paymentError instanceof Error ? paymentError.message : 'Unable to send the Testnet payment.');
    } finally {
      setBusy(null);
    }
  }

  let enoughBalance = false;
  try {
    enoughBalance = balance !== null && balance >= BigInt(ckbToHex(channelAmount));
  } catch {
    enoughBalance = false;
  }

  return (
    <main className="tutorial-page">
      <header className="hero">
        <span>Fiber Testnet · Channel tutorial</span>
        <h1>Open a Fiber Channel and Send a Payment</h1>
        <p>Fund your browser node, open a real Fiber Testnet channel, and send CKB to a public peer.</p>
      </header>

      <section className="steps" aria-label="Tutorial steps">
        <div><b>1</b><p><strong>Prepare node.</strong> Start and connect.</p></div>
        <div><b>2</b><p><strong>Fund address.</strong> Receive Testnet CKB.</p></div>
        <div><b>3</b><p><strong>Open channel.</strong> Commit the peer minimum on-chain.</p></div>
        <div><b>4</b><p><strong>Send payment.</strong> Send CKB to the peer.</p></div>
      </section>

      <section className="surface">
        <article className="payment-card">
          <div className="status-grid">
            <div><span>Node</span><strong><i className={nodeState === 'running' ? 'dot success' : 'dot waiting'} />{friendlyState(nodeState)}</strong></div>
            <div><span>Peer</span><strong><i className={connected ? 'dot success' : 'dot idle'} />{connected ? 'Peer connected' : 'Node required'}</strong></div>
            <div><span>Channel</span><strong><i className={channelReady ? 'dot success' : 'dot idle'} />{channelReady ? 'Channel ready' : channelState}</strong></div>
            <div><span>Payment</span><strong><i className={paymentStatus === 'Success' ? 'dot success' : paymentStatus === 'Failed' ? 'dot error' : 'dot idle'} />{paymentStatus}</strong></div>
          </div>

          <div className="flow-row">
            <b>1</b><div><strong>Prepare browser node</strong><span>Start locally and connect over WSS. This does not move funds.</span></div>
            <button disabled={busy !== null || (nodeState === 'running' && connected)} onClick={prepare}>{busy === 'prepare' ? 'Preparing…' : nodeState === 'running' && connected ? 'Node running' : 'Prepare browser node'}</button>
          </div>
          <div className="flow-row">
            <b>2</b><div><strong>Fund the address</strong><code title={address}>{shorten(address)}</code><span>Balance: {formatCkb(balance)} · auto-checks every 5s</span></div>
            <div className="row-actions"><a className={!address ? 'disabled' : ''} href={address ? 'https://faucet.nervos.org' : undefined} rel="noreferrer" target="_blank">Get CKB ↗</a><button className="secondary" disabled={!node.current || busy !== null} onClick={refresh}>{busy === 'refresh' ? 'Refreshing…' : 'Refresh'}</button></div>
          </div>
          <div className="flow-row">
            <b>3</b><div><strong>Open a 499 CKB channel</strong><label><input aria-label="Channel funding amount in CKB" inputMode="decimal" onChange={(event) => setChannelAmount(event.target.value)} value={channelAmount} /><span>CKB</span></label></div>
            <button disabled={busy !== null || !connected || !enoughBalance || channelState !== 'Not opened'} onClick={open}>{busy === 'channel' ? 'Opening…' : channelReady ? 'Channel ready' : 'Open channel'}</button>
          </div>

          {channelHistory.length > 0 && <div className="timeline"><span>Observed channel lifecycle</span><div>{channelHistory.map((state, index) => <span key={`${state}-${index}`}>{index > 0 && <i>→</i>}<b>{state}</b></span>)}</div></div>}

          <div className="flow-row">
            <b>4</b><div><strong>Send CKB to the peer</strong><label><input aria-label="Payment amount in CKB" inputMode="decimal" onChange={(event) => setPaymentAmount(event.target.value)} value={paymentAmount} /><span>CKB</span></label></div>
            <button disabled={busy !== null || !channelReady || !connected} onClick={pay}>{busy === 'payment' ? 'Sending…' : 'Send payment'}</button>
          </div>

          {receipt && <section className="receipt"><span>Payment receipt</span><dl><div><dt>Status</dt><dd>{receipt.status}</dd></div><div><dt>Amount</dt><dd>{receipt.amount} CKB</dd></div><div><dt>Channel ID</dt><dd title={receipt.channelId}>{shorten(receipt.channelId)}</dd></div><div><dt>Payment hash</dt><dd title={receipt.hash}>{shorten(receipt.hash)}</dd></div><div><dt>Local balance</dt><dd>{formatCkb(receipt.localBalanceBefore)} → {formatCkb(receipt.localBalanceAfter)}</dd></div></dl></section>}
          {error && <p className="alert" role="alert">{error}</p>}
        </article>

        <aside className="events">
          <header><span>Runtime events and results</span><i className={error ? 'dot error' : receipt?.status === 'Success' ? 'dot success' : 'dot info'} /></header>
          <div><time>NODE</time><code>state</code><span>{friendlyState(nodeState)}</span></div>
          <div><time>PEER</time><code>connection</code><span>{connected ? 'Connected' : 'Offline'}</span></div>
          {events.length === 0 && <p>Channel and payment events will appear here.</p>}
          {events.map((event, index) => <div key={`${event.label}-${index}`}><time>{event.label}</time><code>{event.name}</code><span>{event.value}</span></div>)}
        </aside>
      </section>
    </main>
  );
}
