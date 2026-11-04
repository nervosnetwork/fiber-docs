import { pageMetadata } from '@/lib/seo';
import type { ReactNode } from 'react';
import Header from '@/components/header';
import Footer from '@/components/footer';

export const metadata = pageMetadata('Multi-Asset Payment Channels', 'Instant, low-cost payments on Nervos CKB. Explore Fiber Network, run a node, and build applications interoperable with Bitcoin Lightning.', '/');

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <div style={{ backgroundColor: '#0a0a0a', width: '100%', maxWidth: '1600px', margin: '0 auto'  }}>
      <Header />
      <div style={{}}>
        {children}
      </div>
      <Footer />
    </div>
  );
}
