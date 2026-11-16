'use client';

import { useEffect, useRef, useState } from 'react';
import { scriptToAddress, type Channel, type FiberBrowserNode, type GetPaymentResult } from '@fiber-pay/sdk/browser';
import { decryptResult, toHex } from '../lib/crypto';
import { bottle, channelFundingCkb, connectAndOpenChannel, readChannel, ready, startRole } from '../lib/fiber';
import { createOffer, parseOffer, type EncryptedOffer } from '../lib/offer';
import { payForOffer, validateOffer } from '../lib/payment';
import { createBrowserNodeSession } from '../lib/node-session';
import { encryptedSessionKey, encryptedBuyerProfile, encryptedSellerProfile, savedNodeIdentifier, readEncryptedProgress, type EncryptedLessonProgress } from '../lib/progress';

type Role = 'buyer' | 'seller';
const ckb = (value: string) => `${Number(BigInt(value)) / 100_000_000}`;
const sample = 'Fiber Testnet report\n\nPayment settled. The encrypted result is readable.';

export default function Page() {
  const nodes = useRef<Partial<Record<Role, FiberBrowserNode>>>({});
  const sessions = useRef<Partial<Record<Role, ReturnType<typeof createBrowserNodeSession>>>>({});
  const progress = useRef<EncryptedLessonProgress | null>(null);
  const locked = useRef(false);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [addresses, setAddresses] = useState<Partial<Record<Role, string>>>({});
  const [connected, setConnected] = useState<Partial<Record<Role, boolean>>>({});
  const [channels, setChannels] = useState<Partial<Record<Role, Channel>>>({});
  const [plaintext, setPlaintext] = useState(sample);
  const [generated, setGenerated] = useState('');
  const [received, setReceived] = useState('');
  const [offer, setOffer] = useState<EncryptedOffer | null>(null);
  const [attempt, setAttempt] = useState('');
  const [tested, setTested] = useState(false);
  const [payment, setPayment] = useState<GetPaymentResult | null>(null);
  const [key, setKey] = useState('');
  const [decrypted, setDecrypted] = useState('');
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const saved = readEncryptedProgress(sessionStorage, localStorage);
    progress.current = saved;
    if (saved) { setGenerated(saved.generatedOffer); setReceived(saved.buyerOfferText); setAttempt(saved.attemptedPaymentHash); setTested(saved.triedWithoutKey); }
    setLoaded(true);
    const owned = sessions.current;
    const stop = () => { for (const session of Object.values(owned)) void session.stop().catch(() => {}); };
    window.addEventListener('pagehide', stop);
    return () => { window.removeEventListener('pagehide', stop); stop(); nodes.current = {}; sessions.current = {}; };
  }, []);

  function save(update: Partial<EncryptedLessonProgress>) {
    const buyerId = savedNodeIdentifier(localStorage, encryptedBuyerProfile);
    const sellerId = savedNodeIdentifier(localStorage, encryptedSellerProfile);
    if (!buyerId || !sellerId) throw new Error('Start both saved nodes before continuing.');
    const next = { version: 1 as const, buyerId, sellerId, generatedOffer: '', buyerOfferText: '', attemptedPaymentHash: '', triedWithoutKey: false, ...progress.current, ...update };
    sessionStorage.setItem(encryptedSessionKey, JSON.stringify(next));
    progress.current = next;
  }

  async function run(action: () => Promise<void>) {
    if (locked.current) return;
    locked.current = true; setBusy(true); setError('');
    try { await action(); }
    catch (failure) { setError(failure instanceof Error ? failure.message : 'Action failed. Check status before retrying a transfer.'); }
    finally { locked.current = false; setBusy(false); }
  }

  async function refresh(role: Role) {
    const node = nodes.current[role];
    if (!node) return;
    const channel = await readChannel(node);
    const { peers } = await node.listPeers();
    setConnected((previous) => ({ ...previous, [role]: peers.some(peer => peer.pubkey.replace(/^0x/i, '').toLowerCase() === bottle.pubkey.slice(2)) }));
    setChannels((previous) => ({ ...previous, [role]: channel }));
  }

  async function start(role: Role) {
    if (nodes.current[role]) return;
    const session = sessions.current[role] ??= createBrowserNodeSession();
    let started: FiberBrowserNode | undefined;
    await session.start(role === 'buyer' ? encryptedBuyerProfile : encryptedSellerProfile, async (track) => {
      started = await startRole(role, track);
    });
    if (!started) return;
    nodes.current[role] = started;
    const info = await started.nodeInfo();
    setAddresses((previous) => ({ ...previous, [role]: scriptToAddress(info.default_funding_lock_script, 'testnet') }));
    if (await readChannel(started)) await started.connectPeer(bottle);
    await refresh(role);
  }

  async function open(role: Role) {
    const node = nodes.current[role];
    if (!node) return;
    const channel = await connectAndOpenChannel(node);
    setChannels((previous) => ({ ...previous, [role]: channel }));
    await refresh(role);
    setStatus(channel && ready(channel) ? 'Channel ready.' : 'Opening submitted. Check channel status after confirmation.');
  }

  async function moveLiquidity() {
    const node = nodes.current.seller;
    if (!node) return;
    const id = savedNodeIdentifier(localStorage, encryptedSellerProfile);
    const storageKey = `fiber-docs:encrypted-inbound:${id}`;
    const existing = sessionStorage.getItem(storageKey);
    if (existing === 'submitting') throw new Error('Transfer outcome unknown. Review payment history before sending again.');
    let result: GetPaymentResult;
    if (existing) result = await node.getPayment({ payment_hash: existing as `0x${string}` });
    else {
      sessionStorage.setItem(storageKey, 'submitting');
      result = await node.sendPayment({ target_pubkey: bottle.pubkey, amount: '0x1dcd65000', keysend: true });
      sessionStorage.setItem(storageKey, result.payment_hash);
    }
    if (!['Success', 'Failed'].includes(result.status)) result = await node.waitForPayment(result.payment_hash, { timeout: 60_000, interval: 1_000 });
    if (result.status === 'Failed') sessionStorage.removeItem(storageKey);
    setStatus(`Liquidity transfer: ${result.status}`);
    await refresh('seller');
  }

  async function makeOffer() {
    if (!nodes.current.seller || !channels.seller || !routeReady || generated || attempt) return;
    const value = await createOffer(nodes.current.seller, channels.seller, plaintext);
    save({ generatedOffer: value }); setGenerated(value); setStatus('Invoice created.');
  }

  async function validate() {
    if (!nodes.current.buyer) return;
    const parsed = parseOffer(received);
    await validateOffer(nodes.current.buyer, parsed);
    if (attempt && parsed.paymentHash.toLowerCase() !== attempt.toLowerCase()) throw new Error('Restore the offer for the previous payment.');
    save({ buyerOfferText: received }); setOffer(parsed); setStatus('Offer validated.');
  }

  async function testLock() {
    if (!offer) return;
    try { await decryptResult(offer, toHex(crypto.getRandomValues(new Uint8Array(32)))); }
    catch { save({ triedWithoutKey: true }); setTested(true); setStatus('Decryption rejected: key unavailable.'); }
  }

  async function pay() {
    if (!nodes.current.buyer || !offer || !tested || !routeReady) return;
    const result = await payForOffer(nodes.current.buyer, offer, attempt, (hash) => {
      save({ attemptedPaymentHash: hash }); setAttempt(hash);
    }, payment?.status === 'Failed');
    acceptPayment(result);
    await Promise.all([refresh('buyer'), refresh('seller')]);
  }

  function acceptPayment(result: GetPaymentResult) {
    setPayment(result); setStatus(`Payment: ${result.status}`);
    if (result.status === 'Failed') setError(result.failed_error ?? 'Payment failed. Check channel liquidity before retrying.');
    if (result.status === 'Success' && result.payment_preimage) setKey(result.payment_preimage);
  }

  async function checkPayment() {
    if (!nodes.current.buyer || !offer || !attempt) return;
    await validateOffer(nodes.current.buyer, offer);
    acceptPayment(await nodes.current.buyer.getPayment({ payment_hash: attempt as `0x${string}` }));
  }

  const routeReady = Boolean(connected.buyer && connected.seller && channels.buyer && ready(channels.buyer) && BigInt(channels.buyer.local_balance) >= 100_000_000n && channels.seller && ready(channels.seller) && BigInt(channels.seller.remote_balance) >= 100_000_000n);
  const canSubmit = Boolean(offer && tested && routeReady && !key && (!attempt || payment?.status === 'Failed'));

  return <main>
    <p className="eyebrow">Fiber Testnet</p><h1>Pay to decrypt</h1>
    {status && <p className="status" role="status">{status}</p>}{error && <p role="alert">{error}</p>}
    <div className="grid">{(['buyer', 'seller'] as const).map((role) => <section className="card" key={role}>
      <h2>{role === 'buyer' ? 'Buyer A' : 'Seller C'}</h2>
      {!addresses[role] && <button disabled={!loaded || busy} onClick={() => void run(() => start(role))}>Start node</button>}
      {addresses[role] && <><code>{addresses[role]}</code><a href="https://faucet.nervos.org" target="_blank" rel="noreferrer">Get Testnet CKB ↗</a>
        <button disabled={busy} onClick={() => void run(() => open(role))}>{channels[role] ? 'Reconnect / check channel' : `Open ${channelFundingCkb} CKB channel`}</button>
        <button disabled={busy} onClick={() => void run(() => refresh(role))}>Refresh channel status</button>
      </>}
      {channels[role] && <><code>{channels[role].state.state_name}</code><p>{role}: {ckb(channels[role].local_balance)} CKB · Bottle: {ckb(channels[role].remote_balance)} CKB</p></>}
    </section>)}</div>
    <section className="card"><h2>Liquidity</h2><button disabled={busy || !channels.seller || !ready(channels.seller) || BigInt(channels.seller.local_balance) < 500_000_000n} onClick={() => void run(moveLiquidity)}>Send / check 5 CKB transfer</button></section>
    <div className="grid exchange"><section className="card"><h2>Seller</h2>
      <textarea aria-label="Seller result" disabled={busy || Boolean(generated)} value={plaintext} onChange={e => setPlaintext(e.target.value)} />
      <button disabled={busy || !routeReady || !plaintext.trim() || Boolean(generated || attempt)} onClick={() => void run(makeOffer)}>Encrypt & create 1 CKB Invoice</button>
      <textarea aria-label="Generated offer" readOnly value={generated} />
      <button disabled={!generated || busy} onClick={() => void run(async () => { await navigator.clipboard.writeText(generated); setStatus('Offer copied.'); })}>Copy offer</button>
    </section><section className="card"><h2>Buyer</h2>
      <textarea aria-label="Received offer" disabled={busy || Boolean(offer || attempt)} value={received} onChange={e => { setReceived(e.target.value); setTested(false); }} />
      <button disabled={busy || !received || !addresses.buyer || Boolean(offer)} onClick={() => void run(validate)}>Validate offer</button>
      {!tested && <button disabled={busy || !offer} onClick={() => void run(testLock)}>Decrypt without key</button>}
      {canSubmit && <button disabled={busy} onClick={() => void run(pay)}>{attempt ? 'Retry failed payment' : 'Pay 1 CKB'}</button>}
      {attempt && !key && <button disabled={busy || !offer || !addresses.buyer} onClick={() => void run(checkPayment)}>Check payment status</button>}
      <button disabled={busy || !offer || !key || Boolean(decrypted)} onClick={() => void run(async () => { setDecrypted(await decryptResult(offer!, key)); })}>Decrypt with revealed key</button>
    </section></div>
    {payment?.status === 'Success' && <section className="card"><h2>Receipt</h2><p>Amount: 1 CKB · Fee: {ckb(payment.fee)} CKB · Total: {ckb(`0x${(100_000_000n + BigInt(payment.fee)).toString(16)}`)} CKB</p><code>{payment.payment_hash}</code></section>}
    {decrypted && <section className="result"><h2>Decrypted result</h2><pre>{decrypted}</pre></section>}
  </main>;
}
