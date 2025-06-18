"use client";

import { useState, useEffect } from "react";
import { BlogPost } from "./type";
import BlogClientFilter from "./BlogClientFilter";

interface BlogWithDevlogsProps {
  documentPosts: BlogPost[];
}

interface DevlogApiResponse {
  success: boolean;
  data: BlogPost[];
  timestamp: number;
  error?: string;
}

export default function BlogWithDevlogs({
  documentPosts,
}: BlogWithDevlogsProps) {
  const [devlogPosts, setDevlogPosts] = useState<BlogPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDevlogs = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch("/api/devlogs?limit=20");

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result: DevlogApiResponse = await response.json();

        if (result.success) {
          setDevlogPosts(result.data);
        } else {
          throw new Error(result.error || "Failed to fetch devlogs");
        }
      } catch (err) {
        console.error("Error fetching devlogs:", err);
        setError(err instanceof Error ? err.message : "Unknown error occurred");
        // Continue with empty devlogs array
        setDevlogPosts([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDevlogs();
  }, []);

  const allPosts = [...documentPosts, ...devlogPosts].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  if (isLoading) {
    return (
      <div className="flex flex-col justify-center items-center py-16">
        <div className="relative">
          <div className="w-10 h-10 border-2 border-fd-border rounded-full"></div>
          <div className="absolute top-0 left-0 w-10 h-10 border-2 border-fd-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
        <p className="mt-4 text-sm text-fd-muted-foreground">
          Loading blog posts...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-yellow-600 mb-4">
          ⚠️ Some blog posts may not be available
        </div>
        <p className="text-fd-muted-foreground text-sm mb-6">{error}</p>
        <BlogClientFilter allPosts={documentPosts} />
      </div>
    );
  }

  return <BlogClientFilter allPosts={allPosts} />;
}
