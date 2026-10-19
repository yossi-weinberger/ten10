import { findShortLinkByCode } from "./short-links";

export const FIRST_TOUCH_STORAGE_KEY = "ten10_attribution_first_touch";

const CAMPAIGN_REF_MAX_LENGTH = 32;
const CAMPAIGN_REF_PATTERN = /^[A-Z0-9_-]+$/;

export type SignupUtm = {
  utm_source: string;
  utm_medium: string;
  utm_campaign: string;
};

export type FirstTouchAttribution = {
  code: string;
  utm: SignupUtm;
  capturedAt: string;
};

type StorageLike = Pick<Storage, "getItem" | "setItem">;

function getLocalStorage(): StorageLike | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function hasUtmValues(utm: SignupUtm): boolean {
  return Boolean(utm.utm_source || utm.utm_medium || utm.utm_campaign);
}

/** Trim, uppercase, and accept only `[A-Z0-9_-]` up to 32 chars. */
export function normalizeCampaignRef(
  raw: string | null | undefined
): string | null {
  if (typeof raw !== "string") return null;
  const normalized = raw.trim().toUpperCase();
  if (!normalized) return null;
  if (normalized.length > CAMPAIGN_REF_MAX_LENGTH) return null;
  if (!CAMPAIGN_REF_PATTERN.test(normalized)) return null;
  return normalized;
}

function parseStoredTouch(raw: string | null): FirstTouchAttribution | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<FirstTouchAttribution>;
    const code = normalizeCampaignRef(parsed.code) ?? "";
    const utm: SignupUtm = {
      utm_source:
        typeof parsed.utm?.utm_source === "string" ? parsed.utm.utm_source : "",
      utm_medium:
        typeof parsed.utm?.utm_medium === "string" ? parsed.utm.utm_medium : "",
      utm_campaign:
        typeof parsed.utm?.utm_campaign === "string"
          ? parsed.utm.utm_campaign
          : "",
    };
    const capturedAt =
      typeof parsed.capturedAt === "string" && parsed.capturedAt
        ? parsed.capturedAt
        : "";
    if (!code && !hasUtmValues(utm)) return null;
    return {
      code,
      utm,
      capturedAt,
    };
  } catch {
    return null;
  }
}

export function getLocationSearchParams(
  location: Pick<Location, "search" | "hash"> | undefined = typeof window ===
  "undefined"
    ? undefined
    : window.location
): URLSearchParams {
  if (!location) return new URLSearchParams();
  if (location.search && location.search.length > 1) {
    return new URLSearchParams(location.search);
  }
  const hashQueryIndex = location.hash.indexOf("?");
  if (hashQueryIndex >= 0) {
    return new URLSearchParams(location.hash.slice(hashQueryIndex + 1));
  }
  return new URLSearchParams();
}

export function parseAttributionSearch(
  search: string | URLSearchParams
): FirstTouchAttribution | null {
  const params =
    typeof search === "string"
      ? new URLSearchParams(search.startsWith("?") ? search.slice(1) : search)
      : search;

  const code = normalizeCampaignRef(params.get("ref"));
  const fromRegistry = code ? findShortLinkByCode(code) : null;

  const utm: SignupUtm = {
    utm_source:
      params.get("utm_source")?.trim() || fromRegistry?.utm_source || "",
    utm_medium:
      params.get("utm_medium")?.trim() || fromRegistry?.utm_medium || "",
    utm_campaign:
      params.get("utm_campaign")?.trim() || fromRegistry?.utm_campaign || "",
  };

  if (!code && !hasUtmValues(utm)) return null;

  return {
    code: code ?? "",
    utm,
    capturedAt: new Date().toISOString(),
  };
}

export function readFirstTouch(
  storage: StorageLike | null = getLocalStorage()
): FirstTouchAttribution | null {
  if (!storage) return null;
  return parseStoredTouch(storage.getItem(FIRST_TOUCH_STORAGE_KEY));
}

/** First-touch only: later campaigns do not overwrite an existing record. */
export function persistFirstTouchIfEmpty(
  touch: FirstTouchAttribution,
  storage: StorageLike | null = getLocalStorage()
): boolean {
  if (!storage) return false;
  if (readFirstTouch(storage)) return false;
  storage.setItem(FIRST_TOUCH_STORAGE_KEY, JSON.stringify(touch));
  return true;
}

export function captureAttributionFromLocation(
  location: Pick<Location, "search" | "hash"> | undefined = typeof window ===
  "undefined"
    ? undefined
    : window.location,
  storage: StorageLike | null = getLocalStorage()
): FirstTouchAttribution | null {
  const parsed = parseAttributionSearch(getLocationSearchParams(location));
  if (parsed) {
    persistFirstTouchIfEmpty(parsed, storage);
  }
  return readFirstTouch(storage);
}

/** Super-properties / event properties. No PII — campaign codes and UTMs only. */
export function attributionEventProperties(
  touch: FirstTouchAttribution | null = readFirstTouch()
): Record<string, string> {
  if (!touch) return {};
  const properties: Record<string, string> = {};
  if (touch.code) properties.ref = touch.code;
  if (touch.utm.utm_source) properties.utm_source = touch.utm.utm_source;
  if (touch.utm.utm_medium) properties.utm_medium = touch.utm.utm_medium;
  if (touch.utm.utm_campaign) properties.utm_campaign = touch.utm.utm_campaign;
  return properties;
}

/** Person `$set_once` first-touch traits. */
export function attributionPersonSetOnceProperties(
  touch: FirstTouchAttribution | null = readFirstTouch()
): Record<string, string> {
  if (!touch) return {};
  const properties: Record<string, string> = {};
  if (touch.code) properties.initial_ref = touch.code;
  if (touch.utm.utm_source) {
    properties.first_touch_utm_source = touch.utm.utm_source;
  }
  if (touch.utm.utm_medium) {
    properties.first_touch_utm_medium = touch.utm.utm_medium;
  }
  if (touch.utm.utm_campaign) {
    properties.first_touch_utm_campaign = touch.utm.utm_campaign;
  }
  return properties;
}
