import {
  defineConfig,
  defineDocs,
  defineCollections,
  frontmatterSchema,
  metaSchema,
} from 'fumadocs-mdx/config';
import { z } from 'zod';

// You can customise Zod schemas for frontmatter and `meta.json` here
// see https://fumadocs.vercel.app/docs/mdx/collections#define-docs
export const docs = defineDocs({
  docs: {
    schema: frontmatterSchema.extend({
      author: z.string().optional(),
      authorUrl: z.string().url().optional(),
      date: z.string().date().or(z.date()).optional(),
    }),
  },
  meta: {
    schema: metaSchema,
  },
});

// Define blog collection for blog posts in the app/blog/p directory
export const blogPosts = defineCollections({
  type: 'doc',
  dir: 'app/blog/p',
  schema: frontmatterSchema.extend({
    author: z.string().optional().default('Fiber Team'),
    authorUrl: z.string().url().optional(),
    date: z.string().date().or(z.date()).optional(),
    readTime: z.string().optional(),
    tags: z.array(z.string()).optional().default([]),
  }),
});

export default defineConfig({
  mdxOptions: {
    // MDX options
  },
});
