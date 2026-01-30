import Image from 'next/image';
import Section from './section';

export default function Timeline() {
  return (
    <Section
      title={
        <div className="self-stretch flex justify-between items-center">
          <div>
            How Fiber
            <span className="text-tertiary"> Has </span>
            Evolved.
          </div>
          <button
            data-hovered="false"
            data-orientation="Horizontal"
            className="hidden md:flex w-44 h-[60px] p-2 border border-white justify-center items-center gap-sm cursor-pointer hover-invert"
            onClick={() => window.open('https://github.com/nervosnetwork/fiber/discussions', '_blank')}
          >
            <div className="w-6 h-6 relative flex items-center justify-center">
              <Image
                src="/external.svg"
                alt="External"
                width={20}
                height={20}
              />
            </div>
            <div className="w-28 text-center text-primary text-button">
              VIEW DEV LOG
            </div>
          </button>
        </div>
      }
    >
      <div className="self-stretch flex flex-col md:flex-row md:justify-between md:items-end gap-8">
        <div className="w-[923px] inline-flex flex-col justify-start items-start">
          <div className="self-stretch p-md border border-invisible inline-flex justify-start items-center gap-sm">
            <div className="w-4 h-4 bg-white rounded-full" />
            <div className="text-primary text-h2">2024 Q3</div>
          </div>
          <div className="self-stretch px-7 inline-flex justify-start items-center gap-2.5">
            <div className="w-0 self-stretch border-l border-invisible" />
            <div className="flex-1 h-16 py-md flex items-center gap-2.5">
              <div className="w-[6px] h-[6px] bg-tertiary rounded-full ml-2.5 flex-shrink-0" />
              <div className="flex-1 text-tertiary text-body2">
                Released POC1, Channel Management, On-Chain Contracts,
                Cross-Chain Demo for Lightning
              </div>
            </div>
          </div>
          <div className="self-stretch p-md border border-invisible inline-flex justify-start items-center gap-sm">
            <div className="w-4 h-4 bg-white rounded-full" />
            <div className="text-primary text-h2">2024 Q4</div>
          </div>
          <div className="self-stretch px-7 inline-flex justify-start items-center gap-2.5">
            <div className="w-0 self-stretch border-l border-invisible" />
            <div className="flex-1 py-md inline-flex flex-col items-start gap-xs">
              <div className="flex items-center gap-2.5">
                <div className="w-[6px] h-[6px] bg-tertiary rounded-full ml-2.5 flex-shrink-0" />
                <div className="flex-1 text-tertiary text-body2">
                  Released POC2, Path Finding, Payment Routing
                </div>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="w-[6px] h-[6px] bg-tertiary rounded-full ml-2.5 flex-shrink-0" />
                <div className="flex-1 text-tertiary text-body2">
                  Released the first General Availability (GA) version of
                  the Fiber node implementation, completed contract audit,
                  and planned future upgrades.
                </div>
              </div>
            </div>
          </div>
          <div className="self-stretch p-md border border-invisible inline-flex justify-start items-center gap-sm">
            <div className="w-4 h-4 bg-white rounded-full" />
            <div className="text-primary text-h2">2025 Q1</div>
          </div>
          <div className="self-stretch px-7 inline-flex justify-start items-center gap-2.5">
            <div className="w-0 self-stretch border-l border-invisible" />
            <div className="flex-1 py-md inline-flex flex-col items-start gap-xs">
              <div className="flex items-center gap-2.5">
                <div className="w-[6px] h-[6px] bg-tertiary rounded-full ml-2.5 flex-shrink-0" />
                <div className="flex-1 text-tertiary text-body2">
                  Mainnet Contract Deployment
                </div>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="w-[6px] h-[6px] bg-tertiary rounded-full ml-2.5 flex-shrink-0" />
                <div className="flex-1 text-tertiary text-body2">
                  Release the first stable version of Fiber node
                  implementation{' '}
                </div>
              </div>
            </div>
          </div>
          <div className="self-stretch p-md border border-invisible inline-flex justify-start items-center gap-sm">
            <div className="w-4 h-4 bg-white rounded-full" />
            <div className="text-primary text-h2">2025 Q2</div>
          </div>
          <div className="self-stretch px-7 inline-flex justify-start items-center gap-2.5">
            <div className="w-0 self-stretch border-l border-invisible" />
            <div className="flex-1 py-md inline-flex flex-col items-start gap-xs">
              <div className="flex items-center gap-2.5">
                <div className="w-[6px] h-[6px] bg-tertiary rounded-full ml-2.5 flex-shrink-0" />
                <div className="flex-1 text-tertiary text-body2">
                  More features of payment: Payment Offers and Multi-path
                  Payment
                </div>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="w-[6px] h-[6px] bg-tertiary rounded-full ml-2.5 flex-shrink-0" />
                <div className="flex-1 text-tertiary text-body2">
                  Support multi-hop of cross-chain transfer
                </div>
              </div>
            </div>
          </div>
          <div className="self-stretch p-md border border-invisible inline-flex justify-start items-center gap-sm">
            <div className="w-4 h-4 bg-white rounded-full" />
            <div className="text-primary text-h2">2025 Q3</div>
          </div>
          <div className="self-stretch px-7 inline-flex justify-start items-center gap-2.5">
            <div className="w-0 self-stretch border-l border-invisible" />
            <div className="flex-1 py-md inline-flex flex-col items-start gap-xs">
              <div className="flex items-center gap-2.5">
                <div className="w-[6px] h-[6px] bg-tertiary rounded-full ml-2.5 flex-shrink-0" />
                <div className="flex-1 text-tertiary text-body2">
                  Upgrade contract to support PTLC
                </div>
              </div>
            </div>
          </div>
          <div className="self-stretch p-md border border-invisible inline-flex justify-start items-center gap-sm">
            <div className="w-4 h-4 rounded-full border border-white" />
            <div className="text-primary text-h2">2025 Q4</div>
          </div>
        </div>
        <div className="w-56 relative overflow-hidden hidden md:block">
          <Image
            src="/fiber.svg"
            alt="Fiber"
            width={224}
            height={600}
            className="w-full h-auto animate-fiber-reveal"
          />
        </div>
      </div>
      <button
        data-hovered="false"
        data-orientation="Horizontal"
        className="md:hidden w-full h-[60px] p-2 border border-white flex justify-center items-center gap-sm cursor-pointer hover-invert"
        onClick={() => window.open('https://github.com/nervosnetwork/fiber/discussions', '_blank')}
        style={{ marginTop: '32px' }}
      >
        <div className="w-6 h-6 relative flex items-center justify-center">
          <Image
            src="/external.svg"
            alt="External"
            width={20}
            height={20}
          />
        </div>
        <div className="w-28 text-center text-primary text-button">
          VIEW DEV LOG
        </div>
      </button>
    </Section>
  );
}
