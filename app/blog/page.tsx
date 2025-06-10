import Link from 'next/link';
import blogPosts from './list.json';

function formatDate(dateString: string) {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export default function BlogPage() {
  return (
    <main className="flex flex-1 flex-col px-4 py-8">
      <div className="max-w-4xl mx-auto w-full">
        {/* Header Section */}
        <div className="text-center mb-12">
          <h1 className="mb-4 text-4xl font-bold">Blog</h1>
          <p className="text-lg text-fd-muted-foreground max-w-2xl mx-auto">
            Latest updates and insights from the Fiber team
          </p>
        </div>

        {/* Blog Posts List */}
        <div className="space-y-6">
          {blogPosts.map((post, index) => (
            <article
              key={post.id}
              className="group relative border border-fd-border rounded-lg p-6 hover:border-fd-primary/50 transition-all duration-200 hover:shadow-lg bg-fd-background/50"
            >
              {/* Post Number - Retro Style */}
              <div className="absolute -left-3 -top-3 w-8 h-8 bg-fd-primary text-fd-primary-foreground rounded-full flex items-center justify-center text-sm font-mono font-bold shadow-lg">
                {String(index + 1).padStart(2, '0')}
              </div>

              {/* Post Content */}
              <div className="space-y-3">
                {/* Meta Information */}
                <div className="flex flex-wrap items-center gap-4 text-sm text-fd-muted-foreground">
                  <time className="font-mono">{formatDate(post.date)}</time>
                  <span>•</span>
                  <span>{post.readTime}</span>
                  <span>•</span>
                  <span>by {post.author}</span>
                </div>

                {/* Title */}
                <h2 className="text-xl font-semibold text-fd-foreground group-hover:text-fd-primary transition-colors">
                  <Link href={`/blog/${post.id}`} className="stretched-link">
                    {post.title}
                  </Link>
                </h2>

                {/* Excerpt */}
                <p className="text-fd-muted-foreground leading-relaxed">
                  {post.excerpt}
                </p>

                {/* Tags */}
                <div className="flex flex-wrap gap-2 pt-2">
                  {post.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-1 text-xs font-medium bg-fd-muted text-fd-muted-foreground rounded-full hover:bg-fd-primary/10 hover:text-fd-primary transition-colors"
                    >
                      #{tag.toLowerCase().replace(/\s+/g, '')}
                    </span>
                  ))}
                </div>
              </div>

              {/* Read More Arrow */}
              <div className="absolute right-6 top-1/2 transform -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                <svg
                  className="w-5 h-5 text-fd-primary"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </div>
            </article>
          ))}
        </div>
      </div>
    </main>
  );
} 
