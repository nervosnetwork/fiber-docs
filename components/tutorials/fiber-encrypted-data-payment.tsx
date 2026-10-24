'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { CkbInvoiceStatus, SendPaymentParams } from '@fiber-pay/sdk/browser';
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
const inboundSeedAmount = '5';
const paymentAmount = '1';
const initialPlaintext =
  'Fiber Testnet report\n\nThe payment settled and the encrypted result is now readable.';

type LastHopHint = {
  pubkey: `0x${string}`;
  channel_outpoint: `0x${string}`;
  fee_rate: `0x${string}`;
  tlc_expiry_delta: `0x${string}`;
};

type EncryptedOffer = {
  version: 2;
  cipher: 'AES-256-GCM';
  ciphertext: `0x${string}`;
  iv: `0x${string}`;
  invoice: string;
  paymentHash: `0x${string}`;
  lastHop: LastHopHint;
};

type JsonObject = Record<string, unknown>;

function isJsonObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeHexBytes(value: unknown, label: string, bytes?: number) {
  if (typeof value !== 'string') throw new Error(`${label} is missing.`);
  const body = value.trim().replace(/^0x/i, '');
  if (!body || body.length % 2 !== 0 || !/^[0-9a-f]+$/i.test(body)) {
    throw new Error(`${label} must be hexadecimal bytes.`);
  }
  if (bytes !== undefined && body.length !== bytes * 2) {
    throw new Error(`${label} must be ${bytes} bytes.`);
  }
  return `0x${body.toLowerCase()}` as `0x${string}`;
}

function normalizeHexQuantity(value: unknown, label: string) {
  if (typeof value === 'number' && Number.isSafeInteger(value) && value >= 0) {
    return `0x${value.toString(16)}` as `0x${string}`;
  }
  if (typeof value !== 'string') throw new Error(`${label} is missing.`);
  const normalized = value.trim();
  if (/^0x[0-9a-f]+$/i.test(normalized)) {
    return `0x${BigInt(normalized).toString(16)}` as `0x${string}`;
  }
  if (/^\d+$/.test(normalized)) {
    return `0x${BigInt(normalized).toString(16)}` as `0x${string}`;
  }
  throw new Error(`${label} must be a non-negative integer.`);
}

function packOutpoint(txHash: `0x${string}`, index: `0x${string}`) {
  const indexValue = BigInt(index);
  if (indexValue > 0xffff_ffffn) throw new Error('Last-hop output index exceeds u32.');
  const indexBytes = indexValue
    .toString(16)
    .padStart(8, '0')
    .match(/../g)
    ?.reverse()
    .join('');
  return `0x${txHash.slice(2)}${indexBytes}` as `0x${string}`;
}

function normalizeOutpoint(value: unknown): LastHopHint['channel_outpoint'] {
  if (isJsonObject(value)) {
    return packOutpoint(
      normalizeHexBytes(value.tx_hash ?? value.txHash, 'Last-hop transaction hash', 32),
      normalizeHexQuantity(value.index, 'Last-hop output index'),
    );
  }

  // fiber-js/WASM uses the molecule-packed OutPoint: 32-byte tx hash followed
  // by the 4-byte little-endian output index.
  if (typeof value === 'string' && /^0x[0-9a-f]{72}$/i.test(value.trim())) {
    return value.trim().toLowerCase() as `0x${string}`;
  }

  throw new Error('Last-hop channel outpoint is missing or malformed.');
}

function browserHopHints(hint: LastHopHint) {
  // @fiber-pay/sdk 0.3.1 types this as a structured OutPoint, while its
  // fiber-js/WASM transport expects the packed string used above.
  return [hint] as unknown as NonNullable<SendPaymentParams['hop_hints']>;
}

function normalizeLastHop(value: unknown): LastHopHint {
  if (!isJsonObject(value)) throw new Error('Bottle-to-Seller last-hop hint is missing.');
  const pubkey = normalizeHexBytes(value.pubkey, 'Last-hop public key', 33);
  if (!samePubkey(pubkey, bottlePeer.pubkey)) {
    throw new Error('Last-hop public key must identify Bottle.');
  }
  return {
    pubkey,
    channel_outpoint: normalizeOutpoint(value.channel_outpoint ?? value.channelOutpoint),
    fee_rate: normalizeHexQuantity(value.fee_rate ?? value.feeRate, 'Last-hop fee rate'),
    tlc_expiry_delta: normalizeHexQuantity(
      value.tlc_expiry_delta ?? value.tlcExpiryDelta,
      'Last-hop expiry delta',
    ),
  };
}

function bytesToHex(bytes: Uint8Array) {
  return `0x${Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')}` as `0x${string}`;
}

function hexToBytes(value: string) {
  const normalized = value.replace(/^0x/i, '');
  if (!normalized || normalized.length % 2 !== 0 || !/^[0-9a-f]+$/i.test(normalized)) {
    throw new Error('Expected an even-length hexadecimal value.');
  }
  return Uint8Array.from(normalized.match(/.{2}/g) ?? [], (part) =>
    Number.parseInt(part, 16),
  );
}

async function importAesKey(keyBytes: Uint8Array, usage: KeyUsage) {
  return crypto.subtle.importKey(
    'raw',
    new Uint8Array(keyBytes),
    { name: 'AES-GCM' },
    false,
    [usage],
  );
}

async function encryptText(plaintext: string) {
  const keyBytes = crypto.getRandomValues(new Uint8Array(32));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await importAesKey(keyBytes, 'encrypt');
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    new TextEncoder().encode(plaintext),
  );
  return {
    key: bytesToHex(keyBytes),
    iv: bytesToHex(iv),
    ciphertext: bytesToHex(new Uint8Array(ciphertext)),
  };
}

async function decryptOffer(offer: EncryptedOffer, keyHex: string) {
  const key = await importAesKey(hexToBytes(keyHex), 'decrypt');
  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: new Uint8Array(hexToBytes(offer.iv)) },
    key,
    new Uint8Array(hexToBytes(offer.ciphertext)),
  );
  return new TextDecoder().decode(plaintext);
}

function parseOffer(value: string): EncryptedOffer {
  const parsed: unknown = JSON.parse(value);
  if (!isJsonObject(parsed)) throw new Error('Encrypted offer must be a JSON object.');
  if (parsed.version !== 2 || parsed.cipher !== 'AES-256-GCM') {
    throw new Error('Create a fresh version 2 AES-256-GCM encrypted offer.');
  }
  if (typeof parsed.invoice !== 'string' || !parsed.invoice.toLowerCase().startsWith('fibt')) {
    throw new Error('Encrypted offer is missing a Fiber testnet Invoice.');
  }
  return {
    version: 2,
    cipher: 'AES-256-GCM',
    ciphertext: normalizeHexBytes(parsed.ciphertext, 'Ciphertext'),
    iv: normalizeHexBytes(parsed.iv, 'AES-GCM IV', 12),
    invoice: parsed.invoice,
    paymentHash: normalizeHexBytes(parsed.paymentHash, 'Invoice payment hash', 32),
    lastHop: normalizeLastHop(parsed.lastHop),
  };
}

const codeFiles: RoutingCodeFile[] = [
  {
    id: 'crypto', label: 'lib/crypto.ts', language: 'typescript',
    code: `export async function encryptResult(plaintext: string) {
  const keyBytes = crypto.getRandomValues(new Uint8Array(32));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await crypto.subtle.importKey(
    'raw', keyBytes, { name: 'AES-GCM' }, false, ['encrypt'],
  );
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv }, key, new TextEncoder().encode(plaintext),
  );
  return { keyBytes, iv, ciphertext: new Uint8Array(ciphertext) };
}

export async function decryptResult(ciphertext, iv, keyBytes) {
  const key = await crypto.subtle.importKey(
    'raw', keyBytes, { name: 'AES-GCM' }, false, ['decrypt'],
  );
  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv }, key, ciphertext,
  );
  return new TextDecoder().decode(plaintext);
}`,
  },
  {
    id: 'invoice', label: 'lib/invoice.ts', language: 'typescript',
    code: `import type { FiberBrowserNode } from '@fiber-pay/sdk/browser';

export async function createDataInvoice(
  seller: FiberBrowserNode,
  paymentPreimage: \`0x\${string}\`,
) {
  return seller.newInvoice({
    amount: ckbToHex('1'),
    currency: 'Fibt',
    payment_preimage: paymentPreimage,
    hash_algorithm: 'sha256',
    allow_trampoline_routing: true,
    description: 'Encrypted data payment tutorial',
    expiry: '0xe10',
  });
}`,
  },
  {
    id: 'offer', label: 'lib/offer.ts', language: 'typescript',
    code: `export function createPortableOffer(encrypted, invoice, sellerChannel) {
  return JSON.stringify({
    version: 2,
    cipher: 'AES-256-GCM',
    ciphertext: toHex(encrypted.ciphertext),
    iv: toHex(encrypted.iv),
    invoice: invoice.invoice_address,
    paymentHash: invoice.invoice.data.payment_hash,
    lastHop: {
      pubkey: bottlePeer.pubkey,
      channel_outpoint: sellerChannel.channel_outpoint,
      fee_rate: sellerChannel.tlc_fee_proportional_millionths,
      tlc_expiry_delta: sellerChannel.tlc_expiry_delta,
    },
  }, null, 2);
}

// The hint is public routing metadata. The AES key remains absent.
export async function copyOffer(offer: string) {
  await navigator.clipboard.writeText(offer);
}`,
  },
  {
    id: 'payment', label: 'lib/payment.ts', language: 'typescript',
    code: `export async function payForKey(node, offer) {
  const submitted = await node.sendPayment({
    invoice: offer.invoice,
    hop_hints: [offer.lastHop],
    max_fee_amount: ckbToHex('1'),
    max_parts: '0x1',
  });
  const result = submitted.status === 'Success' || submitted.status === 'Failed'
    ? submitted
    : await node.waitForPayment(submitted.payment_hash, {
        timeout: 60_000,
        interval: 1_000,
      });
  if (result.status !== 'Success' || !result.payment_preimage) {
    throw new Error(result.failed_error ?? 'Payment did not reveal a key');
  }
  return result.payment_preimage;
}`,
  },
  {
    id: 'app', label: 'app/pay-to-decrypt/page.tsx', language: 'tsx',
    code: `'use client';

export default function PayToDecryptPage() {
  const [offer, setOffer] = useState(null);
  const [paymentKey, setPaymentKey] = useState('');
  const [result, setResult] = useState('');

  async function pay() {
    const key = await payForKey(buyer, offer);
    setPaymentKey(key);
  }

  async function decrypt() {
    setResult(await decryptResult(
      fromHex(offer.ciphertext),
      fromHex(offer.iv),
      fromHex(paymentKey),
    ));
  }

  return <EncryptedOffer onPay={pay} onDecrypt={decrypt} result={result} />;
}`,
  },
];

const sectionCode: Record<string, RoutingCodeFocus> = {
  topology: { file: 'app', start: 3, end: 7 },
  encrypt: { file: 'crypto', start: 1, end: 11 },
  invoice: { file: 'invoice', start: 3, end: 16 },
  transfer: { file: 'offer', start: 1, end: 22 },
  pay: { file: 'payment', start: 1, end: 18 },
  decrypt: { file: 'crypto', start: 14, end: 21 },
  boundary: { file: 'offer', start: 18, end: 22 },
};

function SetupNode({
  label,
  runtime,
  stage,
  setStage,
  seller,
  addEvent,
}: {
  label: string;
  runtime: ReturnType<typeof useFiberRoutingNode>;
  stage: ChannelProgressStage;
  setStage: (stage: ChannelProgressStage) => void;
  seller?: boolean;
  addEvent: (message: string) => void;
}) {
  const channel = findReusableChannel(runtime.channels, bottlePeer.pubkey);
  const ready = isChannelReady(channel);
  const connected = runtime.peers.some((pubkey) =>
    samePubkey(pubkey, bottlePeer.pubkey),
  );
  const remoteBalance = channel ? BigInt(channel.remote_balance) : 0n;
  const inboundReady = remoteBalance >= BigInt(ckbToHex(paymentAmount));
  const funded = (runtime.balance ?? 0n) >= BigInt(ckbToHex(channelAmount));
  const fundingNoticeId = seller
    ? 'seller-testnet-funding-notice'
    : 'buyer-testnet-funding-notice';

  const open = async () => {
    const node = runtime.nodeRef.current;
    if (!node) return;
    setStage('connecting');
    const connected =
      runtime.peers.some((key) => samePubkey(key, bottlePeer.pubkey)) ||
      (await runtime.connect(bottlePeer));
    if (!connected) return setStage('error');
    const existing = findReusableChannel(
      (await node.listChannels()).channels,
      bottlePeer.pubkey,
    );
    if (existing) {
      setStage(progressFromChannelState(existing));
      addEvent(`${label} reused ${existing.state.state_name}`);
      return void runtime.refresh();
    }
    setStage('submitting');
    const opened = await runtime.run('open channel', (current) =>
      current.openChannel({
        pubkey: bottlePeer.pubkey,
        funding_amount: ckbToHex(channelAmount),
        public: true,
      }),
    );
    if (!opened) return setStage('error');
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
      return node.waitForPayment(submitted.payment_hash, {
        timeout: 60_000,
        interval: 1_000,
      });
    });
    if (!result) return;
    if (result.status === 'Success') {
      addEvent(`${label} prepared ${inboundSeedAmount} CKB inbound liquidity`);
    }
    await runtime.refresh();
  };

  useEffect(() => {
    if (channel) setStage(progressFromChannelState(channel));
  }, [channel, setStage]);

  return (
    <div className={styles.multiHopNodeSetup}>
      <div className={styles.paymentFlow}>
        <div className={styles.paymentFlowNumber}>{seller ? 'C' : 'A'}</div>
        <div>
          <strong>{label}</strong>
          <span>
            {runtime.address
              ? channel
                ? `${hexToCkb(channel.local_balance)} CKB local · ${hexToCkb(channel.remote_balance)} CKB remote`
                : `${hexToCkb(runtime.balance)} CKB on-chain · opens a ${channelAmount} CKB channel`
              : 'Start an independent browser identity.'}
          </span>
        </div>
        <div className={styles.compactActions}>
          <button
            className={styles.startButton}
            disabled={Boolean(runtime.nodeInfo) || Boolean(runtime.busy)}
            onClick={runtime.start}
            type="button"
          >
            {runtime.busy === 'start' ? 'Starting node…' : 'Start local node'}
          </button>
          <button
            aria-describedby={
              runtime.nodeInfo && !channel && !funded
                ? fundingNoticeId
                : undefined
            }
            className={styles.connectButton}
            disabled={
              !runtime.nodeInfo ||
              Boolean(runtime.busy) ||
              (channel ? connected : !funded)
            }
            onClick={() => void open()}
            type="button"
          >
            {channel && !connected
              ? 'Reconnect Bottle'
              : ready
              ? 'Channel ready'
              : stage === 'connecting'
                ? 'Connecting…'
                : stage === 'submitting'
                  ? 'Opening…'
                  : stage === 'confirming'
                    ? 'Confirming…'
                    : runtime.nodeInfo && !funded
                      ? 'Get Testnet CKB first'
                      : `Connect & open ${channelAmount} CKB`}
          </button>
        </div>
      </div>
      {runtime.address && (
        <div className={styles.rebalanceAddress}>
          <code title={runtime.address}>{runtime.address}</code>
          <button onClick={() => void navigator.clipboard.writeText(runtime.address)}>Copy</button>
          <a className={styles.faucetButton} href="https://faucet.nervos.org" rel="noreferrer" target="_blank">Get Testnet CKB ↗</a>
        </div>
      )}
      {runtime.address && !channel && !funded && (
        <div
          aria-live="polite"
          className={styles.testnetFundingNotice}
          id={fundingNoticeId}
          role="status"
        >
          <div>
            <span>Next step · Testnet funds required</span>
            <strong>Fund {label} before opening its channel</strong>
            <p>
              Current balance: {hexToCkb(runtime.balance)} CKB. Copy the address
              above, request at least {channelAmount} Testnet CKB from the Faucet,
              then return here. This page checks the balance every five seconds.
            </p>
          </div>
          <a href="https://faucet.nervos.org" rel="noreferrer" target="_blank">
            Open Faucet ↗
          </a>
        </div>
      )}
      <ChannelProgress label={`${label} channel progress`} stage={stage} />
      {!seller && ready && (
        <div className={styles.holdInboundRow}>
          <div>
            <span>Buyer capacity</span>
            <strong>{hexToCkb(channel?.local_balance)} CKB outbound</strong>
            <small>Buyer Node A uses this liquidity to pay the encrypted-data Invoice.</small>
          </div>
        </div>
      )}
      {seller && ready && (
        <div className={styles.holdInboundRow}>
          <div>
            <span>{inboundReady ? 'Seller capacity' : 'Next step · Seller capacity'}</span>
            <strong>{inboundReady ? 'Inbound liquidity is ready' : 'Prepare inbound liquidity'}</strong>
            <small>
              Remote balance: {hexToCkb(remoteBalance)} CKB.{' '}
              {inboundReady
                ? `Seller Node C can receive the ${paymentAmount} CKB payment.`
                : `Move ${inboundSeedAmount} CKB to Bottle's side before creating the offer.`}
            </small>
          </div>
          {inboundReady ? (
            <div className={styles.holdInboundReady}>✓ Inbound ready</div>
          ) : (
            <button
              className={styles.paymentButton}
              disabled={Boolean(runtime.busy)}
              onClick={() => void prepareInbound()}
              type="button"
            >
              {runtime.busy === 'prepare inbound liquidity'
                ? 'Preparing 5 CKB…'
                : `Prepare ${inboundSeedAmount} CKB inbound`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export function FiberEncryptedDataPaymentTutorial() {
  const buyer = useFiberRoutingNode('fiber-docs:multi-hop-sender-v1');
  const seller = useFiberRoutingNode('fiber-docs:multi-hop-receiver-v1');
  const [buyerStage, setBuyerStage] = useState<ChannelProgressStage>('idle');
  const [sellerStage, setSellerStage] = useState<ChannelProgressStage>('idle');
  const [plaintext, setPlaintext] = useState(initialPlaintext);
  const [sellerKey, setSellerKey] = useState<`0x${string}` | ''>('');
  const [generatedOffer, setGeneratedOffer] = useState('');
  const [buyerOfferText, setBuyerOfferText] = useState('');
  const [buyerOffer, setBuyerOffer] = useState<EncryptedOffer | null>(null);
  const [paymentHash, setPaymentHash] = useState<`0x${string}` | ''>('');
  const [invoiceStatus, setInvoiceStatus] = useState<CkbInvoiceStatus | 'None'>('None');
  const [paymentStatus, setPaymentStatus] = useState('Not sent');
  const [buyerKey, setBuyerKey] = useState<`0x${string}` | ''>('');
  const [decrypted, setDecrypted] = useState('');
  const [decryptStatus, setDecryptStatus] = useState('Waiting for an encrypted offer');
  const [transferError, setTransferError] = useState('');
  const [events, setEvents] = useState<string[]>([]);
  const invoiceChecking = useRef(false);
  const eventListRef = useRef<HTMLDivElement>(null);
  const addEvent = useCallback(
    (message: string) => setEvents((items) => [...items.slice(-11), message]),
    [],
  );

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      if (eventListRef.current) {
        eventListRef.current.scrollTop = eventListRef.current.scrollHeight;
      }
    });
    return () => window.cancelAnimationFrame(frame);
  }, [decrypted, events]);

  const buyerChannel = findReusableChannel(buyer.channels, bottlePeer.pubkey);
  const sellerChannel = findReusableChannel(seller.channels, bottlePeer.pubkey);
  const amountHex = ckbToHex(paymentAmount);
  const buyerReady =
    isChannelReady(buyerChannel) &&
    BigInt(buyerChannel?.local_balance ?? '0x0') >= BigInt(amountHex);
  const sellerReady =
    isChannelReady(sellerChannel) &&
    BigInt(sellerChannel?.remote_balance ?? '0x0') >= BigInt(amountHex);
  const buyerConnected = buyer.peers.some((pubkey) =>
    samePubkey(pubkey, bottlePeer.pubkey),
  );
  const sellerConnected = seller.peers.some((pubkey) =>
    samePubkey(pubkey, bottlePeer.pubkey),
  );
  const routeReady = buyerReady && sellerReady && buyerConnected && sellerConnected;

  useEffect(() => {
    if (!paymentHash || !seller.nodeRef.current) return;
    const check = async () => {
      if (invoiceChecking.current || !seller.nodeRef.current) return;
      invoiceChecking.current = true;
      try {
        setInvoiceStatus((await seller.nodeRef.current.getInvoice({ payment_hash: paymentHash })).status);
      } catch {
        // The seller may still be reconnecting while the Invoice is persisted locally.
      } finally {
        invoiceChecking.current = false;
      }
    };
    void check();
    const timer = window.setInterval(() => void check(), 2_000);
    return () => window.clearInterval(timer);
  }, [paymentHash, seller.nodeRef]);

  const createOffer = useCallback(async () => {
    if (!plaintext.trim()) {
      seller.setError('Enter a result to encrypt first.');
      return;
    }
    seller.setError('');
    setTransferError('');
    if (!sellerChannel?.channel_outpoint) {
      seller.setError('Seller channel does not have a confirmed outpoint yet. Refresh and try again.');
      return;
    }
    const encrypted = await encryptText(plaintext);
    const invoice = await seller.run('encrypt result and create invoice', (node) =>
      node.newInvoice({
        amount: amountHex,
        currency: 'Fibt',
        payment_preimage: encrypted.key,
        hash_algorithm: 'sha256',
        allow_trampoline_routing: true,
        description: 'Encrypted data payment tutorial',
        expiry: '0xe10',
      }),
    );
    if (!invoice) return;
    const offer: EncryptedOffer = {
      version: 2,
      cipher: 'AES-256-GCM',
      ciphertext: encrypted.ciphertext,
      iv: encrypted.iv,
      invoice: invoice.invoice_address,
      paymentHash: invoice.invoice.data.payment_hash,
      lastHop: {
        pubkey: bottlePeer.pubkey,
        channel_outpoint: normalizeOutpoint(sellerChannel.channel_outpoint),
        fee_rate: normalizeHexQuantity(
          sellerChannel.tlc_fee_proportional_millionths,
          'Last-hop fee rate',
        ),
        tlc_expiry_delta: normalizeHexQuantity(
          sellerChannel.tlc_expiry_delta,
          'Last-hop expiry delta',
        ),
      },
    };
    const serialized = JSON.stringify(offer, null, 2);
    setSellerKey(encrypted.key);
    setGeneratedOffer(serialized);
    setPaymentHash(offer.paymentHash);
    setInvoiceStatus('Open');
    setBuyerOfferText('');
    setBuyerOffer(null);
    setPaymentStatus('Not sent');
    setBuyerKey('');
    setDecrypted('');
    setDecryptStatus('Ciphertext created · key withheld');
    try {
      await navigator.clipboard.writeText(serialized);
      addEvent('Seller encrypted the result and copied the portable offer');
    } catch {
      addEvent('Seller encrypted the result; copy the offer manually');
    }
  }, [addEvent, amountHex, plaintext, seller, sellerChannel]);

  const loadOffer = useCallback(async () => {
    setTransferError('');
    try {
      const parsed = parseOffer(buyerOfferText.trim());
      const decoded = await buyer.run('validate offer invoice', (node) =>
        node.parseInvoice({ invoice: parsed.invoice }),
      );
      if (!decoded) return;
      if (
        decoded.invoice.currency !== 'Fibt' ||
        BigInt(decoded.invoice.amount ?? '0x0') !== BigInt(amountHex) ||
        decoded.invoice.data.payment_hash.toLowerCase() !== parsed.paymentHash.toLowerCase()
      ) {
        throw new Error('The Invoice does not match this 1 CKB encrypted offer.');
      }
      setBuyerOffer(parsed);
      setPaymentStatus('Ready to pay');
      setBuyerKey('');
      setDecrypted('');
      setDecryptStatus('Encrypted offer loaded · key unavailable');
      addEvent('Buyer validated the Invoice and encrypted payload');
    } catch (error) {
      setBuyerOffer(null);
      setTransferError(error instanceof Error ? error.message : 'Unable to load the encrypted offer.');
    }
  }, [addEvent, amountHex, buyer, buyerOfferText]);

  const pasteOffer = useCallback(async () => {
    setTransferError('');
    try {
      const value = (await navigator.clipboard.readText()).trim();
      if (!value) throw new Error('The clipboard is empty.');
      setBuyerOfferText(value);
      addEvent('Encrypted offer pasted into Buyer Node A');
    } catch (error) {
      setTransferError(
        error instanceof Error
          ? `${error.message} You can paste directly into the field.`
          : 'Unable to read the clipboard. Paste directly into the field.',
      );
    }
  }, [addEvent]);

  const pay = useCallback(async () => {
    if (!buyerOffer || !routeReady) return;
    setPaymentStatus('Sending');
    setBuyerKey('');
    setDecrypted('');
    setDecryptStatus('Payment submitted · waiting for the preimage');
    addEvent('Buyer submitted the 1 CKB Invoice payment');
    const result = await buyer.run('pay encrypted offer', async (node) => {
      const rpcLastHop = {
        ...buyerOffer.lastHop,
        channel_outpoint: normalizeOutpoint(buyerOffer.lastHop.channel_outpoint),
      };
      const submitted = await node.sendPayment({
        invoice: buyerOffer.invoice,
        hop_hints: browserHopHints(rpcLastHop),
        max_fee_amount: ckbToHex('1'),
        max_parts: '0x1',
      });
      if (submitted.status === 'Success' || submitted.status === 'Failed') return submitted;
      return node.waitForPayment(submitted.payment_hash, {
        timeout: 60_000,
        interval: 1_000,
      });
    });
    if (!result) {
      setPaymentStatus('Ready to pay');
      setDecryptStatus('Payment was not submitted · key was not revealed');
      return;
    }
    setPaymentStatus(result.status);
    if (result.status !== 'Success') {
      setDecryptStatus('Payment failed · key was not revealed. Retry or create a fresh offer.');
      addEvent(`Payment failed · ${result.failed_error ?? 'no preimage returned'}`);
      return;
    }
    const learnedKey = result.payment_preimage;
    if (!learnedKey) {
      setDecryptStatus('Payment succeeded, but the preimage is not available yet');
      addEvent('Payment succeeded; waiting for its stored preimage');
      const refreshed = await buyer.nodeRef.current?.getPayment({ payment_hash: result.payment_hash });
      if (!refreshed?.payment_preimage) return;
      setBuyerKey(refreshed.payment_preimage);
    } else {
      setBuyerKey(learnedKey);
    }
    setDecryptStatus('Payment succeeded · AES key revealed');
    addEvent('Fiber returned the payment preimage to Buyer Node A');
  }, [addEvent, buyer, buyerOffer, routeReady]);

  const decrypt = useCallback(async () => {
    if (!buyerOffer) return;
    if (!buyerKey) {
      try {
        await decryptOffer(
          buyerOffer,
          bytesToHex(crypto.getRandomValues(new Uint8Array(32))),
        );
      } catch {
        setDecryptStatus('Decryption rejected · AES-GCM authentication failed without the payment key');
        addEvent('Buyer tried to decrypt before payment; authentication failed');
      }
      return;
    }
    try {
      const result = await decryptOffer(buyerOffer, buyerKey);
      setDecrypted(result);
      setDecryptStatus('Decrypted · ciphertext authenticated with the revealed key');
      addEvent('Buyer decrypted and authenticated the original result');
    } catch {
      setDecryptStatus('Decryption failed · the ciphertext and payment key do not match');
    }
  }, [addEvent, buyerKey, buyerOffer]);

  const article = (
    <>
      <header className={styles.hero} data-tutorial-section="intro">
        <div className={styles.eyebrow}>
          <span>Pay to decrypt</span><span className={styles.eyebrowRule} /><span>25 minute tutorial</span>
        </div>
        <h1>Unlock Encrypted Data with a Fiber Payment</h1>
        <p className={styles.lead}>
          Run a Buyer and Seller as independent browser nodes, pay a real Testnet Invoice,
          and use the revealed payment preimage to decrypt the Seller&apos;s result.
        </p>
        <div className={styles.heroMeta}><span>Invoice</span><span>AES-GCM</span><span>Payment preimage</span></div>
      </header>
      <section className={styles.section} data-tutorial-section="topology">
        <div className={styles.stepLabel}><span>1</span> Start two browser nodes</div>
        <h2>Keep Buyer and Seller identities separate</h2>
        <p>Buyer Node A and Seller Node C run locally with separate keys and stores. Browser nodes cannot accept inbound connections, so both connect to Bottle for routing; Bottle is infrastructure, not a third application role.</p>
        <div className={styles.routeDiagram}><b>Buyer Node A</b><i>→</i><span>Bottle · route only</span><i>→</i><b>Seller Node C</b></div>
        <small className={styles.fileReference}>app/pay-to-decrypt/page.tsx · lines 3–7</small>
      </section>
      <section className={styles.section} data-tutorial-section="encrypt">
        <div className={styles.stepLabel}><span>2</span> Encrypt the result</div>
        <h2>Generate a fresh key inside the browser</h2>
        <p>Seller Node C creates a random 256-bit key and 96-bit IV, then encrypts the result with authenticated AES-GCM. The ciphertext can be delivered before payment because it is unreadable without the key.</p>
        <small className={styles.fileReference}>lib/crypto.ts · lines 1–11</small>
      </section>
      <section className={styles.section} data-tutorial-section="invoice">
        <div className={styles.stepLabel}><span>3</span> Bind the key to an Invoice</div>
        <h2>Use the AES key as the payment preimage</h2>
        <p>Seller Node C creates a regular Invoice with <code>payment_preimage: K</code> and <code>hash_algorithm: &apos;sha256&apos;</code>. Fiber places only <code>sha256(K)</code> in the Invoice and keeps K secret until settlement.</p>
        <small className={styles.fileReference}>lib/invoice.ts · lines 3–16</small>
      </section>
      <section className={styles.section} data-tutorial-section="transfer">
        <div className={styles.stepLabel}><span>4</span> Transfer the encrypted offer</div>
        <h2>Copy ciphertext and Invoice, never the key</h2>
        <p>The portable JSON contains the ciphertext, IV, payment hash, encoded Invoice, and a public Bottle→Seller last-hop hint. Copying it between the two panes makes the application boundary explicit without adding a coordination server.</p>
        <small className={styles.fileReference}>lib/offer.ts · lines 1–22</small>
      </section>
      <section className={styles.section} data-tutorial-section="pay">
        <div className={styles.stepLabel}><span>5</span> Pay for the key</div>
        <h2>Wait for Fiber to return the preimage</h2>
        <p>Buyer Node A combines its direct channel to Bottle with the offer&apos;s Bottle→Seller last-hop hint. This builds one ordinary A → Bottle → C payment without waiting for gossip or asking Bottle to start a separate trampoline payment. Only a successful result exposes <code>payment_preimage</code>; failure leaves the ciphertext locked.</p>
        <small className={styles.fileReference}>lib/payment.ts · lines 1–18</small>
      </section>
      <section className={styles.section} data-tutorial-section="decrypt">
        <div className={styles.stepLabel}><span>6</span> Decrypt locally</div>
        <h2>Import the revealed preimage as the AES key</h2>
        <p>Before payment, a trial decryption fails AES-GCM authentication. After payment, the exact preimage returned by Fiber authenticates and decrypts the original result in Buyer Node A&apos;s browser.</p>
        <small className={styles.fileReference}>lib/crypto.ts · lines 14–21</small>
      </section>
      <section className={styles.section} data-tutorial-section="boundary">
        <div className={styles.stepLabel}><span>7</span> Understand the guarantee</div>
        <h2>Payment proves key release, not result quality</h2>
        <p>This construction binds settlement to disclosure of a particular key. AES-GCM proves that the key matches the ciphertext, but it cannot prove that the Seller&apos;s plaintext is useful or truthful. Production markets still need reputation, previews, or dispute rules.</p>
        <div className={styles.note}><strong>No application backend</strong><p>Encryption, offer transfer, Invoice creation, payment polling, and decryption all run in the browser. The demo still uses public Fiber and CKB Testnet infrastructure.</p></div>
      </section>
    </>
  );

  const contentState = decrypted
    ? 'Decrypted'
    : buyerKey
      ? 'Key revealed'
      : generatedOffer
        ? 'Encrypted'
        : 'Plaintext';

  const liveDemo = (
    <>
      <div className={styles.panelHeader}>
        <span><i className={styles.liveDot} /> Encrypted Testnet exchange</span>
        <button className={styles.headerAction} onClick={() => { void buyer.refresh(); void seller.refresh(); }}>Refresh both</button>
      </div>
      <div className={`${styles.previewStage} ${styles.paymentPreviewStage}`}>
        <div className={styles.paymentCard}>
          <div className={styles.routeStatusGrid}>
            <div><span>Buyer Node A</span><strong>{buyer.nodeState}</strong></div>
            <div><span>Seller Node C</span><strong>{seller.nodeState}</strong></div>
            <div><span>Invoice</span><strong>{invoiceStatus}</strong></div>
            <div><span>Content</span><strong>{contentState}</strong></div>
          </div>
          <div className={styles.routeDiagram} aria-label="Buyer to Seller payment route">
            <b>Buyer Node A</b><i>→</i><span>Bottle · routing only</span><i>→</i><b>Seller Node C</b>
          </div>
          <SetupNode addEvent={addEvent} label="Buyer Node A" runtime={buyer} setStage={setBuyerStage} stage={buyerStage} />
          <SetupNode addEvent={addEvent} label="Seller Node C" runtime={seller} seller setStage={setSellerStage} stage={sellerStage} />
          {buyerReady && sellerReady && (
            <div className={`${styles.holdRouteRow} ${routeReady ? styles.holdRouteReady : ''}`} aria-live="polite">
              <div>
                <span>Payment route</span>
                <strong>{routeReady ? 'Last-hop route ready' : 'Reconnecting to Bottle'}</strong>
                <small>{routeReady ? 'Buyer has its Bottle channel; the encrypted offer supplies the Bottle→Seller channel hint.' : 'Channel state is ready, but both live WebSocket peer connections are required.'}</small>
              </div>
              <div className={styles.holdRouteBadge}>{routeReady ? '✓ Ready for Invoice' : 'Connecting…'}</div>
            </div>
          )}
          <div className={`${styles.invoiceTransfer} ${styles.encryptedOfferTransfer}`}>
            <div className={styles.invoiceSide}>
              <span>Seller Node C · Encrypt</span>
              <textarea aria-label="Plaintext result" disabled={!sellerReady} onChange={(event) => setPlaintext(event.target.value)} value={plaintext} />
              <button disabled={!sellerReady || !plaintext.trim() || Boolean(seller.busy)} onClick={() => void createOffer()} type="button">
                {seller.busy === 'encrypt result and create invoice' ? 'Creating offer…' : `Encrypt & create ${paymentAmount} CKB Invoice`}
              </button>
              <textarea aria-label="Generated encrypted offer" readOnly placeholder="Encrypted offer appears here" value={generatedOffer} />
              <button disabled={!generatedOffer} onClick={() => void navigator.clipboard.writeText(generatedOffer)} type="button">Copy encrypted offer</button>
            </div>
            <div className={styles.invoiceTransferArrow}><span>Encrypted offer</span><b>→</b><span>No key</span></div>
            <div className={styles.invoiceSide}>
              <span>Buyer Node A · Pay & decrypt</span>
              <textarea aria-label="Pasted encrypted offer" onChange={(event) => { setBuyerOfferText(event.target.value); setBuyerOffer(null); }} placeholder="Paste the encrypted offer" value={buyerOfferText} />
              <button disabled={!generatedOffer} onClick={() => void pasteOffer()} type="button">Paste from clipboard</button>
              <button disabled={!buyer.nodeInfo || !buyerOfferText.trim() || Boolean(buyer.busy)} onClick={() => void loadOffer()} type="button">Validate encrypted offer</button>
              <button className={styles.paymentButton} disabled={!buyerReady || !routeReady || !buyerOffer || paymentStatus === 'Success' || Boolean(buyer.busy)} onClick={() => void pay()} type="button">
                {buyer.busy === 'pay encrypted offer' ? 'Paying…' : paymentStatus === 'Success' ? 'Paid ✓' : paymentStatus === 'Failed' ? 'Retry payment' : `Pay ${paymentAmount} CKB`}
              </button>
              <button disabled={!buyerOffer || Boolean(decrypted)} onClick={() => void decrypt()} type="button">
                {decrypted ? 'Decrypted ✓' : buyerKey ? 'Decrypt with revealed key' : 'Try to decrypt without key'}
              </button>
              {transferError && <small>{transferError}</small>}
            </div>
          </div>
          <div className={styles.cryptoProofGrid}>
            <div><span>Ciphertext</span><strong>{buyerOffer ? shorten(buyerOffer.ciphertext, 14, 12) : 'Not received'}</strong><small>AES-GCM encrypted bytes</small></div>
            <div><span>Invoice hash</span><strong>{paymentHash ? shorten(paymentHash, 14, 12) : 'Not created'}</strong><small>sha256(payment preimage)</small></div>
            <div><span>Payment preimage</span><strong>{buyerKey ? shorten(buyerKey, 14, 12) : sellerKey ? 'Withheld by Seller' : 'Not generated'}</strong><small>{buyerKey ? 'Revealed to Buyer after Success' : 'Never included in the offer'}</small></div>
            <div className={decrypted ? styles.cryptoProofSuccess : undefined}><span>Decryption</span><strong>{decrypted ? 'Authenticated' : 'Locked'}</strong><small>{decryptStatus}</small></div>
          </div>
          {(buyer.error || seller.error) && <div className={styles.paymentError}>{buyer.error || seller.error}</div>}
        </div>
        <div className={styles.eventPanel}>
          <div className={styles.eventPanelHeader}><span>Encryption and payment events</span><i className={styles.liveDot} /></div>
          <div aria-live="polite" className={styles.eventList} ref={eventListRef}>
            {events.length ? events.map((event, index) => <div key={`${event}-${index}`}><time>{String(index + 1).padStart(2, '0')}</time><code>flow</code><span>{event}</span></div>) : <div><time>00</time><code>ready</code><span>Start Buyer Node A and Seller Node C.</span></div>}
            {decrypted && (
              <div className={styles.eventResult}>
                <time>{String(events.length + 1).padStart(2, '0')}</time>
                <code>decrypted</code>
                <span>
                  <strong>Decrypted result</strong>
                  <pre>{decrypted}</pre>
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );

  return (
    <RoutingTutorialFrame
      article={article}
      codeFiles={codeFiles}
      currentTutorialIndex={5}
      defaultFile="crypto"
      demoDescription="Encrypt a result, pay its real Testnet Invoice, and decrypt with the revealed payment preimage."
      demoTitle="Run the Pay-to-Decrypt Demo"
      downloadHref="/downloads/fiber-encrypted-data-payment.zip"
      liveDemo={liveDemo}
      nextHref="/docs/build/verified-result-payment"
      previousHref="/docs/build/hold-invoice"
      sectionCode={sectionCode}
    />
  );
}
