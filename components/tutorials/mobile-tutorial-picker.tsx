'use client';

import Link from 'next/link';
import { useEffect, useId, useRef, useState } from 'react';
import { liveTutorials as tutorials } from './tutorial-registry';
import styles from './fiber-wasm-quickstart.module.css';

/** The shared mobile chapter picker for every live interactive tutorial. */
export function MobileTutorialPicker({ currentTutorialIndex }: { currentTutorialIndex: number }) {
  const dialogId = useId();
  const titleId = `${dialogId}-title`;
  const mobileTutorialDialogRef = useRef<HTMLDialogElement | null>(null);
  const [mobileTutorialMenuOpen, setMobileTutorialMenuOpen] = useState(false);

  useEffect(() => {
    if (!mobileTutorialMenuOpen) return;
    const dialog = mobileTutorialDialogRef.current;
    if (!dialog) return;
    const mobile = window.matchMedia('(max-width: 600px)');
    if (!mobile.matches) {
      setMobileTutorialMenuOpen(false);
      return;
    }
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialog.showModal();
    const closeOnDesktop = () => {
      if (!mobile.matches) setMobileTutorialMenuOpen(false);
    };
    mobile.addEventListener('change', closeOnDesktop);
    return () => {
      mobile.removeEventListener('change', closeOnDesktop);
      dialog.close();
      document.body.style.overflow = previousOverflow;
    };
  }, [mobileTutorialMenuOpen]);

  return (
    <>
      <button
        aria-label="Choose a tutorial"
        aria-haspopup="dialog"
        aria-expanded={mobileTutorialMenuOpen}
        aria-controls={dialogId}
        className={styles.mobileChapterButton}
        onClick={() => setMobileTutorialMenuOpen(true)}
        type="button"
      >
        <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 4.5h6a3 3 0 0 1 3 3V21a4 4 0 0 0-4-2H4zM13 7.5a3 3 0 0 1 3-3h5V19h-4a4 4 0 0 0-4 2" />
          <path d="M7 8h3M7 11h3M16 8h2M16 11h2" />
        </svg>
      </button>
      <dialog
        aria-labelledby={titleId}
        className={styles.mobileTutorialDialog}
        id={dialogId}
        onClose={() => setMobileTutorialMenuOpen(false)}
        ref={mobileTutorialDialogRef}
      >
        <header>
          <div><small>Fiber tutorials</small><h2 id={titleId}>Choose a chapter</h2></div>
          <button aria-label="Close tutorial picker" autoFocus onClick={() => setMobileTutorialMenuOpen(false)} type="button">
            <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="m6 6 12 12M18 6 6 18" /></svg>
          </button>
        </header>
        <nav aria-label="Tutorial chapters">
          {tutorials.map((tutorial, index) => <Link
            aria-current={index === currentTutorialIndex ? 'page' : undefined}
            href={tutorial.href}
            key={tutorial.href}
            onClick={() => setMobileTutorialMenuOpen(false)}
          >
            <span className={styles.mobileChapterNumber}>{String(index + 1).padStart(2, '0')}</span>
            <span><strong>{tutorial.shortTitle}</strong><small>{tutorial.level} · {tutorial.duration}{index === currentTutorialIndex ? ' · Current chapter' : ''}</small></span>
            <span aria-hidden="true">{index === currentTutorialIndex ? '✓' : '→'}</span>
          </Link>)}
        </nav>
      </dialog>
    </>
  );
}
