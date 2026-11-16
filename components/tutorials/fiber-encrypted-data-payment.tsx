'use client';

import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import type { Channel, CkbInvoiceStatus, GetPaymentResult, SendPaymentParams } from '@fiber-pay/sdk/browser';
import { RoutingCodeBlock, TutorialFooter, TutorialToolbar, type RoutingCodeFile } from './routing-tutorial-frame';
import { liveTutorials } from './tutorial-registry';
import { CopyIconButton } from './copy-icon-button';
import { Callout } from 'fumadocs-ui/components/callout';
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
  type ChannelProgressStage,
  isChannelReady,
  progressFromChannelState,
} from './fiber-tutorial-utils';
import { channelOpeningStates, channelOpeningProgress, channelOpeningDescriptions, channelStateLabel } from './multi-hop-progress';
import styles from './fiber-wasm-quickstart.module.css';
import lesson from './encrypted-data-lesson.module.css';
import { encryptedSessionKey, encryptedBuyerProfile, encryptedSellerProfile, savedNodeIdentifier, readEncryptedProgress, canSubmitEncryptedPayment, encryptedNodeStatus } from './encrypted-data-session';
import { detectMultiHopProfiles } from './multi-hop-setup';

const tutorialIndex = liveTutorials.findIndex((tutorial) => tutorial.id === 'encrypted-data-payment');
const channelAmount = '500';
const inboundSeedAmount = '5';
const paymentAmount = '1';
const initialPlaintext =
  'Sample test report\n\nBoth nodes connected successfully. The round-trip time was 42 ms.';

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
    id: 'channels', label: 'lib/fiber.ts', language: 'typescript',
    code: `// Connect to Bottle before requesting a channel.
await node.connectPeer({
  address: bottlePeer.address,
  pubkey: bottlePeer.pubkey,
});

// Restore existing channels instead of funding replacements.
const existing = findReusableChannel(
  (await node.listChannels()).channels,
  bottlePeer.pubkey,
);
if (!existing) {
  await node.openChannel({
    pubkey: bottlePeer.pubkey,
    funding_amount: ckbToHex('${channelAmount}'),
    public: true,
  });
}

// Run this status check again while the channel is opening.
const channel = findReusableChannel(
  (await node.listChannels()).channels,
  bottlePeer.pubkey,
);
const ready = isChannelReady(channel); // Only true at CHANNEL_READY.`,
  },
  {
    id: 'liquidity', label: 'app/page.tsx', language: 'typescript',
    code: `const submitted = await seller.sendPayment({
  target_pubkey: bottlePeer.pubkey,
  amount: ckbToHex('5'),
  keysend: true,
});
const result = submitted.status === 'Success' || submitted.status === 'Failed'
  ? submitted
  : await seller.waitForPayment(submitted.payment_hash, {
      timeout: 60_000,
      interval: 1_000,
    });
if (result.status !== 'Success') {
  throw new Error(result.failed_error ?? 'Check this transfer before retrying.');
}
const channel = findReusableChannel(
  (await seller.listChannels()).channels,
  bottlePeer.pubkey,
);
// The bar shows the two spendable balances on Seller C’s channel.
const sellerBalance = channel?.local_balance;
const bottleBalance = channel?.remote_balance;`,
  },
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
  return {
    key: toHex(keyBytes),
    payload: { ciphertext: toHex(new Uint8Array(ciphertext)), iv: toHex(iv) },
  };
}

export async function decryptResult(
  payload: { ciphertext: string; iv: string },
  paymentPreimage: string,
) {
  const key = await crypto.subtle.importKey(
    'raw', new Uint8Array(fromHex(paymentPreimage)),
    { name: 'AES-GCM' }, false, ['decrypt'],
  );
  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: new Uint8Array(fromHex(payload.iv)) },
    key, new Uint8Array(fromHex(payload.ciphertext)),
  );
  return new TextDecoder().decode(plaintext);
}`,
  },
  {
    id: 'invoice', label: 'lib/offer.ts', language: 'typescript',
    code: `import type { FiberBrowserNode } from '@fiber-pay/sdk/browser';

export async function createDataInvoice(
  seller: FiberBrowserNode,
  encrypted: Awaited<ReturnType<typeof encryptResult>>,
) {
  return seller.newInvoice({
    amount: ckbToHex('1'),
    currency: 'Fibt',
    payment_preimage: encrypted.key, // Same AES key, encoded as hex.
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
    ...encrypted.payload,
    invoice: invoice.invoice_address,
    paymentHash: invoice.invoice.data.payment_hash,
    lastHop: {
      pubkey: bottlePeer.pubkey,
      channel_outpoint: normalizeOutpoint(sellerChannel.channel_outpoint),
      fee_rate: sellerChannel.tlc_fee_proportional_millionths,
      tlc_expiry_delta: sellerChannel.tlc_expiry_delta,
    },
  }, null, 2);
}`,
  },
  {
    id: 'keyless', label: 'lib/crypto.ts', language: 'typescript',
    code: `const offer = parseOffer(receivedJson);
const unrelatedKey = toHex(crypto.getRandomValues(new Uint8Array(32)));

try {
  await decryptResult(offer, unrelatedKey);
} catch (error) {
  if (!(error instanceof DOMException && error.name === 'OperationError')) throw error;
  // AES-GCM rejected the ciphertext with this key.
  setTriedWithoutKey(true);
}`,
  },
  {
    id: 'validation', label: 'lib/payment.ts', language: 'typescript',
    code: `// Validate the offer before submitting the payment.
export async function validateReceivedOffer(buyer, receivedJson: string) {
  const offer = parseOffer(receivedJson);
  const { invoice } = await buyer.parseInvoice({ invoice: offer.invoice });
  if (
    invoice.currency !== 'Fibt' ||
    BigInt(invoice.amount ?? '0x0') !== BigInt(ckbToHex('1')) ||
    invoice.data.payment_hash.toLowerCase() !== offer.paymentHash.toLowerCase()
  ) {
    throw new Error('The Invoice does not match this 1 CKB encrypted offer.');
  }
  return offer;
}`,
  },
  {
    id: 'payment', label: 'lib/payment.ts', language: 'typescript',
    code: `async function submitPayment(node, offer, saveAttempt) {
  // Record the hash before sending so a refresh can recover the attempt.
  if (!saveAttempt(offer.paymentHash)) {
    throw new Error('Payment progress could not be saved.');
  }
  const submitted = await node.sendPayment({
    invoice: offer.invoice,
    hop_hints: [offer.lastHop],
    max_fee_amount: ckbToHex('1'),
    max_parts: '0x1',
  });
  return submitted.status === 'Success' || submitted.status === 'Failed'
    ? submitted
    : await node.waitForPayment(submitted.payment_hash, {
        timeout: 60_000,
        interval: 1_000,
      });
}

// After a refresh or timeout, check the saved attempt.
const result = savedPaymentHash
  ? await buyer.getPayment({ payment_hash: savedPaymentHash })
  : await submitPayment(buyer, offer, saveAttempt);
const revealedKey = result.status === 'Success'
  ? result.payment_preimage
  : undefined;`,
  },
  {
    id: 'nodes', label: 'lib/fiber.ts', language: 'typescript',
    code: `import {
  FiberBrowserNode,
  RawKeyCredentialProvider,
  scriptToAddress,
} from '@fiber-pay/sdk/browser';

// Use a separate storage key for Buyer A and Seller C.
function loadProfile(storageKey: string) {
  const saved = localStorage.getItem(storageKey);
  if (saved) return JSON.parse(saved);

  const profile = {
    fiberKey: toHex(crypto.getRandomValues(new Uint8Array(32))),
    ckbKey: toHex(crypto.getRandomValues(new Uint8Array(32))),
    identifier: crypto.randomUUID(),
  };
  localStorage.setItem(storageKey, JSON.stringify(profile));
  return profile;
}

export async function startBrowserNode(profile: {
  fiberKey: string;
  ckbKey: string;
  identifier: string;
}) {
  const node = new FiberBrowserNode({
    network: 'testnet',
    credential: new RawKeyCredentialProvider(
      fromHex(profile.fiberKey), fromHex(profile.ckbKey), profile.identifier,
    ),
    nodeConfig: { bootnodes: [], logLevel: 'info' },
  });
  const info = await node.start();
  const fundingAddress = scriptToAddress(
    info.default_funding_lock_script, 'testnet',
  );
  return { node, pubkey: info.pubkey, fundingAddress };
}`,
  },
  {
    id: 'balance', label: 'fiber-routing-runtime.ts', language: 'typescript',
    code: `// Use the same funding lock script that produced the faucet address.
const response = await fetch('https://testnet.ckbapp.dev/', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    jsonrpc: '2.0',
    id: 1,
    method: 'get_cells_capacity',
    params: [{ script: info.default_funding_lock_script, script_type: 'lock' }],
  }),
});
const { result, error } = await response.json();
if (!response.ok || !result?.capacity) {
  throw new Error(error?.message ?? 'Unable to read the Testnet balance.');
}
const funded = BigInt(result.capacity) > BigInt(ckbToHex('${channelAmount}'));`,
  },
];

function LessonCode({ files, cryptoPart }: { files: string[]; cryptoPart?: 'encrypt' | 'decrypt' }) {
  const id = useId();
  const [active, setActive] = useState(0);
  const selectedFiles = codeFiles.filter((file) => files.includes(file.id)).map((file) => {
    if (file.id !== 'crypto' || !cryptoPart) return file;
    const boundary = file.code.indexOf('export async function decryptResult');
    return { ...file, code: cryptoPart === 'encrypt' ? file.code.slice(0, boundary).trimEnd() : file.code.slice(boundary) };
  });
  return (
    <details className={lesson.code}>
      <summary>
        <strong>Explore the code</strong>
        <span className={lesson.disclosureIcon} aria-hidden="true" />
      </summary>
      {selectedFiles.length > 1 && <div className={`${styles.fileTabs} ${lesson.codeTabs}`} role="tablist" aria-label="Code excerpts">
        {selectedFiles.map((file, index) => <button
          key={file.id}
          type="button"
          role="tab"
          id={`${id}-tab-${index}`}
          aria-selected={active === index}
          aria-controls={`${id}-panel-${index}`}
          tabIndex={active === index ? 0 : -1}
          className={active === index ? styles.activeTab : undefined}
          onClick={() => setActive(index)}
          onKeyDown={(event) => {
            const offsets = { ArrowLeft: -1, ArrowRight: 1 };
            const offset = offsets[event.key as keyof typeof offsets];
            const next = event.key === 'Home' ? 0 : event.key === 'End' ? selectedFiles.length - 1
              : offset ? (index + offset + selectedFiles.length) % selectedFiles.length : index;
            if (!offset && event.key !== 'Home' && event.key !== 'End') return;
            event.preventDefault();
            setActive(next);
            document.getElementById(`${id}-tab-${next}`)?.focus();
          }}
        >{file.label}</button>)}
      </div>}
      {selectedFiles.map((file, index) => (
        <div key={file.id} hidden={index !== active} {...(selectedFiles.length > 1 && {
          role: 'tabpanel', id: `${id}-panel-${index}`, 'aria-labelledby': `${id}-tab-${index}`,
        })}>
          <div className={lesson.codeFileHeading}><span>Excerpt · {file.label}</span><CopyIconButton value={file.code} label={`Copy excerpt from ${file.label}`} /></div>
          <RoutingCodeBlock file={file} />
        </div>
      ))}
    </details>
  );
}

function getNodeStatus(runtime: ReturnType<typeof useFiberRoutingNode>) {
  return encryptedNodeStatus({ nodeState: runtime.nodeState, starting: runtime.busy === 'start', hasNode: Boolean(runtime.nodeInfo), hasChannel: Boolean(findReusableChannel(runtime.channels, bottlePeer.pubkey)), connected: runtime.peers.some((peer) => samePubkey(peer, bottlePeer.pubkey)), error: Boolean(runtime.error) });
}

function SetupNode({ label, runtime, savedProfile }: {
  label: string;
  runtime: ReturnType<typeof useFiberRoutingNode>;
  savedProfile: boolean | null;
}) {
  const channel = findReusableChannel(runtime.channels, bottlePeer.pubkey);
  const funded = (runtime.balance ?? 0n) > BigInt(ckbToHex(channelAmount));
  const status = getNodeStatus(runtime);
  const title = runtime.busy === 'start' ? 'Starting node…'
    : status.tone === 'error' ? 'Node error'
    : !runtime.nodeInfo ? 'Ready to start'
    : runtime.nodeState === 'stopped' ? 'Node stopped' : 'Node running';

  return (
    <div id={label.includes('Buyer') ? 'node-a' : 'node-c'} className={`${lesson.experiment} ${lesson.nodeSetup}`} aria-label={`${label} setup`}>
      <div className={lesson.nodeCardHeader}>
        <span className={lesson.nodeMark} aria-hidden="true">{label.includes('Buyer') ? 'A' : 'C'}</span>
        <div><span className={lesson.nodeCardLabel}>{label}</span><strong>{title}</strong></div>
        <span className={lesson.cardStatus} data-tone={status.tone} role="status" aria-label={`${label}: ${status.label}`}><i aria-hidden="true" /></span>
      </div>
      <div className={lesson.nodeIdentity}>
        <span className={lesson.nodeCardLabel}>Node pubkey</span>
        <div className={lesson.copyableValue}>
          <code title={runtime.nodeInfo?.pubkey}>{runtime.nodeInfo?.pubkey ? shorten(runtime.nodeInfo.pubkey, 12, 10) : 'Waiting for node'}</code>
          {runtime.nodeInfo?.pubkey && <CopyIconButton value={runtime.nodeInfo.pubkey} label={`Copy ${label} pubkey`} />}
        </div>
      </div>
      <details className={lesson.supportingDetails}><summary>Node technical details</summary>
      <dl className={lesson.nodeFacts}>
        <div><dt>Runtime</dt><dd>Fiber WASM</dd></div><div><dt>Storage</dt><dd>IndexedDB</dd></div><div><dt>Transport</dt><dd>WSS</dd></div>
      </dl>
      </details>
      {!runtime.nodeInfo && <div className={lesson.actions}>
        <button className={lesson.primary} disabled={savedProfile === null || Boolean(runtime.busy)} onClick={runtime.start} type="button">{runtime.busy === 'start' ? 'Starting Fiber…' : 'Start WASM node'}<span aria-hidden="true">→</span></button>
      </div>}
      {runtime.nodeInfo && runtime.busy !== 'start' && runtime.address && <div className={lesson.fundingAddress}>
        <span className={lesson.nodeCardLabel}>Funding address</span>
        <div className={lesson.copyableValue}><code title={runtime.address}>{shorten(runtime.address, 14, 12)}</code><CopyIconButton value={runtime.address} label={`Copy ${label} address`} /></div>
        <div className={lesson.balanceSummary}>
          <dl className={lesson.onChainBalance}>
            <dt className={lesson.balanceLabel}>
              <span className={lesson.nodeCardLabel}>On-chain CKB</span>
              <button className={lesson.refreshIcon} aria-label={`Refresh ${label} on-chain balance`} aria-busy={runtime.busy === 'refresh'} title="Refresh balance" disabled={Boolean(runtime.busy)} onClick={() => void runtime.run('refresh', () => runtime.refresh())} type="button"><svg aria-hidden="true" width="15" height="15" viewBox="0 0 16 16" fill="none"><path d="M13.25 6A5.5 5.5 0 1 0 13.5 9" /><path d="M13.25 2.75V6H10" /></svg></button>
            </dt>
            <dd>{runtime.balance === null ? '—' : hexToCkb(runtime.balance)}<span>CKB</span></dd>
          </dl>
          {runtime.balance !== null && !funded && !channel && <p className={lesson.faucetWarning}>Faucet confirmation usually takes about 30s, sometimes longer. Refresh to check.</p>}
        </div>
        {runtime.balance !== null && !funded && !channel && <div className={lesson.fundingActions}>
          <a className={lesson.primary} href="https://faucet.nervos.org" rel="noreferrer" target="_blank">Get Testnet CKB ↗</a>
        </div>}
      </div>}
      {runtime.error && !channel && <p role="alert" className={styles.paymentError}>{runtime.error}</p>}
    </div>
  );
}

function OpenChannel({ label, runtime, stage, setStage }: {
  label: string;
  runtime: ReturnType<typeof useFiberRoutingNode>;
  stage: ChannelProgressStage;
  setStage: (stage: ChannelProgressStage) => void;
}) {
  const [slowOpening, setSlowOpening] = useState(false);
  const channel = findReusableChannel(runtime.channels, bottlePeer.pubkey);
  const ready = isChannelReady(channel);
  const connected = runtime.peers.some((pubkey) =>
    samePubkey(pubkey, bottlePeer.pubkey),
  );
  const funded = (runtime.balance ?? 0n) > BigInt(ckbToHex(channelAmount));
  const pending = ['connecting', 'submitting', 'confirming'].includes(stage);
  const { refreshChannels, setError } = runtime;
  const stateName = channel?.state.state_name;
  const lifecycle = channelOpeningProgress(stateName);

  useEffect(() => {
    if (!pending) {
      setSlowOpening(false);
      return;
    }
    const timer = window.setTimeout(() => setSlowOpening(true), 60_000);
    return () => window.clearTimeout(timer);
  }, [pending]);

  const open = async () => {
    const node = runtime.nodeRef.current;
    if (!node) return;
    let hasFundingRequest = false;
    setStage('connecting');
    try {
      const connected =
        runtime.peers.some((key) => samePubkey(key, bottlePeer.pubkey)) ||
        (await runtime.connect(bottlePeer));
      if (!connected) return setStage('error');
      const existing = findReusableChannel(
        (await node.listChannels()).channels,
        bottlePeer.pubkey,
      );
      if (existing) {
        hasFundingRequest = true;
        setStage(progressFromChannelState(existing));

        await refreshChannels();
        return;
      }
      if (!funded) throw new Error(`Fund this node with more than ${channelAmount} on-chain Testnet CKB before opening a channel.`);
      setStage('submitting');
      const opened = await runtime.run('open channel', (current) =>
        current.openChannel({
          pubkey: bottlePeer.pubkey,
          funding_amount: ckbToHex(channelAmount),
          public: true,
        }),
      );
      if (!opened) return setStage('error');
      hasFundingRequest = true;
      setStage('confirming');

      await refreshChannels();
    } catch (error) {
      // Once submitted, a failed status request says nothing about the funding transaction.
      if (!hasFundingRequest) setStage('error');
      setError(error instanceof Error ? error.message : hasFundingRequest ? 'Unable to read the channel status.' : 'Unable to open the channel.');
    }
  };

  useEffect(() => {
    if (channel) setStage(progressFromChannelState(channel));
  }, [channel, setStage]);


  const nodeLetter = label.includes('Buyer') ? 'A' : 'C';
  const prerequisite = runtime.busy === 'start' ? `Wait for node ${nodeLetter} to finish starting.`
    : !runtime.nodeInfo ? `Start node ${nodeLetter} before opening channel.`
    : !channel && !funded && !pending ? `Fund node ${nodeLetter} with more than ${channelAmount} on-chain CKB.` : '';
  const blocked = Boolean(prerequisite) || Boolean(runtime.busy) || pending;

  return <div id={`channel-${nodeLetter.toLowerCase()}`} className={`${lesson.experiment} ${lesson.channelCard}`} aria-label={`${label} channel`}>
    <div className={lesson.channelCardHeader}><strong>Channel {nodeLetter} - B</strong></div>
    {(!channel || !ready || !connected) && <div className={lesson.actions}>
      <button className={lesson.primary} aria-describedby={prerequisite ? `channel-${nodeLetter}-hint` : undefined} aria-busy={pending} disabled={blocked} onClick={() => void open()} type="button">
        {pending ? 'Opening channel…' : channel && !connected ? 'Reconnect channel' : `Open ${channelAmount} CKB channel`}
        {pending && <span className={lesson.channelSpinner} aria-hidden="true" />}
      </button>
    </div>}
    {prerequisite && <p className={lesson.prerequisiteHint} id={`channel-${nodeLetter}-hint`}><a href={nodeLetter === 'A' ? '#node-a' : '#node-c'}>{prerequisite}</a></p>}
    {(pending || channel) && <details className={lesson.channelOpening} open={!ready}>
      <summary>{pending ? 'Opening channel' : 'View opening states'}</summary>
      <ol>{lifecycle.map(({ state, status }) => (
        <li aria-current={status === 'current' ? 'step' : undefined} aria-label={`${state}: ${status}`} data-state={status} key={state}>
          <span className={lesson.channelStageMarker} aria-hidden="true">
            {status === 'current' ? <span className={lesson.channelSpinner} /> : status === 'complete' ? '✓' : '○'}
          </span>
          {state}
        </li>
      ))}</ol>
      {pending && !stateName && <p className={lesson.prerequisiteHint} role="status">
        {stage === 'connecting' ? 'Connecting to Bottle…' : stage === 'submitting' ? 'Submitting the funding request…' : 'Funding request submitted. Waiting for the node to report the channel.'}
      </p>}
    </details>}
    {pending && slowOpening && <p className={lesson.prerequisiteHint} role="status">Opening a channel can take several minutes, and browser nodes can sometimes lose their connection. If progress stays stuck, come back later and start the same node to check the existing channel.</p>}
    {ready && channel && <ChannelLiquidity channel={channel} label={label.includes('Buyer') ? 'Buyer A' : 'Seller C'} bottleFirst={!label.includes('Buyer')} />}
    {runtime.error && <p role="alert" className={styles.paymentError}>
      {/CHANNEL_V2 is required/i.test(runtime.error)
        ? 'Bottle and your browser node need Channel V2 support to open a new channel. Try again once the peer supports V2.'
        : runtime.error}
    </p>}
  </div>;
}

export function ChannelLiquidity({ channel, label, pending = false, bottleFirst = false, before, transferred }: {
  channel?: Pick<Channel, 'local_balance' | 'remote_balance'>;
  label: string;
  pending?: boolean;
  bottleFirst?: boolean;
  before?: Pick<Channel, 'local_balance' | 'remote_balance'>;
  transferred?: bigint;
}) {
  const leftLabel = bottleFirst ? 'Bottle B' : label;
  const rightLabel = bottleFirst ? label : 'Bottle B';
  const leftSide = bottleFirst ? 'remote_balance' : 'local_balance';
  const rightSide = bottleFirst ? 'local_balance' : 'remote_balance';
  const left = channel ? BigInt(channel[leftSide]) : undefined;
  const right = channel ? BigInt(channel[rightSide]) : undefined;
  const total = (left ?? 0n) + (right ?? 0n);
  const share = total > 0n ? Number((left ?? 0n) * 1_000_000n / total) / 10_000 : 0;
  const leftDelta = before && left !== undefined ? left - BigInt(before[leftSide]) : 0n;
  const rightDelta = before && right !== undefined ? right - BigInt(before[rightSide]) : 0n;
  const showDelta = transferred !== undefined && transferred !== 0n && leftDelta === -transferred && rightDelta === transferred;
  const leftChange = showDelta && <LiquidityDelta amount={leftDelta} />;
  const rightChange = showDelta && <LiquidityDelta amount={rightDelta} />;
  return <div className={lesson.liquidity} role="group" aria-busy={pending} aria-label={`${leftLabel}–${rightLabel} channel liquidity`}>
    <dl aria-live="polite">
      <div><dt>{leftLabel}</dt><dd>{hexToCkb(left)} CKB{leftChange}</dd></div>
      <div><dt>{rightLabel}</dt><dd>{rightChange}{hexToCkb(right)} CKB</dd></div>
    </dl>
    <div className={lesson.liquidityTrack} data-known={Boolean(channel)} data-loading={pending || undefined} aria-hidden="true">
      <span style={{ width: `${share}%` }} />
    </div>
  </div>;
}

function LiquidityDelta({ amount }: { amount: bigint }) {
  return <span className={lesson.liquidityDelta} data-direction={amount < 0n ? 'decrease' : 'increase'}>
    {amount < 0n ? '−' : '+'}{hexToCkb(amount < 0n ? -amount : amount)} CKB
  </span>;
}

function OfferPreview({ value }: { value: string }) {
  const jsonId = useId();
  return <div className={lesson.offerPreview}>
    <div className={lesson.copyableValue}>
      <label className={lesson.nodeCardLabel} htmlFor={jsonId}>Offer JSON</label>
      <CopyIconButton value={value} label="Copy encrypted offer" />
    </div>
    <textarea id={jsonId} readOnly value={value} />
  </div>;
}

function PrepareInbound({ runtime, profileKey, enabled }: {
  runtime: ReturnType<typeof useFiberRoutingNode>;
  profileKey: string;
  enabled: boolean;
}) {
  const channel = findReusableChannel(runtime.channels, bottlePeer.pubkey);
  const local = channel ? BigInt(channel.local_balance) : undefined;
  const transferAmount = BigInt(ckbToHex(inboundSeedAmount));
  const [hash, setHash] = useState<`0x${string}` | ''>('');
  const [detail, setDetail] = useState('');
  const [working, setWorking] = useState(false);
  const [sent, setSent] = useState(false);
  const [beforeTransfer, setBeforeTransfer] = useState<Channel>();
  const [uncertain, setUncertain] = useState(false);
  const locked = useRef(false);
  const savedAttemptKey = useCallback(() => {
    const id = savedNodeIdentifier(localStorage, profileKey);
    return id ? `fiber-docs:encrypted-inbound:${id}` : null;
  }, [profileKey]);

  useEffect(() => {
    if (!runtime.nodeInfo) return;
    try {
      const key = savedAttemptKey();
      const saved = key ? sessionStorage.getItem(key) : null;
      if (saved === 'submitting') setUncertain(true);
      else if (saved && /^0x[0-9a-f]{64}$/i.test(saved)) setHash(saved as `0x${string}`);
    } catch { /* Live balances remain authoritative if browser storage is unavailable. */ }
  }, [runtime.nodeInfo, savedAttemptKey]);

  useEffect(() => {
    if (!sent || working || !beforeTransfer) return;
    const timer = window.setTimeout(() => setBeforeTransfer(undefined), 10_000);
    return () => window.clearTimeout(timer);
  }, [sent, working, beforeTransfer]);

  const prepare = async () => {
    if (locked.current || sent || uncertain || !runtime.nodeRef.current || (!hash && !enabled)) return;
    locked.current = true;
    setWorking(true);
    setDetail('');
    if (!hash) setBeforeTransfer(channel);
    try {
      const result = hash
        ? await runtime.nodeRef.current.getPayment({ payment_hash: hash })
        : await runtime.run('prepare inbound liquidity', async (node) => {
          const key = savedAttemptKey();
          if (!key) throw new Error('Node identity is unavailable.');
          sessionStorage.setItem(key, 'submitting');
          setUncertain(true);
          const submitted = await node.sendPayment({ target_pubkey: bottlePeer.pubkey, amount: ckbToHex(inboundSeedAmount), keysend: true });
          setUncertain(false);
          setHash(submitted.payment_hash);
          try { const key = savedAttemptKey(); if (key) sessionStorage.setItem(key, submitted.payment_hash); } catch { /* Keep the in-memory attempt. */ }
          if (submitted.status === 'Success' || submitted.status === 'Failed') return submitted;
          return node.waitForPayment(submitted.payment_hash, { timeout: 60_000, interval: 1_000 });
        });
      if (result?.status === 'Failed') {
        setDetail(result.failed_error ?? 'Inbound payment failed. You can retry.');
        setHash('');
        try { const key = savedAttemptKey(); if (key) sessionStorage.removeItem(key); } catch { /* The failure remains visible. */ }
      } else if (result?.status === 'Success') {
        setSent(true);
      } else {
        setDetail('Payment outcome is not confirmed yet.');
      }
      await runtime.refreshChannels();
    } catch {
      setDetail('Unable to read the payment status.');
    } finally {
      locked.current = false;
      setWorking(false);
    }
  };

  const requirement = !working && !runtime.busy && !enabled && !hash && !sent ? 'Open both channels before preparing liquidity.' : '';
  return <div className={`${lesson.experiment} ${lesson.centeredPanel}`} aria-label="Seller channel liquidity demonstration">
    <ChannelLiquidity channel={isChannelReady(channel) ? channel : undefined} label="Seller C" bottleFirst pending={working}
      before={beforeTransfer?.channel_id === channel?.channel_id ? beforeTransfer : undefined}
      transferred={sent && !working ? -transferAmount : undefined} />
    <div className={lesson.actions}>
      <button className={lesson.primary} aria-describedby={requirement ? 'inbound-prerequisite' : undefined} disabled={sent || uncertain || working || Boolean(runtime.busy) || (hash ? !runtime.nodeInfo : !enabled || (local ?? 0n) < transferAmount)} onClick={() => void prepare()} type="button">{working ? 'Transferring…' : sent ? '5 CKB sent' : uncertain ? 'Transfer needs review' : hash ? 'Check inbound payment' : 'Send 5 CKB to Bottle'}</button>
    </div>
    {requirement && <p className={lesson.prerequisiteHint} id="inbound-prerequisite"><a href="#channels">{requirement}</a></p>}
    {(uncertain || detail) && <p className={lesson.feedback} role="status">{uncertain ? 'The transfer outcome is unknown. Review the node’s payment history before sending again.' : detail}</p>}
  </div>;

}

function ResultHeading({ title, tone, heading: Heading = 'h4' }: {
  title: string;
  tone: 'success' | 'pending' | 'error';
  heading?: 'h3' | 'h4';
}) {
  const success = tone === 'success';
  return <Heading className={`${lesson.resultHeading} ${success ? lesson.resultSuccess : lesson.resultStatus}`} data-tone={tone}>
    {success && <span className={styles.multiHopOutcomeMark} data-tone="success" aria-hidden="true">✓</span>}
    {title}
  </Heading>;
}

function ResultValue({ label, value, copyLabel }: { label: string; value: string; copyLabel: string }) {
  return <dl className={lesson.resultValue}>
    <div>
      <dt className={lesson.nodeCardLabel}>{label}</dt>
      <dd className={lesson.copyableValue}><code>{value}</code><CopyIconButton value={value} label={copyLabel} /></dd>
    </div>
  </dl>;
}

export function FiberEncryptedDataPaymentTutorial() {
  const shellRef = useRef<HTMLDivElement>(null);
  const toolbarRef = useRef<HTMLElement>(null);
  const stepperRef = useRef<HTMLElement>(null);
  const [readingStep, setReadingStep] = useState('setup');
  const [articleProgress, setArticleProgress] = useState(0);
  useEffect(() => {
    const shell = shellRef.current;
    const toolbar = toolbarRef.current;
    const stepper = stepperRef.current;
    if (!shell || !toolbar || !stepper) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const readingLine = Math.max(toolbar.getBoundingClientRect().bottom, stepper.getBoundingClientRect().bottom) + 32;
      let active = 'setup';
      for (const id of ['setup', 'encrypt', 'transfer', 'pay', 'decrypt']) {
        if ((document.getElementById(id)?.getBoundingClientRect().top ?? Infinity) <= readingLine) active = id;
      }
      setReadingStep(active);
      const scrollDistance = shell.scrollHeight - shell.clientHeight;
      setArticleProgress(scrollDistance > 0 ? Math.min(1, Math.max(0, shell.scrollTop / scrollDistance)) : 0);
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
    const resize = new ResizeObserver(() => {
      shell.style.setProperty('--lesson-header-height', `${toolbar.offsetHeight}px`);
      shell.style.setProperty('--lesson-stepper-height', `${stepper.offsetHeight}px`);
      schedule();
    });
    resize.observe(toolbar);
    resize.observe(stepper);
    shell.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    schedule();
    return () => {
      resize.disconnect();
      shell.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      cancelAnimationFrame(frame);
    };
  }, []);
  const [profileKeys, setProfileKeys] = useState({ buyer: encryptedBuyerProfile, seller: encryptedSellerProfile });
  const buyer = useFiberRoutingNode(profileKeys.buyer);
  const seller = useFiberRoutingNode(profileKeys.seller);
  const [buyerStage, setBuyerStage] = useState<ChannelProgressStage>('idle');
  const [sellerStage, setSellerStage] = useState<ChannelProgressStage>('idle');
  const [plaintext, setPlaintext] = useState(initialPlaintext);
  const [generatedOffer, setGeneratedOffer] = useState('');
  const [restoredBuyerOffer, setRestoredBuyerOffer] = useState('');
  const [buyerOffer, setBuyerOffer] = useState<EncryptedOffer | null>(null);
  const [paymentHash, setPaymentHash] = useState<`0x${string}` | ''>('');
  const [invoiceStatus, setInvoiceStatus] = useState<CkbInvoiceStatus | 'None'>('None');
  const [paymentStatus, setPaymentStatus] = useState('Not sent');
  const [paymentReceipt, setPaymentReceipt] = useState<GetPaymentResult | null>(null);
  const [liquidityBeforePayment, setLiquidityBeforePayment] = useState<{ buyer: Channel; seller: Channel } | null>(null);
  const [buyerKey, setBuyerKey] = useState<`0x${string}` | ''>('');
  const [decrypted, setDecrypted] = useState('');
  const [decryptStatus, setDecryptStatus] = useState('Waiting for an encrypted offer');
  const [transferError, setTransferError] = useState('');
  const [savedProfiles, setSavedProfiles] = useState<{ buyer: boolean; seller: boolean } | null>(null);
  const [progressLoaded, setProgressLoaded] = useState(false);
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);
  const [attemptedPaymentHash, setAttemptedPaymentHash] = useState('');
  const [triedWithoutKey, setTriedWithoutKey] = useState(false);
  const [paymentChecking, setPaymentChecking] = useState(false);
  const [encryptedDraft, setEncryptedDraft] = useState<Awaited<ReturnType<typeof encryptText>> | null>(null);
  const [encrypting, setEncrypting] = useState(false);
  const [cryptoError, setCryptoError] = useState('');
  const [guaranteeAnswer, setGuaranteeAnswer] = useState('');
  const [guaranteeChecked, setGuaranteeChecked] = useState(false);
  const cryptoLock = useRef(false);
  const invoiceLock = useRef(false);
  const sellerOffer = useMemo(() => {
    try { return generatedOffer ? parseOffer(generatedOffer) : null; } catch { return null; }
  }, [generatedOffer]);
  const receivedOfferJson = restoredBuyerOffer || generatedOffer;
  const [storageError, setStorageError] = useState('');
  const paymentLock = useRef(false);
  const invoiceChecking = useRef(false);
  useEffect(() => {
    try {
      const saved = readEncryptedProgress(sessionStorage, localStorage);
      const resuming = saved && (saved.generatedOffer || saved.buyerOfferText || saved.attemptedPaymentHash || saved.completedSteps?.length);
      const multiHop = detectMultiHopProfiles(localStorage);
      const keys = resuming
        ? { buyer: saved.buyerProfileKey ?? encryptedBuyerProfile, seller: saved.sellerProfileKey ?? encryptedSellerProfile }
        : { buyer: multiHop.sender.key, seller: multiHop.receiver.key };
      setProfileKeys(keys);
      setSavedProfiles({ buyer: Boolean(savedNodeIdentifier(localStorage, keys.buyer)), seller: Boolean(savedNodeIdentifier(localStorage, keys.seller)) });
      if (saved) {
        let restoredSellerOffer = '';
        if (saved.generatedOffer) {
          try {
            const offer = parseOffer(saved.generatedOffer);
            restoredSellerOffer = saved.generatedOffer;
            setGeneratedOffer(saved.generatedOffer);
            setPaymentHash(offer.paymentHash);
            setPlaintext('');
          } catch { setStorageError('The saved seller offer is unreadable. Check any previous payment using the buyer’s saved offer.'); }
        }
        // Older sessions could validate and pay for an offer pasted from elsewhere.
        const legacyOffer = saved.attemptedPaymentHash || !restoredSellerOffer ? saved.buyerOfferText : '';
        setRestoredBuyerOffer(legacyOffer);
        const sameOffer = (legacyOffer || restoredSellerOffer) === saved.buyerOfferText;
        const completed = saved.completedSteps ?? [];
        setCompletedSteps(sameOffer ? completed : completed.filter((step) => step !== 'transfer'));
        setAttemptedPaymentHash(saved.attemptedPaymentHash);
        setTriedWithoutKey(sameOffer && saved.triedWithoutKey);
        setPaymentStatus(saved.attemptedPaymentHash ? 'Check status' : 'Not sent');
      }
    } catch {
      setSavedProfiles({ buyer: false, seller: false });
      setStorageError('Saved progress could not be read. Restore the nodes and check their balances before continuing.');
    }
    setProgressLoaded(true);
  }, []);

  const saveProgress = useCallback((attempt = attemptedPaymentHash) => {
    if (!progressLoaded) return false;
    try {
      const buyerId = savedNodeIdentifier(localStorage, profileKeys.buyer);
      const sellerId = savedNodeIdentifier(localStorage, profileKeys.seller);
      if (!buyerId || !sellerId) return false;
      sessionStorage.setItem(encryptedSessionKey, JSON.stringify({ version: 1, buyerId, sellerId, buyerProfileKey: profileKeys.buyer, sellerProfileKey: profileKeys.seller, generatedOffer, buyerOfferText: receivedOfferJson, attemptedPaymentHash: attempt, triedWithoutKey, completedSteps }));
      setStorageError('');
      return true;
    } catch {
      setStorageError('Unable to save progress in this browser. Enable browser storage before paying.');
      return false;
    }
  }, [progressLoaded, profileKeys, generatedOffer, receivedOfferJson, attemptedPaymentHash, triedWithoutKey, completedSteps]);

  useEffect(() => { if (progressLoaded) saveProgress(); }, [progressLoaded, saveProgress]);

  const buyerChannel = findReusableChannel(buyer.channels, bottlePeer.pubkey);
  const sellerChannel = findReusableChannel(seller.channels, bottlePeer.pubkey);
  const { refreshChannels: refreshBuyerChannels } = buyer;
  const { refreshChannels: refreshSellerChannels } = seller;
  useEffect(() => {
    if (paymentStatus !== 'Success') return;
    void Promise.allSettled([refreshBuyerChannels(), refreshSellerChannels()]);
  }, [paymentStatus, refreshBuyerChannels, refreshSellerChannels]);
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
  const routePrerequisite = [
    { needed: !buyer.nodeInfo, href: '#node-a', label: 'Start Buyer A.' },
    { needed: !seller.nodeInfo, href: '#node-c', label: 'Start Seller C.' },
    { needed: !isChannelReady(buyerChannel) || !buyerConnected, href: '#channel-a', label: 'Get the Buyer A → Bottle channel ready.' },
    { needed: !isChannelReady(sellerChannel) || !sellerConnected, href: '#channel-c', label: 'Get the Seller C → Bottle channel ready.' },
    { needed: !buyerReady, href: '#channel-a', label: 'Check Buyer A’s outbound liquidity.' },
    { needed: !sellerReady, href: '#liquidity', label: 'Check Seller C’s inbound liquidity.' },
  ].find(({ needed }) => needed);
  const invoicePrerequisite = !encryptedDraft
    ? { href: '#encrypt-title', label: 'Encrypt a result before creating its Invoice.' }
    : routePrerequisite;
  useEffect(() => {
    if (!progressLoaded) return;
    const reached = [routeReady && 'setup', generatedOffer && 'encrypt', triedWithoutKey && 'transfer', buyerKey && 'pay', decrypted && 'decrypt'].filter(Boolean) as string[];
    setCompletedSteps((previous) => reached.every((step) => previous.includes(step)) ? previous : [...new Set([...previous, ...reached])]);
  }, [progressLoaded, routeReady, generatedOffer, triedWithoutKey, buyerKey, decrypted]);



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
  }, [paymentHash, seller.nodeInfo, seller.nodeRef]);

  const encryptResult = async () => {
    if (cryptoLock.current || invoiceLock.current || generatedOffer || !plaintext.trim()) return;
    cryptoLock.current = true;
    setEncrypting(true);
    setCryptoError('');
    try { setEncryptedDraft(await encryptText(plaintext)); }
    catch { setCryptoError('Encryption failed. Try again in this browser.'); }
    finally { cryptoLock.current = false; setEncrypting(false); }
  };

  const createOffer = useCallback(async () => {
    if (!routeReady || !encryptedDraft || generatedOffer || attemptedPaymentHash || invoiceLock.current || cryptoLock.current || buyer.busy || seller.busy) return;
    invoiceLock.current = true;
    try {
      seller.setError('');
      setTransferError('');
      if (!sellerChannel?.channel_outpoint) {
        seller.setError('Seller channel does not have a confirmed outpoint yet. Refresh and try again.');
        return;
      }
      const encrypted = encryptedDraft;
      const invoice = await seller.run('create data invoice', (node) =>
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
      setAttemptedPaymentHash('');
      setTriedWithoutKey(false);
      setGeneratedOffer(serialized);
      setPaymentHash(offer.paymentHash);
      setInvoiceStatus('Open');
      setRestoredBuyerOffer('');
      setBuyerOffer(null);
      setTransferError('');
      setPaymentStatus('Not sent'); setPaymentReceipt(null);
      setBuyerKey('');
      setDecrypted('');
      setDecryptStatus('Ciphertext created · key withheld');

    } catch (error) {
      seller.setError(error instanceof Error ? error.message : 'Invoice creation failed.');
    } finally { invoiceLock.current = false; }
  }, [amountHex, encryptedDraft, generatedOffer, attemptedPaymentHash, routeReady, buyer.busy, seller, sellerChannel]);

  const validateOffer = useCallback(async () => {
    const parsed = parseOffer(receivedOfferJson.trim());
    const decoded = await buyer.run('validate offer invoice', (node) =>
      node.parseInvoice({ invoice: parsed.invoice }),
    );
    if (!decoded) throw new Error('Unable to validate the Invoice. Check Buyer A and try again.');
    if (
      decoded.invoice.currency !== 'Fibt' ||
      BigInt(decoded.invoice.amount ?? '0x0') !== BigInt(amountHex) ||
      decoded.invoice.data.payment_hash.toLowerCase() !== parsed.paymentHash.toLowerCase()
    ) {
      throw new Error('The Invoice does not match this 1 CKB encrypted offer.');
    }
    if (attemptedPaymentHash && parsed.paymentHash.toLowerCase() !== attemptedPaymentHash.toLowerCase()) throw new Error('Restore the offer for the previous payment before continuing.');
    return parsed;
  }, [amountHex, buyer, receivedOfferJson, attemptedPaymentHash]);



  const checkPayment = useCallback(async () => {
    if (!receivedOfferJson || !attemptedPaymentHash || !buyer.nodeRef.current || paymentLock.current) return;
    paymentLock.current = true;
    setPaymentChecking(true);
    try {
      const offer = buyerOffer ?? await validateOffer();
      setBuyerOffer(offer);
      const result = await buyer.nodeRef.current.getPayment({ payment_hash: attemptedPaymentHash as `0x${string}` });
      setPaymentStatus(result.status);
      setPaymentReceipt(result);
      if (result.status === 'Success') {
        if (result.payment_preimage) setBuyerKey(result.payment_preimage);
        setDecryptStatus(result.payment_preimage ? 'Key recovered. Decrypt the result below.' : 'Payment succeeded. Check status again to retrieve the key.');
      } else if (result.status === 'Failed') {
        setDecryptStatus('Payment failed. You can retry the payment.');
      } else {
        setDecryptStatus('Payment is pending. Check status again; do not send another payment.');
      }
      buyer.setError('');
    } catch {
      setPaymentStatus('Check status');
      buyer.setError('Could not verify the previous payment. Check status again before continuing; no new payment was sent.');
    } finally {
      paymentLock.current = false;
      setPaymentChecking(false);
    }
  }, [attemptedPaymentHash, buyer, buyerOffer, receivedOfferJson, validateOffer]);

  const pay = useCallback(async () => {
    if (!buyerChannel || !sellerChannel || paymentLock.current || !canSubmitEncryptedPayment({ routeReady, hasOffer: Boolean(receivedOfferJson), triedWithoutKey, attemptedPaymentHash, paymentStatus, busy: Boolean(buyer.busy || seller.busy) || paymentChecking })) return;
    paymentLock.current = true;
    let offer: EncryptedOffer;
    try {
      offer = await validateOffer();
    } catch (error) {
      buyer.setError(error instanceof Error ? error.message : 'Unable to validate the Invoice.');
      paymentLock.current = false;
      return;
    }
    if (!saveProgress(offer.paymentHash)) {
      setStorageError('Payment progress could not be saved.');
      paymentLock.current = false;
      return;
    }
    setBuyerOffer(offer);
    setLiquidityBeforePayment({ buyer: buyerChannel, seller: sellerChannel });
    setAttemptedPaymentHash(offer.paymentHash);
    setPaymentStatus('Sending');
    setPaymentReceipt(null);
    setBuyerKey('');
    setDecrypted('');
    setDecryptStatus('Payment submitted. Waiting for the key.');

    try {
      const result = await buyer.run('pay encrypted offer', async (node) => {
        const submitted = await node.sendPayment({
          invoice: offer.invoice,
          hop_hints: browserHopHints({ ...offer.lastHop, channel_outpoint: normalizeOutpoint(offer.lastHop.channel_outpoint) }),
          max_fee_amount: ckbToHex('1'),
          max_parts: '0x1',
        });
        if (submitted.status === 'Success' || submitted.status === 'Failed') return submitted;
        return node.waitForPayment(submitted.payment_hash, { timeout: 60_000, interval: 1_000 });
      });
      if (!result) {
        setPaymentStatus('Check status');
        setDecryptStatus('Check the payment status before continuing.');
        return;
      }
      setPaymentStatus(result.status);
      setPaymentReceipt(result);
      if (result.status === 'Success') {
        if (result.payment_preimage) setBuyerKey(result.payment_preimage);
        setDecryptStatus(result.payment_preimage ? 'Key received.' : 'Payment succeeded. Check status to retrieve the key.');

      } else if (result.status === 'Failed') {
        setDecryptStatus('Payment failed. You can retry.');

      } else {
        setDecryptStatus('Payment pending. Check status before continuing.');
      }
    } finally {
      paymentLock.current = false;
    }
  }, [attemptedPaymentHash, buyer, buyerChannel, paymentChecking, paymentStatus, receivedOfferJson, routeReady, saveProgress, seller.busy, sellerChannel, triedWithoutKey, validateOffer]);

  const tryWithoutKey = async () => {
    setTransferError('');
    try {
      const offer = parseOffer(receivedOfferJson);
      try {
        await decryptOffer(offer, bytesToHex(crypto.getRandomValues(new Uint8Array(32))));
      } catch (error) {
        if (!(error instanceof DOMException && error.name === 'OperationError')) throw error;
        setTriedWithoutKey(true);
      }
    } catch (error) {
      setTransferError(error instanceof Error ? error.message : 'Unable to try decryption.');
    }
  };

  const decrypt = useCallback(async () => {
    if (!buyerOffer || !buyerKey) return;
    try {
      const result = await decryptOffer(buyerOffer, buyerKey);
      setDecrypted(result);
      setDecryptStatus('Decrypted · ciphertext authenticated with the revealed key');

    } catch {
      setDecryptStatus('Decryption failed · the ciphertext and payment key do not match');
    }
  }, [buyerKey, buyerOffer]);

  const busy = Boolean(buyer.busy || seller.busy) || paymentChecking || encrypting;
  const canPay = canSubmitEncryptedPayment({ routeReady, hasOffer: Boolean(receivedOfferJson), triedWithoutKey, attemptedPaymentHash, paymentStatus, busy });
  const paymentSucceeded = paymentStatus === 'Success';
  const paymentFailed = paymentStatus === 'Failed';
  const buyerBefore = liquidityBeforePayment?.buyer.channel_id === buyerChannel?.channel_id ? liquidityBeforePayment?.buyer : undefined;
  const sellerBefore = liquidityBeforePayment?.seller.channel_id === sellerChannel?.channel_id ? liquidityBeforePayment?.seller : undefined;
  const paidAmount = paymentSucceeded ? BigInt(amountHex) : undefined;
  const paidTotal = paidAmount !== undefined && paymentReceipt?.status === 'Success' ? paidAmount + BigInt(paymentReceipt.fee) : undefined;
  const paymentInFlight = Boolean(attemptedPaymentHash) && !paymentSucceeded && !paymentFailed;
  const paymentOutcome = paymentSucceeded ? (invoiceStatus === 'Paid' ? 'Payment completed' : buyerKey ? 'Payment succeeded · key ready' : 'Payment sent')
    : paymentFailed ? 'Payment failed'
    : paymentStatus === 'Check status' ? 'Payment status needs checking' : 'Payment pending';
  const paymentPrerequisite = !receivedOfferJson
    ? { href: attemptedPaymentHash ? '#transfer' : '#invoice', label: attemptedPaymentHash ? 'The saved offer is needed to check the previous payment.' : 'Create the Invoice to receive the offer.' }
    : attemptedPaymentHash && !buyer.nodeInfo
      ? { href: '#node-a', label: 'Start Buyer A to check the previous payment.' }
      : !attemptedPaymentHash || paymentFailed
        ? !triedWithoutKey
          ? { href: '#transfer', label: 'Test “Decrypt without key” in Transfer first.' }
          : routePrerequisite
        : undefined;
  const invoiceTone = invoiceStatus === 'Paid' ? 'success'
    : invoiceStatus === 'Cancelled' || invoiceStatus === 'Expired' ? 'error' : 'pending';
  const canCreateOffer = routeReady && Boolean(encryptedDraft) && !generatedOffer && !attemptedPaymentHash && !busy;
  const canStartAnother = Boolean(decrypted) || (Boolean(generatedOffer) && !busy && ['Expired', 'Cancelled'].includes(invoiceStatus) && (!attemptedPaymentHash || paymentStatus === 'Failed'));
  const startAnother = () => {
    if (!canStartAnother) return;
    setCompletedSteps((previous) => previous.filter((step) => step === 'setup'));
    setGeneratedOffer(''); setEncryptedDraft(null); setCryptoError(''); setRestoredBuyerOffer(''); setBuyerOffer(null);
    setAttemptedPaymentHash(''); setPaymentHash(''); setPaymentStatus('Not sent'); setPaymentReceipt(null);
    setLiquidityBeforePayment(null);
    if (!plaintext.trim()) setPlaintext(initialPlaintext);
    setInvoiceStatus('None'); setBuyerKey(''); setDecrypted(''); setTriedWithoutKey(false);
    setDecryptStatus('Waiting for an encrypted offer'); setTransferError('');
    document.getElementById('encrypt')?.scrollIntoView({ behavior: 'smooth' });
  };

  const ciphertext = encryptedDraft?.ciphertext ?? sellerOffer?.ciphertext ?? '';
  const setupNeedsRestart = completedSteps.includes('setup') && (!buyer.nodeInfo || !seller.nodeInfo);
  const steps = [
    { id: 'setup', label: 'Setup', complete: routeReady, needsRestart: setupNeedsRestart },
    { id: 'encrypt', label: 'Encrypt & invoice', complete: completedSteps.includes('encrypt') || Boolean(generatedOffer) },
    { id: 'transfer', label: 'Transfer', complete: completedSteps.includes('transfer') || triedWithoutKey },
    { id: 'pay', label: 'Pay', complete: completedSteps.includes('pay') || Boolean(buyerKey) },
    { id: 'decrypt', label: 'Decrypt', complete: completedSteps.includes('decrypt') || Boolean(decrypted) },
  ];

  return (
    <div ref={shellRef} className={`${styles.shell} ${lesson.shell}`}>
      <TutorialToolbar
        currentTutorialIndex={tutorialIndex}
        articleProgress={articleProgress}
        headerRef={toolbarRef}
      />
      <main className={lesson.article}>
        <header className={lesson.intro}>
          <p className={lesson.eyebrow}>Fiber v0.10.0 · 30 min</p>
          <h1>Unlock Encrypted Data with a Fiber Payment</h1>
          <p className={lesson.lead}>Run a buyer and a seller in your browser. As the seller, encrypt a sample report and create an invoice. As the buyer, pay 1 Testnet CKB to get the key and read the report.</p>
        </header>
        <nav ref={stepperRef} className={lesson.contents} aria-label="Lesson progress">
          <ol>{steps.map((step, index) => <li key={step.id} data-complete={step.complete} data-reading={step.id === readingStep} data-restart={step.needsRestart || undefined}>
            <a href={`#${step.id}`} aria-current={step.id === readingStep ? 'location' : undefined} aria-label={`${index + 1}. ${step.label}, ${step.complete ? 'complete' : step.needsRestart ? 'restart browser nodes' : 'not complete'}`}>
              <span className={lesson.stepNumber} aria-hidden="true">{step.complete ? '✓' : index + 1}</span>
              <span>{step.label}</span>
            </a>
          </li>)}</ol>
        </nav>
        {storageError && <p className={styles.paymentError} role="alert">{storageError}</p>}

        <section className={lesson.section} id="setup" aria-labelledby="setup-step-title">
          <h2 id="setup-step-title">Setup</h2>
          <div className={lesson.subsection} id="topology">
          <h3 id="topology-title">Start nodes for the Buyer and Seller</h3>
          <p>Start Buyer A and Seller C. Each node has a <strong>pubkey</strong> that identifies it on Fiber and a <strong>funding address</strong> that receives Testnet CKB on the CKB blockchain. Copy the funding address into the faucet for each node that needs funds, then use the refresh icon next to <strong>On-chain CKB</strong> to check its balance.</p>
          <p>If you’ve completed other Fiber tutorials in this browser, starting both nodes here may restore saved identities and Bottle channels. After a page reload, start the nodes again to resume.</p>
          <Callout type="info" title={`${channelAmount} CKB breakdown`} className={lesson.fundingTip}>
            <p>Each new channel uses <strong>{channelAmount} CKB from your node’s on-chain balance</strong>. Of that, <strong>100 CKB</strong> is reserved for settling the channel on-chain when it closes, and <strong>400 CKB</strong> is available for payments. That spendable amount meets Bottle’s auto-accept minimum. Leave extra CKB in the funding address for the opening transaction fee.</p>
          </Callout>
          <div className={lesson.nodeGrid}>
            <SetupNode savedProfile={savedProfiles?.buyer ?? null} label="Buyer Node A" runtime={buyer} />
            <SetupNode savedProfile={savedProfiles?.seller ?? null} label="Seller Node C" runtime={seller} />
          </div>
          <LessonCode files={['nodes', 'balance']} />
          </div>

          <div className={lesson.subsection} id="channels">
          <h3 id="channels-title">Open channels with Bottle</h3>
          <p>Browser nodes can start connections but cannot accept them, so Buyer A and Seller C each open a channel with Bottle B, the public node that forwards payments between them. Opening a channel locks CKB on-chain. Once it’s ready, payments shift the spendable balance between its two sides without a new on-chain transaction each time.</p>
          <p>In this Testnet setup, Bottle contributes <strong>250 CKB from its own wallet</strong> to each new channel. Its 100 CKB settlement reserve leaves <strong>150 CKB of spendable balance on Bottle’s side</strong>.</p>
          <div className={lesson.nodeGrid}>
            <OpenChannel label="Buyer Node A" runtime={buyer} stage={buyerStage} setStage={setBuyerStage} />
            <OpenChannel label="Seller Node C" runtime={seller} stage={sellerStage} setStage={setSellerStage} />
          </div>
          <p>Both channels must reach <strong>CHANNEL_READY</strong> before you can use the route. The demo polls every five seconds while the tab is visible, so fast stages may go straight to a checkmark.</p>
          <details className={`${lesson.supportingDetails} ${lesson.stageDetails}`}><summary id="channel-stages-summary">What happens in the six opening stages?</summary>
          <div className={lesson.stageTableWrap}><table className={lesson.stageTable} aria-labelledby="channel-stages-summary">
            <thead><tr><th scope="col">Stage</th><th scope="col">State</th><th scope="col">What happens</th></tr></thead>
            <tbody>{channelOpeningStates.map((state, index) => <tr key={state}><td>{index + 1}</td><th scope="row"><code>{state}</code></th><td>{channelOpeningDescriptions[state]}</td></tr>)}</tbody>
          </table></div>
          </details>
          <LessonCode files={['channels']} />
          </div>

          <div className={lesson.subsection} id="liquidity">
          <h3 id="liquidity-title">Understanding channel liquidity</h3>
          <p><strong>Outbound liquidity</strong> is what you can send from your side of a channel. <strong>Inbound liquidity</strong> is what you can receive from the other side. For Seller C, that’s the balance on Bottle’s side of B–C.</p>
          <figure className={lesson.routeExample}>
            <figcaption>Payment route with fresh channels, before fees</figcaption>
            <ol>
              <li><span className={lesson.nodeCardLabel}>Buyer A → Bottle B</span><strong>400 CKB</strong></li>
              <li><span className={lesson.nodeCardLabel}>Bottle B → Seller C</span><strong>150 CKB</strong></li>
            </ol>
            <p>Bottle receives on A–B and forwards from its own balance on B–C. The smaller balance limits the route to 150 CKB before fees.</p>
          </figure>
          <p>To see the balances change, try sending <strong>5 CKB from Seller C to Bottle B</strong>. The bar shows the live B–C balances. The purchase can proceed without this transfer if the route already has enough liquidity.</p>
          <PrepareInbound runtime={seller} profileKey={profileKeys.seller} enabled={isChannelReady(buyerChannel) && isChannelReady(sellerChannel) && buyerConnected && sellerConnected && !busy} />
          <LessonCode files={['liquidity']} />
          </div>
        </section>

        <section className={lesson.section} id="encrypt" aria-labelledby="encrypt-step-title">
          <h2 id="encrypt-step-title">Encrypt and create an Invoice</h2>
          <div className={lesson.subsection}>
          <h3 id="encrypt-title">Generate a fresh key inside the browser</h3>
          <p>Enter a sample report or use the one provided. <strong>Encrypt result</strong> uses AES-GCM to turn readable text into <strong>ciphertext</strong>. The browser generates a fresh 256-bit secret key and a random 96-bit initialization vector (IV). The IV travels with the ciphertext, and Seller C keeps the key private.</p>
          <div className={lesson.experiment}>
            <div className={lesson.encryptSplit}>
              <div className={lesson.field}>
                <label className={lesson.nodeCardLabel} htmlFor="seller-report">Seller’s result</label>
                <textarea
                  id="seller-report"
                  placeholder={generatedOffer
                    ? 'The buyer can decrypt the sample result after paying the invoice.'
                    : 'Enter a sample result for the buyer to decrypt after paying the invoice.'}
                  disabled={busy || Boolean(generatedOffer)}
                  onChange={(event) => {
                    if (invoiceLock.current || cryptoLock.current) return;
                    setPlaintext(event.target.value);
                    setEncryptedDraft(null);
                    setCryptoError('');
                  }}
                  value={plaintext}
                />
              </div>
              <div className={lesson.actions}>
                {!generatedOffer && <button className={lesson.primary} disabled={busy || !plaintext.trim()} onClick={() => void encryptResult()} type="button">{encrypting ? 'Encrypting…' : encryptedDraft ? 'Regenerate' : 'Encrypt result'}</button>}
              </div>
              <div className={lesson.field}>
                <div className={lesson.copyableValue}>
                  <label className={lesson.nodeCardLabel} htmlFor="encrypted-report">Ciphertext</label>
                  {ciphertext && <CopyIconButton value={ciphertext} label="Copy ciphertext" />}
                </div>
                <textarea id="encrypted-report" readOnly value={ciphertext} />
              </div>
            </div>
            {cryptoError && <p className={styles.paymentError} role="alert">{cryptoError}</p>}
          </div>
          <LessonCode files={['crypto']} cryptoPart="encrypt" />
          </div>

          <div className={lesson.subsection} id="invoice">
          <h3 id="invoice-title">Use the AES key as the payment preimage</h3>
          <p>An invoice is a request for payment. Seller C uses the AES key as the invoice’s <strong>payment preimage</strong>, the secret required to settle the payment. The <strong>invoice payment hash</strong> shown below is the SHA-256 fingerprint of that secret. Buyer A can check the fingerprint against the revealed secret after payment.</p>
          <div className={lesson.experiment}>
            {generatedOffer && <div className={lesson.result}>
              <div role="status"><ResultHeading title="Invoice created" tone="success" /></div>
              <dl className={`${styles.multiHopOutcomeFacts} ${lesson.resultFacts}`}>
                <div className={styles.multiHopOutcomeAmount}><dt>Invoice amount</dt><dd>{paymentAmount} <span>CKB</span></dd></div>
              </dl>
              <ResultValue label="Invoice payment hash" value={paymentHash} copyLabel="Copy invoice payment hash" />
              {!buyerOffer && !attemptedPaymentHash && !canStartAnother && <div className={lesson.actions}><a className={lesson.resultLink} href="#transfer">Continue to transfer</a></div>}
            </div>}
            <div className={lesson.actions}>
              {!generatedOffer && <button className={lesson.primary} disabled={!canCreateOffer} onClick={() => void createOffer()} type="button">{seller.busy === 'create data invoice' ? 'Creating…' : 'Create 1 CKB Invoice'}</button>}
              {canStartAnother && !decrypted && <button onClick={startAnother} type="button">Start another offer</button>}
            </div>
            {!generatedOffer && invoicePrerequisite && <p className={lesson.prerequisiteHint}><a href={invoicePrerequisite.href}>{invoicePrerequisite.label}</a></p>}
            {seller.error && <p className={styles.paymentError} role="alert">{seller.error}</p>}
          </div>
          <LessonCode files={['invoice']} />
          </div>
        </section>

        <section className={lesson.section} id="transfer" aria-labelledby="transfer-title">
          <h2 id="transfer-title">Transfer the encrypted offer</h2>
          <p>The demo delivers the offer to Buyer A automatically. The JSON includes the invoice and its public <code>paymentHash</code>, the encrypted report (<code>ciphertext</code>), the <code>iv</code> needed for decryption, and the final channel to Seller C (<code>lastHop</code>). Try decrypting the report with what the buyer has so far.</p>
          <div className={`${lesson.experiment} ${lesson.centeredPanel}`}>
            {receivedOfferJson ? <>
              <OfferPreview value={receivedOfferJson} />
              {!attemptedPaymentHash && <div className={lesson.actions}>
                <button className={lesson.primary} disabled={triedWithoutKey} onClick={() => void tryWithoutKey()} type="button">Decrypt without key</button>
              </div>}
              {triedWithoutKey && !attemptedPaymentHash && <Callout className={lesson.decryptionWarning} type="error" title="Decryption rejected" role="status">
                <p>AES-GCM rejected the attempt with a substitute key. Buyer A has the ciphertext and its IV, and needs Seller C’s original AES key to decrypt it.</p>
              </Callout>}
              {(triedWithoutKey || attemptedPaymentHash) && <p className={lesson.transferNext}>
                <a className={lesson.resultLink} href={buyerKey ? '#decrypt' : '#pay'}>{buyerKey ? 'Continue to decryption' : attemptedPaymentHash ? 'Check payment status' : 'Pay to unlock decryption'}</a>
              </p>}
            </> : <p className={lesson.prerequisiteHint}>
              {attemptedPaymentHash ? 'The offer for the saved payment could not be restored.' : <a href="#invoice">Create the Invoice to send the offer to Buyer A.</a>}
            </p>}
            {transferError && <p className={styles.paymentError} role="alert">{transferError}</p>}
          </div>
          <LessonCode files={['offer', 'keyless']} />
        </section>

        <section className={lesson.section} id="pay" aria-labelledby="pay-title">
          <h2 id="pay-title">Wait for Fiber to return the preimage</h2>
          <p>Buyer A pays <strong>1 Testnet CKB</strong> for the report, plus up to <strong>1 CKB</strong> in routing fees. Watch the two bars as the payment settles. Seller C gains 1 CKB on B–C, and Buyer A spends 1 CKB plus the actual fee on A–B. The receipt shows that fee and the total paid.</p>
          <div className={lesson.experiment}>
            {buyerChannel && sellerChannel && isChannelReady(buyerChannel) && isChannelReady(sellerChannel) && <aside className={lesson.paymentLiquidity} aria-label="Payment route liquidity">
              <h3>Channel liquidity</h3>
              <ChannelLiquidity label="Buyer A" channel={paymentInFlight ? buyerBefore ?? buyerChannel : buyerChannel} before={buyerBefore} transferred={paidTotal} />
              <ChannelLiquidity label="Seller C" bottleFirst channel={paymentInFlight ? sellerBefore ?? sellerChannel : sellerChannel} before={sellerBefore} transferred={paidAmount} />
            </aside>}
            <div className={lesson.paymentContent}>
            {attemptedPaymentHash && <div className={lesson.result}>
              <div role="status"><ResultHeading heading="h3" title={paymentOutcome} tone={paymentSucceeded ? 'success' : paymentFailed ? 'error' : 'pending'} /></div>
              <dl className={`${styles.multiHopOutcomeFacts} ${lesson.resultFacts}`} aria-label={paymentSucceeded ? 'Payment receipt' : 'Payment details'}>
                <div className={styles.multiHopOutcomeAmount}><dt>{invoiceStatus === 'Paid' && paymentSucceeded ? 'Amount received' : 'Payment amount'}</dt><dd>{paymentAmount} <span>CKB</span></dd></div>
                {paymentReceipt?.status === 'Success' && <>
                  <div><dt>Routing fee</dt><dd>{hexToCkb(paymentReceipt.fee)} CKB</dd></div>
                  <div><dt>Total paid</dt><dd>{hexToCkb(BigInt(amountHex) + BigInt(paymentReceipt.fee))} CKB</dd></div>
                </>}
                {(invoiceStatus !== 'None' || paymentSucceeded) && <div>
                  <dt>Invoice status</dt>
                  <dd className={lesson.resultStatus} data-tone={invoiceTone}>{invoiceStatus === 'None' ? 'Not yet verified' : invoiceStatus}</dd>
                  {invoiceStatus === 'None' && generatedOffer && !seller.nodeInfo && <dd><a className={lesson.resultLink} href="#node-c">Start Seller C to verify</a></dd>}
                </div>}
              </dl>
              {paymentReceipt?.status === 'Success' && <ResultValue label="Payment hash" value={paymentReceipt.payment_hash} copyLabel="Copy payment hash" />}
              {paymentSucceeded && buyerOffer && <div className={lesson.offerValidated}>
                <ResultHeading title="Offer validated" tone="success" />
                <p>Before sending funds, Buyer A checked the invoice’s network, amount, and payment hash against the offer.</p>
              </div>}
            </div>}
            <div className={lesson.actions}>
              {(!attemptedPaymentHash || paymentStatus === 'Failed') && <button className={lesson.primary} disabled={!canPay} onClick={() => void pay()} type="button">{paymentStatus === 'Failed' ? 'Retry 1 CKB payment' : 'Pay 1 CKB to decrypt the result'}</button>}
              {attemptedPaymentHash && receivedOfferJson && buyer.nodeInfo && !buyerKey && paymentStatus !== 'Sending' && <button className={lesson.primary} disabled={busy} onClick={() => void checkPayment()} type="button">{paymentChecking ? 'Checking…' : 'Check payment status'}</button>}
              {buyerKey && !decrypted && <a className={lesson.resultLink} href="#decrypt">Continue to decryption</a>}
            </div>
            {paymentPrerequisite && <p className={lesson.prerequisiteHint}><a href={paymentPrerequisite.href}>{paymentPrerequisite.label}</a></p>}
            {attemptedPaymentHash && receivedOfferJson && buyer.nodeInfo && !buyerKey && !paymentFailed && !busy && <p className={lesson.prerequisiteHint}>Check the existing payment after a timeout or reload to recover the key.</p>}
            {buyer.error && <p className={styles.paymentError} role="alert">{buyer.error}</p>}
            </div>
          </div>
          <LessonCode files={['validation', 'payment']} />
        </section>

        <section className={lesson.section} id="decrypt" aria-labelledby="decrypt-step-title">
          <h2 id="decrypt-step-title">Decrypt the result</h2>
          <div className={lesson.subsection}>
          <h3 id="decrypt-title">Use the payment preimage to decrypt</h3>
          <p>Seller C reveals the preimage to claim the payment. Fiber checks it against the invoice’s payment hash and returns it to Buyer A. Select <strong>Decrypt result</strong> to use that value as the AES key and read the original report.</p>
          <div className={lesson.experiment}>
            <div className={lesson.result}>
              <h4 className={lesson.resultHeading}>Seller’s result</h4>
              <div aria-live="polite" className={lesson.result}>
                {decrypted && <pre className={lesson.report}>{decrypted}</pre>}
                {buyerKey && <ResultValue label="Payment preimage (AES key)" value={buyerKey} copyLabel="Copy payment preimage" />}
              </div>
            </div>
            <div className={lesson.actions}>{!decrypted && <button className={lesson.primary} disabled={!buyerOffer || !buyerKey || busy} onClick={() => void decrypt()} type="button">Decrypt result</button>}{canStartAnother && Boolean(decrypted) && <button onClick={startAnother} type="button">Start another offer</button>}</div>
            {!buyerKey && <p className={lesson.prerequisiteHint}><a href="#pay">Complete or check payment to reveal the decryption key.</a></p>}
            {decryptStatus.startsWith('Decryption failed') && <p className={`${lesson.feedback} ${lesson.resultStatus}`} data-tone="error" role="status">{decryptStatus}</p>}
          </div>
          <LessonCode files={['crypto']} cryptoPart="decrypt" />
          </div>

          <div className={lesson.subsection} id="boundary">
          <h3 id="boundary-title">What does payment guarantee?</h3>
          <div className={lesson.experiment}>
            <fieldset className={lesson.knowledgeCheck}>
              <legend>Buyer A pays for the report and decrypts it successfully. What can the buyer conclude?</legend>
              <label><input type="radio" name="guarantee" value="key" checked={guaranteeAnswer === 'key'} onChange={() => { setGuaranteeAnswer('key'); setGuaranteeChecked(false); }} /> The released key matches the ciphertext</label>
              <label><input type="radio" name="guarantee" value="quality" checked={guaranteeAnswer === 'quality'} onChange={() => { setGuaranteeAnswer('quality'); setGuaranteeChecked(false); }} /> The report is accurate</label>
            </fieldset>
            <button className={lesson.primary} disabled={!guaranteeAnswer} onClick={() => setGuaranteeChecked(true)} type="button">Check answer</button>
            {guaranteeChecked && <p className={lesson.feedback} role="status">{guaranteeAnswer === 'key' ? 'Correct. Settlement released the matching key; evaluating the report still requires trust or verification.' : 'Try again. AES-GCM authenticates the encrypted bytes, but cannot judge whether the report is true.'}</p>}
          </div>
          <p>If you build a marketplace with this pattern, consider how buyers will assess the report’s accuracy and usefulness. Previews and seller reputation can help buyers decide what to purchase. Dispute rules can help them resolve problems afterward.</p>
          </div>
        </section>

        <section className={lesson.section} id="build-your-own" aria-labelledby="build-your-own-title">
          <h2 id="build-your-own-title">Build your own pay-to-unlock demo</h2>
          <p>Use the standalone Testnet demo as a starting point for your own project. It already connects the seller’s encrypted result to a Fiber invoice, so you can explore ideas like these.</p>
          <ul className={lesson.starterIdeas}>
            <li><strong>Sell a research brief.</strong> Show a free summary and unlock the full report after payment.</li>
            <li><strong>Deliver an analysis on demand.</strong> Generate a result from a buyer’s input and create an invoice for that specific result.</li>
            <li><strong>Offer a paid file download.</strong> Adapt the text demo to encrypt a file and let the buyer download it once the payment reveals the key.</li>
          </ul>
          <p><a className={lesson.starterDownload} href="/downloads/fiber-encrypted-data-payment.zip" download>Download the starter project</a> and follow the README to run it locally. The standalone app has separate Seller and Buyer panels, so you can try handing off the offer JSON yourself.</p>
        </section>
      </main>
      <TutorialFooter previousHref={liveTutorials[tutorialIndex - 1].href} nextHref={liveTutorials[tutorialIndex + 1]?.href} />
    </div>
  );
}
