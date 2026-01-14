import type { ReactNode } from 'react';
import Header from '@/components/header';
import Footer from '@/components/footer';

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <div style={{ backgroundColor: '#0a0a0a' }}>
      <Header />
      {children}
      <Footer />
    </div>
  );
}
