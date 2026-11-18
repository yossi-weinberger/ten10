import type { AiBetaJoin } from "./email-template.ts";

export const AI_BETA_JOIN_LIST_CAP = 50;
export const AI_BETA_LOOKUP_CONCURRENCY = 5;

type AcceptedRow = {
  user_id: string;
  beta_terms_accepted_at: string;
};

type AuthLookup = {
  email: string | null;
  metaName?: string | null;
};

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  mapper: (item: T) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  const workers = Math.min(Math.max(limit, 1), items.length);
  await Promise.all(Array.from({ length: workers }, async () => {
    while (next < items.length) {
      const index = next;
      next += 1;
      results[index] = await mapper(items[index]);
    }
  }));
  return results;
}

/** Looks up at most the first 50 joins, five at a time, and keeps that order. */
export async function buildAiBetaJoins(
  accepted: AcceptedRow[],
  lookup: (userId: string) => Promise<AuthLookup>,
  names: Map<string, string | null>,
): Promise<AiBetaJoin[]> {
  const listed = accepted.slice(0, AI_BETA_JOIN_LIST_CAP);
  return mapWithConcurrency(listed, AI_BETA_LOOKUP_CONCURRENCY, async (row) => {
    let auth: AuthLookup = { email: null, metaName: null };
    try {
      auth = await lookup(row.user_id);
    } catch {
      auth = { email: null, metaName: null };
    }
    return {
      accepted_at: row.beta_terms_accepted_at,
      email: auth.email,
      full_name: names.get(row.user_id) ?? auth.metaName ?? null,
    };
  });
}
