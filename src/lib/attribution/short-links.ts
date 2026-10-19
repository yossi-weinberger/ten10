/**
 * Typed registry of campaign short links.
 *
 * Adding a channel (local paper, phone line, forum) is one extra entry.
 * Keep `vercel.json` redirects in sync — `scripts/short-link-vercel-sync.test.ts`
 * asserts every registry path has matching Vercel redirects (case + trailing slash).
 */

export type ShortLinkCampaign = {
  code: string;
  utm_source: string;
  utm_medium: string;
  utm_campaign: string;
  target: "/landing";
};

export type ShortLinkEntry = ShortLinkCampaign & {
  /** Public URL path segment, lowercase, no slashes. */
  path: string;
};

export const SHORT_LINK_REGISTRY = {
  machon: {
    code: "MACHON",
    utm_source: "institute",
    utm_medium: "email",
    utm_campaign: "update_2026",
    target: "/landing",
  },
} as const satisfies Record<string, ShortLinkCampaign>;

export type ShortLinkPath = keyof typeof SHORT_LINK_REGISTRY;

export function normalizeShortLinkPath(pathname: string): string {
  return pathname.replace(/\/+$/, "").replace(/^\//, "").toLowerCase();
}

export function listShortLinks(): ShortLinkEntry[] {
  return Object.entries(SHORT_LINK_REGISTRY).map(([path, campaign]) => ({
    path,
    ...campaign,
  }));
}

export function findShortLinkByPath(pathname: string): ShortLinkEntry | null {
  const path = normalizeShortLinkPath(pathname);
  if (!(path in SHORT_LINK_REGISTRY)) return null;
  const campaign = SHORT_LINK_REGISTRY[path as ShortLinkPath];
  return { path, ...campaign };
}

export function findShortLinkByCode(code: string): ShortLinkEntry | null {
  const normalized = code.trim().toUpperCase();
  if (!normalized) return null;
  for (const entry of listShortLinks()) {
    if (entry.code === normalized) return entry;
  }
  return null;
}

export function buildRedirectHref(link: ShortLinkCampaign): string {
  const params = new URLSearchParams({
    ref: link.code,
    utm_source: link.utm_source,
    utm_medium: link.utm_medium,
    utm_campaign: link.utm_campaign,
  });
  return `${link.target}?${params.toString()}`;
}

export function vercelSourcesForPath(path: string): string[] {
  const lower = path.toLowerCase();
  const upper = path.toUpperCase();
  return [...new Set([`/${lower}`, `/${lower}/`, `/${upper}`, `/${upper}/`])];
}

export function buildVercelRedirects(): Array<{
  source: string;
  destination: string;
  permanent: false;
}> {
  return listShortLinks().flatMap((entry) => {
    const destination = buildRedirectHref(entry);
    return vercelSourcesForPath(entry.path).map((source) => ({
      source,
      destination,
      permanent: false as const,
    }));
  });
}
