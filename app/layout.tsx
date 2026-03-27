import './global.css';
import { RootProvider } from 'fumadocs-ui/provider';
import { Inter, Atkinson_Hyperlegible } from 'next/font/google';
import type { ReactNode } from 'react';
import type { Metadata } from 'next';

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  display: 'swap',
});

const atkinsonHyperlegible = Atkinson_Hyperlegible({
  variable: '--font-atkinson',
  subsets: ['latin'],
  weight: ['400', '700'],
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL('https://www.fiber.world'),
  icons: {
    icon: '/logo/favicon.svg',
  },
  openGraph: {
    images: [
      {
        url: '/imgs/open-graph.png',
        width: 1200,
        height: 630,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    images: ['/imgs/open-graph.png'],
  },
};

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${atkinsonHyperlegible.variable} dark bg-[#0a0a0a]`} suppressHydrationWarning>
      <body className="flex flex-col min-h-screen bg-[#0a0a0a]">
        <RootProvider
          theme={{
            defaultTheme: 'dark',
            attribute: 'class',
            enableSystem: false,
          }}
        >{children}</RootProvider>
      </body>
    </html>
  );
}
