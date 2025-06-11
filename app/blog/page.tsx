import { blog } from "@/lib/source";
import { calculateReadingTime } from "./util";
import { BlogPost } from "./type";
import { getFiberDevLogLists } from "./devlog";
import BlogClientFilter from "./BlogClientFilter";

export default async function BlogPage() {
  const documentPosts: BlogPost[] = blog.getPages().map((page) => {
    const data = page.data;
    return {
      id: page.slugs[0], // Use the slug as ID
      title: data.title,
      excerpt:
        data.description ||
        `${data.title} - A blog post by ${data.author || "Fiber Team"}`,
      date:
        typeof data.date === "string"
          ? data.date
          : data.date?.toISOString().split("T")[0] ||
            new Date().toISOString().split("T")[0],
      readTime:
        data.readTime || calculateReadingTime(data.content?.toString() || ""),
      tags: data.tags || [],
      author: data.author || "Fiber Team",
      type: "blog" as const,
    };
  });

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

        <BlogClientFilter allPosts={allPosts} />
      </div>
    </main>
  );
}

// Add ISR for production performance
export const revalidate = 300; // Revalidate every 5 minutes
