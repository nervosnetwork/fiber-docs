'use client';

import {
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import type {
  BrowserNodeState,
  FiberBrowserNode,
  NodeInfoResult,
} from '@fiber-pay/sdk/browser';
import styles from './fiber-wasm-quickstart.module.css';

const routerAddress =
  '/dns4/bottle.fiber.channel/tcp/443/wss/p2p/QmXen3eUHhywmutEzydCsW4hXBoeVmdET2FJvMX69XJ1Eo';
const routerPubkey =
  '0x02b6d4e3ab86a2ca2fad6fae0ecb2e1e559e0b911939872a90abdda6d20302be71';
const profileKey = 'fiber-docs:wasm-quickstart-profile-v1';
const isolationReloadKey = 'fiber-docs:wasm-isolation-reload-v1';
const shannonsPerCkb = 100_000_000n;

type CodeFile = {
  id: 'fiber' | 'balance' | 'amounts' | 'channel' | 'payment' | 'app';
  label: string;
  language: string;
  code: string;
};

const codeFiles: CodeFile[] = [
  {
    id: 'fiber',
    label: 'lib/fiber.ts',
    language: 'typescript',
    code: `import type { FiberBrowserNode } from '@fiber-pay/sdk/browser';

const routerAddress =
  '/dns4/bottle.fiber.channel/tcp/443/wss/p2p/' +
  'QmXen3eUHhywmutEzydCsW4hXBoeVmdET2FJvMX69XJ1Eo';

export const routerPubkey =
  '0x02b6d4e3ab86a2ca2fad6fae0ecb2e1e559e0b911939872a90abdda6d20302be71';

const profileKey = 'fiber-docs:wasm-quickstart-profile-v1';

function bytesToHex(bytes: Uint8Array) {
  return Array.from(bytes, (value) =>
    value.toString(16).padStart(2, '0'),
  ).join('');
}

function hexToBytes(value: string) {
  return Uint8Array.from(value.match(/.{2}/g) ?? [], (part) =>
    Number.parseInt(part, 16),
  );
}

function getOrCreateProfile() {
  const saved = localStorage.getItem(profileKey);
  if (saved) {
    const profile = JSON.parse(saved);
    return {
      fiberKey: hexToBytes(profile.fiberKey),
      ckbKey: hexToBytes(profile.ckbKey),
      identifier: profile.identifier,
    };
  }

  const profile = {
    fiberKey: bytesToHex(crypto.getRandomValues(new Uint8Array(32))),
    ckbKey: bytesToHex(crypto.getRandomValues(new Uint8Array(32))),
    identifier: \`fiber-quickstart-\${crypto.randomUUID()}\`,
  };
  localStorage.setItem(profileKey, JSON.stringify(profile));
  return {
    fiberKey: hexToBytes(profile.fiberKey),
    ckbKey: hexToBytes(profile.ckbKey),
    identifier: profile.identifier,
  };
}

export async function startFiber(): Promise<FiberBrowserNode> {
  if (!crossOriginIsolated) {
    throw new Error('Cross-origin isolation is required');
  }

  const {
    FiberBrowserNode,
    RawKeyCredentialProvider,
  } = await import('@fiber-pay/sdk/browser');
  const profile = getOrCreateProfile();
  const credential = new RawKeyCredentialProvider(
    profile.fiberKey,
    profile.ckbKey,
    profile.identifier,
  );
  const node = new FiberBrowserNode({
    network: 'testnet',
    credential,
    nodeConfig: { bootnodes: [], logLevel: 'info' },
  });

  await node.start();
  return node;
}

export async function connectToRouter(node: FiberBrowserNode) {
  await node.connectPeer({
    address: routerAddress.replace(/\\/p2p\\/[^/]+$/, ''),
    pubkey: routerPubkey,
  });
}`,
  },
  {
    id: 'balance',
    label: 'lib/balance.ts',
    language: 'typescript',
    code: `type FundingScript = {
  code_hash: string;
  hash_type: string;
  args: string;
};

export async function queryCkbBalance(script: FundingScript) {
  const response = await fetch('https://testnet.ckbapp.dev/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'get_cells_capacity',
      params: [{ script, script_type: 'lock' }],
    }),
  });
  const payload = await response.json();
  return BigInt(payload.result.capacity);
}

export function watchCkbBalance(
  script: FundingScript,
  onBalance: (value: bigint) => void,
) {
  let checking = false;
  const check = async () => {
    if (checking || document.visibilityState !== 'visible') return;
    checking = true;
    try {
      onBalance(await queryCkbBalance(script));
    } finally {
      checking = false;
    }
  };

  void check();
  const timer = window.setInterval(check, 5_000);
  document.addEventListener('visibilitychange', check);

  return () => {
    window.clearInterval(timer);
    document.removeEventListener('visibilitychange', check);
  };
}`,
  },
  {
    id: 'amounts',
    label: 'lib/amounts.ts',
    language: 'typescript',
    code: `const SHANNONS_PER_CKB = 100_000_000n;

export function ckbToHex(value: string) {
  if (!/^\\d+(\\.\\d{1,8})?$/.test(value)) {
    throw new Error('Enter a valid CKB amount');
  }

  const [whole, fraction = ''] = value.split('.');
  const shannons =
    BigInt(whole) * SHANNONS_PER_CKB +
    BigInt(fraction.padEnd(8, '0'));

  if (shannons <= 0n) {
    throw new Error('Amount must be positive');
  }

  return \`0x\${shannons.toString(16)}\` as \`0x\${string}\`;
}`,
  },
  {
    id: 'channel',
    label: 'lib/channel.ts',
    language: 'typescript',
    code: `import type { FiberBrowserNode } from '@fiber-pay/sdk/browser';
import { ckbToHex } from './amounts';

const wait = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

export async function openCkbChannel(
  node: FiberBrowserNode,
  peerPubkey: \`0x\${string}\`,
  amount: string,
) {
  const result = await node.openChannel({
    pubkey: peerPubkey,
    funding_amount: ckbToHex(amount),
    public: true,
  });

  return result.temporary_channel_id;
}

export function watchChannelStates(
  node: FiberBrowserNode,
  onState: (state: string) => void,
) {
  let active = true;

  const poll = async () => {
    while (active) {
      const { channels } = await node.listChannels();
      const latest = channels.at(-1);
      if (latest) onState(latest.state.state_name);
      await wait(2_000);
    }
  };

  void poll();
  return () => {
    active = false;
  };
}`,
  },
  {
    id: 'payment',
    label: 'lib/payment.ts',
    language: 'typescript',
    code: `import type { FiberBrowserNode } from '@fiber-pay/sdk/browser';
import { ckbToHex } from './amounts';

export async function sendKeysend(
  node: FiberBrowserNode,
  peerPubkey: \`0x\${string}\`,
  amount: string,
) {
  const submitted = await node.sendPayment({
    target_pubkey: peerPubkey,
    amount: ckbToHex(amount),
    keysend: true,
  });

  if (
    submitted.status === 'Success' ||
    submitted.status === 'Failed'
  ) {
    return submitted;
  }

  return node.waitForPayment(submitted.payment_hash, {
    timeout: 30_000,
    interval: 1_000,
  });
}`,
  },
  {
    id: 'app',
    label: 'app/pay/page.tsx',
    language: 'tsx',
    code: `'use client';

import { useRef, useState } from 'react';
import {
  scriptToAddress,
  type FiberBrowserNode,
} from '@fiber-pay/sdk/browser';
import {
  connectToRouter,
  routerPubkey,
  startFiber,
} from '@/lib/fiber';
import { openCkbChannel } from '@/lib/channel';
import { sendKeysend } from '@/lib/payment';

export default function PayPage() {
  const node = useRef<FiberBrowserNode | null>(null);
  const [connected, setConnected] = useState(false);
  const [fundingAddress, setFundingAddress] = useState('');
  const [channelReady, setChannelReady] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState('Not sent');

  async function start() {
    // Reuse startFiber() from the first tutorial.
    const fiber = await startFiber();
    node.current = fiber;
    const info = await fiber.getNodeInfo();
    setFundingAddress(
      scriptToAddress(info.default_funding_lock_script, 'testnet'),
    );
  }

  async function connect() {
    if (!node.current) return;
    await connectToRouter(node.current);
    setConnected(true);
  }

  async function openChannel() {
    if (!node.current || !connected) return;
    await openCkbChannel(node.current, routerPubkey, '499');
    setChannelReady(true);
  }

  async function pay() {
    if (!node.current || !channelReady) return;
    const result = await sendKeysend(node.current, routerPubkey, '1');
    setPaymentStatus(result.status);
  }

  return (
    <main>
      <button onClick={start}>Start node</button>
      <button disabled={!node.current} onClick={connect}>
        Connect peer
      </button>
      <code>{fundingAddress}</code>
      <button disabled={!connected} onClick={openChannel}>
        Open 499 CKB channel
      </button>
      <button disabled={!channelReady} onClick={pay}>
        Send 1 CKB
      </button>
      <p>{paymentStatus}</p>
    </main>
  );
}`,
  },
];

type CodeFocus = {
  file: CodeFile['id'];
  start: number;
  end: number;
};

const sectionCode: Record<string, CodeFocus> = {
  intro: { file: 'app', start: 15, end: 20 },
  model: { file: 'fiber', start: 46, end: 74 },
  fund: { file: 'balance', start: 7, end: 43 },
  amounts: { file: 'amounts', start: 1, end: 18 },
  open: { file: 'channel', start: 7, end: 17 },
  ready: { file: 'channel', start: 19, end: 38 },
  pay: { file: 'payment', start: 4, end: 13 },
  result: { file: 'payment', start: 15, end: 25 },
  react: { file: 'app', start: 40, end: 66 },
  production: { file: 'app', start: 40, end: 66 },
};

const syntaxPattern =
  /(\/\/.*$|\/\*.*?\*\/|'(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*"|`(?:\\.|[^`\\])*`|<\/?[A-Za-z][\w.]*|\b(?:import|from|export|default|const|let|var|function|async|await|return|if|else|throw|new|typeof|instanceof|true|false|null|undefined|type|interface|extends|implements|as|in|of)\b|\b(?:[A-Z][A-Za-z0-9_]*|[a-zA-Z_$][\w$]*(?=\())\b|\b\d[\d_]*(?:\.\d+)?n?\b)/g;

function syntaxClass(token: string) {
  if (token.startsWith('//') || token.startsWith('/*')) return styles.tokenComment;
  if (/^['"`]/.test(token)) return styles.tokenString;
  if (token.startsWith('<')) return styles.tokenTag;
  if (/^\d/.test(token)) return styles.tokenNumber;
  if (/^[A-Z]/.test(token)) return styles.tokenType;
  if (/^(true|false|null|undefined)$/.test(token)) return styles.tokenConstant;
  if (
    /^(import|from|export|default|const|let|var|function|async|await|return|if|else|throw|new|typeof|instanceof|type|interface|extends|implements|as|in|of)$/.test(
      token,
    )
  ) {
    return styles.tokenKeyword;
  }
  return styles.tokenFunction;
}

function highlightLine(line: string): ReactNode[] {
  const parts: ReactNode[] = [];
  let cursor = 0;

  for (const match of line.matchAll(syntaxPattern)) {
    const index = match.index ?? 0;
    if (index > cursor) parts.push(line.slice(cursor, index));
    parts.push(
      <span className={syntaxClass(match[0])} key={`${index}-${match[0]}`}>
        {match[0]}
      </span>,
    );
    cursor = index + match[0].length;
  }

  if (cursor < line.length) parts.push(line.slice(cursor));
  return parts;
}

function CodeBlock({ file, focus }: { file: CodeFile; focus: CodeFocus }) {
  const codeRef = useRef<HTMLPreElement | null>(null);

  useEffect(() => {
    const code = codeRef.current;
    const line = code?.querySelector<HTMLElement>(`[data-line="${focus.start}"]`);
    if (!code || !line) return;
    const lineTop =
      line.getBoundingClientRect().top -
      code.getBoundingClientRect().top +
      code.scrollTop;

    code.scrollTo({
      top: Math.max(0, lineTop - code.clientHeight * 0.28),
      behavior: 'smooth',
    });
  }, [file.id, focus.start]);

  return (
    <pre className={styles.code} aria-label={`${file.label} code`} ref={codeRef}>
      <code>
        {file.code.split('\n').map((line, index) => {
          const lineNumber = index + 1;
          const isFocused =
            focus.file === file.id &&
            lineNumber >= focus.start &&
            lineNumber <= focus.end;

          return (
            <span
              className={`${styles.codeLine} ${
                isFocused ? styles.focusedCodeLine : ''
              }`}
              data-line={lineNumber}
              key={`${file.id}-${index}`}
            >
              <span className={styles.lineNumber}>{lineNumber}</span>
              <span>{line ? highlightLine(line) : ' '}</span>
            </span>
          );
        })}
      </code>
    </pre>
  );
}

function bytesToHex(bytes: Uint8Array) {
  return Array.from(bytes, (value) => value.toString(16).padStart(2, '0')).join('');
}

function hexToBytes(value: string) {
  return Uint8Array.from(value.match(/.{2}/g) ?? [], (part) =>
    Number.parseInt(part, 16),
  );
}

function getOrCreateProfile() {
  const stored = window.localStorage.getItem(profileKey);

  if (stored) {
    try {
      const parsed = JSON.parse(stored) as {
        fiberKey: string;
        ckbKey: string;
        identifier: string;
      };

      if (
        /^[0-9a-f]{64}$/i.test(parsed.fiberKey) &&
        /^[0-9a-f]{64}$/i.test(parsed.ckbKey)
      ) {
        return {
          fiberKey: hexToBytes(parsed.fiberKey),
          ckbKey: hexToBytes(parsed.ckbKey),
          identifier: parsed.identifier,
        };
      }
    } catch {
      window.localStorage.removeItem(profileKey);
    }
  }

  const profile = {
    fiberKey: bytesToHex(crypto.getRandomValues(new Uint8Array(32))),
    ckbKey: bytesToHex(crypto.getRandomValues(new Uint8Array(32))),
    identifier: `fiber-quickstart-${crypto.randomUUID()}`,
  };
  window.localStorage.setItem(profileKey, JSON.stringify(profile));

  return {
    fiberKey: hexToBytes(profile.fiberKey),
    ckbKey: hexToBytes(profile.ckbKey),
    identifier: profile.identifier,
  };
}

function ckbToHex(value: string) {
  const amount = value.trim();
  if (!/^\d+(\.\d{1,8})?$/.test(amount)) {
    throw new Error('Enter a valid CKB amount with at most 8 decimals.');
  }

  const [whole, fraction = ''] = amount.split('.');
  const shannons =
    BigInt(whole) * shannonsPerCkb + BigInt(fraction.padEnd(8, '0'));
  if (shannons <= 0n) throw new Error('Amount must be greater than zero.');
  return `0x${shannons.toString(16)}` as `0x${string}`;
}

async function queryCkbBalance(script: {
  code_hash: string;
  hash_type: string;
  args: string;
}) {
  const response = await fetch('https://testnet.ckbapp.dev/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'get_cells_capacity',
      params: [{ script, script_type: 'lock' }],
    }),
  });
  const result = (await response.json()) as {
    result?: { capacity?: string };
    error?: { message?: string };
  };

  if (!result.result?.capacity) {
    throw new Error(result.error?.message ?? 'Unable to query the CKB balance.');
  }
  return BigInt(result.result.capacity);
}

function formatCkb(value: bigint | null) {
  if (value === null) return '—';
  const whole = value / shannonsPerCkb;
  const fraction = (value % shannonsPerCkb)
    .toString()
    .padStart(8, '0')
    .replace(/0+$/, '');
  return `${whole}${fraction ? `.${fraction}` : ''} CKB`;
}

function shorten(value?: string) {
  if (!value) return '—';
  return value.length > 28
    ? `${value.slice(0, 14)}…${value.slice(-10)}`
    : value;
}

const wait = (milliseconds: number) =>
  new Promise((resolve) => window.setTimeout(resolve, milliseconds));

const channelStateSequence = [
  'NEGOTIATING_FUNDING',
  'COLLABORATING_FUNDING_TX',
  'SIGNING_COMMITMENT',
  'AWAITING_TX_SIGNATURES',
  'AWAITING_CHANNEL_READY',
  'CHANNEL_READY',
] as const;

function nextChannelState(current: string) {
  const normalized = current.replace(/[^a-z0-9]/gi, '').toLowerCase();
  const index = channelStateSequence.findIndex(
    (state) => state.replace(/_/g, '').toLowerCase() === normalized,
  );

  return index >= 0 && index < channelStateSequence.length - 1
    ? channelStateSequence[index + 1]
    : null;
}

type BusyAction =
  | 'start'
  | 'connect'
  | 'refresh'
  | 'channel'
  | 'payment'
  | null;

type PaymentLog = {
  at: string;
  message: string;
  tone: 'pending' | 'success' | 'error';
};

type ChannelList = Awaited<
  ReturnType<FiberBrowserNode['listChannels']>
>['channels'];

export function FiberChannelPaymentTutorial() {
  const nodeRef = useRef<FiberBrowserNode | null>(null);
  const articleRef = useRef<HTMLDivElement | null>(null);
  const [activeFile, setActiveFile] = useState<CodeFile['id']>('app');
  const [codeFocus, setCodeFocus] = useState<CodeFocus>(sectionCode.intro);
  const [nodeState, setNodeState] = useState<BrowserNodeState>('idle');
  const [nodeInfo, setNodeInfo] = useState<NodeInfoResult | null>(null);
  const [peerCount, setPeerCount] = useState(0);
  const [ckbAddress, setCkbAddress] = useState('');
  const [ckbBalance, setCkbBalance] = useState<bigint | null>(null);
  const [channelAmount, setChannelAmount] = useState('499');
  const [channelState, setChannelState] = useState('Not opened');
  const [channelCount, setChannelCount] = useState(0);
  const [channelHistory, setChannelHistory] = useState<string[]>([]);
  const [readyChannelCount, setReadyChannelCount] = useState(0);
  const [paymentAmount, setPaymentAmount] = useState('1');
  const [paymentStatus, setPaymentStatus] = useState('Not sent');
  const [paymentLogs, setPaymentLogs] = useState<PaymentLog[]>([]);
  const [busyAction, setBusyAction] = useState<BusyAction>(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [addressCopied, setAddressCopied] = useState(false);
  const [isolationReady, setIsolationReady] = useState<boolean | null>(null);

  const applyChannelSnapshot = useCallback((channels: ChannelList) => {
    const ready = channels.filter((channel) =>
      channel.state.state_name.toLowerCase().includes('ready'),
    );
    const nextState = channels.at(-1)?.state.state_name;

    setChannelCount(channels.length);
    setReadyChannelCount(ready.length);
    if (!nextState) {
      setChannelState((current) =>
        current.startsWith('Opening') ? current : 'Not opened',
      );
      return;
    }

    setChannelState(nextState);
    setChannelHistory((states) =>
      states.at(-1) === nextState
        ? states
        : [...states, nextState].slice(-8),
    );
  }, []);

  const addPaymentLog = useCallback(
    (message: string, tone: PaymentLog['tone']) => {
      setPaymentLogs((logs) => [
        ...logs.slice(-5),
        {
          at: new Date().toLocaleTimeString([], { hour12: false }),
          message,
          tone,
        },
      ]);
    },
    [],
  );

  const currentFile =
    codeFiles.find((file) => file.id === activeFile) ?? codeFiles[0];
  const channelFundingReady = (() => {
    if (ckbBalance === null) return false;
    try {
      return ckbBalance >= BigInt(ckbToHex(channelAmount));
    } catch {
      return false;
    }
  })();
  const channelOpening =
    readyChannelCount === 0 &&
    channelState !== 'Not opened' &&
    channelState !== 'Open failed';
  const expectedChannelState = nextChannelState(channelState);

  useEffect(() => {
    const supported =
      window.crossOriginIsolated && typeof SharedArrayBuffer !== 'undefined';

    if (!supported) {
      const reloadedPath = window.sessionStorage.getItem(isolationReloadKey);
      if (reloadedPath !== window.location.pathname) {
        window.sessionStorage.setItem(
          isolationReloadKey,
          window.location.pathname,
        );
        window.location.reload();
        return;
      }
    } else {
      window.sessionStorage.removeItem(isolationReloadKey);
    }

    setIsolationReady(supported);
    return () => {
      void nodeRef.current?.stop();
    };
  }, []);

  useEffect(() => {
    const article = articleRef.current;
    if (!article) return;

    const onScroll = () => {
      const sections = Array.from(
        article.querySelectorAll<HTMLElement>('[data-tutorial-section]'),
      );
      const articleTop = article.getBoundingClientRect().top;
      let next = sections[0]?.dataset.tutorialSection ?? 'intro';

      for (const section of sections) {
        if (section.getBoundingClientRect().top - articleTop <= 180) {
          next = section.dataset.tutorialSection ?? next;
        } else {
          break;
        }
      }

      const nextCode = sectionCode[next] ?? sectionCode.intro;
      setActiveFile(nextCode.file);
      setCodeFocus(nextCode);
    };

    onScroll();
    article.addEventListener('scroll', onScroll, { passive: true });
    return () => article.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (!nodeInfo) return;

    let cancelled = false;
    let checking = false;
    const checkBalance = async () => {
      if (
        cancelled ||
        checking ||
        document.visibilityState !== 'visible'
      ) {
        return;
      }

      checking = true;
      try {
        const balance = await queryCkbBalance(
          nodeInfo.default_funding_lock_script,
        );
        if (!cancelled) setCkbBalance(balance);
      } catch {
        // Keep the last successful balance. The manual Refresh action
        // surfaces errors when the user wants immediate feedback.
      } finally {
        checking = false;
      }
    };

    const interval = window.setInterval(() => void checkBalance(), 5_000);
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') void checkBalance();
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [nodeInfo]);

  useEffect(() => {
    if (!nodeInfo) return;

    let cancelled = false;
    let checking = false;
    const checkChannels = async () => {
      const node = nodeRef.current;
      if (
        cancelled ||
        checking ||
        !node ||
        document.visibilityState !== 'visible'
      ) {
        return;
      }

      checking = true;
      try {
        const { channels } = await node.listChannels();
        if (!cancelled) applyChannelSnapshot(channels);
      } catch {
        // Preserve the last known state. Manual Refresh surfaces errors.
      } finally {
        checking = false;
      }
    };

    void checkChannels();
    const interval = window.setInterval(() => void checkChannels(), 2_000);
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') void checkChannels();
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [applyChannelSnapshot, nodeInfo]);

  const refreshState = useCallback(async () => {
    const node = nodeRef.current;
    if (!node) return;

    const [{ peers }, info, { channels }] = await Promise.all([
      node.listPeers(),
      node.nodeInfo(),
      node.listChannels(),
    ]);
    setPeerCount(peers.length);
    setNodeInfo(info);
    applyChannelSnapshot(channels);
    setCkbBalance(await queryCkbBalance(info.default_funding_lock_script));
  }, [applyChannelSnapshot]);

  const startNode = useCallback(async () => {
    if (busyAction || nodeRef.current) return;
    setBusyAction('start');
    setError('');

    try {
      if (!window.crossOriginIsolated) {
        throw new Error('Cross-origin isolation is not enabled for this page.');
      }

      const {
        FiberBrowserNode,
        RawKeyCredentialProvider,
        scriptToAddress,
      } = await import('@fiber-pay/sdk/browser');
      const profile = getOrCreateProfile();
      const credential = new RawKeyCredentialProvider(
        profile.fiberKey,
        profile.ckbKey,
        profile.identifier,
      );
      const node = new FiberBrowserNode({
        network: 'testnet',
        credential,
        nodeConfig: { bootnodes: [], logLevel: 'info' },
      });

      node.on('stateChange', setNodeState);
      node.on('error', (nodeError) => setError(nodeError.message));
      nodeRef.current = node;

      const info = await node.start();
      setNodeInfo(info);
      setCkbAddress(
        scriptToAddress(info.default_funding_lock_script, 'testnet'),
      );
      try {
        setCkbBalance(await queryCkbBalance(info.default_funding_lock_script));
      } catch (balanceError) {
        setError(
          balanceError instanceof Error
            ? balanceError.message
            : 'Unable to read the Testnet balance.',
        );
      }

      const { channels } = await node.listChannels();
      applyChannelSnapshot(channels);
    } catch (startError) {
      setError(
        startError instanceof Error
          ? startError.message
          : 'Unable to start the Fiber node.',
      );
      if (!nodeRef.current?.isRunning) nodeRef.current = null;
    } finally {
      setBusyAction(null);
    }
  }, [applyChannelSnapshot, busyAction]);

  const connectPublicPeer = useCallback(async () => {
    const node = nodeRef.current;
    if (busyAction || !node?.isRunning || peerCount > 0) return;
    setBusyAction('connect');
    setError('');

    try {
      await node.connectPeer({
        address: routerAddress.replace(/\/p2p\/[^/]+$/i, ''),
        pubkey: routerPubkey,
      });

      let peers = (await node.listPeers()).peers;
      for (let attempt = 0; peers.length === 0 && attempt < 10; attempt += 1) {
        await wait(800);
        peers = (await node.listPeers()).peers;
      }
      if (peers.length === 0) {
        throw new Error('The public peer handshake timed out.');
      }
      setPeerCount(peers.length);
    } catch (connectError) {
      setError(
        connectError instanceof Error
          ? connectError.message
          : 'Unable to connect to the public peer.',
      );
    } finally {
      setBusyAction(null);
    }
  }, [busyAction, peerCount]);

  const handleRefresh = useCallback(async () => {
    if (!nodeRef.current || busyAction) return;
    setBusyAction('refresh');
    setError('');
    try {
      await refreshState();
    } catch (refreshError) {
      setError(
        refreshError instanceof Error
          ? refreshError.message
          : 'Unable to refresh live state.',
      );
    } finally {
      setBusyAction(null);
    }
  }, [busyAction, refreshState]);

  const openChannel = useCallback(async () => {
    const node = nodeRef.current;
    if (!node || peerCount === 0 || busyAction) return;
    setBusyAction('channel');
    setError('');
    setChannelState('Opening');

    try {
      const result = await node.openChannel({
        pubkey: routerPubkey,
        funding_amount: ckbToHex(channelAmount),
        public: true,
      });
      setChannelState(`Opening ${shorten(result.temporary_channel_id)}`);
      const { channels } = await node.listChannels();
      if (channels.length) applyChannelSnapshot(channels);
    } catch (channelError) {
      setChannelState('Open failed');
      setError(
        channelError instanceof Error
          ? channelError.message
          : 'Unable to open the Testnet channel.',
      );
    } finally {
      setBusyAction(null);
    }
  }, [applyChannelSnapshot, busyAction, channelAmount, peerCount]);

  const sendPayment = useCallback(async () => {
    const node = nodeRef.current;
    if (!node || readyChannelCount === 0 || peerCount === 0 || busyAction) return;
    setBusyAction('payment');
    setError('');
    setPaymentStatus('Sending');
    addPaymentLog(`Sending ${paymentAmount} CKB with keysend…`, 'pending');

    try {
      const submitted = await node.sendPayment({
        target_pubkey: routerPubkey,
        amount: ckbToHex(paymentAmount),
        keysend: true,
      });
      addPaymentLog(
        `Submitted · ${shorten(submitted.payment_hash)}`,
        'pending',
      );
      if (submitted.status !== 'Success' && submitted.status !== 'Failed') {
        addPaymentLog('Waiting for a terminal payment status…', 'pending');
      }
      const result =
        submitted.status !== 'Success' && submitted.status !== 'Failed'
          ? await node.waitForPayment(submitted.payment_hash, {
              timeout: 30_000,
              interval: 1_000,
            })
          : submitted;
      setPaymentStatus(result.status);
      addPaymentLog(
        `${result.status} · ${paymentAmount} CKB · ${shorten(result.payment_hash)}`,
        result.status === 'Success' ? 'success' : 'error',
      );
      await refreshState();
    } catch (paymentError) {
      const message =
        paymentError instanceof Error
          ? paymentError.message
          : 'Unable to send the Testnet payment.';
      setPaymentStatus('Failed');
      setError(message);
      addPaymentLog(`Failed · ${message}`, 'error');
    } finally {
      setBusyAction(null);
    }
  }, [
    addPaymentLog,
    busyAction,
    paymentAmount,
    peerCount,
    readyChannelCount,
    refreshState,
  ]);

  const copyCode = useCallback(async () => {
    await navigator.clipboard.writeText(currentFile.code);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1_500);
  }, [currentFile]);

  const copyFundingAddress = useCallback(async () => {
    if (!ckbAddress) return;
    try {
      await navigator.clipboard.writeText(ckbAddress);
      setAddressCopied(true);
      window.setTimeout(() => setAddressCopied(false), 1_500);
    } catch {
      setError('Unable to copy the funding address.');
    }
  }, [ckbAddress]);

  return (
    <div className={styles.shell}>
      <div className={styles.article} ref={articleRef}>
        <header className={styles.hero} data-tutorial-section="intro">
          <div className={styles.eyebrow}>
            <span>Build</span>
            <span className={styles.eyebrowRule} />
            <span>15 minute tutorial</span>
          </div>
          <h1>Open a Fiber Channel and Send a Payment</h1>
          <p className={styles.lead}>
            Fund your browser node, open a real Testnet payment channel, and
            send CKB over Fiber—all from React and WASM.
          </p>
          <div className={styles.heroMeta}>
            <span>React</span>
            <span>Fiber WASM</span>
            <span>Testnet payment</span>
          </div>
        </header>

        <section className={styles.section} data-tutorial-section="model">
          <div className={styles.stepLabel}>Before you pay</div>
          <h2>A channel turns one on-chain setup into fast payments</h2>
          <p>
            Opening a channel commits Testnet CKB on-chain. Once the channel
            reaches <code>ChannelReady</code>, payments update the channel
            off-chain instead of creating a new CKB transaction each time.
          </p>
          <div className={styles.flow} aria-label="Channel payment flow">
            <div>
              <b>Your browser node</b>
              <span>WASM + local keys</span>
            </div>
            <span className={styles.flowArrow}>→ Channel →</span>
            <div>
              <b>Public Fiber node</b>
              <span>Receives keysend</span>
            </div>
          </div>
          <div className={styles.note}>
            <strong>This page uses real Testnet state</strong>
            <p>
              Starting and connecting do not move funds. Opening the channel
              and sending the payment happen only after you click their
              separate buttons.
            </p>
          </div>
        </section>

        <section className={styles.section} data-tutorial-section="fund">
          <div className={styles.stepLabel}>
            <span>1</span> Fund the browser identity
          </div>
          <h2>Send Testnet CKB to the generated address</h2>
          <p>
            Start the same browser identity used in the connection tutorial.
            The SDK derives its CKB funding address from
            <code> default_funding_lock_script</code>. Use the faucet, then
            refresh until the on-chain balance appears.
          </p>
          <div className={styles.checkList}>
            <span>Keep the same localStorage identity and IndexedDB data</span>
            <span>Fund at least 499 CKB plus an on-chain transaction fee</span>
            <span>Use Testnet funds only</span>
          </div>
        </section>

        <section className={styles.section} data-tutorial-section="amounts">
          <div className={styles.stepLabel}>
            <span>2</span> Convert the amount
          </div>
          <h2>Express CKB as hexadecimal shannons</h2>
          <p>
            Fiber RPC amounts use hexadecimal shannons. Parse the decimal
            string with <code>BigInt</code> so eight-decimal CKB values stay
            exact and do not pass through floating-point numbers.
          </p>
          <div className={styles.inlineCode}>
            <code>499 CKB = 49,900,000,000 shannons</code>
            <span>0xb9e0ab300</span>
          </div>
        </section>

        <section className={styles.section} data-tutorial-section="open">
          <div className={styles.stepLabel}>
            <span>3</span> Open the channel
          </div>
          <h2>Commit funding to the public Testnet peer</h2>
          <p>
            Call <code>openChannel()</code> only after the browser node is
            running, the public peer is connected, and the funding address has
            enough CKB. The example makes the channel public so it can
            participate in routing.
          </p>
          <div className={styles.note}>
            <strong>Why 499 CKB?</strong>
            <p>
              The selected public Testnet node auto-accepts CKB channels at or
              above 499 CKB. Each side also reserves 99 CKB for channel
              contracts and shutdown.
            </p>
          </div>
        </section>

        <section className={styles.section} data-tutorial-section="ready">
          <div className={styles.stepLabel}>
            <span>4</span> Wait for ChannelReady
          </div>
          <h2>Do not enable payments when negotiation merely starts</h2>
          <p>
            <code>openChannel()</code> returns a temporary channel ID before
            the funding transaction is ready. Poll <code>listChannels()</code>
            and unlock the payment UI only when a channel state contains
            <code> ready</code>.
          </p>
          <div className={styles.checkList}>
            <span>NegotiatingFunding: agree on channel parameters</span>
            <span>CollaboratingFundingTx: build the funding transaction</span>
            <span>SigningCommitment: exchange commitment signatures</span>
            <span>AwaitingTxSignatures: finalize funding signatures</span>
            <span>AwaitingChannelReady: wait for confirmation and both peers</span>
            <span>ChannelReady: the channel can carry a payment</span>
          </div>
        </section>

        <section className={styles.section} data-tutorial-section="pay">
          <div className={styles.stepLabel}>
            <span>5</span> Send a payment
          </div>
          <h2>Use keysend for the smallest working example</h2>
          <p>
            Pass the recipient pubkey, an amount, and <code>keysend: true</code>
            to <code>sendPayment()</code>. Keysend avoids invoice generation,
            which keeps this first payment flow entirely in the browser.
          </p>
          <div className={styles.note}>
            <strong>When do you need a backend?</strong>
            <p>
              Not for this direct keysend demo. A merchant app usually adds a
              backend to create invoices, match payments to orders, and grant
              access after server-side verification.
            </p>
          </div>
        </section>

        <section className={styles.section} data-tutorial-section="result">
          <div className={styles.stepLabel}>
            <span>6</span> Confirm the result
          </div>
          <h2>Wait for a terminal payment status</h2>
          <p>
            A submitted payment can still be in flight. If the first response
            is not <code>Success</code> or <code>Failed</code>, call
            <code>waitForPayment()</code> and update the React UI with its
            terminal status.
          </p>
        </section>

        <section className={`${styles.section} ${styles.reactSection}`}>
          <div className={styles.stepLabel}>
            <span>7</span> Wire the controls
          </div>
          <h2>Keep every state-changing action explicit</h2>
          <p>
            The complete React page exposes separate controls for starting,
            connecting, opening, and paying. Each button is enabled only when
            the previous network state is ready.
          </p>
          <div className={styles.reactSteps}>
            <article
              className={styles.reactStep}
              data-tutorial-section="react"
            >
              <span className={styles.substepNumber}>7.1</span>
              <div>
                <h3>Start, then connect</h3>
                <p>
                  Starting restores local identity and channel data. Connecting
                  is a separate user action, just like the first tutorial.
                </p>
              </div>
            </article>
            <article
              className={styles.reactStep}
              data-tutorial-section="production"
            >
              <span className={styles.substepNumber}>7.2</span>
              <div>
                <h3>Open, then pay</h3>
                <p>
                  The channel button requires a connected peer. The payment
                  button remains disabled until a stored or new channel is
                  ready.
                </p>
              </div>
            </article>
          </div>
        </section>

        <section className={styles.section} data-tutorial-section="production">
          <div className={styles.stepLabel}>Production checklist</div>
          <h2>Keep the browser node; harden everything around it</h2>
          <p>
            Before handling real funds, encrypt keys, add backup and recovery,
            validate channel liquidity, surface fees and timeouts, and decide
            whether invoices need server-side order verification.
          </p>
          <div className={styles.nextLinks}>
            <a href="/docs/concept/channels">
              Understand channel lifecycle <span>↗</span>
            </a>
            <a href="/docs/concept/payments">
              Read the payment model <span>↗</span>
            </a>
            <a href="/labs/browser-node">
              Open the full Browser Node Lab <span>↗</span>
            </a>
          </div>
        </section>

        <footer className={styles.articleFooter}>
          <span>Fiber Network</span>
          <span>Channel and payment tutorial complete</span>
        </footer>
      </div>

      <aside
        className={`${styles.workspace} ${styles.paymentWorkspace}`}
        aria-label="Live channel preview and code"
      >
        <section className={styles.preview}>
          <div className={styles.panelHeader}>
            <span>
              <i className={styles.liveDot} /> Live Testnet flow
            </span>
            <button
              className={styles.headerAction}
              disabled={!nodeInfo || busyAction !== null}
              onClick={handleRefresh}
            >
              {busyAction === 'refresh' ? 'Refreshing…' : 'Refresh'}
            </button>
          </div>

          <div className={`${styles.previewStage} ${styles.paymentPreviewStage}`}>
            <div className={styles.paymentCard}>
              <div className={styles.paymentStatusGrid}>
                <div>
                  <span>Node</span>
                  <strong>{nodeState === 'running' ? 'Running' : 'Stopped'}</strong>
                </div>
                <div>
                  <span>Peer</span>
                  <strong>{peerCount > 0 ? 'Connected' : 'Offline'}</strong>
                </div>
                <div>
                  <span>Channel</span>
                  <strong>{readyChannelCount > 0 ? 'Ready' : channelState}</strong>
                </div>
                <div>
                  <span>Payment</span>
                  <strong>{paymentStatus}</strong>
                </div>
              </div>

              <div className={styles.paymentFlow}>
                <div className={styles.paymentFlowNumber}>1</div>
                <div>
                  <strong>Prepare the browser node</strong>
                  <span>Start locally, then connect over WSS.</span>
                </div>
                <div className={styles.compactActions}>
                  <button
                    className={styles.startButton}
                    disabled={
                      busyAction !== null ||
                      Boolean(nodeInfo)
                    }
                    onClick={
                      isolationReady === false
                        ? () => window.location.reload()
                        : startNode
                    }
                  >
                    {busyAction === 'start'
                      ? 'Starting…'
                      : isolationReady === false
                        ? 'Reload to enable WASM'
                        : 'Start'}
                  </button>
                  <button
                    className={styles.connectButton}
                    disabled={
                      busyAction !== null ||
                      !nodeInfo ||
                      peerCount > 0
                    }
                    onClick={connectPublicPeer}
                  >
                    {busyAction === 'connect' ? 'Connecting…' : 'Connect'}
                  </button>
                </div>
              </div>

              <div className={styles.paymentFlow}>
                <div className={styles.paymentFlowNumber}>2</div>
                <div className={styles.paymentFlowBody}>
                  <strong>Fund the address</strong>
                  <div className={styles.addressLine}>
                    <code title={ckbAddress}>{shorten(ckbAddress)}</code>
                    <button
                      disabled={!ckbAddress}
                      onClick={copyFundingAddress}
                      type="button"
                    >
                      {addressCopied ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                  <span>
                    Balance: <b>{formatCkb(ckbBalance)}</b> · auto-checks every 5s
                  </span>
                </div>
                <a
                  className={styles.faucetButton}
                  href="https://faucet.nervos.org"
                  rel="noreferrer"
                  target="_blank"
                >
                  Faucet ↗
                </a>
              </div>

              <div className={styles.paymentFlow}>
                <div className={styles.paymentFlowNumber}>3</div>
                <div className={styles.paymentFlowBody}>
                  <strong>Open a channel</strong>
                  <label>
                    <input
                      aria-label="Channel funding amount in CKB"
                      disabled={!nodeInfo || busyAction !== null}
                      inputMode="decimal"
                      onChange={(event) => setChannelAmount(event.target.value)}
                      value={channelAmount}
                    />
                    <span>CKB</span>
                  </label>
                </div>
                <button
                  className={styles.channelButton}
                  disabled={
                    busyAction !== null ||
                    peerCount === 0 ||
                    !ckbAddress ||
                    !channelFundingReady ||
                    channelCount > 0 ||
                    channelOpening ||
                    readyChannelCount > 0
                  }
                  onClick={openChannel}
                >
                  {busyAction === 'channel' ? 'Opening…' : 'Open channel'}
                </button>
              </div>

              {channelHistory.length > 0 && (
                <div className={styles.channelTimeline}>
                  <span>Observed channel lifecycle</span>
                  <div>
                    {channelHistory.map((state, index) => (
                      <span key={`${state}-${index}`}>
                        {index > 0 && <i>→</i>}
                        <b>{state}</b>
                      </span>
                    ))}
                    {expectedChannelState && (
                      <span
                        aria-label={`Waiting for ${expectedChannelState}`}
                        className={styles.pendingChannelState}
                      >
                        <i aria-hidden="true">→</i>
                        <b>{expectedChannelState}</b>
                      </span>
                    )}
                  </div>
                </div>
              )}

              <div className={styles.paymentFlow}>
                <div className={styles.paymentFlowNumber}>4</div>
                <div className={styles.paymentFlowBody}>
                  <strong>Send keysend</strong>
                  <label>
                    <input
                      aria-label="Payment amount in CKB"
                      disabled={readyChannelCount === 0 || busyAction !== null}
                      inputMode="decimal"
                      onChange={(event) => setPaymentAmount(event.target.value)}
                      value={paymentAmount}
                    />
                    <span>CKB</span>
                  </label>
                </div>
                <button
                  className={styles.paymentButton}
                  disabled={
                    busyAction !== null ||
                    readyChannelCount === 0 ||
                    peerCount === 0
                  }
                  onClick={sendPayment}
                >
                  {busyAction === 'payment' ? 'Sending…' : 'Send payment'}
                </button>
              </div>

              {paymentLogs.length > 0 && (
                <div className={styles.paymentLog}>
                  <span>Payment log</span>
                  <div>
                    {paymentLogs.map((log, index) => (
                      <div key={`${log.at}-${index}`}>
                        <time>{log.at}</time>
                        <i className={styles[`paymentLog_${log.tone}`]} />
                        <code>{log.message}</code>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {error ? (
                <div className={styles.paymentError} role="alert">
                  {error}
                </div>
              ) : (
                <div className={styles.paymentNotice}>
                  Channel and payment buttons submit real Testnet actions only
                  when you click them.
                </div>
              )}
            </div>
          </div>
        </section>

        <section className={styles.codePanel}>
          <div className={styles.fileTabs}>
            {codeFiles.map((file) => (
              <button
                className={file.id === activeFile ? styles.activeTab : ''}
                key={file.id}
                onClick={() => {
                  setActiveFile(file.id);
                  setCodeFocus({
                    file: file.id,
                    start: 1,
                    end: Math.min(8, file.code.split('\n').length),
                  });
                }}
              >
                {file.label}
              </button>
            ))}
            <button className={styles.copyButton} onClick={copyCode}>
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
          <div className={styles.codeMeta}>
            <span>{currentFile.language}</span>
            <span>
              Lines {codeFocus.start}–{codeFocus.end}
            </span>
          </div>
          <CodeBlock file={currentFile} focus={codeFocus} />
        </section>
      </aside>
    </div>
  );
}
