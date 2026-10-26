'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import styles from './fiber-wasm-quickstart.module.css';

export function CopyValue({ value, label = 'Copy', iconOnly = false }: { value: string; label?: string; iconOnly?: boolean }) {
  const [feedback, setFeedback] = useState<'idle' | 'copied' | 'failed'>('idle');
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (resetTimer.current) clearTimeout(resetTimer.current);
  }, []);
  return (
    <span className={styles.multiHopCopy} data-icon-only={iconOnly}>
      <button
        aria-label={label}
        className={iconOnly ? `${styles.demoAction} ${styles.addressCopyButton}` : undefined}
        data-copied={feedback === 'copied'}
        disabled={!value}
        onClick={async () => {
          if (resetTimer.current) clearTimeout(resetTimer.current);
          setFeedback('idle');
          try {
            await navigator.clipboard.writeText(value);
            setFeedback('copied');
            resetTimer.current = setTimeout(() => setFeedback('idle'), 3_000);
          } catch {
            setFeedback('failed');
          }
        }}
        type="button"
      >
        {iconOnly ? <Image alt="" aria-hidden="true" height={15} src="/icon-copy.svg" width={15} /> : feedback === 'copied' ? '✓ Copied' : label}
      </button>
      <span className={styles.multiHopCopyFeedback} data-error={feedback === 'failed'} role="status">
        {feedback === 'copied' ? `${label === 'Copy' ? 'Value' : label.slice(5)} copied to clipboard` : feedback === 'failed' ? 'Copy failed. Select the text and copy manually.' : ''}
      </span>
    </span>
  );
}

