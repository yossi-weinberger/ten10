// Synthetic receipt eval set: every image is rendered from data, so the data is the gold answer.
// usage: node gen.mjs <outDir> <workDir> <chromePath>
import fs from "node:fs";
import path from "node:path";
import { execFile } from "node:child_process";

const [OUT, WORK, CHROME] = process.argv.slice(2);
const TODAY = "2026-10-30";

let seed = 20261030;
function rnd() {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const pick = (a) => a[Math.floor(rnd() * a.length)];
const int = (a, b) => a + Math.floor(rnd() * (b - a + 1));
const chance = (p) => rnd() < p;
const r2 = (x) => Math.round((x + Number.EPSILON) * 100) / 100;
const pad = (n) => String(n).padStart(2, "0");
const digits = (n) => Array.from({ length: n }, () => int(0, 9)).join("");
function money(n) {
  const [i, d] = r2(n).toFixed(2).split(".");
  return `${i.length > 3 ? i.replace(/\B(?=(\d{3})+(?!\d))/g, ",") : i}.${d}`;
}
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;");

function addDays(iso, n) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}
/** A purchase date in the last ~45 days. "ambiguous": day 12 or below, so dd/mm and mm/dd differ. "clear": day 13 or above. */
function purchaseDate(mode = "any") {
  for (;;) {
    const iso = addDays(TODAY, -int(0, 45));
    const day = Number(iso.slice(8));
    const month = Number(iso.slice(5, 7));
    if (mode === "any" || (mode === "ambiguous" ? day <= 12 && day !== month : day >= 13)) return iso;
  }
}
const P = (iso) => { const [y, m, d] = iso.split("-").map(Number); return { y, m, d }; };
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTHS_LONG = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const fmt = {
  heShort: (iso) => { const { y, m, d } = P(iso); return `${pad(d)}/${pad(m)}/${String(y).slice(2)}`; },
  heLong: (iso) => { const { y, m, d } = P(iso); return `${pad(d)}/${pad(m)}/${y}`; },
  heDot: (iso) => { const { y, m, d } = P(iso); return `${pad(d)}.${pad(m)}.${y}`; },
  us: (iso) => { const { y, m, d } = P(iso); return `${pad(m)}/${pad(d)}/${y}`; },
  eu: (iso) => { const { y, m, d } = P(iso); return `${pad(d)}/${pad(m)}/${y}`; },
  name: (iso) => { const { y, m, d } = P(iso); return `${MONTHS[m - 1]} ${d}, ${y}`; },
  longName: (iso) => { const { y, m, d } = P(iso); return `${MONTHS_LONG[m - 1]} ${d}, ${y}`; },
  euName: (iso) => { const { y, m, d } = P(iso); return `${d} ${MONTHS[m - 1]} ${y}`; },
};
const time = () => `${pad(int(8, 21))}:${pad(int(0, 59))}`;

// ---------- data pools (all business names are invented) ----------
const HE = {
  super: {
    names: ["סופר השכונה", "מרכול הגפן", "שוק העיר", "מינימרקט הדקל", "סופר זול כאן", "מרכז המזון בגבעה"],
    items: [["חלב 3% 1 ל'", 6.2, 7.4], ["לחם אחיד פרוס", 7.5, 9.9], ["ביצים L תבנית 12", 13.9, 16.9], ["עגבניות", 0, 0, "kg", 6.9, 9.9], ["מלפפונים", 0, 0, "kg", 5.9, 8.9], ["שמן קנולה 1 ל'", 11.9, 14.9], ["אורז פרסי 1 ק\"ג", 9.9, 13.9], ["גבינה צהובה 28%", 18.9, 29.9], ["קפה טורקי 200 ג'", 14.9, 21.9], ["נייר טואלט 32 גלילים", 34.9, 49.9], ["מים מינרליים 6x1.5", 12.9, 17.9], ["יוגורט טבעי", 4.5, 6.9], ["טחינה גולמית 500 ג'", 16.9, 24.9], ["פסטה פנה 500 ג'", 5.9, 8.9], ["רסק עגבניות", 3.9, 5.9], ["תפוחי אדמה", 0, 0, "kg", 3.9, 6.9], ["חומוס מוכן", 8.9, 12.9], ["שוקולד חלב", 5.9, 8.9]],
  },
  pharm: {
    names: ["פארם הגליל", "בית מרקחת השרון", "פארמה פלוס"],
    items: [["אקמול 20 טבליות", 14.9, 19.9], ["משחת שיניים", 12.9, 22.9], ["שמפו 700 מ\"ל", 16.9, 29.9], ["ויטמין D3", 39.9, 69.9], ["פלסטרים 20 יח'", 9.9, 15.9], ["קרם ידיים", 19.9, 34.9], ["מגבונים לחים", 8.9, 14.9], ["מברשת שיניים", 9.9, 19.9]],
  },
  rest: {
    names: ["מסעדת הגפן", "קפה ברחוב", "בורגר בשכונה", "פיצה אחים", "המטבח של סבתא"],
    items: [["שניצל בצלחת", 58, 72], ["סלט ישראלי", 32, 42], ["המבורגר 220 ג'", 62, 78], ["צ'יפס", 18, 24], ["קולה", 12, 14], ["לימונדה גרוסה", 16, 19], ["פסטה שמנת פטריות", 52, 64], ["קפה הפוך", 12, 16], ["עוגת שוקולד", 28, 36], ["פיצה משפחתית", 62, 79]],
  },
  home: {
    names: ["כלי בית המרכז", "בית ועוד", "מרכז השיפוצים"],
    items: [["מנורת שולחן", 89, 149], ["סט מגבות", 79, 129], ["מחבת 28 ס\"מ", 99, 189], ["מברגה נטענת", 249, 449], ["סוללות AA 8 יח'", 24.9, 34.9], ["כבל מאריך 3 מ'", 29.9, 49.9], ["קופסאות אחסון 3 יח'", 39.9, 69.9]],
  },
  fuel: { names: ["תחנת דלק צומת הגבעה", "דלק הדרך בע\"מ", "תדלוק העמק"] },
  cities: ["רח' הרצל 12, רחובות", "רח' ויצמן 40, כפר סבא", "שד' ירושלים 7, חולון", "רח' הנביאים 3, ירושלים", "רח' העצמאות 18, אשדוד", "דרך השלום 52, תל אביב", "רח' הגליל 9, כרמיאל"],
};
const US = {
  grocery: { names: ["MAPLE STREET MARKET", "GREEN VALLEY GROCERS"], items: [["MILK 1 GAL", 3.49, 4.29], ["BREAD WHEAT", 2.99, 4.49], ["EGGS LG DOZ", 3.29, 4.99], ["BANANAS", 0, 0, "lb", 0.59, 0.69], ["CHEDDAR 8OZ", 3.99, 5.49], ["COFFEE 12OZ", 7.99, 11.99], ["PASTA", 1.49, 2.29], ["OLIVE OIL", 8.99, 12.99]] },
  pharm: { names: ["CORNER PHARMACY"], items: [["IBUPROFEN 100CT", 8.99, 12.99], ["TOOTHPASTE", 3.49, 5.99], ["SHAMPOO", 5.99, 8.99], ["BANDAGES", 3.99, 6.49], ["VITAMIN C", 9.99, 14.99]] },
  diner: { names: ["LAKESIDE DINER", "BEAN & LEAF CAFE"], items: [["CHEESEBURGER", 12.5, 15.5], ["FRIES", 4.5, 5.5], ["CLUB SANDWICH", 11.5, 14], ["SODA", 2.75, 3.5], ["LATTE", 4.25, 5.75], ["PANCAKES", 9.5, 12], ["APPLE PIE", 5.5, 7]] },
  places: [["1420 Maple St", "Springfield, IL 62704", 0.0625], ["88 State St", "Albany, NY 12207", 0.08], ["301 Congress Ave", "Austin, TX 78701", 0.0825], ["15 Colfax Ave", "Denver, CO 80202", 0.0881], ["720 Burnside St", "Portland, OR 97209", 0]],
};
const EU = {
  shops: [["HARBOUR CAFE", "12 Quay Street, Dublin", 0.135, "IE"], ["MARKET HALL GROCER", "Kade 14, Amsterdam", 0.09, "NL"], ["CITY PHARMACY", "Vodickova 21, Prague", 0.12, "CZ"], ["OLD TOWN BISTRO", "Via Roma 8, Bologna", 0.10, "IT"]],
  items: [["Cappuccino", 3.2, 4.2], ["Croissant", 2.1, 3.2], ["Sandwich", 6.5, 8.9], ["Water 0.5L", 1.8, 2.6], ["Soup of the day", 5.5, 7.5], ["Pasta", 11, 15], ["Salad", 8.5, 12], ["Tiramisu", 5.5, 7]],
};

function lineItems(pool, count) {
  const chosen = [];
  const used = new Set();
  count = Math.min(count, pool.length);
  while (chosen.length < count) {
    const it = pick(pool);
    if (used.has(it[0])) continue;
    used.add(it[0]);
    if (it[3] === "kg" || it[3] === "lb") {
      const w = int(250, 1800) / 1000;
      const unit = r2(it[4] + rnd() * (it[5] - it[4]));
      chosen.push({ name: it[0], qty: w, unit, weighed: it[3], total: r2(w * unit) });
    } else {
      const unit = r2(Math.round((it[1] + rnd() * (it[2] - it[1])) * 10) / 10 - (chance(0.6) ? 0.01 : 0));
      const qty = chance(0.25) ? int(2, 3) : 1;
      chosen.push({ name: it[0], qty, unit, total: r2(qty * unit) });
    }
  }
  return chosen;
}
const sum = (xs) => r2(xs.reduce((a, b) => a + b, 0));

// ---------- row model: each row has a height so the canvas fits the paper ----------
const ROW = 21;
// A masked card number keeps its order inside Hebrew text, as printed.
const card = (s) => esc(s).replace(/(\*{4}\d{4})/g, '<bdi dir="ltr">$1</bdi>');
const row = (label, value = "", cls = "") => ({ h: cls.includes("big") ? 28 : ROW, html: `<div class="row ${cls}"><span>${card(label)}</span><span dir="ltr">${esc(value)}</span></div>` });
const center = (text, cls = "") => {
  const title = cls.includes("title");
  const style = title && text.length > 18 ? ' style="font-size:17px"' : "";
  const inner = cls.includes("q") ? `<span dir="ltr">${esc(text)}</span>` : card(text);
  return { h: title ? 34 : cls.includes("small") ? 19 : ROW, html: `<div class="c ${cls}"${style}>${inner}</div>` };
};
const hr = () => ({ h: 12, html: `<div class="hr"></div>` });
const qtyRow = (it, he) => {
  if (it.weighed) return center(he ? `${it.qty.toFixed(3)} ק"ג x ${money(it.unit)}` : `${it.qty.toFixed(3)} ${it.weighed.toUpperCase()} @ ${money(it.unit)}/${it.weighed.toUpperCase()}`, "small q");
  return center(`${it.qty} x ${money(it.unit)}`, "small q");
};

const PAY_HE = { credit_card: "credit", cash: "cash", bit_paybox: "bit" };
function payBlockHe(method, pay, extra) {
  if (method === "credit_card") {
    const rows = [row(`אשראי ${pick(["ויזה", "מסטרקארד", "ישראכרט", "אמקס"])} ${digits(4)}`, money(pay)), row("מס' אישור", digits(7))];
    if (extra.installments) rows.push(row("מספר תשלומים", String(extra.installments)));
    return rows;
  }
  if (method === "cash") {
    const given = [20, 50, 100, 200, 500].find((g) => g >= pay) ?? Math.ceil(pay / 100) * 100;
    const rows = [row("מזומן", money(given))];
    if (given > pay) rows.push(row("עודף", money(given - pay)));
    return rows;
  }
  return [row("Bit", money(pay)), center(`אסמכתא ${digits(9)}`, "small")];
}

// ---------- receipt builders: each returns { rows, gold, note } ----------
function heThermal(sub, opts = {}) {
  const name = pick(HE[sub === "fuel" ? "fuel" : sub].names);
  const iso = purchaseDate();
  const dateStr = pick([fmt.heShort, fmt.heShort, fmt.heLong, fmt.heDot])(iso);
  const notes = [`he-${sub}`];
  const rows = [center(name, "title"), center(pick(HE.cities), "small"), center(`עוסק מורשה ${5}${digits(8)}  טל' 0${pick(["3", "8", "9", "4"])}-${int(5, 9)}${digits(6)}`, "small"), hr(),
    row(`קופה ${int(1, 9)}`, `קבלה ${digits(6)}`), row(`תאריך ${dateStr}`, `שעה ${time()}`), hr()];
  let pay;
  let total;
  const extra = {};
  if (sub === "fuel") {
    const liters = r2(int(1800, 5500) / 100);
    const ppl = r2(7.4 + int(0, 40) / 100);
    const fuel = r2(liters * ppl);
    rows.push(row(`משאבה ${int(1, 12)}`, ""), row("בנזין 95", money(fuel)), center(`${liters.toFixed(2)} ליטר x ${ppl.toFixed(2)}`, "small q"), row("ק\"מ ברכב", String(int(30000, 190000))));
    total = fuel;
    if (chance(0.35)) { rows.push(row("שטיפת רכב", "35.00")); total = r2(fuel + 35); notes.push("addon"); }
    notes.push("liters");
  } else {
    const items = lineItems(HE[sub].items, int(sub === "rest" ? 2 : 3, sub === "super" ? 9 : 5));
    if (sub === "rest") rows.splice(5, 0, row(`שולחן ${int(1, 30)}`, `סועדים ${int(1, 6)}`));
    for (const it of items) { rows.push(row(it.name, money(it.total))); if (it.weighed || it.qty > 1) rows.push(qtyRow(it, true)); }
    rows.push(hr());
    const subtotal = sum(items.map((i) => i.total));
    total = subtotal;
    if (sub !== "rest" && chance(0.4)) {
      const discount = r2(subtotal * pick([0.05, 0.1]));
      total = r2(subtotal - discount);
      rows.push(row("סכום ביניים", money(subtotal)), row("הנחת מועדון", `-${money(discount)}`));
      notes.push("discount");
    }
    if (sub === "home" && total > 250 && chance(0.6)) { extra.installments = pick([2, 3, 6]); notes.push("installments"); }
  }
  pay = total;
  if (sub === "rest" && chance(0.5)) {
    const tip = Math.round(total * pick([0.1, 0.12, 0.15]));
    pay = r2(total + tip);
    rows.push(row("סה\"כ ארוחה", money(total)), row("טיפ", money(tip)));
    notes.push("tip");
  }
  rows.push(row("סה\"כ לתשלום", money(pay), "big b"), row("כולל מע\"מ 18%", money(r2((pay * 18) / 118))), hr());
  const method = opts.method ?? (chance(0.65) ? "credit_card" : chance(0.6) ? "cash" : "bit_paybox");
  if (extra.installments && method !== "credit_card") delete extra.installments;
  rows.push(...payBlockHe(method, pay, extra));
  if (method === "cash") notes.push("cash-change");
  if (sub !== "fuel" && sub !== "rest" && chance(0.4)) { rows.push(center(`החזרה עד ${fmt.heShort(addDays(iso, 30))} בצירוף קבלה`, "small")); notes.push("return-date"); }
  rows.push(center("תודה ולהתראות!", "small"));
  return {
    rows, notes, dir: "rtl",
    items: [{ description: name, amount: pay, amount_text: money(pay), currency: "ILS", date: iso, type: "expense", type_question: null, payment_method: method }],
  };
}

function usThermal(kind, opts = {}) {
  const pool = US[kind === "gas" ? "grocery" : kind];
  const name = kind === "gas" ? `QUICKFUEL #${int(100, 499)}` : pick(pool.names);
  const [street, city, taxRate] = pick(US.places);
  const iso = purchaseDate(opts.ambiguous ? "ambiguous" : "clear");
  const dateStr = opts.ambiguous ? fmt.us(iso) : pick([fmt.us, fmt.name])(iso);
  const notes = [`us-${kind}`];
  if (opts.ambiguous) notes.push("date-format-us");
  const rows = [center(name, "title"), center(street, "small"), center(city, "small"), center(`TEL (${int(200, 989)}) 555-${digits(4)}`, "small"), hr(),
    row(`RECEIPT #${digits(5)}`, `REG ${int(1, 6)}`), row(dateStr, time()), hr()];
  let total;
  if (kind === "gas") {
    const gal = r2(int(6000, 16000) / 1000);
    const ppg = r2(3.1 + int(0, 90) / 100);
    total = r2(gal * ppg);
    rows.push(row(`PUMP ${int(1, 12)} UNLEADED`, money(total)), center(`${gal.toFixed(3)} GAL @ ${ppg.toFixed(3)}/GAL`, "small q"), hr(), row("TOTAL", `$${money(total)}`, "big b"));
    notes.push("gallons");
  } else {
    const items = lineItems(pool.items, int(2, 6));
    for (const it of items) { rows.push(row(it.name, money(it.total))); if (it.weighed || it.qty > 1) rows.push(qtyRow(it, false)); }
    rows.push(hr());
    const subtotal = sum(items.map((i) => i.total));
    const tax = r2(subtotal * taxRate);
    total = r2(subtotal + tax);
    rows.push(row("SUBTOTAL", money(subtotal)), row(`TAX ${(taxRate * 100).toFixed(2)}%`, money(tax)));
    if (kind === "diner" && chance(0.6)) {
      const tip = r2(Math.round(subtotal * 0.18));
      rows.push(row("TIP", money(tip)));
      total = r2(total + tip);
      notes.push("tip");
    }
    rows.push(row("TOTAL", `$${money(total)}`, "big b"));
  }
  const method = chance(0.75) ? "credit_card" : "cash";
  if (method === "credit_card") rows.push(row(`${pick(["VISA", "MASTERCARD", "AMEX"])} ****${digits(4)}`, money(total)), row("AUTH", digits(6)));
  else { const given = Math.ceil(total / 20) * 20; rows.push(row("CASH", money(given)), row("CHANGE", money(given - total))); notes.push("cash-change"); }
  if (kind !== "gas" && kind !== "diner" && chance(0.5)) { rows.push(center(`RETURNS BY ${fmt.us(addDays(iso, 30))} WITH RECEIPT`, "small")); notes.push("return-date"); }
  rows.push(center("THANK YOU", "small"));
  const currency = "USD";
  return { rows, notes, dir: "ltr", items: [{ description: name, amount: total, amount_text: money(total), currency, date: iso, type: "expense", type_question: null, payment_method: method }] };
}

function euThermal(opts = {}) {
  const [name, addr, vat, cc] = pick(EU.shops);
  const iso = purchaseDate(opts.ambiguous ? "ambiguous" : "clear");
  const dateStr = opts.ambiguous ? fmt.eu(iso) : pick([fmt.eu, fmt.euName])(iso);
  const notes = ["eu"];
  if (opts.ambiguous) notes.push("date-format-eu");
  const rows = [center(name, "title"), center(addr, "small"), center(`VAT NO ${cc}${digits(8)}`, "small"), hr(), row(dateStr, time()), row(`TABLE ${int(1, 20)}`, `NO ${digits(4)}`), hr()];
  const items = lineItems(EU.items, int(2, 5));
  for (const it of items) { rows.push(row(it.name, money(it.total))); if (it.qty > 1) rows.push(qtyRow(it, false)); }
  const total = sum(items.map((i) => i.total));
  rows.push(hr(), row("TOTAL EUR", money(total), "big b"), row(`incl. VAT ${Math.round(vat * 100)}%`, money(r2((total * vat) / (1 + vat)))));
  const method = chance(0.7) ? "credit_card" : "cash";
  rows.push(method === "credit_card" ? row(`CARD ****${digits(4)}`, money(total)) : row("CASH", money(total)));
  rows.push(center("Thank you!", "small"));
  return { rows, notes, dir: "ltr", items: [{ description: name, amount: total, amount_text: money(total), currency: "EUR", date: iso, type: "expense", type_question: null, payment_method: method }] };
}

const WORDS_HE = { 180: "מאה ושמונים", 250: "מאתיים וחמישים", 360: "שלוש מאות ושישים", 500: "חמש מאות", 720: "שבע מאות ועשרים", 1000: "אלף", 1800: "אלף ושמונה מאות" };
function heDonation() {
  const org = pick(["עמותת יד לחבר", "עמותת לב פתוח", "קרן חסד לעולם", "עמותת שולחן לכל משפחה", "גמ\"ח השכונה"]);
  const amount = Number(pick(Object.keys(WORDS_HE)));
  const iso = purchaseDate();
  const method = pick(["credit_card", "bank_transfer", "cash", "check"]);
  const payText = { credit_card: `כרטיס אשראי המסתיים ב-${digits(4)}`, bank_transfer: `העברה בנקאית, אסמכתא ${digits(8)}`, cash: "מזומן", check: `צ'ק מס' ${digits(6)}, בנק ${int(10, 31)}` }[method];
  const rows = [center(org, "title"), center(`(ע"ר 58-${digits(7)})`, "small"), center(pick(HE.cities), "small"), hr(),
    center(`קבלה על תרומה מס' ${digits(5)}  |  מקור`, "b"), row("תאריך", fmt.heLong(iso)), row("התקבל מאת", "ישראל ישראלי"), hr(),
    row("סכום", `₪ ${money(amount)}`, "big b"), center(`במילים: ${WORDS_HE[amount]} שקלים חדשים`, "small"), row("אמצעי תשלום", ""), center(payText, "small"), hr(),
    center("המוסד מוכר לעניין סעיף 46", "small"), center("לפקודת מס הכנסה.", "small"), center("האישור בתוקף עד 31/12/2026.", "small"), center("תודה רבה על תרומתך!", "small")];
  return { rows, notes: ["he-donation", "words", "section46-date"], dir: "rtl", items: [{ description: org, amount, amount_text: money(amount), currency: "ILS", date: iso, type: "donation", type_question: null, payment_method: method }] };
}
function enDonation() {
  const iso = purchaseDate();
  const rows = [center("HOPE COMMUNITY FOOD BANK", "title"), center("A 501(c)(3) nonprofit. EIN 00-0000000", "small"), center("210 Oak Ave, Columbus, OH 43215", "small"), hr(),
    center(`DONATION RECEIPT #${digits(5)}`, "b"), row("Date", fmt.longName(iso)), row("Received from", "Israel Israeli"), hr(),
    row("Amount", "$250.00", "big b"), center("(Two hundred fifty dollars)", "small"), row("Payment", `Credit card ****${digits(4)}`), hr(),
    center("No goods or services were provided", "small"), center("in exchange for this contribution.", "small"), center("Thank you for your generosity!", "small")];
  return { rows, notes: ["en-donation", "words"], dir: "ltr", items: [{ description: "Hope Community Food Bank", amount: 250, amount_text: "250.00", currency: "USD", date: iso, type: "donation", type_question: null, payment_method: "credit_card" }] };
}

// ---------- A4 documents (invoices and statements) ----------
function heInvoice() {
  const biz = pick([["מוסך הדר", [["טיפול 30,000 ק\"מ", 1, 650, 950], ["רפידות בלמים קדמיות", 1, 280, 420], ["שמן מנוע 5 ל'", 1, 160, 220]]], ["שיעורים פרטיים - מורה נטע", [["שיעור פרטי במתמטיקה", 4, 160, 200]]], ["מיזוג אוויר הצפון", [["תיקון מזגן - קריאת שירות", 1, 250, 350], ["החלפת קבל", 1, 180, 260]]], ["חשמל בטוח - עוסק מורשה", [["התקנת שקעים", 3, 120, 180], ["החלפת לוח חשמל", 1, 1400, 2200]]], ["סטודיו גל לעיצוב", [["עיצוב לוגו", 1, 1500, 2500], ["כרטיסי ביקור 500 יח'", 1, 180, 260]]], ["ספרי הלימוד בע\"מ", [["ספרי לימוד לכיתה ה'", 1, 380, 520], ["מחברות 10 יח'", 2, 25, 35]]]]);
  const iso = purchaseDate();
  const lines = biz[1].map(([n, q, a, b]) => { const unit = Math.round(a + rnd() * (b - a)); return { n, q, unit, total: q * unit }; });
  const net = sum(lines.map((l) => l.total));
  const vat = r2(net * 0.18);
  const total = r2(net + vat);
  const method = pick(["bank_transfer", "credit_card", "check", "bank_transfer"]);
  const payText = { bank_transfer: "העברה בנקאית", credit_card: `כרטיס אשראי המסתיים ב-${digits(4)}`, check: `צ'ק מס' ${digits(6)}` }[method];
  const period = chance(0.5) ? `<p>תקופת השירות: ${fmt.heLong(addDays(iso, -40))} – ${fmt.heLong(addDays(iso, -10))}</p>` : "";
  const html = `<header><h1>${esc(biz[0])}</h1><p>עוסק מורשה 5${digits(8)} | ${esc(pick(HE.cities))} | טל' 0${int(2, 9)}-${digits(7)} | office@example.co.il</p></header>
<h2>חשבונית מס / קבלה מס' 2026${digits(4)} <small>מקור</small></h2>
<p>תאריך: ${fmt.heLong(iso)}</p><p>לכבוד: ישראל ישראלי, רח' הדוגמה 1, עיר לדוגמה</p>${period}
<table><tr><th>תיאור</th><th>כמות</th><th>מחיר יחידה</th><th>סה"כ</th></tr>${lines.map((l) => `<tr><td>${esc(l.n)}</td><td>${l.q}</td><td dir="ltr">${money(l.unit)}</td><td dir="ltr">${money(l.total)}</td></tr>`).join("")}</table>
<table class="sum"><tr><td>סה"כ לפני מע"מ</td><td dir="ltr">${money(net)}</td></tr><tr><td>מע"מ 18%</td><td dir="ltr">${money(vat)}</td></tr><tr class="b"><td>סה"כ כולל מע"מ</td><td dir="ltr">${money(total)} ₪</td></tr></table>
<h3>פרטי תשלום</h3><table><tr><th>אמצעי תשלום</th><th>תאריך</th><th>סכום</th></tr><tr><td>${esc(payText)}</td><td>${fmt.heLong(iso)}</td><td dir="ltr">${money(total)}</td></tr></table>
<footer>מסמך ממוחשב. נחתם דיגיטלית.</footer>`;
  return { html, dir: "rtl", notes: ["he-invoice", "vat-added", ...(period ? ["service-period"] : []), ...(total >= 1000 ? ["thousands-sep"] : [])], items: [{ description: biz[0], amount: total, amount_text: money(total), currency: "ILS", date: iso, type: "expense", type_question: null, payment_method: method }] };
}
function enInvoice() {
  const cur = pick(["USD", "EUR"]);
  const sym = cur === "USD" ? "$" : "€";
  const biz = pick([["Northwind Web Studio", [["Website maintenance", 1, 400, 900], ["Hosting (annual)", 1, 120, 240]]], ["Clearview Translations", [["Translation, 3,200 words", 1, 380, 640]]], ["Atlas Bookkeeping", [["Monthly bookkeeping", 1, 250, 450]]], ["Pixel & Print", [["Brochure design", 1, 600, 1400], ["Printing 250 copies", 1, 150, 300]]]]);
  const iso = purchaseDate();
  const lines = biz[1].map(([n, q, a, b]) => { const unit = Math.round(a + rnd() * (b - a)); return { n, q, unit, total: q * unit }; });
  const net = sum(lines.map((l) => l.total));
  const taxRate = cur === "EUR" ? 0.21 : 0;
  const tax = r2(net * taxRate);
  const total = r2(net + tax);
  const html = `<header><h1>${esc(biz[0])}</h1><p>billing@example.com | Tax ID 00-${digits(7)}</p></header>
<h2>INVOICE #INV-2026-${digits(4)} <small>PAID</small></h2>
<p>Invoice date: ${fmt.longName(iso)}</p><p>Due date: ${fmt.longName(addDays(iso, 30))}</p><p>Bill to: Israel Israeli</p>
<table><tr><th>Description</th><th>Qty</th><th>Unit price</th><th>Amount</th></tr>${lines.map((l) => `<tr><td>${esc(l.n)}</td><td>${l.q}</td><td>${sym}${money(l.unit)}</td><td>${sym}${money(l.total)}</td></tr>`).join("")}</table>
<table class="sum"><tr><td>Subtotal</td><td>${sym}${money(net)}</td></tr><tr><td>Tax ${Math.round(taxRate * 100)}%</td><td>${sym}${money(tax)}</td></tr><tr class="b"><td>Total ${cur}</td><td>${sym}${money(total)}</td></tr></table>
<p class="b">Paid in full by bank transfer on ${fmt.longName(iso)}.</p><footer>Thank you for your business.</footer>`;
  return { html, dir: "ltr", notes: ["en-invoice", "due-date", ...(total >= 1000 ? ["thousands-sep"] : [])], items: [{ description: biz[0], amount: total, amount_text: money(total), currency: cur, date: iso, type: "expense", type_question: null, payment_method: "bank_transfer" }] };
}
function statement(lang, card) {
  const n = int(9, 14);
  let bal = int(4000, 16000);
  const heDesc = ["הוראת קבע ועד בית", "סופר השכונה", "משכורת", "חברת החשמל", "תאגיד המים", "העברה לישראל כהן", "משיכת מזומן", "פארם הגליל", "ביטוח רכב", "גן ילדים", "תחנת דלק צומת הגבעה", "ריבית זכות", "עמלת פעולה", "תרומה - עמותת לב פתוח"];
  const enDesc = ["PAYROLL DEPOSIT", "GREEN VALLEY GROCERS", "ELECTRIC CO", "WATER UTILITY", "ATM WITHDRAWAL", "TRANSFER TO SAVINGS", "CORNER PHARMACY", "AUTO INSURANCE", "QUICKFUEL", "MONTHLY FEE", "ONLINE PAYMENT", "INTEREST"];
  const rows = [];
  let iso = addDays(TODAY, -32);
  for (let i = 0; i < n; i++) {
    iso = addDays(iso, int(1, 3));
    if (iso > TODAY) iso = TODAY;
    const desc = pick(lang === "he" ? heDesc : enDesc);
    const credit = /משכורת|PAYROLL|ריבית|INTEREST/.test(desc);
    const amt = credit ? int(1500, 14000) : r2(int(1500, 90000) / 100);
    bal = r2(bal + (credit ? amt : -amt));
    rows.push({ iso, desc, debit: credit ? "" : money(amt), credit: credit ? money(amt) : "", bal: money(bal) });
  }
  let html;
  if (lang === "he" && card) {
    html = `<header><h1>פירוט חיובים לכרטיס המסתיים ב-${digits(4)}</h1><p>מועד חיוב: 02/11/2026</p></header><table><tr><th>תאריך עסקה</th><th>בית עסק</th><th>סכום עסקה</th><th>סכום חיוב</th></tr>${rows.filter((r) => r.debit).map((r) => `<tr><td>${fmt.heLong(r.iso)}</td><td>${esc(r.desc)}</td><td dir="ltr">${r.debit}</td><td dir="ltr">${r.debit}</td></tr>`).join("")}</table>`;
  } else if (lang === "he") {
    html = `<header><h1>בנק לדוגמה - סניף ${int(100, 999)}</h1><p>דף חשבון | חשבון ${int(10, 99)}-${int(100, 999)}-${digits(6)} | תקופה: ${fmt.heLong(addDays(TODAY, -31))} – ${fmt.heLong(TODAY)}</p></header><table><tr><th>תאריך</th><th>תיאור</th><th>חובה</th><th>זכות</th><th>יתרה</th></tr>${rows.map((r) => `<tr><td>${fmt.heLong(r.iso)}</td><td>${esc(r.desc)}</td><td dir="ltr">${r.debit}</td><td dir="ltr">${r.credit}</td><td dir="ltr">${r.bal}</td></tr>`).join("")}</table>`;
  } else {
    html = `<header><h1>SAMPLE BANK</h1><p>Checking account ****${digits(4)} | Statement period ${fmt.name(addDays(TODAY, -31))} – ${fmt.name(TODAY)}</p></header><table><tr><th>Date</th><th>Description</th><th>Debit</th><th>Credit</th><th>Balance</th></tr>${rows.map((r) => `<tr><td>${fmt.us(r.iso)}</td><td>${esc(r.desc)}</td><td>${r.debit}</td><td>${r.credit}</td><td>${r.bal}</td></tr>`).join("")}</table>`;
  }
  return { html, dir: lang === "he" ? "rtl" : "ltr", notes: [`${lang}-statement`, ...(card ? ["card"] : [])], rowsCount: rows.length };
}

// ---------- HTML ----------
const CSS_THERMAL = `.paper{background:#fdfcf7;width:330px;padding:22px 20px;color:#1d1d1d;font-size:15px;line-height:${ROW}px;box-sizing:border-box}
.row{display:flex;justify-content:space-between;gap:10px;height:${ROW}px;white-space:nowrap}.row span:first-child{overflow:hidden;text-overflow:clip}
.c{text-align:center;height:${ROW}px;white-space:nowrap;overflow:hidden}.title{font-size:21px;font-weight:bold;height:34px;line-height:34px}.small{font-size:12.5px;height:19px;line-height:19px}
.q{text-align:start;padding-inline-start:12px}.big{font-size:18px;height:28px;line-height:28px}.b{font-weight:bold}.hr{height:12px;border-top:1px dashed #555;margin-top:6px;box-sizing:border-box}`;
const CSS_A4 = `body{font-family:Arial,sans-serif;font-size:14px;color:#222;margin:0}.page{padding:40px 48px;background:#fff}header{border-bottom:2px solid #333;margin-bottom:16px}h1{font-size:24px;margin:0 0 6px}h2{font-size:18px}h2 small{font-size:12px;border:1px solid #777;padding:1px 6px;margin-inline-start:8px}
table{width:100%;border-collapse:collapse;margin:12px 0}th,td{border:1px solid #bbb;padding:6px 8px;text-align:start}th{background:#eee}.sum{width:50%;margin-inline-start:auto}.b{font-weight:bold}footer{margin-top:30px;font-size:12px;color:#666}`;

const BACKGROUNDS = ["repeating-linear-gradient(95deg,#7b5e45 0 18px,#73573f 18px 31px,#80624a 31px 52px)", "linear-gradient(160deg,#9a9a96,#7d7d79)", "linear-gradient(135deg,#3d3a36,#2b2926)", "linear-gradient(120deg,#d9d6cf,#c4c0b7)", "radial-gradient(circle at 30% 20%,#b9b2a6,#8f877b)"];

function paperHeight(rows) { return 44 + rows.reduce((a, r) => a + r.h, 0); }
function paperHtml(r, fx, font) {
  const style = [`font-family:${font}`];
  const filters = [];
  if (fx.blur) filters.push(`blur(${fx.blur}px)`);
  if (fx.fade) { filters.push("contrast(0.62) brightness(1.12)"); style.push("color:#4a4a4a"); }
  if (filters.length) style.push(`filter:${filters.join(" ")}`);
  if (fx.on) {
    const t = [];
    if (fx.perspective) t.push(`perspective(900px) rotateX(${fx.perspective}deg)`);
    t.push(`rotate(${fx.rotate}deg)`);
    style.push(`transform:${t.join(" ")}`, "box-shadow:0 8px 22px rgba(0,0,0,.45)");
  }
  return `<div class="paper" dir="${r.dir}" style="${style.join(";")}">${r.rows.map((x) => x.html).join("")}</div>`;
}
function thermalPage(papers, fx) {
  const hMax = Math.max(...papers.map((p) => paperHeight(p.r.rows)));
  const tilt = Math.max(...papers.map((p) => Math.abs(p.fx.rotate)));
  const w = fx.on ? papers.length * 380 + 120 + (tilt > 8 ? hMax * 0.22 : 0) : 330 * papers.length + 40;
  const h = fx.on ? hMax + 150 + (tilt > 8 ? 90 : 0) : hMax + 20;
  const light = fx.on && fx.light ? `<div style="position:fixed;inset:0;pointer-events:none;background:linear-gradient(${int(0, 360)}deg,rgba(255,255,255,.18),rgba(0,0,0,.32))"></div>` : "";
  const body = `<body style="margin:0;width:${Math.round(w)}px;height:${Math.round(h)}px;overflow:hidden;background:${fx.on ? fx.bg : "#fff"};display:flex;gap:30px;align-items:flex-start;justify-content:center;padding-top:${fx.on ? 60 : 10}px;box-sizing:border-box">${papers.map((p) => paperHtml(p.r, p.fx, p.font)).join("")}${light}</body>`;
  return { html: `<!doctype html><html><head><meta charset="utf-8"><style>${CSS_THERMAL}</style></head>${body}</html>`, w: Math.round(w), h: Math.round(h) };
}
function a4Page(doc, fx) {
  const shell = fx.on
    ? `<body style="margin:0;width:900px;height:${fx.h}px;overflow:hidden;background:${fx.bg};padding:50px 60px;box-sizing:border-box"><div class="page" dir="${doc.dir}" style="transform:rotate(${fx.rotate}deg);box-shadow:0 8px 22px rgba(0,0,0,.4);${fx.blur ? `filter:blur(${fx.blur}px)` : ""}">${doc.html}</div></body>`
    : `<body><div class="page" dir="${doc.dir}">${doc.html}</div></body>`;
  return `<!doctype html><html><head><meta charset="utf-8"><style>${CSS_A4}@page{size:A4;margin:12mm}</style></head>${shell}</html>`;
}

// ---------- the set ----------
const cases = [];
const add = (c) => cases.push(c);
const heSubs = [...Array(14).fill("super"), ...Array(6).fill("pharm"), ...Array(6).fill("fuel"), ...Array(8).fill("rest"), ...Array(6).fill("home")];
heSubs.forEach((sub, i) => add({ id: `rcpt-he-${pad(i + 1)}`, lang: "he", kind: "receipt", fmt: "png", build: () => heThermal(sub) }));
const usKinds = [["grocery", true], ["grocery", false], ["grocery", false], ["pharm", true], ["pharm", false], ["diner", false], ["diner", true], ["diner", false], ["gas", false]];
usKinds.forEach(([k, amb], i) => add({ id: `rcpt-en-${pad(i + 1)}`, lang: "en", kind: "receipt", fmt: "png", build: () => usThermal(k, { ambiguous: amb }) }));
[true, true, false, false, false, false].forEach((amb, i) => add({ id: `rcpt-en-${pad(i + 10)}`, lang: "en", kind: "receipt", fmt: "png", build: () => euThermal({ ambiguous: amb }) }));
for (let i = 0; i < 6; i++) add({ id: `inv-he-${pad(i + 1)}`, lang: "he", kind: "receipt", fmt: "pdf", doc: true, build: heInvoice });
for (let i = 0; i < 4; i++) add({ id: `inv-en-${pad(i + 1)}`, lang: "en", kind: "receipt", fmt: "pdf", doc: true, build: enInvoice });
for (let i = 0; i < 3; i++) add({ id: `don-he-${pad(i + 1)}`, lang: "he", kind: "receipt", fmt: "png", build: heDonation });
add({ id: "don-he-04", lang: "he", kind: "receipt", fmt: "pdf", build: heDonation, thermalPdf: true });
add({ id: "don-en-01", lang: "en", kind: "receipt", fmt: "pdf", build: enDonation, thermalPdf: true });
const multis = [["he", ["super", "pharm"]], ["he", ["rest", "fuel", "super"]], ["he", ["home", "super"]], ["en", ["grocery", "diner"]], ["en", ["pharm", "grocery", "diner"]]];
multis.forEach(([lang, subs], i) => add({ id: `multi-${lang}-${pad(i + 1)}`, lang, kind: "several", fmt: "png", multi: subs.map((s) => () => (lang === "he" ? heThermal(s) : usThermal(s))) }));
[["he", false, "png"], ["he", true, "png"], ["he", false, "pdf"], ["en", false, "png"], ["en", false, "pdf"]].forEach(([lang, card, f], i) => add({ id: `stmt-${lang}-${pad(i + 1)}`, lang, kind: "statement", fmt: f, doc: true, statement: () => statement(lang, card) }));

// Photo effects for PNGs. Fixed counts, spread by a shuffled index.
const pngs = cases.filter((c) => c.fmt === "png");
const order = pngs.map((_, i) => i).sort(() => rnd() - 0.5);
const take = (n) => order.splice(0, n).map((i) => pngs[i]);
take(3).forEach((c) => (c.upside = true));
take(3).forEach((c) => (c.tilt = true));
take(8).forEach((c) => (c.fade = true));
take(8).forEach((c) => (c.blur = true));
take(6).forEach((c) => (c.persp = true));
pngs.forEach((c) => (c.light = chance(0.3)));

const PRINT_IDS = ["rcpt-he-01", "rcpt-he-04", "rcpt-he-09", "rcpt-he-15", "rcpt-he-17", "rcpt-he-21", "rcpt-he-24", "rcpt-he-28", "rcpt-he-36", "rcpt-en-02", "rcpt-en-06", "rcpt-en-12", "don-he-01", "don-he-02", "multi-he-01"];

fs.mkdirSync(path.join(OUT, "images"), { recursive: true });
fs.mkdirSync(path.join(OUT, "print"), { recursive: true });
fs.mkdirSync(path.join(WORK, "html"), { recursive: true });

const jobs = [];
const answers = [];
const printPapers = [];
for (const c of cases) {
  const fx = { on: true, bg: pick(BACKGROUNDS), rotate: c.upside ? 180 + int(-3, 3) : c.tilt ? pick([-1, 1]) * int(9, 13) : int(-40, 40) / 10, blur: c.blur ? int(5, 10) / 10 : 0, fade: Boolean(c.fade), perspective: c.persp ? int(6, 12) : 0, light: c.light };
  const font = chance(0.6) ? "'Courier New',monospace" : "Arial,sans-serif";
  const notes = [];
  let items = [];
  let route = "several";
  let htmlPath = path.join(WORK, "html", `${c.id}.html`);
  let size = null;
  if (c.multi) {
    const parts = c.multi.map((b) => b());
    const papers = parts.map((r) => ({ r, fx: { ...fx, rotate: int(-60, 60) / 10 }, font }));
    const page = thermalPage(papers, fx);
    fs.writeFileSync(htmlPath, page.html);
    size = page;
    items = parts.flatMap((p) => p.items);
    notes.push("several", ...parts.flatMap((p) => p.notes));
    if (PRINT_IDS.includes(c.id)) printPapers.push(papers.map((p) => paperHtml(p.r, { on: false }, font)).join(""));
  } else if (c.statement) {
    const doc = c.statement();
    route = "list";
    notes.push(...doc.notes);
    const h = 230 + doc.rowsCount * 31 + 90;
    fs.writeFileSync(htmlPath, a4Page(doc, c.fmt === "png" ? { ...fx, rotate: int(-25, 25) / 10, h } : { on: false }));
    size = { w: 900, h };
  } else if (c.doc) {
    const doc = c.build();
    items = doc.items;
    notes.push(...doc.notes);
    fs.writeFileSync(htmlPath, a4Page(doc, { on: false }));
  } else {
    const r = c.build();
    items = r.items;
    notes.push(...r.notes);
    if (c.fmt === "pdf") {
      const page = thermalPage([{ r, fx: { on: false }, font }], { on: false });
      const mm = Math.ceil(paperHeight(r.rows) * 0.2646) + 12;
      fs.writeFileSync(htmlPath, page.html.replace("<style>", `<style>@page{size:90mm ${mm}mm;margin:4mm}`));
    } else {
      const page = thermalPage([{ r, fx, font }], fx);
      fs.writeFileSync(htmlPath, page.html);
      size = page;
    }
    if (PRINT_IDS.includes(c.id)) printPapers.push(paperHtml(r, { on: false }, font));
  }
  if (c.fmt === "png") {
    if (c.upside) notes.push("upside-down");
    if (c.tilt) notes.push("tilted");
    if (c.fade) notes.push("faded");
    if (c.blur) notes.push("blurred");
    if (c.persp) notes.push("perspective");
    if (c.light) notes.push("uneven-light");
  }
  const file = `${c.id}.${c.fmt}`;
  jobs.push({ html: htmlPath, out: path.join(OUT, "images", file), fmt: c.fmt, size });
  answers.push({ id: c.id, file: `images/${file}`, kind: c.kind, language: c.lang, note: [...new Set(notes)].join(","), today: TODAY, expected: { route, ask: null, items } });
}

// Print sheet: the PRINT_IDS receipts, clean, one per page, at thermal width (80mm).
const printHtml = `<!doctype html><html><head><meta charset="utf-8"><style>${CSS_THERMAL}@page{size:A4;margin:15mm}body{margin:0}.sheet{page-break-after:always;display:flex;gap:10mm;justify-content:center}.paper{border:1px dotted #bbb}</style></head><body>${printPapers.map((p, i) => `<div class="sheet">${p}</div>`).join("")}</body></html>`;
const printPath = path.join(WORK, "html", "print-sheet.html");
fs.writeFileSync(printPath, printHtml);
jobs.push({ html: printPath, out: path.join(OUT, "print", "print-sheet.pdf"), fmt: "pdf" });

fs.writeFileSync(path.join(OUT, "answers.jsonl"), answers.map((a) => JSON.stringify(a)).join("\n") + "\n");
const photoAnswers = answers.filter((a) => PRINT_IDS.includes(a.id)).map((a) => ({ ...a, id: `${a.id}-photo`, file: `photos/${a.id}-photo.jpg`, note: `${a.note},printed-photo` }));
fs.writeFileSync(path.join(OUT, "answers-photos.jsonl"), photoAnswers.map((a) => JSON.stringify(a)).join("\n") + "\n");

// Render with headless Chrome, four at a time.
const fileUrl = (p) => `file:///${p.replace(/\\/g, "/")}`;
function render(job, slot) {
  const args = ["--headless=new", "--disable-gpu", "--hide-scrollbars", `--user-data-dir=${path.join(WORK, `prof${slot}`)}`];
  if (job.fmt === "png") args.push("--force-device-scale-factor=2", `--window-size=${job.size.w},${job.size.h}`, `--screenshot=${job.out}`);
  else args.push("--no-pdf-header-footer", `--print-to-pdf=${job.out}`);
  args.push(fileUrl(job.html));
  return new Promise((resolve) => execFile(CHROME, args, { timeout: 60000 }, (err) => resolve(err ? `${job.out}: ${err.message}` : null)));
}
const queue = [...jobs];
const errors = [];
await Promise.all([0, 1, 2, 3].map(async (slot) => { while (queue.length) { const e = await render(queue.shift(), slot); if (e) errors.push(e); } }));
console.log(JSON.stringify({ cases: answers.length, photos: photoAnswers.length, rendered: jobs.length - errors.length, errors }, null, 1));
