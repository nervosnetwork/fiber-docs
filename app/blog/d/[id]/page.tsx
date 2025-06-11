import { notFound } from "next/navigation";
import Link from "next/link";
import { getFiberDevLogById } from "../../devlog";
import { getMDXComponents } from "@/mdx-components";
import { MDXRemote } from "next-mdx-remote/rsc";

interface DevlogPageProps {
  params: Promise<{ id: string }>;
}

export default async function DevlogPage({ params }: DevlogPageProps) {
  const { id } = await params;

  // Decode the URL-encoded ID
  const decodedId = decodeURIComponent(id);

  let devlog;
  try {
    devlog = await getFiberDevLogById(decodedId);
  } catch (error) {
    console.error("Error fetching devlog:", error);
    notFound();
  }

  if (!devlog) notFound();

  return (
    <main className="flex flex-1 flex-col px-4 py-8">
      <div className="max-w-4xl mx-auto w-full">
        {/* Back Navigation */}
        <div className="mb-8">
          <Link
            href="/blog"
            className="inline-flex items-center gap-2 text-fd-muted-foreground hover:text-fd-primary transition-colors group"
          >
            <svg
              className="w-4 h-4 transition-transform group-hover:-translate-x-1"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
                transform="rotate(180 12 12)"
              />
            </svg>
            Back to Blog
          </Link>
        </div>

        {/* Article Header */}
        <header className="mb-8">
          {/* Title */}
          <h1 className="text-4xl font-bold mb-6 text-fd-foreground">
            {devlog.title}
          </h1>

          {/* Meta Information */}
          <div className="flex flex-wrap items-center gap-4 text-sm text-fd-muted-foreground mb-6">
            <div className="flex items-center gap-1">
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 7V3a2 2 0 012-2h4a2 2 0 012 2v4m-6 8h6m-8-4v8a2 2 0 002 2h12a2 2 0 002-2v-8M9 12h6"
                />
              </svg>
              <time className="font-mono">{devlog.date}</time>
            </div>
            <span>•</span>
            <div className="flex items-center gap-1">
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span>{devlog.readTime}</span>
            </div>
            <span>•</span>
            <div className="flex items-center gap-1">
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
              <span>
                by{" "}
                {devlog.authorUrl ? (
                  <a
                    className="underline"
                    href={devlog.authorUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {devlog.author}
                  </a>
                ) : (
                  devlog.author
                )}
              </span>
            </div>
          </div>

          {/* Tags */}
          {devlog.tags && devlog.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-6">
              {devlog.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-3 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full hover:bg-blue-200 transition-colors"
                >
                  #{tag.toLowerCase().replace(/\s+/g, "")}
                </span>
              ))}
            </div>
          )}
        </header>

        {/* Article Content */}
        <article className="prose prose-lg max-w-none mb-12">
          <MDXRemote
            source={devlog.rawMarkdown || devlog.excerpt}
            components={getMDXComponents()}
          />
        </article>

        {/* External Link to GitHub Discussion */}
        <div className="mb-8 p-4 bg-fd-muted/50 rounded-lg border border-fd-border">
          <div className="flex items-center gap-2 text-sm text-fd-muted-foreground mb-2">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
            </svg>
            View original discussion on GitHub
          </div>
          <a
            href={devlog.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-fd-primary hover:text-fd-primary/80 transition-colors font-medium"
          >
            Open in GitHub Discussions
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
              />
            </svg>
          </a>
        </div>

        {/* Footer Navigation */}
        <footer className="pt-8 border-t border-fd-border">
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
            <Link
              href="/blog"
              className="inline-flex items-center gap-2 px-4 py-2 bg-fd-muted text-fd-foreground rounded-lg hover:bg-fd-muted/80 transition-colors"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                  transform="rotate(180 12 12)"
                />
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

// Generate metadata for SEO
export async function generateMetadata({ params }: DevlogPageProps) {
  const { id } = await params;
  const decodedId = decodeURIComponent(id);

  try {
    const devlog = await getFiberDevLogById(decodedId);

    if (!devlog) {
      return {
        title: "Devlog | Fiber",
        description: "A development log from the Fiber team",
      };
    }

    return {
      title: `${devlog.title} | Fiber Devlog`,
      description: devlog.excerpt,
    };
  } catch (error) {
    return {
      title: "Devlog | Fiber",
      description: "A development log from the Fiber team",
    };
  }
}
