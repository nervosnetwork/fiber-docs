import Image from 'next/image';
import Section from './section';
import FeatureCard from './feature-card';

export default function HighlightedFeatures() {
  const features = [
    {
      title: 'Scalability',
      description:
        'Through off-chain payment channels and multi-hop routing, Fiber Network can achieve high-throughput transaction processing, meeting the needs of large-scale users.',
      image: '/scalability-animated.png',
    },
    {
      title: 'Low cost',
      description:
        'By reducing the frequency of on-chain transactions, Fiber Network lowers transaction fees, making micropayments feasible and efficient.',
      image: '/low-cost-animated.png',
    },
    {
      title: 'Fast',
      description:
        'The instant confirmation of off-chain transactions provides a split second payment confirmation experience suitable for various instant payment scenarios.',
      image: '/fast-animated.png',
    },
    {
      title: 'Multi-Asset Support',
      description:
        'Fiber Network supports payments in a variety of digital assets, offering users a broader range of payment options.',
      image: '/multi-asset-animated.png',
    },
    {
      title: 'Interoperability',
      description:
        'Fiber Network supports interoperability with the Bitcoin Lightning Network, providing support for cross-chain payments and asset transfers.',
      image: '/interoperability-animated.png',
    },
  ];

  return (
    <Section
      title={
        <>
          <span className="text-tertiary">Highlighted</span> Features
        </>
      }
    >
      <Section>
        <div className="self-stretch h-[560px] lg:h-[720px] border-t border-b border-invisible relative">
          {/* Mobile: stacking effect without separate headers */}
          <div
            className="lg:hidden absolute inset-0 overflow-y-auto scrollbar-hide"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {features.map((feature, index) => (
              <div 
                key={feature.title}
                className="sticky top-0 h-[560px] bg-black"
                style={{
                  zIndex: index + 1,
                }}
              >
                <FeatureCard
                  title={feature.title}
                  description={feature.description}
                  isLast={index === features.length - 1}
                >
                  <Image
                    src={feature.image}
                    alt={feature.title}
                    width={320}
                    height={320}
                  />
                </FeatureCard>
              </div>
            ))}
          </div>

          {/* Desktop/Tablet: stacking effect with headers */}
          <div
            className="hidden lg:block absolute inset-0 overflow-y-auto scrollbar-hide"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {features.map((feature, index) => (
              <div 
                key={feature.title}
                className="sticky"
                style={{
                  top: `${index * 56}px`,
                }}
              >
                {/* Sticky header - high z-index to stay above all content */}
                <div 
                  className="w-full p-4 bg-layer-01 border border-invisible relative"
                  style={{
                    zIndex: 100 + index,
                  }}
                >
                  <div className="text-secondary text-base font-normal font-['Inter'] leading-6">
                    {String(index + 1).padStart(2, '0')} {feature.title}
                  </div>
                </div>
                
                {/* Content with background to cover previous content - lower z-index */}
                <div 
                  className="h-[664px] bg-black relative"
                  style={{
                    zIndex: index + 1,
                  }}
                >
                  <FeatureCard
                    title={feature.title}
                    description={feature.description}
                    isLast={index === features.length - 1}
                  >
                    <Image
                      src={feature.image}
                      alt={feature.title}
                      width={320}
                      height={320}
                    />
                  </FeatureCard>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Section>
    </Section>
  );
}
