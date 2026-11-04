import { pageMetadata } from '@/lib/seo';
import type { ReactNode } from 'react';
import { HomeLayout } from 'fumadocs-ui/layouts/home';
import { baseOptions } from '@/app/layout.config';

export const metadata = pageMetadata('Projects Built on Fiber', 'Explore wallets, payment tools, games, and open-source applications built on Fiber Network.', '/showcase');

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="bg-fd-background">
      <HomeLayout {...baseOptions}>{children}</HomeLayout>
    </div>
  );
} 
