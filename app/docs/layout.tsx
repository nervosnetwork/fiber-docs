import { DocsLayout } from 'fumadocs-ui/layouts/docs';
import type { ReactNode } from 'react';
import { baseOptions } from '@/app/layout.config';
import { source } from '@/lib/source';

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="bg-fd-background">
      <DocsLayout
        tree={source.pageTree}
        {...baseOptions}
        links={[]}
        sidebar={{
          tabs: false,
        }}
        searchToggle={{ enabled: true }}
      >
        {children}
      </DocsLayout>
    </div>
  );
}
