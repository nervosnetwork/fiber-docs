import Link from "next/link";
import { blog } from "@/lib/source";
import { calculateReadingTime, formatDate } from "./util";
import { BlogPost } from "./type";
import { getFiberDevLogLists } from "./devlog";

export default async function BlogPage() {
  const documentPosts: BlogPost[] = blog.getPages().map((page) => {
    const data = page.data;
    return {
      id: page.slugs[0], // Use the slug as ID
      title: data.title,
      excerpt: data.description || `${data.title} - A blog post by ${data.author || 'Fiber Team'}`,
      date: typeof data.date === 'string' ? data.date : data.date?.toISOString().split('T')[0] || new Date().toISOString().split('T')[0],
      readTime: data.readTime || calculateReadingTime(data.content?.toString() || ''),
      tags: data.tags || [],
      author: data.author || 'Fiber Team',
      type: "blog" as const,
    };
  })

  let devlogPosts: BlogPost[] = [];
  try {
    devlogPosts = await getFiberDevLogLists(20);
  } catch (error) {
    console.error("Error fetching devlog posts:", error);
    // Continue without devlogs if there's an error
  }

  const allPosts = [...documentPosts, ...devlogPosts].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const PostLink = ({
    post,
    children,
  }: {
    post: BlogPost;
    children: React.ReactNode;
  }) => {
    if (post.type === "devlog") {
      return (
        <Link href={`/blog/d/${encodeURIComponent(post.id)}`} className="block">
          {children}
        </Link>
      );
    } else {
      return (
        <Link href={`/blog/p/${post.id}`} className="block">
          {children}
        </Link>
      );
    }
  };

  return (
    <main className="flex flex-1 flex-col px-4 py-8">
      <div className="max-w-4xl mx-auto w-full">
        {/* Header Section */}
        <div className="text-center mb-12">
          <h1 className="mb-4 text-4xl font-bold">Fiber Blog</h1>
          <p className="text-lg text-fd-muted-foreground max-w-2xl mx-auto">
            Latest updates and insights from the Fiber team
          </p>
        </div>

        {/* Blog Posts List */}
        <div className="space-y-6">
          {allPosts.map((post, index) => (
            <PostLink key={post.id} post={post}>
              <article className="group relative border border-fd-border rounded-lg p-6 hover:border-fd-primary/50 transition-all duration-200 hover:shadow-lg bg-fd-background/50 cursor-pointer">
                {/* Post Number - Retro Style */}
                <div className="absolute -left-3 -top-3 w-8 h-8 bg-fd-primary text-fd-primary-foreground rounded-full flex items-center justify-center text-sm font-mono font-bold shadow-lg">
                  {String(index + 1).padStart(2, "0")}
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
                    {post.title}
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
                        className={`px-2 py-1 text-xs font-medium rounded-full transition-colors ${
                          post.type === "devlog"
                            ? "bg-blue-100 text-blue-800 hover:bg-blue-200"
                            : "bg-fd-muted text-fd-muted-foreground hover:bg-fd-primary/10 hover:text-fd-primary"
                        }`}
                      >
                        #{tag.toLowerCase().replace(/\s+/g, "")}
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
            </PostLink>
          ))}
        </div>

        {/* No posts message */}
        {allPosts.length === 0 && (
          <div className="text-center py-12">
            <p className="text-fd-muted-foreground">
              No blog posts found.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
