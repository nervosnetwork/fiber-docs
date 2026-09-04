'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
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
const sdkInstallCommand = 'npm install @fiber-pay/sdk';

const tutorials = [
  {
    title: 'Connect to Fiber with a WASM Node',
    shortTitle: 'Connect a WASM node',
    href: '/docs/build/connect-wasm-node',
  },
  {
    title: 'Open a Fiber Channel and Send a Payment',
    shortTitle: 'Open a channel and send a payment',
    href: '/docs/build/open-channel-payment',
  },
  {
    title: 'Send a Multi-Hop Invoice Payment',
    shortTitle: 'Send a multi-hop invoice payment',
    href: '/docs/build/multi-hop-invoice',
  },
  {
    title: 'Open a Unidirectional Fiber Channel',
    shortTitle: 'Open a unidirectional channel',
    href: '/docs/build/unidirectional-channel',
  },
  { title: 'Build a Conditional Payment with a Hold Invoice', shortTitle: 'Build a Hold Invoice payment', href: '/docs/build/hold-invoice' },
  { title: 'Pay with RUSD over Fiber', shortTitle: 'Pay with RUSD', href: '/docs/build/rusd-payment' },
  { title: 'Close a Fiber Channel and Recover Funds', shortTitle: 'Close a channel and recover funds', href: '/docs/build/close-channel' },
] as const;

const currentTutorialIndex = tutorials.findIndex(
  (tutorial) => tutorial.href === '/docs/build/connect-wasm-node',
);
const previousTutorial = tutorials[currentTutorialIndex - 1] ?? {
  title: 'Interactive Tutorials',
  shortTitle: 'Interactive tutorials',
  href: '/docs/build/interactive-tutorials',
};
const nextTutorial = tutorials[currentTutorialIndex + 1];

type CodeFile = {
  id: 'headers' | 'fiber' | 'app';
  label: string;
  language: string;
  code: string;
};

const codeFiles: CodeFile[] = [
  {
    id: 'headers',
    label: 'next.config.mjs',
    language: 'javascript',
    code: `/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: [
    '@fiber-pay/sdk',
    '@nervosnetwork/fiber-js',
  ],
  async headers() {
    return [{
      source: '/fiber',
      headers: [
        {
          key: 'Cross-Origin-Opener-Policy',
          value: 'same-origin',
        },
        {
          key: 'Cross-Origin-Embedder-Policy',
          value: 'require-corp',
        },
      ],
    }];
  },
};

export default nextConfig;`,
  },
  {
    id: 'fiber',
    label: 'lib/fiber.ts',
    language: 'typescript',
    code: `import type {
  BrowserNodeState,
  FiberBrowserNode,
} from '@fiber-pay/sdk/browser';

export const router =
  '/dns4/bottle.fiber.channel/tcp/443/wss/p2p/' +
  'QmXen3eUHhywmutEzydCsW4hXBoeVmdET2FJvMX69XJ1Eo';

export const routerPubkey =
  '0x02b6d4e3ab86a2ca2fad6fae0ecb2e1e559e0b911939872a90abdda6d20302be71';

function randomKey() {
  return crypto.getRandomValues(new Uint8Array(32));
}

export async function startFiber(
  onState: (state: BrowserNodeState) => void,
): Promise<FiberBrowserNode> {
  if (!crossOriginIsolated) {
    throw new Error('This page must be cross-origin isolated.');
  }

  const {
    FiberBrowserNode,
    RawKeyCredentialProvider,
  } = await import('@fiber-pay/sdk/browser');

  // Testnet quickstart: persist these keys in encrypted
  // application storage before using this in production.
  const credential = new RawKeyCredentialProvider(
    randomKey(),
    randomKey(),
    crypto.randomUUID(),
  );

  const node = new FiberBrowserNode({
    network: 'testnet',
    credential,
    nodeConfig: {
      bootnodes: [],
      logLevel: 'info',
    },
  });

  node.on('stateChange', onState);
  await node.start();
  return node;
}

export async function connectToRouter(node: FiberBrowserNode) {
  await node.connectPeer({
    address: router,
    pubkey: routerPubkey,
  });
}`,
  },
  {
    id: 'app',
    label: 'app/fiber/page.tsx',
    language: 'tsx',
    code: `'use client';

import { useRef, useState } from 'react';
import type { FiberBrowserNode } from '@fiber-pay/sdk/browser';
import { connectToRouter, startFiber } from '@/lib/fiber';

export default function FiberPage() {
  const node = useRef<FiberBrowserNode | null>(null);
  const [status, setStatus] = useState('idle');
  const [pubkey, setPubkey] = useState('');
  const [peers, setPeers] = useState(0);

  async function start() {
    const fiber = await startFiber(setStatus);
    node.current = fiber;
    const info = await fiber.getNodeInfo();
    setPubkey(info.pubkey);
  }

  async function connect() {
    if (!node.current) return;
    await connectToRouter(node.current);
    const peerList = await node.current.listPeers();
    setPeers(peerList.peers.length);
  }

  return (
    <main>
      <p>Fiber WASM · {status}</p>
      <h1>Your Fiber node, inside React.</h1>
      <button onClick={start}>Start node</button>
      <button disabled={!node.current} onClick={connect}>
        Connect peer
      </button>
      {pubkey && <code>{pubkey}</code>}
      <p>{peers} connected peers</p>
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
  isolate: { file: 'headers', start: 1, end: 24 },
  start: { file: 'fiber', start: 17, end: 49 },
  'connect-helper': { file: 'fiber', start: 51, end: 56 },
  'react-store': { file: 'app', start: 7, end: 11 },
  'react-start': { file: 'app', start: 13, end: 18 },
  'react-connect': { file: 'app', start: 20, end: 25 },
  'react-render': { file: 'app', start: 27, end: 39 },
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

function shorten(value?: string) {
  if (!value) return 'Waiting for node';
  return `${value.slice(0, 12)}…${value.slice(-8)}`;
}

function friendlyState(state: BrowserNodeState) {
  if (state === 'running') return 'Node running';
  if (state === 'starting') return 'Starting WASM';
  if (state === 'stopping') return 'Stopping';
  if (state === 'error') return 'Connection issue';
  return 'Ready to start';
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

export function FiberWasmQuickstart() {
  const router = useRouter();
  const nodeRef = useRef<FiberBrowserNode | null>(null);
  const topRef = useRef<HTMLElement | null>(null);
  const demoRef = useRef<HTMLElement | null>(null);
  const articleRef = useRef<HTMLDivElement | null>(null);
  const tutorialMenuRef = useRef<HTMLDivElement | null>(null);
  const [activeSection, setActiveSection] = useState('architecture');
  const [articleProgress, setArticleProgress] = useState(0);
  const [articleAtBottom, setArticleAtBottom] = useState(false);
  const [tutorialMenuOpen, setTutorialMenuOpen] = useState(false);
  const [liveDemoActive, setLiveDemoActive] = useState(false);
  const [activeFile, setActiveFile] = useState<CodeFile['id']>('app');
  const [codeFocus, setCodeFocus] = useState<CodeFocus | null>(null);
  const [nodeState, setNodeState] = useState<BrowserNodeState>('idle');
  const [nodeInfo, setNodeInfo] = useState<NodeInfoResult | null>(null);
  const [peerCount, setPeerCount] = useState(0);
  const [busyAction, setBusyAction] = useState<'start' | 'connect' | null>(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [sdkCommandCopied, setSdkCommandCopied] = useState(false);
  const [isolationReady, setIsolationReady] = useState<boolean | null>(null);

  const currentFile =
    codeFiles.find((file) => file.id === activeFile) ?? codeFiles[0];
  const nodeStatusTone = error
    ? styles.statusError
    : nodeState === 'running'
      ? styles.statusSuccess
      : styles.statusWaiting;
  const demoStatusTone = error
    ? styles.statusError
    : peerCount > 0
      ? styles.statusSuccess
      : styles.statusWaiting;

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
      const distanceFromBottom = Math.max(
        0,
        maxScroll - article.scrollTop,
      );
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
    articleRef.current
      ?.querySelectorAll<HTMLElement>('[data-tutorial-section]')
      .forEach((section) => {
        section.dataset.active = String(
          section.dataset.tutorialSection === activeSection,
        );
      });
  }, [activeSection]);

  const logs = useMemo(() => {
    if (error) {
      return [
        ['WASM runtime', nodeState === 'running' ? 'Running' : 'Stopped'],
        ['Public peer', 'Not connected'],
        ['Message', error],
      ];
    }

    if (nodeInfo) {
      return [
        ['WASM runtime', 'Running'],
        [
          'Public peer',
          peerCount > 0
            ? `${peerCount} connected`
            : busyAction === 'connect'
              ? 'Connecting'
              : 'Not connected',
        ],
        ['Network', 'Fiber Testnet'],
      ];
    }

    return [
      ['Runtime', 'Fiber WASM'],
      ['Storage', 'IndexedDB'],
      ['Transport', 'WSS'],
    ];
  }, [busyAction, error, nodeInfo, nodeState, peerCount]);

  const startNode = useCallback(async () => {
    if (busyAction || nodeRef.current) return;
    setBusyAction('start');
    setError('');
    setPeerCount(0);

    try {
      if (!window.crossOriginIsolated) {
        throw new Error('Cross-origin isolation is not enabled for this page.');
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
        nodeConfig: {
          bootnodes: [],
          logLevel: 'info',
        },
      });

      node.on('stateChange', (state) => setNodeState(state));
      node.on('error', (nodeError) => setError(nodeError.message));
      nodeRef.current = node;

      const info = await node.start();
      setNodeInfo(info);
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
  }, [busyAction]);

  const connectPublicPeer = useCallback(async () => {
    const node = nodeRef.current;
    if (busyAction || !node?.isRunning || peerCount > 0) return;
    setBusyAction('connect');
    setError('');

    try {
      await node.connectPeer({
        address: routerAddress,
        pubkey: routerPubkey,
      });

      let peers = (await node.listPeers()).peers;
      for (let attempt = 0; peers.length === 0 && attempt < 10; attempt += 1) {
        await new Promise((resolve) => window.setTimeout(resolve, 800));
        peers = (await node.listPeers()).peers;
      }

      if (peers.length === 0) {
        throw new Error('The node is running, but the peer handshake timed out.');
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

  const copyCode = useCallback(async () => {
    await navigator.clipboard.writeText(currentFile.code);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1_500);
  }, [currentFile]);

  const copySdkInstallCommand = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(sdkInstallCommand);
      setSdkCommandCopied(true);
      window.setTimeout(() => setSdkCommandCopied(false), 1_500);
    } catch {
      setError('Unable to copy the SDK installation command.');
    }
  }, []);

  const toggleDemo = useCallback(() => {
    const target = liveDemoActive ? topRef.current : demoRef.current;
    target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [liveDemoActive]);

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
            <a download href="/downloads/fiber-connect-wasm-node.zip">
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

      <section className={styles.liveDemo} ref={demoRef}>
        <div className={styles.liveDemoHeading}>
          <div>
            <span>Interactive tutorial · About 15 minutes</span>
            <h1>Run a Fiber WASM Node in Your Browser</h1>
            <p>
              Start a real Fiber node in this page, connect it to a public Fiber
              Testnet peer, and inspect its runtime state. No installation,
              wallet, Testnet funds, or backend is required.
            </p>
          </div>
        </div>

        <div className={styles.demoSteps}>
          <div>
            <span>1</span>
            <p>
              <strong>Start your browser node.</strong> Select{' '}
              <b>Start WASM node</b>, then wait for <b>Node running</b> and a
              public key. The node starts locally and remains disconnected.
            </p>
          </div>
          <div>
            <span>2</span>
            <p>
              <strong>Connect to Fiber Testnet.</strong> Select{' '}
              <b>Connect public peer</b>, then wait for the public-peer status to
              show a successful connection.
            </p>
          </div>
        </div>

        <div className={styles.liveDemoGrid}>
          <div className={styles.nodeCard}>
            <div className={styles.nodeCardTop}>
              <div className={styles.nodeMark}>F</div>
              <div>
                <span>Your browser node</span>
                <strong>{friendlyState(nodeState)}</strong>
              </div>
              <i
                className={`${styles.statusDot} ${nodeStatusTone}`}
              />
            </div>
            <div className={styles.nodeIdentity}>
              <span>Node pubkey</span>
              <code>{shorten(nodeInfo?.pubkey)}</code>
            </div>
            <div className={styles.nodeStats}>
              {logs.map(([label, value]) => (
                <div key={label}>
                  <span>{label}</span>
                  <strong title={value}>{value}</strong>
                </div>
              ))}
            </div>
            <div className={styles.nodeActions}>
              <button
                className={styles.startButton}
                disabled={busyAction !== null || Boolean(nodeInfo)}
                onClick={
                  isolationReady === false
                    ? () => window.location.reload()
                    : startNode
                }
                type="button"
              >
                {busyAction === 'start'
                  ? 'Starting Fiber…'
                  : nodeInfo
                    ? 'Node running'
                    : isolationReady === false
                      ? 'Reload to enable WASM'
                      : 'Start WASM node'}
                <span>→</span>
              </button>
              <button
                className={styles.connectButton}
                disabled={busyAction !== null || !nodeInfo || peerCount > 0}
                onClick={connectPublicPeer}
                type="button"
              >
                {busyAction === 'connect'
                  ? 'Connecting…'
                  : peerCount > 0
                    ? `${peerCount} peer connected`
                    : 'Connect public peer'}
                <span>→</span>
              </button>
            </div>
          </div>

          <div className={styles.eventPanel}>
            <div className={styles.eventPanelHeader}>
              <span>Node events</span>
              <i className={`${styles.liveDot} ${demoStatusTone}`} />
            </div>
            <div className={styles.eventList}>
              <div><time>01</time><code>wasm_runtime</code><span>{isolationReady ? 'ready' : 'checking'}</span></div>
              <div><time>02</time><code>node_state</code><span>{friendlyState(nodeState)}</span></div>
              {nodeInfo && <div><time>03</time><code>node_started</code><span>{shorten(nodeInfo.pubkey)}</span></div>}
              {peerCount > 0 && (
                <div className={styles.eventConnected}>
                  <time>04</time>
                  <code>peer_connected</code>
                  <span>{peerCount} public peer</span>
                </div>
              )}
              {error && <div className={styles.eventError}><time>!</time><code>error</code><span>{error}</span></div>}
            </div>
          </div>
        </div>

      </section>

      <div aria-hidden="true" className={styles.sectionDivider} />

      <header className={styles.walkthroughHeader} ref={topRef}>
        <span>Implementation walkthrough</span>
        <h2>Behind the scenes</h2>
        <p>
          See how the browser runs the node, why it needs browser isolation,
          and which Fiber SDK APIs power each action in the demo.
        </p>
      </header>

      <section className={styles.instructionWorkspace}>
        <div className={styles.instructionGrid}>
          <div
            className={styles.article}
            onClick={(event) => {
              const section = (event.target as HTMLElement).closest<HTMLElement>(
                '[data-tutorial-section]',
              );
              if (section?.dataset.tutorialSection) {
                syncToSection(section.dataset.tutorialSection);
              }
            }}
            ref={articleRef}
          >
            <section
              className={styles.section}
              data-tutorial-section="architecture"
            >
              <div className={styles.stepLabel}>Architecture</div>
              <h2>How the browser node works</h2>
              <p>
                The page starts the WebAssembly version of Fiber in{' '}
                <ExplainedTerm
                  explanation="Background browser execution contexts that keep the node runtime from blocking the page interface."
                  id="worker-definition"
                >
                  Web Workers
                </ExplainedTerm>
                . The workers exchange data through{' '}
                <ExplainedTerm
                  explanation="A block of memory that multiple workers can access to coordinate their work."
                  id="shared-array-buffer-definition"
                >
                  SharedArrayBuffer
                </ExplainedTerm>
                , while{' '}
                <ExplainedTerm
                  explanation="Browser storage used to keep the node's local data."
                  id="indexed-db-definition"
                >
                  IndexedDB
                </ExplainedTerm>{' '}
                stores local node data. The node reaches the public Fiber peer
                over{' '}
                <ExplainedTerm
                  explanation="WebSocket Secure: an encrypted, persistent, two-way connection supported by browsers."
                  id="wss-definition"
                >
                  WSS
                </ExplainedTerm>
                .
              </p>
              <div className={styles.flow} aria-label="Browser to Fiber network flow">
                <div>
                  <b>Browser application</b>
                  <span>React + Fiber WASM + IndexedDB</span>
                </div>
                <span className={styles.flowArrow}>→ WSS →</span>
                <div>
                  <b>Public Fiber peer</b>
                  <span>Testnet network</span>
                </div>
              </div>
              <p className={styles.followupParagraph}>
                <code>@fiber-pay/sdk</code> provides the browser-facing APIs used
                here to create the node, manage its identity, observe its state,
                and connect it to peers. Install it in an existing TypeScript or
                JavaScript project with:
              </p>
              <div className={styles.setupCodeBlock}>
                <div className={styles.setupCodeHeader}>
                  <span>Terminal</span>
                  <button
                    aria-label={
                      sdkCommandCopied
                        ? 'SDK installation command copied'
                        : 'Copy SDK installation command'
                    }
                    onClick={copySdkInstallCommand}
                    type="button"
                  >
                    <Image
                      alt=""
                      aria-hidden="true"
                      height={18}
                      src={
                        sdkCommandCopied
                          ? '/icon-checkmark.svg'
                          : '/icon-copy.svg'
                      }
                      width={18}
                    />
                    {sdkCommandCopied ? 'Copied' : 'Copy'}
                  </button>
                </div>
                <pre><code>{sdkInstallCommand}</code></pre>
              </div>
            </section>

            <section className={styles.section} data-tutorial-section="isolate">
              <div className={styles.stepLabel}>Browser requirement</div>
              <h2>Why the page needs COOP and COEP</h2>
              <p>
                Browsers restrict shared memory to pages that opt into
                cross-origin isolation. This example enables it with two response
                headers:{' '}
                <ExplainedTerm
                  explanation="Cross-Origin-Opener-Policy separates this page from windows opened from other origins."
                  id="coop-definition"
                >
                  COOP
                </ExplainedTerm>{' '}
                and{' '}
                <ExplainedTerm
                  explanation="Cross-Origin-Embedder-Policy permits only cross-origin resources that explicitly allow the page to load them."
                  id="coep-definition"
                >
                  COEP
                </ExplainedTerm>
                .
              </p>
              <p className={styles.followupParagraph}>
                Together, these headers make{' '}
                <code>window.crossOriginIsolated</code> return <code>true</code>,
                allowing Fiber WASM to use <code>SharedArrayBuffer</code>.
              </p>
              <div className={styles.checkList}>
                <span>Cross-Origin-Opener-Policy: same-origin</span>
                <span>Cross-Origin-Embedder-Policy: require-corp</span>
              </div>
              <div className={`${styles.note} ${styles.noteInfo}`}>
                <strong>The live demo is already configured</strong>
                <p>
                  You only need to add these headers when running the project on
                  your own server.
                </p>
              </div>
              <small className={styles.fileReference}>next.config.mjs · lines 1–24</small>
            </section>

            <section className={styles.section} data-tutorial-section="start">
              <div className={styles.stepLabel}>
                <span>1</span> Code walkthrough
              </div>
              <h2>Start the node without connecting</h2>
              <p>
                Before creating the node, verify that{' '}
                <code>crossOriginIsolated</code> is enabled. Then create a
                credential and initialize a Fiber Testnet node with an empty{' '}
                <code>bootnodes</code> list so it starts without connecting to a
                peer. Register the <code>stateChange</code> listener before calling{' '}
                <code>node.start()</code> to receive startup updates.
              </p>
              <div className={`${styles.note} ${styles.noteWarning}`}>
                <strong>Testnet only</strong>
                <p>
                  The generated credentials are intended for Testnet development
                  only. Production applications must store private keys in
                  encrypted storage and provide backup, account-switching, and
                  recovery mechanisms.
                </p>
              </div>
              <small className={styles.fileReference}>lib/fiber.ts · lines 17–49</small>
            </section>

            <section
              className={styles.section}
              data-tutorial-section="connect-helper"
            >
              <div className={styles.stepLabel}>
                <span>2</span> Code walkthrough
              </div>
              <h2>Connect the node to a public peer</h2>
              <p>
                The browser node needs both an address and a pubkey to make its
                first connection. The <code>address</code> tells it how to reach the
                public Fiber Testnet peer over WSS; the <code>pubkey</code>{' '}
                identifies the Fiber node it expects to reach.
              </p>
              <div className={styles.peerConnectionInputs}>
                <div className={styles.connectionInput}>
                  <div className={styles.connectionInputHeader}>
                    <code>address</code>
                    <span>Browser route</span>
                  </div>
                  <code className={styles.connectionValue}>{routerAddress}</code>
                  <div
                    aria-label="Address structure"
                    className={styles.addressPartsGrid}
                  >
                    <div className={styles.addressPart}>
                      <code>/dns4/bottle.fiber.channel</code>
                      <span className={styles.codeComment}>// DNS host</span>
                    </div>
                    <div className={styles.addressPart}>
                      <code>/tcp/443</code>
                      <span className={styles.codeComment}>// TCP port</span>
                    </div>
                    <div className={styles.addressPart}>
                      <code>/wss</code>
                      <span className={styles.codeComment}>
                        // encrypted WebSocket
                      </span>
                    </div>
                    <div className={styles.addressPart}>
                      <code>/p2p/Qm...</code>
                      <span className={styles.codeComment}>// libp2p peer ID</span>
                    </div>
                  </div>
                </div>
                <div className={styles.connectionInput}>
                  <div className={styles.connectionInputHeader}>
                    <code>pubkey</code>
                    <span>Fiber identity</span>
                  </div>
                  <code className={styles.connectionValue}>{routerPubkey}</code>
                  <span className={styles.codeComment}>
                    // Hex-encoded secp256k1 Fiber node public key
                  </span>
                </div>
              </div>
              <p className={styles.followupParagraph}>
                <code>connectToRouter(node)</code> passes both values to{' '}
                <code>node.connectPeer({'{ address, pubkey }'})</code>, allowing
                the first connection to use the explicit WSS route without
                depending on graph synchronization.
              </p>
              <small className={styles.fileReference}>lib/fiber.ts · lines 51–56</small>
            </section>

            <section
              className={styles.section}
              data-tutorial-section="react-store"
            >
              <div className={styles.stepLabel}>
                <span>3.1</span> React integration
              </div>
              <h2>Keep the node between renders</h2>
              <p>
                <code>useRef()</code> keeps one node instance available across
                React renders without triggering extra renders. React state stores
                the status, public key, and peer count displayed by the interface.
              </p>
              <small className={styles.fileReference}>app/fiber/page.tsx · lines 7–11</small>
            </section>

            <section
              className={styles.section}
              data-tutorial-section="react-start"
            >
              <div className={styles.stepLabel}>
                <span>3.2</span> React integration
              </div>
              <h2>Start the WASM node</h2>
              <p>
                <code>start()</code> calls <code>startFiber()</code>, saves the
                returned node in a React ref, then calls{' '}
                <code>getNodeInfo()</code> and stores the public key in React
                state. It does not connect to a peer.
              </p>
              <small className={styles.fileReference}>app/fiber/page.tsx · lines 13–18</small>
            </section>

            <section
              className={styles.section}
              data-tutorial-section="react-connect"
            >
              <div className={styles.stepLabel}>
                <span>3.3</span> React integration
              </div>
              <h2>Connect the running node to Testnet</h2>
              <p>
                <code>connect()</code> calls <code>connectToRouter()</code>, then
                calls <code>listPeers()</code> and stores the connected-peer count
                in React state so the interface can confirm the connection.
              </p>
              <small className={styles.fileReference}>app/fiber/page.tsx · lines 20–25</small>
            </section>

            <section
              className={styles.section}
              data-tutorial-section="react-render"
            >
              <div className={styles.stepLabel}>
                <span>3.4</span> React integration
              </div>
              <h2>Show the result</h2>
              <p>
                <code>FiberPage()</code> gives users visible confirmation of each
                operation. It binds the handlers to separate buttons and displays
                the node status, public key, and peer count.
              </p>
              <small className={styles.fileReference}>app/fiber/page.tsx · lines 27–39</small>
            </section>

            <section className={styles.section} data-tutorial-section="download">
              <div className={styles.stepLabel}>Optional local setup</div>
              <h2>Run the complete project locally</h2>
              <p>
                Select <strong>Download project</strong> in the top-right
                corner, or{' '}
                <a
                  className={styles.inlineDownloadLink}
                  download
                  href="/downloads/fiber-connect-wasm-node.zip"
                >
                  download here
                </a>
                . The archive already contains the Next.js application, Fiber
                integration, browser headers, and interface shown here. After
                extracting it, open the project directory and run:
              </p>
              <div className={styles.setupCodeBlock}>
                <div className={styles.setupCodeHeader}><span>Terminal</span></div>
                <pre><code>{`npm install
npm run dev`}</code></pre>
              </div>
              <p className={styles.followupParagraph}>
                Then open <code>http://localhost:3000/fiber</code> in your
                browser.
              </p>
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
          <nav
            aria-label="Tutorial navigation"
            className={`${styles.tutorialFooter} ${styles.walkthroughFooter}`}
          >
            <button
              onClick={() => router.push(previousTutorial.href)}
              type="button"
            >
              <span aria-hidden="true">←</span> Previous
            </button>
            <button
              disabled={!nextTutorial}
              onClick={() => nextTutorial && router.push(nextTutorial.href)}
              type="button"
            >
              Next <span aria-hidden="true">→</span>
            </button>
          </nav>
        )}
      </section>
    </div>
  );
}
