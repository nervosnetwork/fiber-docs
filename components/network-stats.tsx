import Image from 'next/image';
import Section from './section';

export default function NetworkStats() {
  return (
    <Section className="mt-xxl">
      <div className="self-stretch flex flex-wrap md:inline-flex md:flex-nowrap justify-start items-stretch">
        <div className="w-full md:flex-1 flex flex-wrap md:flex-nowrap justify-start items-stretch">
          <div className="w-1/2 md:flex-1 p-sm border border-invisible inline-flex flex-col justify-start items-start gap-lg">
            <div className="justify-center text-tertiary text-label">
              Fiber nodes
            </div>
            <div className="justify-center text-primary text-h2">
              544,810
            </div>
          </div>
          <div className="w-1/2 md:flex-1 p-sm border border-invisible inline-flex flex-col justify-start items-start gap-lg">
            <div className="justify-center text-tertiary text-label">
              Fiber channels
            </div>
            <div className="justify-center text-primary text-h2">
              544,810
            </div>
          </div>
          <div className="w-1/2 md:flex-1 p-sm border border-invisible inline-flex flex-col justify-start items-start gap-lg">
            <div className="justify-center text-tertiary text-label">
              Capacity (CKB)
            </div>
            <div className="justify-center text-primary text-h2">
              544,810
            </div>
          </div>
          <div className="w-1/2 md:w-32 p-sm border border-invisible inline-flex flex-col justify-center items-center gap-sm hover-invert cursor-pointer"
            data-hovered="false"
            data-orientation="Vertical"
            onClick={() => window.open('https://fiber-dashboard-3aew.vercel.app/', '_blank')}
          >
            <Image
              src="/external.svg"
              alt="External"
              width={24}
              height={24}
            />
            <div className="self-stretch text-center justify-center text-primary text-button">
              Full simulation
            </div>
          </div>
        </div>
      </div>
    </Section>
  );
}
