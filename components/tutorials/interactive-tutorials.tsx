import styles from './interactive-tutorials.module.css';

type TutorialLevel = 'Beginner' | 'Intermediate' | 'Hard';

type Tutorial = {
  level: TutorialLevel;
  duration: string;
  title: string;
  description: string;
  tags: string[];
  href: string;
};

const levelClassNames: Record<TutorialLevel, string> = {
  Beginner: styles.levelBeginner,
  Intermediate: styles.levelIntermediate,
  Hard: styles.levelHard,
};

const tutorials: Tutorial[] = [
  {
    level: 'Beginner',
    duration: '~10 min',
    title: 'Connect to Fiber with a WASM Node',
    description:
      'Start a browser-based Fiber node, create a Testnet identity, and connect to a public peer.',
    tags: ['React', 'WASM', 'WebSocket'],
    href: '/docs/build/connect-wasm-node',
  },
  {
    level: 'Intermediate',
    duration: '~15 min',
    title: 'Open a Fiber Channel and Send a Payment',
    description:
      'Fund a Testnet channel and send your first off-chain payment through the Fiber network.',
    tags: ['Channels', 'Payments', 'Fiber SDK'],
    href: '/docs/build/open-channel-payment',
  },
  {
    level: 'Hard',
    duration: '~25 min',
    title: 'Send a Multi-Hop Invoice Payment',
    description:
      'Copy an invoice between two browser nodes and pay it through one public Fiber intermediary.',
    tags: ['Invoice', 'Multi-hop', 'WASM'],
    href: '/docs/build/multi-hop-invoice',
  },
  {
    level: 'Intermediate',
    duration: '~20 min',
    title: 'Open a Unidirectional Fiber Channel',
    description:
      'Open a private one-way channel, inspect the payer and acceptor roles, and send a forward payment.',
    tags: ['One-way', 'Channels', 'Keysend'],
    href: '/docs/build/unidirectional-channel',
  },
  {
    level: 'Hard',
    duration: '~30 min',
    title: 'Build a Conditional Payment with a Hold Invoice',
    description:
      'Hold a multi-hop Invoice at the receiver, then explicitly settle or cancel it.',
    tags: ['Hold Invoice', 'Conditional', 'Multi-hop'],
    href: '/docs/build/hold-invoice',
  },
  {
    level: 'Intermediate',
    duration: '~20 min',
    title: 'Stream Payments over a One-Way Channel',
    description:
      'Send a controlled sequence of small payments through one reusable channel.',
    tags: ['Streaming', 'One-way', 'Keysend'],
    href: '/docs/build/streaming-payments',
  },
  {
    level: 'Hard',
    duration: '~25 min',
    title: 'Pay with RUSD over Fiber',
    description:
      'Fund a Testnet RUSD channel, inspect token liquidity, and send a stablecoin payment.',
    tags: ['RUSD', 'UDT', 'Stablecoin'],
    href: '/docs/build/rusd-payment',
  },
  {
    level: 'Intermediate',
    duration: '~20 min',
    title: 'Close a Fiber Channel and Recover Funds',
    description:
      'Cooperatively close a channel and follow its final balance back on-chain.',
    tags: ['Shutdown', 'Recovery', 'Lifecycle'],
    href: '/docs/build/close-channel',
  },
];

export function InteractiveTutorials() {
  return (
    <div className={styles.grid}>
      {tutorials.map((tutorial) => (
        <a
          className={styles.card}
          href={tutorial.href}
          key={tutorial.href}
          rel="noreferrer"
          target="_blank"
        >
          <span aria-hidden="true" className={styles.externalArrow}>
            ↗
          </span>
          <div className={styles.meta}>
            <span className={`${styles.level} ${levelClassNames[tutorial.level]}`}>
              {tutorial.level}
            </span>
            <span className={styles.duration}>◷ {tutorial.duration}</span>
          </div>
          <h2>{tutorial.title}</h2>
          <p>{tutorial.description}</p>
          <div className={styles.tags}>
            {tutorial.tags.map((tag) => (
              <span key={tag}>{tag}</span>
            ))}
          </div>
        </a>
      ))}
    </div>
  );
}
