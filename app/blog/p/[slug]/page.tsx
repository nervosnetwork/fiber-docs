import { notFound } from 'next/navigation';
import Link from 'next/link';
import { blog } from '@/lib/source';
import defaultMdxComponents from 'fumadocs-ui/mdx';
import { calculateReadingTime } from '../../util';

interface BlogPostProps {
  params: Promise<{ slug: string }>;
}

export default async function BlogPostPage({ params }: BlogPostProps) {
  const { slug } = await params;
  const page = blog.getPage([slug]);

  if (!page) notFound();

  const Body = page.data.body;
  
  // Calculate reading time from the page content if not provided
  const readTime = page.data.readTime || calculateReadingTime(page.data.content?.toString() || '');
  
  // Use today's date if no date is provided
  const postDate = page.data.date || new Date().toISOString().split('T')[0];

  return (
    <main className="flex flex-1 flex-col px-4 py-8">
      <div className="max-w-4xl mx-auto w-full">
        {/* Back Navigation */}
        <div className="mb-8">
          <Link 
            href="/blog" 
            className="inline-flex items-center gap-2 text-fd-muted-foreground hover:text-fd-primary transition-colors group"
          >
            <svg className="w-4 h-4 transition-transform group-hover:-translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" transform="rotate(180 12 12)" />
            </svg>
            Back to Blog
          </Link>
        </div>

        {/* Article Header */}
        <header className="mb-8">
          {/* Title */}
          <h1 className="text-4xl font-bold mb-6 text-fd-foreground">
            {page.data.title}
          </h1>
          
          {/* Meta Information */}
          <div className="flex flex-wrap items-center gap-4 text-sm text-fd-muted-foreground mb-6">
            <div className="flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3a2 2 0 012-2h4a2 2 0 012 2v4m-6 8h6m-8-4v8a2 2 0 002 2h12a2 2 0 002-2v-8M9 12h6" />
              </svg>
              <time className="font-mono">
                {new Date(postDate).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </time>
            </div>
            <span>•</span>
            <div className="flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{readTime}</span>
            </div>
            <span>•</span>
            <div className="flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <span>by {page.data.authorUrl ? <a className="underline" href={page.data.authorUrl} target="_blank" rel="noopener noreferrer">{page.data.author}</a> : page.data.author || 'Fiber Team'}</span>
            </div>
          </div>

          {/* Tags */}
          {page.data.tags && page.data.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-6">
              {page.data.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-3 py-1 text-xs font-medium bg-fd-muted text-fd-muted-foreground rounded-full hover:bg-fd-primary/10 hover:text-fd-primary transition-colors"
                >
                  #{tag.toLowerCase().replace(/\s+/g, '')}
                </span>
              ))}
            </div>
          )}

          {/* Description */}
          {page.data.description && (
            <p className="text-lg text-fd-muted-foreground leading-relaxed mb-8 max-w-3xl">
              {page.data.description}
            </p>
          )}
        </header>

        {/* Article Content */}
        <article className="prose prose-lg max-w-none mb-12">
	  <Body components={defaultMdxComponents} />
        </article>

        {/* Footer Navigation */}
        <footer className="pt-8 border-t border-fd-border">
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
            <Link 
              href="/blog" 
              className="inline-flex items-center gap-2 bg-fd-muted text-fd-foreground rounded-lg hover:bg-fd-muted/80 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" transform="rotate(180 12 12)" />
              </svg>
              All Posts
            </Link>
            
            <div className="text-sm text-fd-muted-foreground text-center">
              <p>Found this helpful? Share it with others!</p>
            </div>
          </div>
        </footer>
      </div>
    </main>
  );
}

// Generate static params for all blog posts
export async function generateStaticParams() {
  const pages = blog.getPages();
  return pages.map((page) => ({
    slug: page.slugs[0],
  }));
}

// Generate metadata for SEO
export async function generateMetadata({ params }: BlogPostProps) {
  const { slug } = await params;
  const page = blog.getPage([slug]);

  if (!page) {
    return {
      title: 'Blog Post | Fiber',
      description: 'A blog post from the Fiber team',
    };
  }

  return {
    title: `${page.data.title} | Fiber Blog`,
    description: page.data.description || `${page.data.title} - A blog post by ${page.data.author || 'Fiber Team'}`,
  };
} 
