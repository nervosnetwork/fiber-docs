import React from "react";
import { CalenderIcon, CheckIcon } from "./icons";
import { Tooltip } from "./Tooltip";
import { Dependency, StatusBadge } from "./StatusBadge";

export interface VersionBadgeProps {
  author?: string;
  authorUrl?: string;
  date: string;
  dependencies?: Dependency[];
  className?: string;
}

export function VersionBadge({
  author,
  authorUrl,
  date,
  dependencies = [],
  className = "",
}: VersionBadgeProps) {
  const renderDependency = (dep: Dependency, index: number) => {
    const content = (
      <div className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 shadow-sm hover:shadow-md transition-all duration-200">
        <div className="flex items-center gap-1">
          <span className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">
            {dep.name}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-xs sm:text-sm font-bold text-gray-900 dark:text-gray-100">
            v{dep.minVersion}
          </span>
        </div>
        {dep.link && (
          <svg
            className="w-3 h-3 text-gray-400 dark:text-gray-500 flex-shrink-0"
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
        )}
      </div>
    );

    if (dep.link) {
      return (
        <a
          key={index}
          href={dep.link}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:scale-105 transition-transform duration-200 no-underline min-w-0"
        >
          {content}
        </a>
      );
    }

    return (
      <div key={index} className="min-w-0">
        {content}
      </div>
    );
  };

  return (
    <div
      className={`px-3 sm:px-6 py-3 sm:py-4 mb-6 sm:mb-8 rounded-xl border-2 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all duration-200 ${className}`}
    >
      {/* Header Section */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-2">
        <Tooltip
          content="The dependencies versions listed below have been tested when writing the documentation."
          position="top"
        >
          <div className="flex items-center gap-2">
            <CheckIcon />
            <span className="text-sm sm:text-base font-semibold text-gray-700 dark:text-gray-300">
              {dependencies.length > 0
                ? "Requirements"
                : "No Listed Requirements"}
            </span>
          </div>
        </Tooltip>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
          {author && (
            <div className="flex items-center gap-1.5 text-xs sm:text-sm text-gray-500 dark:text-gray-400">
              <svg
                className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0"
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
              <span className="truncate">
                by{" "}
                {authorUrl ? (
                  <a
                    className="underline hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                    href={authorUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {author}
                  </a>
                ) : (
                  author
                )}
              </span>
            </div>
          )}

          <div className="flex items-center justify-between sm:justify-start gap-2 sm:gap-3">
            <div className="flex items-center gap-1.5 text-xs sm:text-sm text-gray-500 dark:text-gray-400">
              <CalenderIcon />
              <span className="whitespace-nowrap">Updated {date}</span>
            </div>
            <StatusBadge dependencies={dependencies} />
          </div>
        </div>
      </div>

      {/* Dependencies Section */}
      {dependencies.length > 0 && (
        <div className="mt-3 sm:mt-4">
          <div className="flex flex-wrap gap-1.5 sm:gap-2">
            {dependencies.map(renderDependency)}
          </div>
        </div>
      )}
    </div>
  );
}
