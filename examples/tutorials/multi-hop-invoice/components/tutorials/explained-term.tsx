'use client';

import {
  type ReactNode,
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import styles from './fiber-wasm-quickstart.module.css';

export function ExplainedTerm({
  ariaLabel,
  children,
  className = styles.explainedTerm,
  explanation,
  id,
}: {
  ariaLabel?: string;
  children: ReactNode;
  className?: string;
  explanation: string;
  id: string;
}) {
  const triggerRef = useRef<HTMLSpanElement | null>(null);
  const tooltipRef = useRef<HTMLSpanElement | null>(null);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<{ left: number; top: number } | null>(
    null,
  );

  const updatePosition = useCallback(() => {
    const trigger = triggerRef.current;
    const tooltip = tooltipRef.current;
    if (!trigger || !tooltip) return;

    const viewportPadding = 12;
    const gap = 10;
    const triggerBox = trigger.getBoundingClientRect();
    const tooltipBox = tooltip.getBoundingClientRect();
    const centeredLeft =
      triggerBox.left + triggerBox.width / 2 - tooltipBox.width / 2;
    const left = Math.min(
      Math.max(centeredLeft, viewportPadding),
      window.innerWidth - tooltipBox.width - viewportPadding,
    );
    const roomAbove = triggerBox.top - gap - tooltipBox.height;
    const preferredTop =
      roomAbove >= viewportPadding ? roomAbove : triggerBox.bottom + gap;
    const top = Math.min(
      Math.max(preferredTop, viewportPadding),
      window.innerHeight - tooltipBox.height - viewportPadding,
    );

    setPosition({ left, top });
  }, []);

  useLayoutEffect(() => {
    if (!open) return;

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [open, updatePosition]);

  const showTooltip = () => {
    setPosition(null);
    setOpen(true);
  };

  return (
    <>
      <span
        aria-label={ariaLabel}
        aria-describedby={open ? id : undefined}
        className={className}
        onBlur={() => setOpen(false)}
        onFocus={showTooltip}
        onKeyDown={(event) => {
          if (event.key === 'Escape') setOpen(false);
        }}
        onMouseEnter={showTooltip}
        onMouseLeave={() => {
          if (document.activeElement !== triggerRef.current) setOpen(false);
        }}
        ref={triggerRef}
        tabIndex={0}
      >
        {children}
      </span>
      {open &&
        createPortal(
          <span
            className={styles.termTooltip}
            data-positioned={Boolean(position)}
            id={id}
            ref={tooltipRef}
            role="tooltip"
            style={{ left: position?.left ?? 0, top: position?.top ?? 0 }}
          >
            {explanation}
          </span>,
          document.body,
        )}
    </>
  );
}
