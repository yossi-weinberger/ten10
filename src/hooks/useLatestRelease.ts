import { useState, useEffect } from "react";

export interface GitHubAsset {
  name: string;
  browser_download_url: string;
  size: number;
  download_count: number;
  content_type: string;
}

export interface GitHubRelease {
  tag_name: string;
  name: string;
  published_at: string;
  body: string;
  assets: GitHubAsset[];
}

export interface ReleaseDownloads {
  windowsMsi?: GitHubAsset;
  windowsExe?: GitHubAsset;
  windowsWithWebView2?: GitHubAsset;
  macOsDmg?: GitHubAsset;
  linuxAppImage?: GitHubAsset;
}

interface UseLatestReleaseReturn {
  release: GitHubRelease | null;
  downloads: ReleaseDownloads;
  loading: boolean;
  error: Error | null;
  refetch: () => void;
}

interface UseLatestReleaseOptions {
  enabled?: boolean;
  cacheTtlMs?: number;
}

const GITHUB_REPO_OWNER = "yossi-weinberger";
const GITHUB_REPO_NAME = "ten10";
const GITHUB_API_URL = `https://api.github.com/repos/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}/releases/latest`;
const CACHE_KEY = "ten10_latest_release";
const DEFAULT_CACHE_TTL_MS = 1000 * 60 * 15;

interface CachedRelease {
  timestamp: number;
  release: GitHubRelease;
}

const parseDownloads = (release: GitHubRelease): ReleaseDownloads => {
  const parsedDownloads: ReleaseDownloads = {};

  for (const asset of release.assets) {
    const name = asset.name.toLowerCase();

    if (name.endsWith(".sig")) continue;

    if (
      (name.endsWith(".exe") || name.includes(".exe.")) &&
      (name.includes("with_webview2") ||
        name.includes("webview2") ||
        name.includes("webview") ||
        name.includes("offline"))
    ) {
      parsedDownloads.windowsWithWebView2 = asset;
    } else if (name.endsWith(".msi") || name.includes(".msi.")) {
      parsedDownloads.windowsMsi = asset;
    } else if (name.endsWith(".exe") || name.includes(".exe.")) {
      parsedDownloads.windowsExe = asset;
    } else if (name.endsWith(".dmg") || name.includes(".dmg.")) {
      parsedDownloads.macOsDmg = asset;
    } else if (name.endsWith(".appimage") || name.includes(".appimage.")) {
      parsedDownloads.linuxAppImage = asset;
    }
  }

  return parsedDownloads;
};

/**
 * Hook to fetch the latest release from GitHub
 *
 * Fetches release information including version, assets (installers), and metadata.
 * Caches the result to avoid excessive API calls.
 *
 * @returns Release information and download links
 */
export function useLatestRelease(
  options: UseLatestReleaseOptions = {}
): UseLatestReleaseReturn {
  const { enabled = true, cacheTtlMs = DEFAULT_CACHE_TTL_MS } = options;
  const [release, setRelease] = useState<GitHubRelease | null>(null);
  const [downloads, setDownloads] = useState<ReleaseDownloads>({});
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<Error | null>(null);
  const [refetchTrigger, setRefetchTrigger] = useState(0);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    const fetchRelease = async () => {
      setLoading(true);
      setError(null);

      try {
        try {
          const cached = sessionStorage.getItem(CACHE_KEY);

          if (cached) {
            const parsed = JSON.parse(cached) as CachedRelease;
            const isFresh = Date.now() - parsed.timestamp < cacheTtlMs;

            if (isFresh) {
              setRelease(parsed.release);
              setDownloads(parseDownloads(parsed.release));
              setLoading(false);
              return;
            }
          }
        } catch {
          sessionStorage.removeItem(CACHE_KEY);
        }

        const response = await fetch(GITHUB_API_URL, {
          headers: {
            Accept: "application/vnd.github+json",
          },
        });

        if (!response.ok) {
          throw new Error(
            `GitHub API returned ${response.status}: ${response.statusText}`
          );
        }

        const data: GitHubRelease = await response.json();
        setRelease(data);
        setDownloads(parseDownloads(data));
        try {
          sessionStorage.setItem(
            CACHE_KEY,
            JSON.stringify({ timestamp: Date.now(), release: data })
          );
        } catch {
          // Ignore cache write failures so successful fetches still work.
        }
      } catch (err) {
        console.error("Failed to fetch latest release:", err);
        setError(err instanceof Error ? err : new Error("Unknown error"));
      } finally {
        setLoading(false);
      }
    };

    fetchRelease();
  }, [cacheTtlMs, enabled, refetchTrigger]);

  const refetch = () => {
    setRefetchTrigger((prev) => prev + 1);
  };

  return {
    release,
    downloads,
    loading,
    error,
    refetch,
  };
}

/**
 * Format file size in human-readable format
 *
 * @param bytes - Size in bytes
 * @returns Formatted string (e.g., "45.2 MB")
 */
export function formatFileSize(bytes: number): string {
  const units = ["B", "KB", "MB", "GB"];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(1)} ${units[unitIndex]}`;
}

/**
 * Get a clean version string from a tag name
 *
 * @param tagName - Git tag (e.g., "v0.2.9" or "0.2.9")
 * @returns Clean version (e.g., "0.2.9")
 */
export function getVersionFromTag(tagName: string): string {
  return tagName.startsWith("v") ? tagName.substring(1) : tagName;
}
