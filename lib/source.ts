import { docs, blogPosts, pulsePosts } from '@/.source';
import { loader } from 'fumadocs-core/source';
import { createMDXSource } from 'fumadocs-mdx';

// See https://fumadocs.vercel.app/docs/headless/source-api for more info
export const source = loader({
  // it assigns a URL to your pages
  baseUrl: '/docs',
  source: docs.toFumadocsSource(),
});

// Blog source loader for blog posts
export const blog = loader({
  baseUrl: '/blog/p',
  source: createMDXSource(blogPosts),
});

// Blog source loader for Pulse
export const pulse = loader({
  baseUrl: '/blog/pulse',
  source: createMDXSource(pulsePosts),
});
