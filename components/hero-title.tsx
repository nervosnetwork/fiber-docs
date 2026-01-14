interface HeroTitleProps {
  className?: string;
}

export default function HeroTitle({ className = '' }: HeroTitleProps) {
  return (
    <section className={`self-stretch inline-flex flex-col justify-start items-start mt-[120px] md:mt-[180px] relative z-20 ${className}`}>
      <div className="self-stretch flex flex-col justify-start items-start">
        <div className="self-stretch justify-center text-primary text-display">
          Fiber Network
        </div>
      </div>
      <div className="self-stretch inline-flex justify-start items-start">
        <div className="justify-center text-tertiary text-display">
          Is Scailing Satoshi&apos;s
        </div>
      </div>
      <div className="self-stretch flex flex-col justify-start items-start">
        <div className="self-stretch justify-center text-primary text-display">
          P2P Ecash Vision
        </div>
      </div>
    </section>
  );
}
