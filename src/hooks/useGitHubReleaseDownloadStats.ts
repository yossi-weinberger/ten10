import { useState, useEffect, useCallback } from "react";

const GITHUB_REPO_OWNER = "yossi-weinberger";
const GITHUB_REPO_NAME = "ten10";
const GITHUB_RELEASES_URL = `https://api.github.com/repos/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}/releases`;

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

interface GitHubAsset {
  name: string;
  download_count: number;
}

interface GitHubRelease {
  tag_name: string;
  assets: GitHubAsset[];
}

export interface ReleaseDownloadRow {
  tagName: string;
  installerDownloads: number;
  updateChecks: number;
}

export interface GitHubReleaseDownloadStats {
  installerDownloads: number;
  installerDownloadsLast3: number;
  updateChecks: number;
  byRelease: ReleaseDownloadRow[];
}

interface UseGitHubReleaseDownloadStatsReturn {
  stats: GitHubReleaseDownloadStats | null;
  loading: boolean;
  error: Error | null;
  refetch: () => void;
}

let cache: { data: GitHubReleaseDownloadStats; expiresAt: number } | null =
  null;

/**
 * True only for actual installer files: .msi, .exe, .dmg, .appimage.
 * Excludes: .sig, latest.json, and any non-installer files.
 */
function isInstallerAsset(name: string): boolean {
  const n = name.toLowerCase();
  if (n.endsWith(".sig")) return false;
  return (
    n.endsWith(".msi") ||
    n.endsWith(".exe") ||
    n.endsWith(".dmg") ||
    n.endsWith(".appimage")
  );
}

/** True only for latest.json (update checks, not installer downloads). */
function isUpdateCheckAsset(name: string): boolean {
  const n = name.toLowerCase();
  return n === "latest.json";
}

const MAX_PAGES = 5;
const PER_PAGE = 100;

async function fetchAllReleases(): Promise<GitHubRelease[]> {
  const releases: GitHubRelease[] = [];
  let page = 1;

  while (page <= MAX_PAGES) {
    const url = `${GITHUB_RELEASES_URL}?per_page=${PER_PAGE}&page=${page}`;
    const response = await fetch(url, {
      headers: { Accept: "application/vnd.github+json" },
    });

    if (!response.ok) {
      throw new Error(
        `GitHub API returned ${response.status}: ${response.statusText}`
      );
    }

    const data: GitHubRelease[] = await response.json();
    if (data.length === 0) break;

    releases.push(...data);
    if (data.length < PER_PAGE) break;
    page++;
  }

  return releases;
}

const RELEASES_LAST_N = 3;

function computeStats(releases: GitHubRelease[]): GitHubReleaseDownloadStats {
  let installerDownloads = 0;
  let installerDownloadsLast3 = 0;
  let updateChecks = 0;
  const byRelease: ReleaseDownloadRow[] = [];

  for (let i = 0; i < releases.length; i++) {
    const release = releases[i];
    const isInLast3 = i < RELEASES_LAST_N;
    let releaseInstallers = 0;
    let releaseUpdateChecks = 0;

    for (const asset of release.assets) {
      const count = asset.download_count ?? 0;
      if (isInstallerAsset(asset.name)) {
        installerDownloads += count;
        releaseInstallers += count;
        if (isInLast3) installerDownloadsLast3 += count;
      } else if (isUpdateCheckAsset(asset.name)) {
        updateChecks += count;
        releaseUpdateChecks += count;
      }
    }

    byRelease.push({
      tagName: release.tag_name,
      installerDownloads: releaseInstallers,
      updateChecks: releaseUpdateChecks,
    });
  }

  return {
    installerDownloads,
    installerDownloadsLast3,
    updateChecks,
    byRelease,
  };
}

/**
 * Hook to fetch GitHub release download statistics across all releases.
 * Distinguishes between installer downloads (MSI, EXE, DMG, AppImage) and
 * update checks (latest.json). Caches results for 5 minutes.
 *
 * @returns Installer download count, update check count, loading state
 */
export function useGitHubReleaseDownloadStats(): UseGitHubReleaseDownloadStatsReturn {
  const [stats, setStats] = useState<GitHubReleaseDownloadStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [refetchTrigger, setRefetchTrigger] = useState(0);

  const fetchStats = useCallback(async () => {
    if (cache && Date.now() < cache.expiresAt) {
      setStats(cache.data);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const releases = await fetchAllReleases();
      const computed = computeStats(releases);

      cache = {
        data: computed,
        expiresAt: Date.now() + CACHE_TTL_MS,
      };

      setStats(computed);
    } catch (err) {
      console.error("Failed to fetch GitHub release download stats:", err);
      setError(err instanceof Error ? err : new Error("Unknown error"));
      setStats(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats, refetchTrigger]);

  const refetch = useCallback(() => {
    cache = null;
    setRefetchTrigger((prev) => prev + 1);
  }, []);

  return { stats, loading, error, refetch };
}
