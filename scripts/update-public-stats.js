/**
 * Fetches public stats: website_users (profiles), installer_downloads (GitHub MSI+EXE),
 * email_downloads (download_requests sent), total_downloads. Writes .github/public-stats.json.
 * Run from repo root. Requires: GITHUB_TOKEN; optional: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.
 * If Supabase env vars are missing, writes 0 for website_users and email_downloads.
 */

const REPO = "yossi-weinberger/ten10";
const OUT_FILE = ".github/public-stats.json";

async function getInstallerDownloads() {
  const token = process.env.GITHUB_TOKEN;
  const headers = {
    Accept: "application/vnd.github.v3+json",
    "User-Agent": "ten10-public-stats",
    ...(token && { Authorization: `Bearer ${token}` }),
  };
  const perPage = 100;
  const releases = [];
  let page = 1;
  let hasMore = true;
  while (hasMore) {
    const res = await fetch(
      `https://api.github.com/repos/${REPO}/releases?per_page=${perPage}&page=${page}`,
      { headers }
    );
    if (!res.ok)
      throw new Error(`GitHub API ${res.status}: ${await res.text()}`);
    const chunk = await res.json();
    releases.push(...chunk);
    hasMore = chunk.length === perPage;
    page += 1;
  }
  let total = 0;
  for (const rel of releases) {
    for (const asset of rel.assets || []) {
      const isInstaller =
        /\.(msi|exe)$/i.test(asset.name) && !asset.name.endsWith(".sig");
      if (isInstaller) total += asset.download_count || 0;
    }
  }
  return total;
}

async function getSupabaseCounts() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return { website_users: 0, email_downloads: 0 };

  let createClient;
  try {
    ({ createClient } = await import("@supabase/supabase-js"));
  } catch (err) {
    throw new Error(
      'Failed to load "@supabase/supabase-js". Install it (e.g. npm install) or unset SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY. ' +
        (err && err.message ? err.message : String(err))
    );
  }
  const supabase = createClient(url, key);

  const [
    { count: website_users, error: e1 },
    { count: email_downloads, error: e2 },
  ] = await Promise.all([
    supabase.from("profiles").select("*", { count: "exact", head: true }),
    supabase
      .from("download_requests")
      .select("*", { count: "exact", head: true })
      .eq("status", "sent"),
  ]);

  if (e1) console.error("profiles count error:", e1.message);
  if (e2) console.error("download_requests count error:", e2.message);
  return {
    website_users: website_users ?? 0,
    email_downloads: email_downloads ?? 0,
  };
}

async function main() {
  const [installer_downloads, db] = await Promise.all([
    getInstallerDownloads(),
    getSupabaseCounts(),
  ]);

  const { website_users, email_downloads } = db;
  const total_downloads = installer_downloads + email_downloads;
  const updated_at = new Date().toISOString();

  const payload = {
    website_users,
    installer_downloads,
    email_downloads,
    total_downloads,
    updated_at,
  };

  const fs = await import("fs");
  const path = await import("path");
  const dir = path.dirname(OUT_FILE);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(OUT_FILE, JSON.stringify(payload, null, 2) + "\n");

  console.log("Public stats:", payload);
  console.log("Wrote", OUT_FILE);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
