'use client';

import Link from 'next/link';
import { useState } from 'react';
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

const difficultyOptions = ['All', 'Beginner', 'Intermediate', 'Hard'] as const;

function TutorialCard({ tutorial, concept = false }: { tutorial: Tutorial; concept?: boolean }) {
  const content = (
    <>
      <div className={styles.meta}>
        <span className={`${styles.level} ${levelClassNames[tutorial.level]}`}>
          {tutorial.level}
        </span>
        {concept && <span className={styles.mode}>{tutorial.mode}</span>}
        <span className={styles.duration}>
          <svg aria-hidden="true" focusable="false" width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round">
            <circle cx="7" cy="7" r="5.75" />
            <path d="M7 3.75V7h2.75" />
          </svg>
          {tutorial.duration}
        </span>
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
  const [level, setLevel] = useState<TutorialLevel | 'All'>('All');
  const tutorials = liveTutorials.filter((tutorial) => level === 'All' || tutorial.level === level);

  return (
    <div className={`${styles.catalog} ${styles.liveCatalog}`}>
      <section className={styles.group} aria-label="Tutorial catalog">
        <div className={styles.difficultyFilter} role="group" aria-label="Difficulty">
          <span aria-hidden="true">Difficulty:</span>
          <div className={styles.difficultyOptions}>
            {difficultyOptions.map((value) => (
              <button
                key={value}
                type="button"
                aria-pressed={level === value}
                onClick={() => setLevel(value)}
              >
                {value}
              </button>
            ))}
          </div>
        </div>
        <div className={styles.grid}>
          {tutorials.map((tutorial) => (
            <TutorialCard key={tutorial.href} tutorial={tutorial} />
          ))}
        </div>
      </section>
    </div>
  );
}

function ConceptLabsGroup() {
  return (
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
  );
}

export function LiquidityConceptLabs() {
  return (
    <div className={styles.catalog}>
      <ConceptLabsGroup />
    </div>
  );
}
