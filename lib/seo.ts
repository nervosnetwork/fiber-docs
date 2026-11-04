import type { Metadata } from 'next';

export const SITE_URL = 'https://www.fiber.world';
export const SOCIAL_IMAGE = `${SITE_URL}/imgs/fiber-og.png`;

export function pageMetadata(title: string, description: string, path: string, article = false): Metadata {
  const url = new URL(path, SITE_URL).href;
  return {
    title: { absolute: `${title} | Fiber Network` },
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      siteName: 'Fiber Network',
      type: article ? 'article' : 'website',
      images: [{ url: SOCIAL_IMAGE, width: 1200, height: 630, alt: 'Fiber Network' }],
    },
    twitter: { card: 'summary_large_image', title, description, images: [SOCIAL_IMAGE] },
  };
}
