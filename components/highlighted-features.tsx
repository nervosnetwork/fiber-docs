import Image from 'next/image';
import Section from './section';
import FeatureCard from './feature-card';

export default function HighlightedFeatures() {
  return (
    <Section
      title={
        <>
          <span className="text-tertiary">Hightlighted</span> Features
        </>
      }
      showDivider={false}
    >
      <Section>
        <div className="self-stretch h-[560px] lg:h-[720px] border-t border-b border-invisible relative">
          <div
            className="absolute inset-0 overflow-y-auto flex flex-col scrollbar-hide"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            <FeatureCard
              title="Scalability"
              description="Through off-chain payment channels and multi-hop routing, Fiber Network can achieve high-throughput transaction processing, meeting the needs of large-scale users."
            >
              <Image
                src="/scalability-animated.png"
                alt="Scalability"
                width={320}
                height={320}
              />
            </FeatureCard>

            <FeatureCard
              title="Low cost"
              description="By reducing the frequency of on-chain transactions, Fiber Network lowers transaction fees, making micropayments feasible and efficient."
            >
              <Image
                src="/low-cost-animated.png"
                alt="LowCost"
                width={320}
                height={320}
              />
            </FeatureCard>

            <FeatureCard
              title="Fast"
              description="The instant confirmation of off-chain transactions provides a split second payment confirmation experience suitable for various instant payment scenarios."
            >
              <Image
                src="/fast-animated.png"
                alt="Fast"
                width={320}
                height={320}
              />
            </FeatureCard>
            <FeatureCard
              title="Multi-Asset Support"
              description="Fiber Network supports payments in a variety of digital assets, offering users a broader range of payment options."
            >
              <Image
                src="/multi-asset-animated.png"
                alt="Multi-Asset Support"
                width={320}
                height={320}
              />
            </FeatureCard>
            <FeatureCard
              title="Interoperability"
              description="Fiber Network supports interoperability with the Bitcoin Lightning Network, providing support for cross-chain payments and asset transfers."
              isLast={true}
            >
              <Image
                src="/interoperability-animated.png"
                alt="Interoperability"
                width={320}
                height={320}
              />
            </FeatureCard>
          </div>
        </div>
      </Section>
    </Section>
  );
}
