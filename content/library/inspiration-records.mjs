import fs from "node:fs";

const CONTENT_MARKER = "**content:**";

export function masterBlocks(text) {
  return text.split(/\n---\n/).slice(1);
}

export function fieldBacktick(block, key) {
  const match = block.match(new RegExp(`\\*\\*${key}:\\*\\*\\s+\`([^\`]+)\``));
  return match ? match[1] : null;
}

export function fieldPlain(block, key) {
  const match = block.match(new RegExp(`\\*\\*${key}:\\*\\*\\s+(.+)`));
  return match ? match[1].trim() : null;
}

export function fieldContent(block) {
  const at = block.indexOf(CONTENT_MARKER);
  if (at < 0) return "";
  return block.slice(at + CONTENT_MARKER.length).trim();
}

function encouragements(email) {
  return Array.isArray(email.monthlyEncouragements) ? email.monthlyEncouragements : [];
}

/**
 * Library items except halakha, plus email encouragements that have no contentId.
 * An email row with contentId attaches its English text to that library item.
 * Hebrew body stays the master text.
 */
export function inspirationItemsFromSources({ masterText, emailHe, emailEn }) {
  const items = [];
  for (const block of masterBlocks(masterText)) {
    const id = fieldBacktick(block, "id");
    const type = fieldBacktick(block, "type");
    if (!id || type === "halakha") continue;
    items.push({
      id,
      type,
      title: fieldPlain(block, "title") ?? "",
      body: fieldContent(block),
      source: fieldPlain(block, "source") ?? "",
    });
  }

  const byId = new Map(items.map((item) => [item.id, item]));
  for (const row of encouragements(emailEn)) {
    if (!row.contentId) continue;
    const item = byId.get(row.contentId);
    if (!item || typeof row.body !== "string" || row.body.length === 0) continue;
    item.body_en = row.body;
    item.source_en = typeof row.source === "string" ? row.source : "";
  }

  const heOrphans = encouragements(emailHe).filter((row) => !row.contentId);
  const enOrphans = encouragements(emailEn).filter((row) => !row.contentId);
  const count = Math.max(heOrphans.length, enOrphans.length);
  for (let index = 0; index < count; index += 1) {
    const hebrew = heOrphans[index];
    const english = enOrphans[index];
    const body = hebrew?.body || english?.body || "";
    const source = hebrew?.source || english?.source || "";
    const item = {
      id: `email-orphan-${index + 1}`,
      type: "email",
      title: source || body.split("\n")[0].slice(0, 80),
      body,
      source,
    };
    if (typeof english?.body === "string" && english.body.length > 0) {
      item.body_en = english.body;
      item.source_en = typeof english.source === "string" ? english.source : "";
    }
    items.push(item);
  }

  return items;
}

export function readInspirationSources(root) {
  const masterText = fs.readFileSync(`${root}/content/library/ten10-content-master.md`, "utf8");
  const emailHe = JSON.parse(fs.readFileSync(
    `${root}/supabase/functions/send-reminder-emails/locales/email-he.json`,
    "utf8",
  ));
  const emailEn = JSON.parse(fs.readFileSync(
    `${root}/supabase/functions/send-reminder-emails/locales/email-en.json`,
    "utf8",
  ));
  return { masterText, emailHe, emailEn };
}
