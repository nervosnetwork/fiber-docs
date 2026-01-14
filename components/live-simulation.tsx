import Image from 'next/image';
import Section from './section';

export default function LiveSimulation() {
  return (
    <Section
      title={
        <div className="self-stretch flex justify-between items-center">
          <div>
            Live 
            <span className="text-tertiary"> Fiber Network </span>
            Simulation
          </div>
          <button
            data-hovered="false"
            data-orientation="Horizontal"
            className="w-44 h-[60px] p-2 border border-primary flex justify-center items-center gap-sm cursor-pointer hover:bg-layer-02 transition-colors"
            onClick={() => window.open('https://fiber-dashboard-3aew.vercel.app/', '_blank')}
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
              VIEW SIMULATION
            </div>
          </button>
        </div>
      }
    >
      <></>
    </Section>
  );
}
