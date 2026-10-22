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
import styles from './fiber-wasm-quickstart.module.css';
import { liveTutorials } from './tutorial-registry';

export type RoutingCodeFile = {
  id: string;
  label: string;
  language: string;
  code: string;
};

export type RoutingCodeFocus = {
  file: string;
  start: number;
  end: number;
};

const tutorials = liveTutorials;

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
  file: RoutingCodeFile;
  focus: RoutingCodeFocus | null;
}) {
  const codeRef = useRef<HTMLPreElement | null>(null);

  useEffect(() => {
    if (!focus || focus.file !== file.id) return;
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

export function RoutingTutorialFrame({
  article,
  currentTutorialIndex,
  codeFiles,
  sectionCode,
  defaultFile,
  downloadHref,
  demoTitle,
  demoDescription,
  liveDemo,
  previousHref,
  nextHref,
  demoFirst = false,
  walkthroughDescription = 'See how the result rules, Hold Invoice, and payment decision map to the Fiber SDK calls used by the demo.',
}: {
  article: ReactNode;
  currentTutorialIndex: number;
  codeFiles: RoutingCodeFile[];
  sectionCode: Record<string, RoutingCodeFocus>;
  defaultFile: string;
  downloadHref: string;
  demoTitle: string;
  demoDescription: string;
  liveDemo: ReactNode;
  previousHref: string;
  nextHref?: string;
  demoFirst?: boolean;
  walkthroughDescription?: string;
}) {
  const router = useRouter();
  const topRef = useRef<HTMLDivElement | null>(null);
  const demoRef = useRef<HTMLElement | null>(null);
  const walkthroughRef = useRef<HTMLElement | null>(null);
  const articleRef = useRef<HTMLDivElement | null>(null);
  const tutorialMenuRef = useRef<HTMLDivElement | null>(null);
  const mobileTutorialDialogRef = useRef<HTMLDialogElement | null>(null);
  const [activeSection, setActiveSection] = useState('intro');
  const [articleProgress, setArticleProgress] = useState(0);
  const [tutorialMenuOpen, setTutorialMenuOpen] = useState(false);
  const [mobileTutorialMenuOpen, setMobileTutorialMenuOpen] = useState(false);
  const [liveDemoActive, setLiveDemoActive] = useState(false);
  const [activeFile, setActiveFile] = useState(defaultFile);
  const [codeFocus, setCodeFocus] = useState<RoutingCodeFocus | null>(null);
  const [copied, setCopied] = useState(false);

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

  const currentFile =
    codeFiles.find((file) => file.id === activeFile) ?? codeFiles[0];

  const syncToSection = useCallback(
    (section: string) => {
      setActiveSection(section);
      const nextCode = sectionCode[section];
      if (!nextCode) {
        setCodeFocus(null);
        return;
      }
      setActiveFile(nextCode.file);
      setCodeFocus(nextCode);
    },
    [sectionCode],
  );

  useEffect(() => {
    const articleElement = articleRef.current;
    if (!articleElement) return;

    const onScroll = () => {
      const sections = Array.from(
        articleElement.querySelectorAll<HTMLElement>('[data-tutorial-section]'),
      );
      const maxScroll = articleElement.scrollHeight - articleElement.clientHeight;
      setArticleProgress(
        maxScroll <= 0
          ? 1
          : Math.min(1, Math.max(0, articleElement.scrollTop / maxScroll)),
      );
      const articleTop = articleElement.getBoundingClientRect().top;
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
    articleElement.addEventListener('scroll', onScroll, { passive: true });
    return () => articleElement.removeEventListener('scroll', onScroll);
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

  const copyCode = useCallback(async () => {
    await navigator.clipboard.writeText(currentFile.code);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1_500);
  }, [currentFile]);

  const toggleDemo = useCallback(() => {
    if (liveDemoActive) {
      if (demoFirst) {
        walkthroughRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else {
        topRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
      }
      return;
    }
    demoRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [demoFirst, liveDemoActive]);

  const articlePanel = (
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
      {article}
    </div>
  );

  const codePanel = (
    <section className={styles.codePanel} aria-label="Tutorial project files">
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
    </section>
  );

  const footer = (
    <nav className={styles.tutorialFooter} aria-label="Tutorial navigation">
      <button onClick={() => router.push(previousHref)} type="button">
        <span aria-hidden="true">←</span> Previous
      </button>
      <button
        disabled={!nextHref}
        onClick={() => nextHref && router.push(nextHref)}
        type="button"
      >
        Next <span aria-hidden="true">→</span>
      </button>
    </nav>
  );

  return (
    <div
      className={`${styles.shell} ${demoFirst ? '' : styles.paymentShell}`}
      ref={topRef}
    >
      <header className={`${styles.tutorialToolbar} ${styles.routingToolbar}`}>
        <button
          aria-label="Choose a tutorial"
          aria-haspopup="dialog"
          aria-expanded={mobileTutorialMenuOpen}
          aria-controls="mobile-tutorial-picker"
          className={styles.mobileChapterButton}
          onClick={() => setMobileTutorialMenuOpen(true)}
          type="button"
        >
          <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 4.5h6a3 3 0 0 1 3 3V21a4 4 0 0 0-4-2H4zM13 7.5a3 3 0 0 1 3-3h5V19h-4a4 4 0 0 0-4 2" />
            <path d="M7 8h3M7 11h3M16 8h2M16 11h2" />
          </svg>
        </button>
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
        <button className={styles.runDemoAction} onClick={toggleDemo} type="button">
          {demoFirst
            ? liveDemoActive
              ? 'View code walkthrough'
              : 'Try live demo'
            : liveDemoActive
              ? 'Back to tutorial'
              : 'Run live demo'}{' '}
          <span aria-hidden="true">{liveDemoActive ? (demoFirst ? '↓' : '↑') : demoFirst ? '↑' : '↓'}</span>
        </button>
        <div className={styles.toolbarActions}>
          <a download href={downloadHref}>
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
            style={{ transform: `scaleX(${articleProgress})` }}
          />
        </div>
      </header>

      <dialog
        aria-labelledby="mobile-tutorial-picker-title"
        className={styles.mobileTutorialDialog}
        id="mobile-tutorial-picker"
        onClose={() => setMobileTutorialMenuOpen(false)}
        ref={mobileTutorialDialogRef}
      >
        <header>
          <div><small>Fiber tutorials</small><h2 id="mobile-tutorial-picker-title">Choose a chapter</h2></div>
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

      {demoFirst ? (
        <>
          <section className={`${styles.liveDemo} ${styles.channelLiveDemo}`} ref={demoRef}>
            <div className={styles.liveDemoHeading}>
              <div>
                <span>Interactive tutorial · About 30 minutes</span>
                <h1>{demoTitle}</h1>
                <p>{demoDescription}</p>
              </div>
            </div>
            {liveDemo}
          </section>
          <div aria-hidden="true" className={styles.sectionDivider} />
          <header className={styles.walkthroughHeader} ref={walkthroughRef}>
            <span>Implementation walkthrough</span>
            <h2>Behind the scenes</h2>
            <p>
              {walkthroughDescription}
            </p>
          </header>
          <section className={styles.instructionWorkspace}>
            <div className={styles.instructionGrid}>
              {articlePanel}
              {codePanel}
            </div>
            {footer}
          </section>
        </>
      ) : (
        <>
          {articlePanel}
          <aside
            className={`${styles.workspace} ${styles.paymentWorkspace}`}
            aria-label="Live Fiber preview and tutorial project files"
          >
            <section className={styles.preview} ref={demoRef}>
              <div className={styles.liveDemoHeading}>
                <div>
                  <span>Fiber Testnet</span>
                  <h2>{demoTitle}</h2>
                  <p>{demoDescription}</p>
                </div>
              </div>
              {liveDemo}
            </section>
            {codePanel}
          </aside>
          {footer}
        </>
      )}
    </div>
  );
}
