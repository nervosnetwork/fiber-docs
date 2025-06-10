import { DocsLayout } from 'fumadocs-ui/layouts/docs';
import type { ReactNode } from 'react';
import { baseOptions } from '@/app/layout.config';
import { source } from '@/lib/source';

export default function Layout({ children }: { children: ReactNode }) {
  // Create docs-specific options without navbar links
  const docsOptions = {
    ...baseOptions,
    links: [], // Remove navbar links for docs pages
  };

  return (
    <DocsLayout tree={source.pageTree} {...docsOptions}>
      {children}
    </DocsLayout>
  );
}
