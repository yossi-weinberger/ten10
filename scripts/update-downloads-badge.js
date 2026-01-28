/**
 * Fetches GitHub Releases API, sums installer downloads (MSI + EXE only, excludes .sig and latest.json),
 * and writes .github/downloads.json for the shields.io dynamic badge.
 * Run from repo root. Uses GITHUB_TOKEN env if set (recommended in CI).
 */

const REPO = "yossi-weinberger/ten10";
const OUT_FILE = ".github/downloads.json";

async function main() {
  const token = process.env.GITHUB_TOKEN;
  const headers = {
    Accept: "application/vnd.github.v3+json",
    "User-Agent": "ten10-downloads-badge",
    ...(token && { Authorization: `Bearer ${token}` }),
  };

  const res = await fetch(`https://api.github.com/repos/${REPO}/releases`, {
    headers,
  });
  if (!res.ok) throw new Error(`GitHub API ${res.status}: ${await res.text()}`);

  const releases = await res.json();
  let installerTotal = 0;

  for (const rel of releases) {
    for (const asset of rel.assets || []) {
      const isInstaller =
        /\.(msi|exe)$/i.test(asset.name) && !asset.name.endsWith(".sig");
      if (isInstaller) installerTotal += asset.download_count || 0;
    }
  }

  const fs = await import("fs");
  const path = await import("path");
  const dir = path.dirname(OUT_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(
    OUT_FILE,
    JSON.stringify({ installer_downloads: installerTotal }, null, 2) + "\n",
  );
  console.log("Installer downloads (MSI + EXE only):", installerTotal);
  console.log("Wrote", OUT_FILE);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
