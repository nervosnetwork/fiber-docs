'use client';

import { useState } from 'react';
import Image from 'next/image';
import Section from './section';

export default function NetworkComparison() {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <Section
      title={
        <>
          Fiber Network vs.
          <span className="text-tertiary"> Lightning Network</span>
        </>
      }
    >
      <div className="self-stretch inline-flex flex-col justify-start items-start">
        <div className="self-stretch flex flex-col justify-start items-start">
          <div className="self-stretch inline-flex justify-start items-stretch">
            <div className="flex-1 py-10 border border-invisible inline-flex flex-col justify-center items-start md:items-center gap-xs px-2">
              <div className="text-left md:text-center text-primary text-h3 break-words">
                Features
              </div>
            </div>
            <div className="flex-1 py-10 bg-layer-02 border border-invisible inline-flex flex-col justify-center items-center gap-xs px-2">
              <div className="text-center text-primary text-h3 break-words">
                Fiber Network
              </div>
            </div>
            <div className="flex-1 py-10 border border-invisible inline-flex flex-col justify-center items-center gap-xs px-2">
              <div className="text-center text-primary text-h3 break-words">
                Lightning Network
              </div>
            </div>
          </div>
          <div className="self-stretch inline-flex justify-start items-stretch">
            <div className="flex-1 py-10 border border-invisible inline-flex flex-col justify-center items-start md:items-center gap-xs px-2">
              <div className="text-left md:text-center text-primary text-h3 break-words">
                Assets
              </div>
            </div>
            <div className="flex-1 py-10 bg-layer-02 border border-invisible inline-flex flex-col justify-center items-center gap-xs px-2">
              <div className="text-center text-primary text-body1 break-words">
                CKB/RGB++
              </div>
            </div>
            <div className="flex-1 py-10 border border-invisible inline-flex flex-col justify-center items-center gap-xs px-2">
              <div className="text-center text-primary text-body1 break-words">
                BTC Only
              </div>
            </div>
          </div>
          <div className="self-stretch inline-flex justify-start items-stretch">
            <div className="flex-1 py-10 border border-invisible inline-flex flex-col justify-center items-start md:items-center gap-xs px-2">
              <div className="text-left md:text-center text-primary text-h3 break-words">
                Cross Chain Hub
              </div>
            </div>
            <div className="flex-1 py-10 bg-layer-02 border border-invisible flex justify-center items-center gap-xs px-2">
              <Image src="/check.svg" alt="Check" width={20} height={20} className="flex-shrink-0" />
              <div className="text-center text-primary text-body1 break-words">
                Yes
              </div>
            </div>
            <div className="flex-1 py-10 border border-invisible flex justify-center items-center gap-xs px-2">
              <Image src="/x.svg" alt="X" width={20} height={20} className="flex-shrink-0" />
              <div className="text-center text-primary text-body1 break-words">
                No
              </div>
            </div>
          </div>
          <div className="self-stretch inline-flex justify-start items-stretch">
            <div className="flex-1 py-10 border border-invisible inline-flex flex-col justify-center items-start md:items-center gap-xs px-2">
              <div className="text-left md:text-center text-primary text-h3 break-words">
                Watchtower Storage
              </div>
              <div 
                className="w-5 h-5 relative flex items-center justify-center cursor-pointer"
                onMouseEnter={() => setShowTooltip(true)}
                onMouseLeave={() => setShowTooltip(false)}
              >
                <Image
                  src="/info.svg"
                  alt="Info"
                  width={20}
                  height={20}
                />
                {showTooltip && (
                  <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 z-50">
                    <div className="w-60 relative">
                      <div className="w-60 bg-layer-inverse rounded p-2">
                        <div className="text-inverse text-sm font-normal leading-6">
                          O(1): Constant storage<br />O(n): Storage grows with updates
                        </div>
                      </div>
                      {/* Triangle arrow pointing down */}
                      <div className="absolute left-1/2 -translate-x-1/2 -bottom-1.5">
                        <div 
                          className="w-0 h-0" 
                          style={{
                            borderLeft: '5px solid transparent',
                            borderRight: '5px solid transparent',
                            borderTop: '6px solid var(--color-layer-inverse)'
                          }}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="flex-1 py-10 bg-layer-02 border border-invisible inline-flex flex-col justify-center items-center gap-xs px-2">
              <div className="text-center text-primary text-body1 break-words">
                O(1)
              </div>
            </div>
            <div className="flex-1 py-10 border border-invisible inline-flex flex-col justify-center items-center gap-xs px-2">
              <div className="text-center text-primary text-body1 break-words">
                O(N)
              </div>
            </div>
          </div>
        </div>
      </div>
    </Section>
  );
}
