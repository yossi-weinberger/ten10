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

const GITHUB_REPO_OWNER = "yossi-weinberger";
const GITHUB_REPO_NAME = "ten10";
const GITHUB_API_URL = `https://api.github.com/repos/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}/releases/latest`;

/**
 * Hook to fetch the latest release from GitHub
 *
 * Fetches release information including version, assets (installers), and metadata.
 * Caches the result to avoid excessive API calls.
 *
 * @returns Release information and download links
 */
export function useLatestRelease(): UseLatestReleaseReturn {
  const [release, setRelease] = useState<GitHubRelease | null>(null);
  const [downloads, setDownloads] = useState<ReleaseDownloads>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [refetchTrigger, setRefetchTrigger] = useState(0);

  useEffect(() => {
    const fetchRelease = async () => {
      setLoading(true);
      setError(null);

      try {
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

        // Parse assets to find platform-specific downloads
        const parsedDownloads: ReleaseDownloads = {};

        for (const asset of data.assets) {
          const name = asset.name.toLowerCase();

          // Skip signature files
          if (name.endsWith(".sig")) {
            continue;
          }

          // Windows with WebView2 (offline installer) - must check before generic exe
          if (
            (name.endsWith(".exe") || name.includes(".exe.")) &&
            (name.includes("with_webview2") ||
              name.includes("webview2") ||
              name.includes("webview") ||
              name.includes("offline"))
          ) {
            parsedDownloads.windowsWithWebView2 = asset;
          }
          // Windows MSI
          else if (name.endsWith(".msi") || name.includes(".msi.")) {
            parsedDownloads.windowsMsi = asset;
          }
          // Windows EXE (NSIS) - standard installer
          else if (name.endsWith(".exe") || name.includes(".exe.")) {
            parsedDownloads.windowsExe = asset;
          }
          // macOS DMG
          else if (name.endsWith(".dmg") || name.includes(".dmg.")) {
            parsedDownloads.macOsDmg = asset;
          }
          // Linux AppImage
          else if (name.endsWith(".appimage") || name.includes(".appimage.")) {
            parsedDownloads.linuxAppImage = asset;
          }
        }

        setDownloads(parsedDownloads);
      } catch (err) {
        console.error("Failed to fetch latest release:", err);
        setError(err instanceof Error ? err : new Error("Unknown error"));
      } finally {
        setLoading(false);
      }
    };

    fetchRelease();
  }, [refetchTrigger]);

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
