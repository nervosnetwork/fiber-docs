import Image from 'next/image';
import Section from './section';
import Tabs from './tabs';
import MobileWorkSlider from './mobile-work-slider';

export default function HowItWorks() {
  return (
    <Section
      title={
        <>
          How <span className="text-tertiary">Fiber Network</span> Works
        </>
      }
    >
      {/* Desktop: Tabs */}
      <div className="hidden md:block w-full">
        <Tabs
          tabs={[
            {
              label: 'Off-chain Payment Channels',
              active: true,
              content: (
                <>
                  <Image
                    src="/work1.svg"
                    alt="Work 1"
                    width={800}
                    height={600}
                    className="w-full"
                  />
                  <div className="w-2/3 self-center text-center">
                    An off-chain payment channel allows two parties to lock
                    funds on-chain, conduct unlimited instant transactions
                    off-chain, and settle the final balance on-chain when the
                    channel is closed.f
                  </div>
                </>
              ),
            },
            {
              label: 'On-Chain Contracts (HTLCs)',
              content: (
                <>
                  <Image
                    src="/work2.svg"
                    alt="Work 2"
                    width={800}
                    height={600}
                    className="w-full"
                  />
                  <div className="w-3/4 self-center text-center">
                    Hash Time-Locked Contracts (HTLC) ensure secure off-chain
                    transactions by requiring the recipient to provide avalid
                    hash preimage within a set timeframe to claim funds, while
                    enabling automatic refunds if the condition isn&apos;t
                    met.
                  </div>
                </>
              ),
            },
            {
              label: 'Multi-Hop Routing',
              content: (
                <>
                  <Image
                    src="/work3.svg"
                    alt="Work 3"
                    width={800}
                    height={600}
                    className="w-full"
                  />
                  <div className="w-2/3 self-center text-center">
                    Multi-hop routing enables payments to be securely relayed
                    through multiple intermediate nodes, allowing users
                    totransact without direct payment channels while ensuring
                    fund transfers are atomic and secure.
                  </div>
                </>
              ),
            },
            {
              label: 'Watchtower Service',
              content: (
                <>
                  <Image
                    src="/work4.svg"
                    alt="Work 4"
                    width={800}
                    height={600}
                    className="w-full"
                  />
                  <div className="w-2/3 self-center text-center">
                    The Watchtower service monitors on-chain payment channels,
                    detects anomalies, and broadcasts the latest validstate to
                    the blockchain to prevent fund loss.
                  </div>
                </>
              ),
            },
          ]}
        />
      </div>

      {/* Mobile: Slider */}
      <div className="md:hidden">
        <MobileWorkSlider
          slides={[
            {
              label: 'Off-chain Payment Channels',
              description: 'An off-chain payment channel allows two parties to lock funds on-chain, conduct unlimited instant transactions off-chain, and settle the final balance on-chain when the channel is closed.',
              image: '/work1.svg',
              mobileImage: '/work1_s.svg',
            },
            {
              label: 'On-Chain Contracts (HTLCs)',
              description: 'Hash Time-Locked Contracts (HTLC) ensure secure off-chain transactions by requiring the recipient to provide a valid hash preimage within a set timeframe to claim funds, while enabling automatic refunds if the condition isn\'t met.',
              image: '/work2.svg',
              mobileImage: '/work2_s.svg',
            },
            {
              label: 'Multi-Hop Routing',
              description: 'Multi-hop routing enables payments to be securely relayed through multiple intermediate nodes, allowing users to transact without direct payment channels while ensuring fund transfers are atomic and secure.',
              image: '/work3.svg',
              mobileImage: '/work3_s.svg',
            },
            {
              label: 'Watchtower Service',
              description: 'The Watchtower service monitors on-chain payment channels, detects anomalies, and broadcasts the latest valid state to the blockchain to prevent fund loss.',
              image: '/work4.svg',
              mobileImage: '/work4_s.svg',
            },
          ]}
        />
      </div>
    </Section>
  );
}
