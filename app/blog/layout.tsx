import { pageMetadata } from '@/lib/seo';
import type { ReactNode } from 'react';
import { HomeLayout } from 'fumadocs-ui/layouts/home';
import { baseOptions } from '@/app/layout.config';

export const metadata = pageMetadata('Blog and Development Updates', 'Read Fiber Network articles, Pulse ecosystem updates, and development logs about payment channels, multi-asset payments, and Lightning interoperability.', '/blog');

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="bg-fd-background">
      <HomeLayout {...baseOptions}>{children}</HomeLayout>
    </div>
  );
} 
