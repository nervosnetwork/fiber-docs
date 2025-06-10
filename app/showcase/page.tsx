"use client";

import Link from "next/link";
import { useState } from "react";
import { categories, showcaseProjects } from "./data";

function getLanguageColor(language: string) {
  const colors: { [key: string]: string } = {
    TypeScript: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    JavaScript:
      "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    Rust: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
    Python:
      "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
    Java: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200",
    Bruno: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    HTML: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  };
  return (
    colors[language] ||
    "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200"
  );
}

export default function ShowcasePage() {
  const [selectedCategory, setSelectedCategory] = useState("All");
  
  // Filter projects based on selected category
  const filteredProjects = selectedCategory === "All" 
    ? showcaseProjects 
    : showcaseProjects.filter(project => project.category === selectedCategory);

  const handleCardClick = (project: any) => {
    // Open GitHub URL in new tab when card is clicked
    window.open(project.githubUrl, '_blank', 'noopener noreferrer');
  };

  return (
    <main className="flex flex-1 flex-col px-4 py-8">
      <div className="max-w-7xl mx-auto w-full">
        {/* Header Section */}
        <div className="text-center mb-12">
          <h1 className="mb-4 text-4xl font-bold">Awesome Fiber</h1>
          <p className="text-lg text-fd-muted-foreground max-w-3xl mx-auto">
            Explore Open Source Projects Built on Fiber Network
          </p>
        </div>

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

        {/* Projects Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {filteredProjects.map((project) => (
            <div
              key={project.id}
              onClick={() => handleCardClick(project)}
              className="group border border-fd-border rounded-lg overflow-hidden hover:border-fd-primary/50 transition-all duration-200 hover:shadow-lg bg-fd-background cursor-pointer flex flex-col"
            >
              {/* Project Content */}
              <div className="p-6 flex flex-col flex-1">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-semibold text-fd-foreground group-hover:text-fd-primary transition-colors">
                    {project.title}
                  </h3>
                </div>

                {/* Tags */}
                <div className="flex flex-wrap gap-1 mb-4">
                  {project.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-xs p-1 bg-fd-muted text-fd-muted-foreground rounded border-1"
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                <p className="text-sm text-fd-muted-foreground mb-4 line-clamp-3 flex-1">
                  {project.description}
                </p>

                {/* Footer */}
                <div className="flex items-center justify-between mt-auto">
                  <span
                    className={`text-xs px-2 py-1 rounded-full font-medium ${getLanguageColor(
                      project.language
                    )}`}
                  >
                    {project.language}
                  </span>

                  <div className="flex" onClick={(e) => e.stopPropagation()}>
                    <Link
                      href={project.githubUrl}
                      className="p-2 text-fd-muted-foreground hover:text-fd-foreground transition-colors"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                      </svg>
                    </Link>
                    {project.demoUrl && (
                      <Link
                        href={project.demoUrl}
                        className="p-2 text-fd-muted-foreground hover:text-fd-primary transition-colors"
                        target="_blank"
                        rel="noopener noreferrer"
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
                            d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                          />
                        </svg>
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Show message when no projects match filter */}
        {filteredProjects.length === 0 && (
          <div className="text-center py-12">
            <p className="text-fd-muted-foreground">
              No projects found for the selected category.
            </p>
          </div>
        )}

        {/* Call to Action */}
        <div className="text-center bg-fd-muted/30 rounded-lg p-12 border border-fd-border">
          <h3 className="text-2xl font-semibold mb-4">
            Build the Next Small Thing
          </h3>
          <p className="text-fd-muted-foreground mb-6 max-w-2xl mx-auto">
            Ready to create something small on Fiber Network? Get started with
            our documentation and join a growing community of builders.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/docs"
              className="px-6 py-3 bg-fd-primary text-fd-primary-foreground rounded-lg font-medium hover:opacity-90 transition-opacity"
            >
              Start Building
            </Link>
            <Link
              href="https://github.com/nervosnetwork/fiber-docs"
              className="px-6 py-3 border border-fd-border rounded-lg font-medium hover:border-fd-primary/50 transition-colors"
              target="_blank"
              rel="noopener noreferrer"
            >
              Contribute on GitHub
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
