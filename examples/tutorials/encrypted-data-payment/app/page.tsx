'use client';

import { useRef, useState } from 'react';
import { scriptToAddress, type Channel, type FiberBrowserNode } from '@fiber-pay/sdk/browser';
import { decryptResult } from '../lib/crypto';
import { connectAndOpenChannel, prepareSellerInbound, startRole } from '../lib/fiber';
import { createOffer, parseOffer, type EncryptedOffer } from '../lib/offer';
import { payForOffer } from '../lib/payment';

const sample = 'Fiber Testnet report\n\nPayment settled. The encrypted result is readable.';

export default function Page() {
  const buyer = useRef<FiberBrowserNode | null>(null);
  const seller = useRef<FiberBrowserNode | null>(null);
  const buyerChannel = useRef<Channel | null>(null);
  const sellerChannel = useRef<Channel | null>(null);
  const [buyerAddress, setBuyerAddress] = useState('');
  const [sellerAddress, setSellerAddress] = useState('');
  const [plaintext, setPlaintext] = useState(sample);
  const [generatedOffer, setGeneratedOffer] = useState('');
  const [pastedOffer, setPastedOffer] = useState('');
  const [offer, setOffer] = useState<EncryptedOffer | null>(null);
  const [paymentKey, setPaymentKey] = useState('');
  const [decrypted, setDecrypted] = useState('');
  const [status, setStatus] = useState('Start both browser nodes.');

  async function start(role: 'buyer' | 'seller') {
    const node = await startRole(role);
    const info = await node.nodeInfo();
    const address = scriptToAddress(info.default_funding_lock_script, 'testnet');
    if (role === 'buyer') {
      buyer.current = node;
      setBuyerAddress(address);
    } else {
      seller.current = node;
      setSellerAddress(address);
    }
    setStatus(`${role} node running. Fund its address before opening a channel.`);
  }

  async function open(role: 'buyer' | 'seller') {
    const node = role === 'buyer' ? buyer.current : seller.current;
    if (!node) return;
    setStatus(`${role} connecting to Bottle and opening a channel…`);
    const channel = await connectAndOpenChannel(node);
    if (role === 'buyer') buyerChannel.current = channel;
    else sellerChannel.current = channel;
    setStatus(`${role} channel ready.`);
  }

  async function prepareInbound() {
    if (!seller.current) return;
    setStatus('Seller is moving 5 CKB to Bottle for inbound liquidity…');
    const result = await prepareSellerInbound(seller.current);
    sellerChannel.current = (await seller.current.listChannels()).channels.find(
      (channel) => channel.pubkey === sellerChannel.current?.pubkey,
    ) ?? sellerChannel.current;
    setStatus(`Inbound preparation: ${result.status}`);
  }

  async function encryptAndInvoice() {
    if (!seller.current || !sellerChannel.current) return;
    const value = await createOffer(seller.current, sellerChannel.current, plaintext);
    setGeneratedOffer(value);
    setPastedOffer('');
    setOffer(null);
    setPaymentKey('');
    setDecrypted('');
    await navigator.clipboard.writeText(value);
    setStatus('Encrypted offer created and copied. The AES key is not in the JSON.');
  }

  async function loadOffer() {
    const parsed = parseOffer(pastedOffer);
    setOffer(parsed);
    setPaymentKey('');
    setDecrypted('');
    setStatus('Encrypted offer loaded. Pay its Invoice to obtain the key.');
  }

  async function pay() {
    if (!buyer.current || !seller.current || !buyerChannel.current || !sellerChannel.current || !offer) return;
    setStatus('Paying the 1 CKB Invoice…');
    const key = await payForOffer(
      buyer.current,
      offer,
    );
    setPaymentKey(key);
    setStatus('Payment succeeded. Fiber revealed the AES key.');
  }

  async function decrypt() {
    if (!offer || !paymentKey) return;
    setDecrypted(await decryptResult(offer, paymentKey));
    setStatus('Ciphertext decrypted and authenticated.');
  }

  return (
    <main>
      <p className="eyebrow">Fiber Testnet · two browser nodes · no application backend</p>
      <h1>Pay to decrypt</h1>
      <p className="status">{status}</p>
      <div className="route"><b>Buyer Node A</b><span>→ Bottle routes →</span><b>Seller Node C</b></div>
      <div className="grid">
        <section className="card">
          <strong>Buyer Node A</strong>
          <button onClick={() => void start('buyer')}>Start Buyer</button>
          <code>{buyerAddress || 'Funding address appears here'}</code>
          <a href="https://faucet.nervos.org" rel="noreferrer" target="_blank">Open Testnet faucet ↗</a>
          <button onClick={() => void open('buyer')}>Connect & open 499 CKB channel</button>
        </section>
        <section className="card">
          <strong>Seller Node C</strong>
          <button onClick={() => void start('seller')}>Start Seller</button>
          <code>{sellerAddress || 'Funding address appears here'}</code>
          <a href="https://faucet.nervos.org" rel="noreferrer" target="_blank">Open Testnet faucet ↗</a>
          <button onClick={() => void open('seller')}>Connect & open 499 CKB channel</button>
          <button onClick={() => void prepareInbound()}>Prepare 5 CKB inbound</button>
        </section>
      </div>
      <div className="grid exchange">
        <section className="card">
          <strong>Seller · encrypt and invoice</strong>
          <textarea value={plaintext} onChange={(event) => setPlaintext(event.target.value)} />
          <button onClick={() => void encryptAndInvoice()}>Encrypt & create 1 CKB Invoice</button>
          <textarea readOnly value={generatedOffer} placeholder="Encrypted offer" />
          <button disabled={!generatedOffer} onClick={() => void navigator.clipboard.writeText(generatedOffer)}>Copy offer</button>
        </section>
        <section className="card">
          <strong>Buyer · pay and decrypt</strong>
          <textarea value={pastedOffer} onChange={(event) => setPastedOffer(event.target.value)} placeholder="Paste encrypted offer" />
          <button onClick={async () => setPastedOffer(await navigator.clipboard.readText())}>Paste offer</button>
          <button disabled={!pastedOffer} onClick={() => void loadOffer()}>Validate offer</button>
          <button disabled={!offer || Boolean(paymentKey)} onClick={() => void pay()}>Pay 1 CKB</button>
          <button disabled={!paymentKey || Boolean(decrypted)} onClick={() => void decrypt()}>Decrypt with payment preimage</button>
        </section>
      </div>
      <section className="result">
        <span>Payment preimage</span>
        <code>{paymentKey || 'Withheld until payment succeeds'}</code>
        <span>Decrypted result</span>
        <pre>{decrypted || 'Locked'}</pre>
      </section>
    </main>
  );
}
