'use client';

import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import styles from './copy-icon-button.module.css';

/** Copy the underlying value, even when the adjacent label is shortened. */
export function CopyIconButton({ value, label }: { value: string; label: string }) {
  const id = useId();
  const button = useRef<HTMLButtonElement>(null);
  const tooltip = useRef<HTMLSpanElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const request = useRef(0);
  const [feedback, setFeedback] = useState('');
  const [copied, setCopied] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const tooltipText = feedback || ((hovered || focused) && value ? label : '');
  const [position, setPosition] = useState({ left: 0, top: 0 });

  useEffect(() => {
    setFeedback('');
    setCopied(false);
    return () => {
      request.current += 1;
      if (timer.current) clearTimeout(timer.current);
    };
  }, [value]);

  useLayoutEffect(() => {
    if (!tooltipText) return;
    const updatePosition = () => {
      if (!button.current || !tooltip.current) return;
      const trigger = button.current.getBoundingClientRect();
      const box = tooltip.current.getBoundingClientRect();
      setPosition({
        left: Math.max(12, Math.min(trigger.left + trigger.width / 2 - box.width / 2, window.innerWidth - box.width - 12)),
        top: trigger.top >= box.height + 20 ? trigger.top - box.height - 8 : trigger.bottom + 8,
      });
    };
    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [tooltipText]);

  async function copy() {
    const attempt = ++request.current;
    if (timer.current) clearTimeout(timer.current);
    setFeedback('');
    setCopied(false);
    try {
      await navigator.clipboard.writeText(value);
      if (attempt !== request.current) return;
      setCopied(true);
      setFeedback('Copied to clipboard');
    } catch {
      if (attempt !== request.current) return;
      setFeedback('Copy failed. Allow clipboard access and try again.');
    }
    timer.current = setTimeout(() => {
      setFeedback('');
      setCopied(false);
    }, 3_000);
  }

  return (
    <>
      <button
        aria-describedby={tooltipText ? id : undefined}
        aria-label={label}
        className={styles.button}
        disabled={!value}
        onClick={() => void copy()}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onKeyDown={(event) => { if (event.key === 'Escape') { setFeedback(''); setHovered(false); setFocused(false); } }}
        ref={button}
        type="button"
      >
        <svg aria-hidden="true" fill="none" height="15" viewBox="0 0 16 16" width="15">
          {copied ? <path d="m3 8 3 3 7-7" /> : <><rect height="9" rx="1" width="9" x="5" y="5" /><path d="M10 3V2H2v8h1" /></>}
        </svg>
      </button>
      <span className={styles.srOnly} role="status">{feedback}</span>
      {tooltipText && createPortal(
        <span className={styles.tooltip} data-success={copied} data-error={Boolean(feedback) && !copied} id={id} ref={tooltip} role="tooltip" style={position}>
          {tooltipText}
        </span>,
        document.body,
      )}
    </>
  );
}
