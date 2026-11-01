// Every gold amount_text must be printed in its own page, and every item date must be printed in some format.
import fs from "node:fs";
const [out, work] = process.argv.slice(2);
const rows = fs.readFileSync(`${out}/answers.jsonl`, "utf8").trim().split("\n").map((l) => JSON.parse(l));
const M = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"], ML = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const forms = (iso) => { const [y, m, d] = iso.split("-"); const D = Number(d), Mo = Number(m); return [`${d}/${m}/${y.slice(2)}`, `${d}/${m}/${y}`, `${d}.${m}.${y}`, `${m}/${d}/${y}`, `${M[Mo-1]} ${D}, ${y}`, `${ML[Mo-1]} ${D}, ${y}`, `${D} ${M[Mo-1]} ${y}`]; };
let bad = 0;
const kinds = {};
for (const r of rows) {
  kinds[r.kind] = (kinds[r.kind] ?? 0) + 1;
  const text = fs.readFileSync(`${work}/html/${r.id}.html`, "utf8").replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&");
  for (const it of r.expected.items) {
    if (!text.includes(it.amount_text)) { bad++; console.log("amount missing", r.id, it.amount_text); }
    if (Number(it.amount_text.replace(/,/g, "")) !== it.amount) { bad++; console.log("amount_text != amount", r.id); }
    if (!forms(it.date).some((f) => text.includes(f))) { bad++; console.log("date missing", r.id, it.date); }
    if (it.date > r.today) { bad++; console.log("future date", r.id); }
  }
  if (r.kind === "statement" && r.expected.route !== "list") { bad++; console.log("statement not list", r.id); }
  if (r.kind === "several" && r.expected.items.length < 2) { bad++; console.log("several with one item", r.id); }
  if (!fs.existsSync(`${out}/${r.file}`)) { bad++; console.log("file missing", r.file); }
}
console.log(JSON.stringify({ rows: rows.length, kinds, bad }));
process.exit(bad ? 1 : 0);
