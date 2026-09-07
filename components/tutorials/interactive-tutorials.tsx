import Link from 'next/link';
import styles from './interactive-tutorials.module.css';
import {
  conceptTutorials,
  liveTutorials,
  type Tutorial,
  type TutorialLevel,
} from './tutorial-registry';

const levelClassNames: Record<TutorialLevel, string> = {
  Beginner: styles.levelBeginner,
  Intermediate: styles.levelIntermediate,
  Hard: styles.levelHard,
};

function TutorialCard({ tutorial, concept = false }: { tutorial: Tutorial; concept?: boolean }) {
  const content = (
    <>
      <span aria-hidden="true" className={styles.externalArrow}>
        {concept ? '→' : '↗'}
      </span>
      <div className={styles.meta}>
        <span className={`${styles.level} ${levelClassNames[tutorial.level]}`}>
          {tutorial.level}
        </span>
        <span className={styles.mode}>{tutorial.mode}</span>
        <span className={styles.duration}>◷ {tutorial.duration}</span>
      </div>
      <h3>{tutorial.title}</h3>
      <p>{tutorial.description}</p>
      <div className={styles.tags}>
        {tutorial.tags.map((tag) => (
          <span key={tag}>{tag}</span>
        ))}
      </div>
    </>
  );

  if (concept) {
    return (
      <Link className={`${styles.card} ${styles.conceptCard}`} href={tutorial.href}>
        {content}
      </Link>
    );
  }

  return (
    <a className={styles.card} href={tutorial.href} rel="noreferrer" target="_blank">
      {content}
    </a>
  );
}

export function InteractiveTutorials() {
  return (
    <div className={styles.catalog}>
      <section className={styles.group}>
        <div className={styles.groupHeading}>
          <span>Live Testnet projects</span>
          <div>
            <h2>Build with real Fiber nodes</h2>
            <p>Run browser nodes, fund Testnet channels, and inspect real payment state.</p>
          </div>
        </div>
        <div className={styles.grid}>
          {liveTutorials.map((tutorial) => (
            <TutorialCard key={tutorial.href} tutorial={tutorial} />
          ))}
        </div>
      </section>

      <section className={styles.group}>
        <div className={styles.groupHeading}>
          <span>Concept labs</span>
          <div>
            <h2>See liquidity move before writing code</h2>
            <p>Short, deterministic simulations for the mental models behind reliable Fiber payments.</p>
          </div>
        </div>
        <div className={styles.grid}>
          {conceptTutorials.map((tutorial) => (
            <TutorialCard concept key={tutorial.href} tutorial={tutorial} />
          ))}
        </div>
      </section>
    </div>
  );
}
