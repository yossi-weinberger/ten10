import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const masterPath = path.join(__dirname, "ten10-content-master.md");
const indexPath = path.join(__dirname, "index.json");

const text = fs.readFileSync(masterPath, "utf8");
const blocks = text.split(/\n---\n/).slice(1);

function fieldBacktick(block, key) {
  const re = new RegExp(`\\*\\*${key}:\\*\\*\\s+\`([^\`]+)\``);
  const m = block.match(re);
  return m ? m[1] : null;
}

function fieldPlain(block, key) {
  const re = new RegExp(`\\*\\*${key}:\\*\\*\\s+(.+)`);
  const m = block.match(re);
  return m ? m[1].trim() : null;
}

function fieldTopics(block) {
  const line = fieldPlain(block, "topics");
  if (!line) return [];
  return [...line.matchAll(/`([^`]+)`/g)].map((m) => m[1]);
}

const records = [];
const types = new Set();
const allTopics = new Set();

for (const block of blocks) {
  const id = fieldBacktick(block, "id");
  if (!id) continue;

  const type = fieldBacktick(block, "type");
  const title = fieldPlain(block, "title");
  const topics = fieldTopics(block);
  const source = fieldPlain(block, "source") ?? "";
  const text_status = fieldBacktick(block, "text_status");
  const verification_status = fieldBacktick(block, "verification_status");
  const original_location = fieldPlain(block, "original_location");

  if (type) types.add(type);
  for (const topic of topics) allTopics.add(topic);

  records.push({
    id,
    type,
    title,
    topics,
    source,
    text_status,
    verification_status,
    original_location,
  });
}

const index = {
  version: 1,
  description:
    "Catalog of Ten10 editorial content records. Metadata only — full text lives in ten10-content-master.md.",
  source_file: "ten10-content-master.md",
  count: records.length,
  types: [...types].sort(),
  topics: [...allTopics].sort(),
  records,
};

fs.writeFileSync(indexPath, `${JSON.stringify(index, null, 2)}\n`, "utf8");
console.log(`Wrote ${records.length} records to index.json`);
console.log(`types: ${index.types.join(", ")}`);
