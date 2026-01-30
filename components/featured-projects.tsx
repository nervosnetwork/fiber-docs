import Image from 'next/image';
import Section from './section';

export default function FeaturedProjects() {
  return (
    <Section
      title={
        <>
          <div>
            <span className="text-tertiary">Featured </span>
            Open-Source Projects
          </div>
          <div>
            <span className="text-tertiary">Built on Fiber Network. </span>
          </div>
        </>
      }
      showDivider={false}
    >
      <div className="self-stretch flex flex-wrap justify-start items-stretch">
        <div className="w-1/2 lg:flex-1 border border-invisible inline-flex flex-col justify-start items-start gap-sm hover-border-bright">
          <div
            data-hovered="false"
            data-showgithub="true"
            data-showlink="true"
            className="w-full h-full md:h-48 p-sm inline-flex flex-col justify-start items-start gap-sm relative pb-sm"
          >
            <div className="self-stretch inline-flex justify-between items-start">
              <div className="text-primary text-h4">Fiber SDK</div>
              <div className="hidden md:flex justify-end items-center gap-xs">
                <Image
                  src="/github.svg"
                  alt="GitHub"
                  width={16}
                  height={16}
                  className="opacity-50 hover:opacity-100 transition-opacity cursor-pointer"
                />
                <Image
                  src="/external.svg"
                  alt="External"
                  width={16}
                  height={16}
                  className="opacity-50 hover:opacity-100 transition-opacity cursor-pointer"
                />
              </div>
            </div>
            <div className="inline-flex flex-wrap justify-start items-center gap-xs">
              <div className="p-1 bg-layer-02 flex justify-center items-center">
                <div className="text-primary text-xs font-normal font-['Inter'] leading-3">
                  SDK
                </div>
              </div>
              <div className="p-1 bg-layer-02 flex justify-center items-center">
                <div className="text-primary text-xs font-normal font-['Inter'] leading-3">
                  Development
                </div>
              </div>
            </div>
            <div className="self-stretch text-tertiary text-body3 md:mb-0 mb-10">
              JS SDK for building dApp on Fiber Network. Integrate with CCC,
              the CKB JS SDK
            </div>
            <div className="md:hidden absolute bottom-4 left-4 inline-flex justify-start items-center gap-xs">
              <Image
                src="/github.svg"
                alt="GitHub"
                width={16}
                height={16}
                className="opacity-50 cursor-pointer"
              />
              <Image
                src="/external.svg"
                alt="External"
                width={16}
                height={16}
                className="opacity-50 cursor-pointer"
              />
            </div>
          </div>
        </div>
        <div className="w-1/2 lg:flex-1 border border-invisible inline-flex flex-col justify-start items-start gap-sm hover-border-bright">
          <div
            data-hovered="false"
            data-showgithub="true"
            data-showlink="true"
            className="w-full h-full md:h-48 p-sm inline-flex flex-col justify-start items-start gap-sm relative pb-sm"
          >
            <div className="self-stretch inline-flex justify-between items-start">
              <div className="text-primary text-h4">Fiber WASM Demo</div>
              <div className="hidden md:flex justify-end items-center gap-xs">
                <Image
                  src="/github.svg"
                  alt="GitHub"
                  width={16}
                  height={16}
                  className="opacity-50 hover:opacity-100 transition-opacity cursor-pointer"
                />
                <Image
                  src="/external.svg"
                  alt="External"
                  width={16}
                  height={16}
                  className="opacity-50 hover:opacity-100 transition-opacity cursor-pointer"
                />
              </div>
            </div>
            <div className="inline-flex flex-wrap justify-start items-center gap-xs">
              <div className="p-1 bg-layer-02 flex justify-center items-center">
                <div className="text-primary text-xs font-normal font-['Inter'] leading-3">
                  WASM
                </div>
              </div>
              <div className="p-1 bg-layer-02 flex justify-center items-center">
                <div className="text-primary text-xs font-normal font-['Inter'] leading-3">
                  WebAssembly
                </div>
              </div>
            </div>
            <div className="self-stretch text-tertiary text-body3 md:mb-0 mb-10">
              A simple demo showcasing Fiber&apos;s capabilities using
              Webassembly
            </div>
            <div className="md:hidden absolute bottom-4 left-4 inline-flex justify-start items-center gap-xs">
              <Image
                src="/github.svg"
                alt="GitHub"
                width={16}
                height={16}
                className="opacity-50 cursor-pointer"
              />
              <Image
                src="/external.svg"
                alt="External"
                width={16}
                height={16}
                className="opacity-50 cursor-pointer"
              />
            </div>
          </div>
        </div>
        <div className="w-1/2 lg:flex-1 border border-invisible inline-flex flex-col justify-start items-start gap-sm hover-border-bright">
          <div
            data-hovered="false"
            data-showgithub="true"
            data-showlink="true"
            className="w-full h-full md:h-48 p-sm inline-flex flex-col justify-start items-start gap-sm relative pb-sm"
          >
            <div className="self-stretch inline-flex justify-between items-start">
              <div className="text-primary text-h4">Micro-payment Game</div>
              <div className="hidden md:flex justify-end items-center gap-xs">
                <Image
                  src="/github.svg"
                  alt="GitHub"
                  width={16}
                  height={16}
                  className="opacity-50 hover:opacity-100 transition-opacity cursor-pointer"
                />
                <Image
                  src="/external.svg"
                  alt="External"
                  width={16}
                  height={16}
                  className="opacity-50 hover:opacity-100 transition-opacity cursor-pointer"
                />
              </div>
            </div>
            <div className="inline-flex flex-wrap justify-start items-center gap-xs">
              <div className="p-1 bg-layer-02 flex justify-center items-center">
                <div className="text-primary text-xs font-normal font-['Inter'] leading-3">
                  Phaser.js
                </div>
              </div>
              <div className="p-1 bg-layer-02 flex justify-center items-center">
                <div className="text-primary text-xs font-normal font-['Inter'] leading-3 whitespace-nowrap">
                  Micro-payment
                </div>
              </div>
            </div>
            <div className="self-stretch text-tertiary text-body3 md:mb-0 mb-10">
              Retro phaser.js game with micro-payments for continues and
              high score rewards.
            </div>
            <div className="md:hidden absolute bottom-4 left-4 inline-flex justify-start items-center gap-xs">
              <Image
                src="/github.svg"
                alt="GitHub"
                width={16}
                height={16}
                className="opacity-50 cursor-pointer"
              />
              <Image
                src="/external.svg"
                alt="External"
                width={16}
                height={16}
                className="opacity-50 cursor-pointer"
              />
            </div>
          </div>
        </div>
        <div
          data-hovered="false"
          data-orientation="Vertical"
          className="w-1/2 lg:w-48 md:h-48 p-sm border border-invisible inline-flex flex-col justify-center items-center gap-xs cursor-pointer hover-invert"
        >
          <Image src="/external.svg" alt="Arrow" width={20} height={20} />
          <div className="text-primary text-button md:whitespace-nowrap" style={{ lineHeight: '16px' }}>
            <div className="md:inline">VIEW ALL</div>
            <div className="md:inline md:before:content-[' ']">PROJECTS</div>
          </div>
        </div>
      </div>
    </Section>
  );
}
