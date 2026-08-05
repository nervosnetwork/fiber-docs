'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import Section from './section';

const UNIX_COMMAND = `curl -sSfL https://raw.githubusercontent.com/nervosnetwork/fiber/develop/tools/install/install.sh \\
  | INSTALL_REF=develop FNN_VERSION=0.9.0-rc7 bash`;

const WINDOWS_COMMAND = `$env:INSTALL_REF="develop"
$env:FNN_VERSION="0.9.0-rc7"
$env:NETWORK="testnet"
$env:INSTALL_DIR="$HOME\\.fiber"
irm https://raw.githubusercontent.com/nervosnetwork/fiber/develop/tools/install/install.ps1 | iex`;

type OperatingSystem = 'unix' | 'windows';
type CopyStatus = 'idle' | 'copied' | 'failed';

const INSTALLERS: Record<
  OperatingSystem,
  {
    label: string;
    prompt: string;
    command: string;
  }
> = {
  unix: {
    label: 'macOS / Linux',
    prompt: '$',
    command: UNIX_COMMAND,
  },
  windows: {
    label: 'Windows PowerShell',
    prompt: 'PS>',
    command: WINDOWS_COMMAND,
  },
};

export default function NativeNodeInstaller() {
  const [operatingSystem, setOperatingSystem] =
    useState<OperatingSystem>('unix');
  const [copyStatus, setCopyStatus] = useState<CopyStatus>('idle');
  const installer = INSTALLERS[operatingSystem];

  const selectOperatingSystem = (nextOperatingSystem: OperatingSystem) => {
    setOperatingSystem(nextOperatingSystem);
    setCopyStatus('idle');
  };

  const copyCommand = async () => {
    try {
      await navigator.clipboard.writeText(installer.command);
      setCopyStatus('copied');
      window.setTimeout(() => setCopyStatus('idle'), 1600);
    } catch {
      setCopyStatus('failed');
    }
  };

  const copyAnnouncement =
    copyStatus === 'copied'
      ? 'Copied'
      : copyStatus === 'failed'
        ? 'Copy failed'
        : 'Copy command';

  return (
    <Section
      description={
        <Link
          className="w-full md:w-60 h-[60px] p-2 border border-white flex shrink-0 justify-center items-center gap-sm cursor-pointer hover-invert"
          href="/docs/quick-start/run-a-node/rust#automated-installer-preview"
        >
          <span className="w-6 h-6 relative flex items-center justify-center">
            <Image src="/external.svg" alt="" width={20} height={20} />
          </span>
          <span className="text-center text-primary text-button">
            FULL GUIDE
          </span>
        </Link>
      }
      headerLayout="split"
      title={
        <>
          Run <span className="text-tertiary">a Native</span> Fiber Node
        </>
      }
      titleDescription={
        <p className="text-secondary text-body2">
          Join Fiber&apos;s peer-to-peer network, connect directly with peers,
          and participate on Testnet by running your own native node.
        </p>
      }
    >
      <div className="self-stretch flex flex-col justify-start items-start">
        <div className="self-stretch overflow-hidden border border-invisible bg-layer-01">
          <div className="flex flex-wrap items-center justify-between gap-sm border-b border-invisible bg-layer-02 px-sm py-sm">
            <div
              aria-label="Choose an operating system"
              className="inline-flex items-stretch border border-invisible bg-layer-01 p-1"
              role="tablist"
            >
              {(Object.keys(INSTALLERS) as OperatingSystem[]).map((key) => (
                <button
                  aria-controls={`installer-panel-${key}`}
                  aria-selected={operatingSystem === key}
                  className={`px-sm py-2 border inline-flex justify-center items-center transition-colors ${
                    operatingSystem === key
                      ? 'bg-primary border-primary text-inverse'
                      : 'border-transparent text-tertiary hover:text-primary'
                  }`}
                  id={`installer-tab-${key}`}
                  key={key}
                  onClick={() => selectOperatingSystem(key)}
                  role="tab"
                  type="button"
                >
                  <span className="text-center text-body3">
                    {INSTALLERS[key].label}
                  </span>
                </button>
              ))}
            </div>

            <div className="hidden sm:flex items-center gap-lg text-tertiary text-body3">
              <span>
                Network: <span className="text-primary">Testnet</span>
              </span>
              <span className="hidden md:inline">
                Target Version:{' '}
                <span className="text-primary">0.9.0-rc7</span>
              </span>
            </div>
          </div>

          <div className="grid w-full bg-layer-01 p-sm md:p-md">
            {(Object.keys(INSTALLERS) as OperatingSystem[]).map((key) => (
              <div
                aria-hidden={operatingSystem !== key}
                aria-labelledby={`installer-tab-${key}`}
                className={`col-start-1 row-start-1 w-full min-w-0 h-full flex flex-col ${
                  operatingSystem === key
                    ? 'visible'
                    : 'invisible pointer-events-none'
                }`}
                id={`installer-panel-${key}`}
                key={key}
                role="tabpanel"
              >
                <div className="relative flex-1 border border-invisible bg-layer-02">
                  <button
                    aria-label="Copy command"
                    className="absolute top-2 right-2 size-10 border border-invisible inline-flex items-center justify-center hover-invert z-10"
                    onClick={copyCommand}
                    type="button"
                  >
                    <Image src="/icon-copy.svg" alt="" width={18} height={18} />
                    <span aria-live="polite" className="sr-only">
                      {copyAnnouncement}
                    </span>
                  </button>

                  <pre className="m-0 min-h-32 py-sm pl-sm pr-16 md:py-md md:pl-md md:pr-12 overflow-x-auto whitespace-pre-wrap break-words text-secondary text-body3 font-mono">
                    <code>
                      <span className="text-primary">
                        {INSTALLERS[key].prompt}{' '}
                      </span>
                      {INSTALLERS[key].command}
                    </code>
                  </pre>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Section>
  );
}
