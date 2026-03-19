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
  icons: {
    icon: '/logo/favicon.svg',
  },
};

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${atkinsonHyperlegible.variable} dark`} suppressHydrationWarning>
      <body className="flex flex-col min-h-screen">
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
