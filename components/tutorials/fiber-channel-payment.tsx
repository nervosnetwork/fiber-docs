'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
import { ExplainedTerm } from './explained-term';
import styles from './fiber-wasm-quickstart.module.css';

const routerAddress =
  '/dns4/bottle.fiber.channel/tcp/443/wss/p2p/QmXen3eUHhywmutEzydCsW4hXBoeVmdET2FJvMX69XJ1Eo';
const routerPubkey =
  '0x02b6d4e3ab86a2ca2fad6fae0ecb2e1e559e0b911939872a90abdda6d20302be71';
const profileKey = 'fiber-docs:wasm-quickstart-profile-v1';
const isolationReloadKey = 'fiber-docs:wasm-isolation-reload-v1';
const shannonsPerCkb = 100_000_000n;

const tutorials = [
  {
    shortTitle: 'Connect a WASM node',
    href: '/docs/build/connect-wasm-node',
  },
  {
    shortTitle: 'Open a channel and send a payment',
    href: '/docs/build/open-channel-payment',
  },
  {
    shortTitle: 'Send a multi-hop invoice payment',
    href: '/docs/build/multi-hop-invoice',
  },
  {
    shortTitle: 'Open a unidirectional channel',
    href: '/docs/build/unidirectional-channel',
  },
  { shortTitle: 'Build a Hold Invoice payment', href: '/docs/build/hold-invoice' },
  { shortTitle: 'Pay with RUSD', href: '/docs/build/rusd-payment' },
  { shortTitle: 'Close a channel and recover funds', href: '/docs/build/close-channel' },
] as const;
const currentTutorialIndex = 1;

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
    address: routerAddress,
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
    // Start this browser's Fiber node.
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
  model: { file: 'app', start: 39, end: 48 },
  identity: { file: 'app', start: 23, end: 31 },
  fund: { file: 'balance', start: 7, end: 45 },
  amounts: { file: 'amounts', start: 1, end: 18 },
  open: { file: 'channel', start: 7, end: 19 },
  ready: { file: 'channel', start: 21, end: 40 },
  pay: { file: 'payment', start: 4, end: 26 },
  react: { file: 'app', start: 16, end: 65 },
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

function CodeBlock({
  file,
  focus,
}: {
  file: CodeFile;
  focus: CodeFocus | null;
}) {
  const codeRef = useRef<HTMLPreElement | null>(null);

  useEffect(() => {
    if (!focus) return;
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
  }, [file.id, focus]);

  return (
    <pre className={styles.code} aria-label={`${file.label} code`} ref={codeRef}>
      <code>
        {file.code.split('\n').map((line, index) => {
          const lineNumber = index + 1;
          const isFocused =
            focus?.file === file.id &&
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

function friendlyNodeState(state: BrowserNodeState) {
  if (state === 'running') return 'Node running';
  if (state === 'starting') return 'Starting WASM';
  if (state === 'stopping') return 'Stopping';
  if (state === 'error') return 'Connection issue';
  return 'Ready to start';
}

function ActionHint({
  children,
  id,
  label,
  reason,
}: {
  children: ReactNode;
  id: string;
  label: string;
  reason: string | null;
}) {
  if (!reason) return <>{children}</>;

  return (
    <ExplainedTerm
      ariaLabel={label}
      className={styles.disabledActionHint}
      explanation={reason}
      id={id}
    >
      {children}
    </ExplainedTerm>
  );
}

function RefreshIcon() {
  return (
    <svg
      aria-hidden="true"
      className={styles.refreshIcon}
      fill="none"
      viewBox="0 0 16 16"
    >
      <path d="M13 5V2m0 0h-3m3 0-2.1 2.1A5 5 0 1 0 13 9" />
    </svg>
  );
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
  | 'prepare'
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
  const router = useRouter();
  const nodeRef = useRef<FiberBrowserNode | null>(null);
  const topRef = useRef<HTMLDivElement | null>(null);
  const demoRef = useRef<HTMLElement | null>(null);
  const articleRef = useRef<HTMLDivElement | null>(null);
  const tutorialMenuRef = useRef<HTMLDivElement | null>(null);
  const [activeSection, setActiveSection] = useState('intro');
  const [articleProgress, setArticleProgress] = useState(0);
  const [articleAtBottom, setArticleAtBottom] = useState(false);
  const [tutorialMenuOpen, setTutorialMenuOpen] = useState(false);
  const [liveDemoActive, setLiveDemoActive] = useState(false);
  const [activeFile, setActiveFile] = useState<CodeFile['id']>('app');
  const [codeFocus, setCodeFocus] = useState<CodeFocus | null>(null);
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
  const [paymentHash, setPaymentHash] = useState('');
  const [activeChannelId, setActiveChannelId] = useState('');
  const [localBalanceBefore, setLocalBalanceBefore] = useState<bigint | null>(null);
  const [localBalanceAfter, setLocalBalanceAfter] = useState<bigint | null>(null);
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
    const activeChannel = ready.at(-1) ?? channels.at(-1);

    setChannelCount(channels.length);
    setReadyChannelCount(ready.length);
    if (activeChannel) {
      setActiveChannelId(activeChannel.channel_id);
    }
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

  const syncToSection = useCallback((section: string) => {
    setActiveSection(section);
    const nextCode = sectionCode[section];
    if (!nextCode) {
      setCodeFocus(null);
      return;
    }
    setActiveFile(nextCode.file);
    setCodeFocus(nextCode);
  }, []);

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
      const maxScroll = article.scrollHeight - article.clientHeight;
      const distanceFromBottom = Math.max(0, maxScroll - article.scrollTop);
      setArticleProgress(
        maxScroll <= 0
          ? 1
          : Math.min(1, Math.max(0, article.scrollTop / maxScroll)),
      );
      setArticleAtBottom((wasAtBottom) =>
        maxScroll <= 1 || distanceFromBottom <= (wasAtBottom ? 72 : 2),
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

      syncToSection(next);
    };

    onScroll();
    article.addEventListener('scroll', onScroll, { passive: true });
    return () => article.removeEventListener('scroll', onScroll);
  }, [syncToSection]);

  useEffect(() => {
    articleRef.current
      ?.querySelectorAll<HTMLElement>('[data-tutorial-section]')
      .forEach((section) => {
        section.dataset.active = String(
          section.dataset.tutorialSection === activeSection,
        );
      });
  }, [activeSection]);

  useEffect(() => {
    if (!tutorialMenuOpen) return;

    const closeOnPointerDown = (event: PointerEvent) => {
      if (
        tutorialMenuRef.current &&
        !tutorialMenuRef.current.contains(event.target as Node)
      ) {
        setTutorialMenuOpen(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setTutorialMenuOpen(false);
    };

    document.addEventListener('pointerdown', closeOnPointerDown);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnPointerDown);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [tutorialMenuOpen]);

  useEffect(() => {
    const demo = demoRef.current;
    if (!demo) return;

    const observer = new IntersectionObserver(
      ([entry]) => setLiveDemoActive(entry.isIntersecting),
      { threshold: 0.2 },
    );
    observer.observe(demo);
    return () => observer.disconnect();
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
    if (!node) return [] as ChannelList;

    const [{ peers }, info, { channels }] = await Promise.all([
      node.listPeers(),
      node.nodeInfo(),
      node.listChannels(),
    ]);
    setPeerCount(peers.length);
    setNodeInfo(info);
    applyChannelSnapshot(channels);
    setCkbBalance(await queryCkbBalance(info.default_funding_lock_script));
    return channels;
  }, [applyChannelSnapshot]);

  const prepareBrowserNode = useCallback(async () => {
    if (busyAction || (nodeRef.current?.isRunning && peerCount > 0)) return;
    setBusyAction('prepare');
    setError('');

    try {
      if (!window.crossOriginIsolated) {
        throw new Error('Cross-origin isolation is not enabled for this page.');
      }

      let node = nodeRef.current;
      let info = nodeInfo;
      if (!node?.isRunning) {
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
        node = new FiberBrowserNode({
          network: 'testnet',
          credential,
          nodeConfig: { bootnodes: [], logLevel: 'info' },
        });

        node.on('stateChange', setNodeState);
        node.on('error', (nodeError) => setError(nodeError.message));
        nodeRef.current = node;
        info = await node.start();
      }

      if (!info) info = await node.nodeInfo();
      setNodeInfo(info);
      const { scriptToAddress } = await import('@fiber-pay/sdk/browser');
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
      if (peerCount === 0) {
        await node.connectPeer({
          address: routerAddress,
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
      }
    } catch (prepareError) {
      setError(
        prepareError instanceof Error
          ? prepareError.message
          : 'Unable to prepare the browser node.',
      );
      if (!nodeRef.current?.isRunning) nodeRef.current = null;
    } finally {
      setBusyAction(null);
    }
  }, [applyChannelSnapshot, busyAction, nodeInfo, peerCount]);

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
      const beforeChannels = (await node.listChannels()).channels;
      const beforeChannel = beforeChannels.find(
        (channel) => channel.channel_id === activeChannelId,
      ) ?? beforeChannels.find((channel) =>
        channel.state.state_name.toLowerCase().includes('ready'),
      );
      setLocalBalanceBefore(
        beforeChannel ? BigInt(beforeChannel.local_balance) : null,
      );
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
      setPaymentHash(result.payment_hash);
      addPaymentLog(
        `${result.status} · ${paymentAmount} CKB · ${shorten(result.payment_hash)}`,
        result.status === 'Success' ? 'success' : 'error',
      );
      const refreshedChannels = await refreshState();
      const refreshedChannel = refreshedChannels.find(
        (channel) => channel.channel_id === (beforeChannel?.channel_id ?? activeChannelId),
      );
      setLocalBalanceAfter(
        refreshedChannel ? BigInt(refreshedChannel.local_balance) : null,
      );
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
    activeChannelId,
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

  const toggleDemo = useCallback(() => {
    const target = liveDemoActive ? topRef.current : demoRef.current;
    target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [liveDemoActive]);

  const nodePrepared = nodeState === 'running' && peerCount > 0;
  const demoStatusTone = error
    ? styles.statusError
    : paymentStatus === 'Success'
      ? styles.statusSuccess
      : busyAction !== null || channelOpening
        ? styles.statusWaiting
        : styles.statusInfo;
  const channelRequirement = !nodePrepared
    ? 'Connect the browser node first.'
    : !ckbAddress
      ? 'Wait for the funding address.'
      : !channelFundingReady
        ? 'Not enough Testnet CKB to open this channel.'
        : channelOpening
          ? 'Wait for ChannelReady before paying.'
          : null;
  const paymentRequirement = readyChannelCount === 0
    ? 'Wait for ChannelReady before sending a payment.'
    : peerCount === 0
      ? 'Reconnect the public peer first.'
      : null;
  const needsFunding =
    nodePrepared && !channelFundingReady && channelCount === 0;
  const canOpenChannel =
    busyAction === null &&
    peerCount > 0 &&
    Boolean(ckbAddress) &&
    channelFundingReady &&
    channelCount === 0 &&
    !channelOpening &&
    readyChannelCount === 0;
  const canSendPayment =
    busyAction === null && readyChannelCount > 0 && peerCount > 0;
  const peerStatus = peerCount > 0
    ? 'Peer connected'
    : nodeState === 'running' && busyAction === 'prepare'
      ? 'Connecting…'
      : nodeState === 'running'
        ? 'Not connected'
        : 'Node required';
  const peerStatusTone = peerCount > 0
    ? styles.statusSuccess
    : nodeState === 'running' && busyAction === 'prepare'
      ? styles.statusWaiting
      : styles.statusIdle;
  const channelStatusTone = readyChannelCount > 0
    ? styles.statusSuccess
    : channelState === 'Open failed'
      ? styles.statusError
      : channelOpening
        ? styles.statusWaiting
        : channelState === 'Not opened'
          ? styles.statusIdle
          : styles.statusInfo;
  const paymentStatusTone = paymentStatus === 'Success'
    ? styles.statusSuccess
    : paymentStatus === 'Failed'
      ? styles.statusError
      : paymentStatus === 'Sending'
        ? styles.statusWaiting
        : paymentStatus === 'Not sent'
          ? styles.statusIdle
          : styles.statusInfo;

  return (
    <div className={styles.shell}>
      <header className={styles.tutorialToolbar}>
        <div className={styles.tutorialSelect} ref={tutorialMenuRef}>
          <button
            aria-expanded={tutorialMenuOpen}
            aria-haspopup="menu"
            className={styles.tutorialSelectButton}
            onClick={() => setTutorialMenuOpen((open) => !open)}
            type="button"
          >
            <span>Tutorial: {tutorials[currentTutorialIndex].shortTitle}</span>
            <Image
              alt=""
              aria-hidden="true"
              className={styles.selectChevron}
              height={18}
              src="/icon-chevron-down.svg"
              width={18}
            />
          </button>
          {tutorialMenuOpen && (
            <div className={styles.tutorialMenu} role="menu">
              {tutorials.map((tutorial, index) => (
                <Link
                  aria-current={
                    index === currentTutorialIndex ? 'page' : undefined
                  }
                  className={
                    index === currentTutorialIndex
                      ? styles.tutorialMenuCurrent
                      : undefined
                  }
                  href={tutorial.href}
                  key={tutorial.href}
                  onClick={() => setTutorialMenuOpen(false)}
                  role="menuitem"
                >
                  <span>{tutorial.shortTitle}</span>
                  {index === currentTutorialIndex && (
                    <Image
                      alt=""
                      aria-hidden="true"
                      height={18}
                      src="/icon-checkmark.svg"
                      width={18}
                    />
                  )}
                </Link>
              ))}
            </div>
          )}
        </div>
        <button
          className={styles.runDemoAction}
          onClick={toggleDemo}
          type="button"
        >
          {liveDemoActive ? 'View code walkthrough' : 'Try live demo'}{' '}
          <span aria-hidden="true">{liveDemoActive ? '↓' : '↑'}</span>
        </button>
        <div className={styles.toolbarActions}>
          <a download href="/downloads/fiber-channel-payment.zip">
            <Image
              alt=""
              aria-hidden="true"
              height={18}
              src="/icon-download.svg"
              width={18}
            />
            Download project
          </a>
        </div>
        <div className={styles.horizontalProgress} aria-hidden="true">
          <span
            className={styles.progressFill}
            style={{
              transform: `scaleX(${articleProgress})`,
            }}
          />
        </div>
      </header>

      <section className={styles.channelLiveDemo} ref={demoRef}>
        <div className={styles.liveDemoHeading}>
          <div>
            <span>Interactive tutorial · About 15 minutes</span>
            <h1>Open a Fiber Channel and Send a Payment</h1>
            <p>
              Fund your browser node, open a real Fiber Testnet channel, and
              send 1 CKB to a public peer. Testnet confirmations may take
              longer than the active tutorial time.
            </p>
            <p className={styles.continuationNote}>
              Need background on browser nodes? Review{' '}
              <Link href="/docs/build/connect-wasm-node">
                Connect to Fiber with a WASM Node
              </Link>
              .
            </p>
          </div>
        </div>

        <div className={styles.demoSteps}>
          {[
            ['1', 'Prepare node', 'Start and connect.'],
            ['2', 'Fund address', 'Receive Testnet CKB.'],
            ['3', 'Open channel', 'Commit the peer minimum on-chain.'],
            ['4', 'Send payment', 'Send 1 CKB to the peer.'],
          ].map(([number, title, detail]) => (
            <div key={number}>
              <span>{number}</span>
              <p><strong>{title}.</strong> {detail}</p>
            </div>
          ))}
        </div>

        <div className={styles.channelDemoSurface}>
          <div className={styles.paymentPreviewStage}>
            <div className={styles.paymentCard}>
              <div className={styles.paymentStatusGrid}>
                <div>
                  <span>Node</span>
                  <strong><i className={`${styles.statusDot} ${nodeState === 'running' ? styles.statusSuccess : styles.statusWaiting}`} />{friendlyNodeState(nodeState)}</strong>
                </div>
                <div>
                  <span>Peer</span>
                  <strong><i className={`${styles.statusDot} ${peerStatusTone}`} />{peerStatus}</strong>
                </div>
                <div>
                  <span>Channel</span>
                  <strong><i className={`${styles.statusDot} ${channelStatusTone}`} />{readyChannelCount > 0 ? 'Channel ready' : channelState}</strong>
                </div>
                <div>
                  <span>Payment</span>
                  <strong><i className={`${styles.statusDot} ${paymentStatusTone}`} />{paymentStatus === 'Success' ? 'Payment successful' : paymentStatus}</strong>
                </div>
              </div>

              <div className={styles.paymentFlow}>
                <div className={styles.paymentFlowNumber}>1</div>
                <div className={styles.paymentFlowBody}>
                  <strong>Prepare browser node</strong>
                  <span>Start locally and connect over WSS. This does not move funds.</span>
                </div>
                <button
                  className={`${styles.startButton} ${styles.demoAction} ${!nodePrepared ? styles.demoPrimaryAction : ''}`}
                  disabled={busyAction !== null || nodePrepared}
                  onClick={isolationReady === false ? () => window.location.reload() : prepareBrowserNode}
                  type="button"
                >
                  {busyAction === 'prepare' ? 'Preparing…' : isolationReady === false ? 'Reload to enable WASM' : nodePrepared ? 'Node running' : 'Prepare browser node'}
                </button>
              </div>

              <div className={styles.paymentFlow}>
                <div className={styles.paymentFlowNumber}>2</div>
                <div className={styles.paymentFlowBody}>
                  <strong>Fund the address</strong>
                  <div className={styles.addressLine}>
                    <code title={ckbAddress}>{shorten(ckbAddress)}</code>
                    <button
                      aria-label={addressCopied ? 'Funding address copied' : 'Copy funding address'}
                      className={`${styles.demoAction} ${styles.addressCopyButton}`}
                      disabled={!ckbAddress}
                      onClick={copyFundingAddress}
                      title={addressCopied ? 'Copied' : 'Copy funding address'}
                      type="button"
                    >
                      <Image
                        alt=""
                        aria-hidden="true"
                        height={15}
                        src={addressCopied ? '/icon-checkmark.svg' : '/icon-copy.svg'}
                        width={15}
                      />
                    </button>
                  </div>
                  <span>
                    Balance: <b>{formatCkb(ckbBalance)}</b> · auto-checks every 5s
                  </span>
                </div>
                <div className={styles.fundingActions}>
                  <ActionHint
                    id="funding-action-requirement"
                    label="Get CKB"
                    reason={!ckbAddress ? 'Prepare the browser node to reveal its address.' : null}
                  >
                    {!ckbAddress ? (
                      <button
                        className={`${styles.faucetButton} ${styles.demoAction}`}
                        disabled
                        type="button"
                      >
                        Get CKB ↗
                      </button>
                    ) : (
                      <a className={`${styles.faucetButton} ${styles.demoAction} ${needsFunding ? styles.demoPrimaryAction : ''}`} href="https://faucet.nervos.org" rel="noreferrer" target="_blank">Get CKB ↗</a>
                    )}
                  </ActionHint>
                  <button className={`${styles.refreshButton} ${styles.demoAction}`} disabled={!nodeInfo || busyAction !== null} onClick={handleRefresh} type="button"><RefreshIcon />{busyAction === 'refresh' ? 'Refreshing…' : 'Refresh'}</button>
                </div>
              </div>

              <div className={styles.paymentFlow}>
                <div className={styles.paymentFlowNumber}>3</div>
                <div className={styles.paymentFlowBody}>
                  <strong>
                    Open a{' '}
                    <ExplainedTerm
                      explanation="The selected public peer requires at least 499 CKB to open a channel. Keep extra Testnet CKB available for the transaction fee."
                      id="channel-minimum-funding"
                    >
                      499 CKB
                    </ExplainedTerm>{' '}
                    channel
                  </strong>
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
                <ActionHint
                  id="channel-action-requirement"
                  label="Open channel"
                  reason={channelRequirement}
                >
                  <button
                    className={`${styles.channelButton} ${styles.demoAction} ${canOpenChannel ? styles.demoPrimaryAction : ''}`}
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
                    {busyAction === 'channel' ? 'Opening…' : readyChannelCount > 0 ? 'Channel ready' : 'Open channel'}
                  </button>
                </ActionHint>
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
                  <strong>Send 1 CKB to the peer</strong>
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
                <ActionHint
                  id="payment-action-requirement"
                  label="Send payment"
                  reason={paymentRequirement}
                >
                  <button
                    className={`${styles.paymentButton} ${styles.demoAction} ${canSendPayment ? styles.demoPrimaryAction : ''}`}
                    disabled={
                      busyAction !== null ||
                      readyChannelCount === 0 ||
                      peerCount === 0
                    }
                    onClick={sendPayment}
                  >
                    {busyAction === 'payment' ? 'Sending…' : 'Send payment'}
                  </button>
                </ActionHint>
              </div>

              {paymentHash && (
                <div className={styles.paymentReceipt}>
                  <span>Payment receipt</span>
                  <dl>
                    <div><dt>Status</dt><dd>{paymentStatus}</dd></div>
                    <div><dt>Amount</dt><dd>{paymentAmount} CKB</dd></div>
                    <div><dt>Channel ID</dt><dd title={activeChannelId}>{shorten(activeChannelId)}</dd></div>
                    <div><dt>Payment hash</dt><dd title={paymentHash}>{shorten(paymentHash)}</dd></div>
                    <div><dt>Local balance</dt><dd>{formatCkb(localBalanceBefore)} → {formatCkb(localBalanceAfter)}</dd></div>
                  </dl>
                </div>
              )}

              {error && (
                <div className={styles.paymentError} role="alert">
                  {error}
                </div>
              )}
            </div>

            <div className={styles.eventPanel}>
              <div className={styles.eventPanelHeader}>
                <span>Runtime events and results</span>
                <i className={`${styles.liveDot} ${demoStatusTone}`} />
              </div>
              <div className={styles.eventList}>
                <div><time>NODE</time><code>state</code><span>{friendlyNodeState(nodeState)}</span></div>
                <div className={peerCount > 0 ? styles.eventConnected : undefined}><time>PEER</time><code>connection</code><span>{peerCount > 0 ? 'Connected' : 'Offline'}</span></div>
                {channelHistory.length === 0 && paymentLogs.length === 0 && !error && (
                  <div className={styles.eventEmpty}>
                    <span>Channel and payment events will appear here.</span>
                  </div>
                )}
                {channelHistory.map((state, index) => (
                  <div key={`${state}-event-${index}`}>
                    <time>CH {String(index + 1).padStart(2, '0')}</time>
                    <code>channel_state</code>
                    <span>{state}</span>
                  </div>
                ))}
                {paymentLogs.map((log, index) => (
                  <div key={`${log.at}-event-${index}`}>
                    <time>{log.at}</time>
                    <code>payment</code>
                    <span>{log.message}</span>
                  </div>
                ))}
                {error && (
                  <div className={styles.eventError}>
                    <time>!</time><code>error</code><span>{error}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <div aria-hidden="true" className={styles.sectionDivider} />

      <header className={styles.walkthroughHeader} ref={topRef}>
        <span>Implementation walkthrough</span>
        <h2>Behind the scenes</h2>
        <p>Follow the data and SDK calls that prepare the node, fund and open the channel, then confirm the payment.</p>
      </header>

      <section className={styles.instructionWorkspace}>
        <div className={styles.instructionGrid}>
          <div
            className={styles.article}
            onClick={(event) => {
              const section = (event.target as HTMLElement).closest<HTMLElement>('[data-tutorial-section]');
              if (section?.dataset.tutorialSection) syncToSection(section.dataset.tutorialSection);
            }}
            ref={articleRef}
          >
            <section className={styles.section} data-tutorial-section="model">
              <div className={styles.stepLabel}>Architecture</div>
              <h2>Understand the channel payment flow</h2>
              <p><code>openChannel()</code> locks a chosen amount of Testnet CKB on-chain. Once the channel is ready, <code>pay()</code> can make multiple off-chain payments without creating a new CKB transaction for every small amount.</p>
              <div className={styles.flow} aria-label="Channel payment flow">
                <div><b>Your browser node</b><span>Fiber WASM</span></div>
                <span className={styles.flowArrow}>→ Fiber channel →</span>
                <div><b>Public Fiber peer</b><span>Receives payment</span></div>
              </div>
              <div className={`${styles.note} ${styles.noteInfo}`}><strong>Testnet state is real</strong><p>Preparing the node starts it locally and connects it to the public peer. Opening the channel and sending payments are separate actions.</p></div>
              <small className={styles.fileReference}>app/pay/page.tsx · lines 39–48</small>
            </section>

            <section className={styles.section} data-tutorial-section="identity">
              <div className={styles.stepLabel}><span>1</span> Prepare the node</div>
              <h2>Start the node and derive its funding address</h2>
              <p><code>start()</code> starts the browser node and reveals the Testnet address that must be funded. It calls <code>startFiber()</code>, reads the node information, and uses <code>scriptToAddress()</code> to convert <code>default_funding_lock_script</code> into its Testnet address.</p>
              <p className={styles.followupParagraph}>The demo combines startup and <code>connectToRouter()</code> into one preparation action. The downloaded source keeps the helpers separate, so an application can expose more control when needed.</p>
              <small className={styles.fileReference}>app/pay/page.tsx · lines 23–31</small>
            </section>

            <section className={styles.section} data-tutorial-section="fund">
              <div className={styles.stepLabel}><span>2</span> Watch funding</div>
              <h2>Detect sufficient Testnet funding</h2>
              <p><code>queryCkbBalance()</code> calls CKB RPC <code>get_cells_capacity</code> to measure the address&apos;s available capacity. <code>watchCkbBalance()</code> repeats the check every five seconds while the page is visible, allowing the interface to unlock channel creation once the address can cover the funding amount.</p>
              <div className={`${styles.note} ${styles.noteWarning}`}><strong>Use Testnet funds only</strong><p>The public peer accepts CKB channels at or above 499 CKB. Keep extra Testnet CKB available for the transaction fee.</p></div>
              <small className={styles.fileReference}>lib/balance.ts · lines 7–45</small>
            </section>

            <section className={styles.section} data-tutorial-section="amounts">
              <div className={styles.stepLabel}><span>3</span> Format the amount</div>
              <h2>Convert CKB amounts without losing precision</h2>
              <p><code>ckbToHex()</code> converts the entered CKB amount into the exact hexadecimal shannon value expected by Fiber RPC. It uses <code>BigInt</code> to avoid floating-point rounding across CKB&apos;s eight decimal places.</p>
              <div className={styles.amountConversion} aria-label="499 CKB represented as shannons and hexadecimal">
                <div><span>CKB amount</span><code>499 CKB</code></div>
                <i aria-hidden="true">→</i>
                <div><span>Smallest unit</span><code>49,900,000,000 shannons</code></div>
                <i aria-hidden="true">→</i>
                <div><span>Hexadecimal RPC value</span><code>0xb9e0ab300</code></div>
              </div>
              <small className={styles.fileReference}>lib/amounts.ts · lines 1–18</small>
            </section>

            <section className={styles.section} data-tutorial-section="open">
              <div className={styles.stepLabel}><span>4</span> Commit funds</div>
              <h2>Open the channel</h2>
              <p><code>openCkbChannel()</code> begins channel negotiation with the connected public peer. It calls <code>node.openChannel()</code> with the peer pubkey, the exact funding amount, and <code>public: true</code>.</p>
              <p className={styles.followupParagraph}>Its temporary channel ID confirms negotiation started; it does not mean the channel can carry a payment yet.</p>
              <small className={styles.fileReference}>lib/channel.ts · lines 7–19</small>
            </section>

            <section className={styles.section} data-tutorial-section="ready">
              <div className={styles.stepLabel}><span>5</span> Observe confirmation</div>
              <h2>Wait for ChannelReady</h2>
              <p><code>watchChannelStates()</code> keeps payment controls locked until the funding transaction and peer handshake complete. It polls <code>listChannels()</code> and reports each new <code>state_name</code> as the channel moves through the following states:</p>
              <div className={styles.checkList}><span>NegotiatingFunding → agree on channel parameters</span><span>CollaboratingFundingTx → build the funding transaction</span><span>AwaitingChannelReady → wait for confirmation and both peers</span><span>ChannelReady → allow payments</span></div>
              <small className={styles.fileReference}>lib/channel.ts · lines 21–40</small>
            </section>

            <section className={styles.section} data-tutorial-section="pay">
              <div className={styles.stepLabel}><span>6</span> Pay and verify</div>
              <h2>Send and confirm the keysend payment</h2>
              <p><code>sendKeysend()</code> sends a direct payment without first requesting an invoice. Fiber calls this a keysend payment because it does not require the receiving peer to create an invoice. The function calls <code>sendPayment()</code> with the recipient pubkey, amount, and <code>keysend: true</code>.</p>
              <p className={styles.followupParagraph}>If the response is still in flight, <code>waitForPayment()</code> waits for <code>Success</code> or <code>Failed</code>. The demo then shows the payment hash and the channel&apos;s local balance before and after.</p>
              <small className={styles.fileReference}>lib/payment.ts · lines 4–26</small>
            </section>

            <section className={styles.section} data-tutorial-section="react">
              <div className={styles.stepLabel}><span>7</span> React integration</div>
              <h2>Wire the complete flow into React</h2>
              <p><code>PayPage()</code> turns SDK state into a guided interface. It keeps the node in a ref, renders funding and channel state from React state, and gates each state-changing button on the prerequisite it needs.</p>
              <div className={`${styles.note} ${styles.noteWarning}`}>
                <strong>Production requirements</strong>
                <p>A production product should also encrypt keys, support backup and recovery, surface fees and timeouts, and use server-side verification when payments unlock orders or access.</p>
              </div>
              <small className={styles.fileReference}>app/pay/page.tsx · lines 16–65</small>
            </section>

            <section className={styles.section} data-tutorial-section="download">
              <div className={styles.stepLabel}>Optional local setup</div>
              <h2>Run the complete project locally</h2>
              <p>Select <strong>Download project</strong> in the top-right corner, or <a className={styles.inlineDownloadLink} download href="/downloads/fiber-channel-payment.zip">download here</a>. The archive contains the Next.js application, Fiber integration, required browser headers, and the interface shown here.</p>
              <div className={styles.setupCodeBlock}><div className={styles.setupCodeHeader}><span>Terminal</span></div><pre><code>{`npm install\nnpm run dev`}</code></pre></div>
              <p className={styles.followupParagraph}>Then open <code>http://localhost:3000/pay</code> in your browser.</p>
            </section>
          </div>

          <aside className={styles.codePanel} aria-label="Tutorial project files">
          <div className={styles.fileTabs} role="tablist" aria-label="Code files">
            {codeFiles.map((file) => (
              <button
                aria-selected={file.id === activeFile}
                className={file.id === activeFile ? styles.activeTab : ''}
                key={file.id}
                onClick={() => {
                  setActiveFile(file.id);
                  setCodeFocus(null);
                }}
                role="tab"
                type="button"
              >
                {file.label}
              </button>
            ))}
          </div>
          <CodeBlock file={currentFile} focus={codeFocus} />
          <div className={styles.codeMeta}>
            <span>
              {currentFile.label} <i>{currentFile.language}</i>
            </span>
            <button
              aria-label={
                copied ? `${currentFile.label} copied` : `Copy ${currentFile.label}`
              }
              className={styles.copyButton}
              onClick={copyCode}
              type="button"
            >
              <Image
                alt=""
                aria-hidden="true"
                height={18}
                src={copied ? '/icon-checkmark.svg' : '/icon-copy.svg'}
                width={18}
              />
              {copied ? 'Copied' : 'Copy file'}
            </button>
          </div>
          </aside>
        </div>

        {articleAtBottom && (
          <nav aria-label="Tutorial navigation" className={`${styles.tutorialFooter} ${styles.walkthroughFooter}`}>
            <button onClick={() => router.push('/docs/build/connect-wasm-node')} type="button"><span aria-hidden="true">←</span> Previous</button>
            <button onClick={() => router.push('/docs/build/multi-hop-invoice')} type="button">Next <span aria-hidden="true">→</span></button>
          </nav>
        )}
      </section>
    </div>
  );
}
