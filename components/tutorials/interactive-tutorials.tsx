import styles from './interactive-tutorials.module.css';

const tutorials = [
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
          <div className={styles.meta}>
            <span className={styles.level}>{tutorial.level}</span>
            <span className={styles.duration}>◷ {tutorial.duration}</span>
          </div>
          <h2>{tutorial.title}</h2>
          <p>{tutorial.description}</p>
          <div className={styles.tags}>
            {tutorial.tags.map((tag) => (
              <span key={tag}>{tag}</span>
            ))}
          </div>
          <div className={styles.open}>Open playground <span>↗</span></div>
        </a>
      ))}
    </div>
  );
}
