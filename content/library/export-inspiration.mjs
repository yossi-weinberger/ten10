import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { inspirationItemsFromSources, readInspirationSources } from "./inspiration-records.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const outPath = path.join(root, "src/lib/ai/inspiration-library.json");
const items = inspirationItemsFromSources(readInspirationSources(root));

fs.writeFileSync(outPath, `${JSON.stringify(items, null, 2)}\n`, "utf8");
console.log(`Wrote ${items.length} inspiration items to src/lib/ai/inspiration-library.json`);
