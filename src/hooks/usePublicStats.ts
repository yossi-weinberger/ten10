import { useState, useEffect } from "react";

const GITHUB_REPO_OWNER = "yossi-weinberger";
const GITHUB_REPO_NAME = "ten10";
const PUBLIC_STATS_URL = `https://raw.githubusercontent.com/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}/main/.github/public-stats.json`;

const CACHE_KEY = "ten10_public_stats";
const CACHE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export interface PublicStats {
  website_users: number;
  installer_downloads: number;
  email_downloads: number;
  total_downloads: number;
  updated_at: string;
}

const defaultStats: PublicStats = {
  website_users: 0,
  installer_downloads: 0,
  email_downloads: 0,
  total_downloads: 0,
  updated_at: "",
};

/**
 * Fallback when offline and no cache (e.g. first run on desktop without network).
 * Values last reviewed 2026-01-30; update periodically to keep them reasonably accurate.
 */
const FALLBACK_OFFLINE_STATS: PublicStats = {
  website_users: 2450,
  installer_downloads: 1500,
  email_downloads: 350,
  total_downloads: 1850,
  updated_at: "",
};

function getCachedStats(): PublicStats | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { data: PublicStats; ts: number };
    const now = Date.now();
    if (parsed.ts > now) {
      console.warn(
        "Cached public stats have a future timestamp; possible clock skew.",
        { cachedTimestamp: parsed.ts, now }
      );
    }
    if (now - parsed.ts > CACHE_MAX_AGE_MS) return null;
    return parsed.data;
  } catch {
    return null;
  }
}

function setCachedStats(data: PublicStats) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ data, ts: Date.now() }));
  } catch {
    // ignore
  }
}

/**
 * Fetches public stats from .github/public-stats.json (website_users, total_downloads, etc.).
 * Uses localStorage cache when fetch fails (offline / no network).
 */
export function usePublicStats(): {
  stats: PublicStats;
  loading: boolean;
  error: Error | null;
  fromCache: boolean;
} {
  const [stats, setStats] = useState<PublicStats>(defaultStats);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [fromCache, setFromCache] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function fetchStats() {
      const cached = getCachedStats();
      try {
        const res = await fetch(PUBLIC_STATS_URL);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as PublicStats;
        if (!cancelled) {
          setStats(data);
          setError(null);
          setFromCache(false);
          setCachedStats(data);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e : new Error(String(e)));
          if (cached) {
            setStats(cached);
            setFromCache(true);
          } else {
            setStats(FALLBACK_OFFLINE_STATS);
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchStats();
    return () => {
      cancelled = true;
    };
  }, []);

  return { stats, loading, error, fromCache };
}
