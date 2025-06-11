"use client";

import Link from "next/link";
import { useState } from "react";
import { BlogPost } from "./type";
import { formatDate } from "./util";

const categories = ["All", "Article", "Devlog"];

interface BlogClientFilterProps {
  allPosts: BlogPost[];
}

export default function BlogClientFilter({ allPosts }: BlogClientFilterProps) {
  const [selectedCategory, setSelectedCategory] = useState("All");

  // Filter posts based on selected category
  const filteredPosts =
    selectedCategory === "All"
      ? allPosts
      : selectedCategory === "Article"
      ? allPosts.filter((post) => post.type.toLowerCase() === "blog")
      : allPosts.filter((post) => post.type.toLowerCase() === "devlog");

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
    <>
      {/* Category Filter */}
      <div className="flex flex-wrap gap-2 mb-8 justify-center">
        {categories.map((category) => (
          <button
            key={category}
            onClick={() => setSelectedCategory(category)}
            className={`px-4 py-2 text-sm font-medium rounded-full border transition-all duration-200 ${
              selectedCategory === category
                ? "border-fd-primary bg-fd-primary text-fd-primary-foreground"
                : "border-fd-border hover:border-fd-primary/50 hover:bg-fd-primary/10"
            }`}
          >
            {category}
          </button>
        ))}
      </div>

      {/* Blog Posts List */}
      <div className="space-y-6">
        {filteredPosts.map((post, index) => (
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
      {filteredPosts.length === 0 && (
        <div className="text-center py-12">
          <p className="text-fd-muted-foreground">
            {allPosts.length === 0
              ? "No blog posts found."
              : "No posts found for the selected category."}
          </p>
        </div>
      )}
    </>
  );
}
