import type { ReactNode } from 'react';
import Header from '@/components/header';
import Footer from '@/components/footer';

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
