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

  return (
    <>
      <p role="status" className="text-sm text-fd-muted-foreground mb-4">
        {isLoading ? 'Loading additional devlogs…' : error ? 'Devlogs are temporarily unavailable. Articles and Pulse updates are available below.' : null}
      </p>
      <BlogClientFilter allPosts={allPosts} />
    </>
  );
}
