import React, { useMemo } from "react";
import {
  StableStateIcon,
  NeedsUpdateStateIcon,
  DeprecatedStateIcon,
  LatestStateIcon,
} from "./icons";
import { Tooltip } from "./Tooltip";
import { LatestVersions } from "@/lib/config";

export enum VersionStatus {
  Latest = "latest",
  Stable = "stable",
  NeedsUpdate = "needs-update",
  Deprecated = "deprecated",
}

export interface Dependency {
  name: string;
  minVersion: string;
  link?: string;
}

export interface StatusBadgeProps {
  dependencies?: Dependency[];
  className?: string;
}

interface VersionComparison {
  major: number;
  minor: number;
  patch: number;
}

enum ComparisonResult {
  LOWER = -1,
  EQUAL = 0,
  HIGHER = 1,
}

// Static configurations - defined once
const STATUS_COLORS = {
  [VersionStatus.Latest]:
    "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700",
  [VersionStatus.Stable]:
    "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700",
  [VersionStatus.NeedsUpdate]:
    "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-700",
  [VersionStatus.Deprecated]:
    "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-700",
} as const;

const STATUS_DESCRIPTIONS = {
  [VersionStatus.Latest]:
    "The documentation is up-to-date and matches the latest development.",
  [VersionStatus.Stable]:
    "The documentation may be slightly left behind the latest development but is stable for reading.",
  [VersionStatus.NeedsUpdate]:
    "The documentation may be outdated for reading since it left behind breaking changes in the latest development.",
  [VersionStatus.Deprecated]:
    "The documentation is deprecated for reading and will be removed in the future.",
} as const;

const STATUS_ICONS = {
  [VersionStatus.Latest]: <LatestStateIcon />,
  [VersionStatus.Stable]: <StableStateIcon />,
  [VersionStatus.NeedsUpdate]: <NeedsUpdateStateIcon />,
  [VersionStatus.Deprecated]: <DeprecatedStateIcon />,
} as const;

// Version comparison utilities - moved outside component for performance
const parseVersion = (version: string): VersionComparison => {
  const parts = version.split(".").map((p) => parseInt(p, 10) || 0);
  while (parts.length < 3) parts.push(0);

  return {
    major: parts[0],
    minor: parts[1],
    patch: parts[2],
  };
};

const normalizeZeroVersion = (
  version: VersionComparison
): VersionComparison => {
  // For 0.x.x versions, treat x as major and patch as minor
  if (version.major === 0) {
    return {
      major: version.minor,
      minor: version.patch,
      patch: 0,
    };
  }
  return version;
};

const compareVersions = (
  current: string,
  required: string
): ComparisonResult => {
  const currentParsed = normalizeZeroVersion(parseVersion(current));
  const requiredParsed = normalizeZeroVersion(parseVersion(required));

  // Compare major version
  if (currentParsed.major > requiredParsed.major)
    return ComparisonResult.HIGHER;
  if (currentParsed.major < requiredParsed.major) return ComparisonResult.LOWER;

  // Compare minor version
  if (currentParsed.minor > requiredParsed.minor)
    return ComparisonResult.HIGHER;
  if (currentParsed.minor < requiredParsed.minor) return ComparisonResult.LOWER;

  // Compare patch version
  if (currentParsed.patch > requiredParsed.patch)
    return ComparisonResult.HIGHER;
  if (currentParsed.patch < requiredParsed.patch) return ComparisonResult.LOWER;

  return ComparisonResult.EQUAL;
};

const analyzeVersionCompatibility = (
  dependencies: Dependency[],
  apiVersions: Record<string, string>
) => {
  let hasBreakingChanges = false;
  let hasMinorUpdates = false;
  let hasDeprecatedVersions = false;
  let hasExactMatches = false;

  for (const dep of dependencies) {
    const currentVersion = apiVersions[dep.name];

    if (!currentVersion) {
      continue; // Skip if version not found in API
    }

    const comparison = compareVersions(currentVersion, dep.minVersion);

    switch (comparison) {
      case ComparisonResult.HIGHER:
        // Current version is higher - could be breaking changes or new features
        const currentParsed = normalizeZeroVersion(
          parseVersion(currentVersion)
        );
        const requiredParsed = normalizeZeroVersion(
          parseVersion(dep.minVersion)
        );

        if (currentParsed.major > requiredParsed.major) {
          hasBreakingChanges = true;
        } else {
          hasMinorUpdates = true;
        }
        break;

      case ComparisonResult.LOWER:
        hasDeprecatedVersions = true;
        break;

      case ComparisonResult.EQUAL:
        // Versions match exactly
        hasExactMatches = true;
        break;
    }
  }

  return {
    hasBreakingChanges,
    hasMinorUpdates,
    hasDeprecatedVersions,
    hasExactMatches,
  };
};

const determineStatusFromAnalysis = (
  analysis: ReturnType<typeof analyzeVersionCompatibility>
): VersionStatus => {
  const {
    hasBreakingChanges,
    hasMinorUpdates,
    hasDeprecatedVersions,
    hasExactMatches,
  } = analysis;

  // Priority order: Deprecated > Needs Update > Latest > Stable
  if (hasDeprecatedVersions) {
    return VersionStatus.Deprecated;
  }

  if (hasBreakingChanges) {
    return VersionStatus.NeedsUpdate;
  }

  // If all dependencies have exact matches (and no breaking changes or deprecated versions)
  if (hasExactMatches && !hasMinorUpdates) {
    return VersionStatus.Latest;
  }

  return VersionStatus.Stable;
};

const determineStatus = (
  dependencies: Dependency[],
  apiVersions: Record<string, string> = LatestVersions
): VersionStatus => {
  if (dependencies.length === 0) {
    return VersionStatus.Stable;
  }

  const analysis = analyzeVersionCompatibility(dependencies, apiVersions);
  return determineStatusFromAnalysis(analysis);
};

export const StatusBadge = React.memo<StatusBadgeProps>(function StatusBadge({
  dependencies = [],
  className = "",
}) {
  // Calculate status once using useMemo with a stable dependency key
  const status = useMemo(() => {
    return determineStatus(dependencies);
  }, [dependencies]);

  return (
    <Tooltip content={STATUS_DESCRIPTIONS[status]} position="top">
      <div
        className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 rounded-full text-xs font-semibold border ${STATUS_COLORS[status]} ${className}`}
      >
        {STATUS_ICONS[status]}
        <span className="capitalize whitespace-nowrap">{status}</span>
      </div>
    </Tooltip>
  );
});
