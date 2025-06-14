import React from "react";

interface Dependency {
  name: string;
  minVersion: string;
  link?: string;
}

interface VersionBadgeProps {
  status?: "stable" | "needs-update" | "deprecated";
  author?: string;
  authorUrl?: string;
  date: string;
  dependencies?: Dependency[];
  className?: string;
}

export function VersionBadge({
  status = "stable",
  author,
  authorUrl,
  date,
  dependencies = [],
  className = "",
}: VersionBadgeProps) {
  const statusColors = {
    stable:
      "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700",
    "needs-update":
      "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-700",
    deprecated:
      "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-700",
  };

  const statusIcons = {
    stable: (
      <svg
        className="w-3 h-3 sm:w-4 sm:h-4"
        fill="currentColor"
        viewBox="0 0 20 20"
      >
        <path
          fillRule="evenodd"
          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
          clipRule="evenodd"
        />
      </svg>
    ),
    "needs-update": (
      <svg
        className="w-3 h-3 sm:w-4 sm:h-4"
        fill="currentColor"
        viewBox="0 0 20 20"
      >
        <path
          fillRule="evenodd"
          d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
          clipRule="evenodd"
        />
      </svg>
    ),
    deprecated: (
      <svg
        className="w-3 h-3 sm:w-4 sm:h-4"
        fill="currentColor"
        viewBox="0 0 20 20"
      >
        <path
          fillRule="evenodd"
          d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
          clipRule="evenodd"
        />
      </svg>
    ),
  };

  const renderDependency = (dep: Dependency, index: number) => {
    const content = (
      <div className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 shadow-sm hover:shadow-md transition-all duration-200">
        <div className="flex items-center gap-1">
          <span className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">
            {dep.name}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-xs text-gray-500 dark:text-gray-400">≥</span>
          <span className="text-xs sm:text-sm font-bold text-gray-900 dark:text-gray-100">
            {dep.minVersion}
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
        <div className="flex items-center gap-2">
          <svg
            className="w-3 h-3 sm:w-4 sm:h-4 text-gray-600 dark:text-gray-400 flex-shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
            />
          </svg>
          <span className="text-sm sm:text-base font-semibold text-gray-700 dark:text-gray-300">
            {dependencies.length > 0
              ? "Requirements"
              : "No Listed Requirements"}
          </span>
        </div>

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
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              <span className="whitespace-nowrap">Updated {date}</span>
            </div>

            <div
              className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 rounded-full text-xs font-semibold border ${statusColors[status]}`}
            >
              {statusIcons[status]}
              <span className="capitalize whitespace-nowrap">{status}</span>
            </div>
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
