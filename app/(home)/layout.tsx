import { JsonLd } from '@/components/json-ld';
import { pageMetadata } from '@/lib/seo';
import type { ReactNode } from 'react';
import Header from '@/components/header';
import Footer from '@/components/footer';

export const metadata = pageMetadata('Multi-Asset Payment Channels', 'Instant, low-cost payments on Nervos CKB. Explore Fiber Network, run a node, and build applications interoperable with Bitcoin Lightning.', '/');

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <div style={{ backgroundColor: '#0a0a0a', width: '100%', maxWidth: '1600px', margin: '0 auto'  }}>
      <JsonLd data={{ '@context': 'https://schema.org', '@graph': [
        { '@type': 'Organization', '@id': 'https://www.fiber.world/#organization', name: 'Fiber Network', url: 'https://www.fiber.world', logo: 'https://www.fiber.world/logo.svg' },
        { '@type': 'WebSite', url: 'https://www.fiber.world', name: 'Fiber Network', publisher: { '@id': 'https://www.fiber.world/#organization' } },
      ] }} />
      <Header />
      <div style={{}}>
        {children}
      </div>
      <Footer />
    </div>
  );
}
