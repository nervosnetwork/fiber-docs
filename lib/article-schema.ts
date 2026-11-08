import { SITE_URL, SOCIAL_IMAGE } from './seo';

export function articleSchema(data: { title: string; description?: string; author?: string; authorUrl?: string; date?: string | Date; lastModified?: string | Date }, path: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: data.title,
    description: data.description,
    url: new URL(path, SITE_URL).href,
    mainEntityOfPage: new URL(path, SITE_URL).href,
    image: SOCIAL_IMAGE,
    datePublished: data.date instanceof Date ? data.date.toISOString() : data.date,
    dateModified: data.lastModified instanceof Date ? data.lastModified.toISOString() : data.lastModified,
    author: data.author && data.author !== 'Fiber Team'
      ? { '@type': 'Person', name: data.author, url: data.authorUrl }
      : { '@type': 'Organization', name: 'Fiber Network', url: SITE_URL },
    publisher: { '@type': 'Organization', name: 'Fiber Network', url: SITE_URL },
  };
}
