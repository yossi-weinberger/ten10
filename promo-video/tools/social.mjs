// WhatsApp status images (1080×1920) in the film's look, posted around the vertical film:
//   1 teaser ("don't know TEN10 yet?") · 2 the film · 3 Natan, the AI assistant, beta invite · 4 "help spread the word".
//   CHROMIUM_PATH=... node tools/social.mjs        → renders/social/*.png
// Each page is self-contained HTML (font, logos and Lucide icons inlined) screenshotted with headless Chromium.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";
import { chromiumPath } from "./browser.mjs";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const repo = path.dirname(root);
const read = (p) => fs.readFileSync(path.join(repo, p), "utf8");
const font = fs.readFileSync(path.join(repo, "public/fonts/Assistant-VariableFont_wght.ttf")).toString("base64");
const wide = read("public/logo/logo-wide.svg");
const symbol = read("public/logo/symbol.svg");
const svgImg = (svg) => `<img src="data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}">`;
// official channel logos (Wikimedia Commons: WhatsApp.svg, Gmail_icon_(2020).svg), shown as "coming soon" channels
const brand = (n) => fs.readFileSync(path.join(root, "tools/brands", `${n}.svg`), "utf8");
const icon = (n) => fs.readFileSync(path.join(root, "node_modules/lucide-static/icons", `${n}.svg`), "utf8").replace(/<!--[\s\S]*?-->/g, "");

// dotted halo rings around one point, like the film's ending
const rings = (cy) => [[300, 22, "rgba(17,103,106,.22)"], [370, 26, "rgba(17,103,106,.16)"], [445, 30, "rgba(240,192,0,.30)"], [525, 34, "rgba(17,103,106,.10)"]]
  .map(([r, gap, col]) => `<circle cx="540" cy="${cy}" r="${r}" fill="none" stroke="${col}" stroke-width="5" stroke-linecap="round" stroke-dasharray="0 ${gap}"/>`).join("");

const CSS = `
@font-face { font-family: Assistant; src: url(data:font/ttf;base64,${font}) format("truetype"); font-weight: 200 800; }
* { margin: 0; padding: 0; box-sizing: border-box; }
html, body { width: 1080px; height: 1920px; overflow: hidden; }
body { font-family: Assistant, sans-serif; color: #1f1c12; position: relative; background: radial-gradient(ellipse at 50% 50%, #fffdf6 0%, #fcfaf1 55%, #f3efdf 100%); }
.halo { position: absolute; inset: 0; }
.c { position: absolute; width: 100%; text-align: center; }
.h1 { font-size: 84px; font-weight: 700; }
.big { font-size: 112px; font-weight: 800; color: #11676a; line-height: 1.05; }
.wide { position: absolute; left: 50%; transform: translateX(-50%); display: flex; align-items: center; gap: 18px; direction: ltr; }
.wide .w svg { display: block; height: 100%; width: auto; }
.wide .qm { font-size: 150px; font-weight: 800; color: #11676a; line-height: 1; }
.ring { position: absolute; left: 50%; width: 360px; height: 360px; transform: translateX(-50%); }
.ring .sym svg { width: 360px; height: 360px; display: block; }
.play { position: absolute; top: 50%; left: 52%; transform: translate(-50%, -50%); width: 0; height: 0; border-top: 62px solid transparent; border-bottom: 62px solid transparent; border-left: 104px solid #11676a; }
.ico { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 130px; height: 130px; color: #11676a; }
.ico svg { width: 100%; height: 100%; stroke-width: 2.2; }
.sub { font-size: 58px; font-weight: 700; line-height: 1.25; }
.sub b { color: #11676a; font-weight: 800; }
.pill { position: absolute; left: 50%; transform: translateX(-50%); white-space: nowrap; border-radius: 999px; font-weight: 800; box-shadow: 0 14px 34px -14px rgba(36,40,30,.35); }
.teal { background: #11676a; color: #fff; font-size: 50px; padding: 18px 56px; }
.gold { background: #f0c000; color: #0c4a4c; font-size: 46px; padding: 14px 50px; direction: ltr; }
.small { font-size: 34px; font-weight: 600; color: rgba(31,28,18,.62); }
.feat { position: absolute; right: 90px; left: 90px; height: 156px; display: flex; align-items: center; gap: 30px; padding: 0 34px; background: rgba(255,255,255,.82); border-radius: 30px; box-shadow: 0 16px 40px -22px rgba(36,40,30,.38); }
.fi { flex: none; width: 96px; height: 96px; border-radius: 50%; background: #11676a; color: #fff; display: grid; place-items: center; }
.fi svg { width: 52px; height: 52px; stroke-width: 2; }
.ft { display: flex; flex-direction: column; gap: 4px; }
.ft b { font-size: 44px; font-weight: 800; }
.ft span { font-size: 33px; font-weight: 600; color: rgba(31,28,18,.62); }
.spark { display: inline-block; width: 86px; height: 86px; color: #f0c000; vertical-align: -12px; }
.spark svg { width: 100%; height: 100%; stroke-width: 2.2; }
.trust { display: flex; justify-content: center; align-items: center; gap: 14px; font-size: 38px; font-weight: 700; color: #11676a; }
.trust i { width: 46px; height: 46px; display: inline-block; } .trust i svg { width: 100%; height: 100%; stroke-width: 2.4; }
.fab { display: inline-grid; place-items: center; width: 118px; height: 118px; border-radius: 50%; background: #11676a; color: #fcfaf1;
       vertical-align: -14px; box-shadow: 0 16px 34px -12px rgba(17,103,106,.55); margin-inline-end: 30px; }
.fab svg { width: 59px; height: 59px; stroke-width: 2; }
.ctas { position: absolute; width: 100%; display: flex; justify-content: center; gap: 26px; }
.cta { display: flex; flex-direction: column; align-items: center; gap: 12px; }
.cta .pill { position: static; transform: none; display: flex; align-items: center; gap: 14px; }
.wa { background: #25d366; color: #fff; font-size: 44px; padding: 10px 36px 10px 14px; direction: ltr; }
.wa img { width: 60px; height: 60px; display: block; }
.cta small { font-size: 30px; font-weight: 700; color: rgba(31,28,18,.7); }
.rowtitle { font-size: 34px; font-weight: 800; color: #11676a; }
.brands { position: absolute; width: 100%; display: flex; justify-content: center; gap: 70px; }
.brand { display: flex; flex-direction: column; align-items: center; gap: 10px; width: 190px; }
.badge { width: 96px; height: 96px; border-radius: 50%; background: #fff; display: grid; place-items: center;
         box-shadow: 0 14px 30px -14px rgba(36,40,30,.45); overflow: hidden; }
.badge img { width: 64%; height: 64%; object-fit: contain; display: block; }
.badge.full img { width: 100%; height: 100%; }
.brand b { font-size: 32px; font-weight: 800; }
.tag { font-size: 24px; font-weight: 800; border-radius: 999px; padding: 2px 14px; }
.tag.now { background: #11676a; color: #fff; } .tag.soon { background: #f0c000; color: #0c4a4c; }
`;
const page = (body, ringCy) => `<!doctype html><html lang="he" dir="rtl"><head><meta charset="utf-8"><style>${CSS}</style></head><body>` +
  `<svg class="halo" viewBox="0 0 1080 1920">${rings(ringCy)}</svg>${body}</body></html>`;

const teaser = page(`
<div class="c h1" style="top:300px">עוד לא מכירים את</div>
<div class="wide" style="top:420px;height:130px"><span class="w" style="height:118px">${wide}</span><span class="qm">?</span></div>
<div class="ring" style="top:690px"><div class="sym">${symbol}</div><div class="play"></div></div>
<div class="c sub" style="top:1150px">סרטון קצר שמסביר <b>הכל</b><br>על ניהול מעשרות ותקציב</div>
<div class="pill teal" style="top:1350px">צפו בסטטוס הבא</div>
<div class="pill gold" style="top:1495px">ten10-app.com</div>
<div class="c small" style="top:1610px">חינם לשימוש אישי · באתר ובתוכנה למחשב</div>`, 870);

// Natan's capabilities as merged to main (text/voice, receipts, data questions, halacha → page or rabbi). Channels
// that are only planned (WhatsApp, email) carry a "soon" tag.
const FEATURES = [
  ["mic", "כתבו או הקליטו, והתנועה נרשמת", "„קניתי היום בסופר ב־247.80”"],
  ["receipt", "צלמו קבלה, והפרטים יחולצו לבד", "סכום, תאריך, בית עסק ואפילו המרת מטבע"],
  ["chart-column", "שאלו את הנתונים שלכם", "„כמה נשאר לי להפריש למעשרות?”"],
  ["book-open", "שאלה הלכתית? נתן יכוון אתכם", "לדף ההלכה המתאים, או לשאלה לרב"],
];
const CHANNELS = [[svgImg(symbol), "", "באפליקציה", "now", "זמין"], [svgImg(brand("whatsapp")), "full", "בוואטסאפ", "soon", "בקרוב"],
                  [svgImg(brand("gmail")), "", "במייל", "soon", "בקרוב"]];
const ai = page(`
<div class="wide" style="top:190px;height:72px"><span class="w" style="height:72px">${wide}</span></div>
<div class="c" style="top:288px;font-size:54px;font-weight:700">ואם הגעתם עד לכאן, יש לנו בשורה:</div>
<div class="c big" style="top:365px;font-size:120px"><span class="fab">${icon("bot-message-square")}</span>הכירו את נתן</div>
<div class="c" style="top:518px;font-size:50px;font-weight:700">העוזר החכם של TEN10, עכשיו בבטא</div>
${FEATURES.map(([ic, t, s], i) => `<div class="feat" style="top:${612 + i * 142}px;height:130px"><div class="fi">${icon(ic)}</div><div class="ft"><b>${t}</b><span>${s}</span></div></div>`).join("")}
<div class="c trust" style="top:1188px"><i>${icon("shield-check")}</i>ה־AI מציע, ואתם מאשרים</div>
<div class="c sub" style="top:1252px">רוצים להצטרף <b>לבטא</b>?</div>
<div class="ctas" style="top:1340px">
  <div class="cta"><span class="pill wa">${svgImg(brand("whatsapp"))}055-289-3733</span><small>שלחו לנו הודעה בוואטסאפ</small></div>
  <div class="cta"><span class="pill gold">ten10-app.com</span><small>צור קשר ← פנייה לצוות הפיתוח</small></div>
</div>
<div class="c rowtitle" style="top:1500px">איפה תמצאו את נתן:</div>
<div class="brands" style="top:1560px">${CHANNELS.map(([img, cls, t, k, tag]) => `<div class="brand"><div class="badge ${cls}">${img}</div><b>${t}</b><span class="tag ${k}">${tag}</span></div>`).join("")}</div>`, 500);

const share = page(`
<div class="wide" style="top:250px;height:96px"><span class="w" style="height:96px">${wide}</span></div>
<div class="c big" style="top:440px">רוצים לזכות<br>את הרבים?</div>
<div class="ring" style="top:770px"><div class="sym">${symbol}</div><div class="ico">${icon("message-circle-heart")}</div></div>
<div class="c sub" style="top:1220px">העלו את הסרטון גם לסטטוס שלכם,<br>כדי שעוד אנשים יכירו את <b dir="ltr">TEN10</b></div>
<div class="pill teal" style="top:1430px">שלחו לי הודעה באישי</div>
<div class="c small" style="top:1565px;font-size:40px;color:rgba(31,28,18,.75)">ואשלח לכם את הסרטון</div>`, 950);

const out = path.join(root, "renders/social");
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ executablePath: chromiumPath() });
const tab = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
for (const [name, html] of [["1_status_teaser", teaser], ["3_status_ai_beta", ai], ["4_status_share", share]]) {
  await tab.setContent(html);
  await tab.evaluate(() => document.fonts.ready);
  await tab.screenshot({ path: path.join(out, `${name}.png`) });
  console.log(path.join(out, `${name}.png`));
}
await browser.close();
