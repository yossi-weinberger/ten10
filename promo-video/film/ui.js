// Recreations of real TEN10 screens, built from the app's own strings, icons,
// colours and layout (see src/components/dashboard/StatCards, TransactionsTable,
// HalachaPage, ContactModal, and the reminder email template).
// Components are static DOM; scenes.js animates them.
(function () {
  const { h, s, icon } = window.ENGINE;

  function makeUI(C) {
    const R = C.dir === "rtl";
    const nf = new Intl.NumberFormat(C.locale, { style: "currency", currency: C.currency, maximumFractionDigits: 0 });
    const money = (n) => nf.format(Math.round(n));
    const U = C.ui;

    // ----------------------------------------------------------- sidebar
    function sidebar() {
      const navIcons = ["house", "circle-plus", "table", "chart-pie", "book", "settings", "info"];
      const hl = h("div", { class: "navhl" });
      const bar = h("div", { class: "navbar" });
      const el = h("div", { class: "sidebar" },
        h("img", { class: "logo", src: "../../public/logo/logo.svg", alt: "" }),
        hl, bar,
        ...navIcons.map((n) => h("div", { class: "nav" }, icon(n, 22, 1.8))),
        h("div", { class: "nav" }, h("img", { src: "../../public/donate.svg", style: { width: "24px", opacity: "0.85" } })),
        h("div", { class: "avatar" }, R ? "י" : "Y"),
        h("div", { class: "globe" }, icon("globe", 22, 1.8)),
      );
      // nav slot i → y (px, relative to sidebar)
      const slotY = (i) => 14 + 36 + 18 + 3 + i * 50;
      return { el, hl, bar, slotY };
    }

    // ----------------------------------------------------------- dashboard
    function statCard(kind, title, iconName) {
      const val = h("div", { class: "val num" });
      const ttl = h("div", { class: "ttl" }, h("span", {}, title), icon(iconName, 20, 2));
      const el = h("div", { class: `card ${kind}` }, ttl, h("div", {}, val));
      return { el, val };
    }

    function dashboard() {
      const k = U.cards;
      const overall = statCard("blue", k.overall, "scale");
      const income = statCard("green", k.income, "wallet");
      const expenses = statCard("red", k.expenses, "credit-card");
      const donations = statCard("yellow", k.donations, "hand-coins");

      // overall: chips + progress + goal text + add button
      const chipM = h("span", { class: "chip num" });
      const chipC = h("span", { class: "chip num" });
      const chips = h("div", { class: "chips" }, chipM, chipC);
      const progI = h("i");
      const goal = h("div", { style: { fontSize: "12.5px", color: "var(--mfg)", textAlign: "center", marginTop: "5px", display: "flex", gap: "6px", justifyContent: "center", alignItems: "center" } });
      const goalTxt = h("span", { class: "num" });
      goal.append(goalTxt, icon("info", 14, 2));
      overall.el.append(chips, h("div", { style: { marginInlineEnd: "44px" } }, h("div", { class: "progress" }, progI), goal));
      overall.el.append(h("div", { class: "add" }, icon("badge-plus", 22, 2)));

      const incFoot = h("div", { class: "foot num" });
      income.el.append(incFoot, h("div", { class: "add" }, icon("badge-plus", 22, 2)));
      if (R) incFoot.style.right = "22px"; else incFoot.style.left = "22px";
      expenses.el.append(h("div", { class: "add" }, icon("badge-plus", 22, 2)));
      const yI = h("i");
      const donFoot = h("div", { class: "num", style: { fontSize: "12.5px", color: "var(--mfg)", marginTop: "6px" } });
      donations.el.append(
        h("div", { style: { position: "absolute", bottom: "14px", [R ? "right" : "left"]: "22px", [R ? "left" : "right"]: "60px" } },
          h("div", { class: "ybar" }, yI), donFoot),
        h("div", { class: "add" }, icon("badge-plus", 22, 2)),
      );

      const cards = h("div", { class: "cards", style: { top: "158px", [R ? "right" : "left"]: "44px", width: "1286px" } },
        overall.el, income.el, expenses.el, donations.el);

      const ranges = h("div", { style: { position: "absolute", top: "104px", [R ? "left" : "right"]: "44px", display: "flex", gap: "8px" } },
        ...U.ranges.map((r, i) => h("div", { class: `btn${i === 0 ? " primary" : ""}` }, i === 3 ? icon("calendar", 15, 2) : null, r)));

      const chart = monthlyChart();
      chart.el.style.top = "368px";
      chart.el.style[R ? "right" : "left"] = "44px";

      const el = h("div", { class: "page" },
        h("h1", {}, U.welcome), h("div", { class: "sub" }, U.welcomeSub), ranges, cards, chart.el);

      // live values set by scenes
      function set({ inc, chom, exp, don, maaser, chomesh, showChomesh }) {
        const overallV = maaser + chomesh;
        overall.val.textContent = money(overallV);
        income.val.textContent = money(inc);
        expenses.val.textContent = money(exp);
        donations.val.textContent = money(don);
        chipM.textContent = `${U.cards.maaserChip}: ${money(maaser)}`;
        chipC.textContent = `${U.cards.chomeshChip}: ${money(chomesh)}`;
        chipC.style.display = showChomesh ? "" : "none";
        const pct = don + overallV > 0 ? (don / (don + overallV)) * 100 : 0;
        progI.style.width = `${pct.toFixed(2)}%`;
        goalTxt.textContent = U.cards.goal(pct.toFixed(1));
        incFoot.textContent = chom > 0 ? (R ? `${money(chom)} ${U.cards.withChomesh}` : `${money(chom)} ${U.cards.withChomesh}`) : "";
        const yp = inc > 0 ? (don / inc) * 100 : 0;
        yI.style.width = `${Math.min(100, yp * 6).toFixed(2)}%`;
        donFoot.textContent = U.cards.ofIncome(yp.toFixed(1));
      }
      return { el, set, overall, income, expenses, donations, chipM, chipC, cards, incFoot };
    }

    function monthlyChart() {
      const W = 1286, H = 440;
      const px = 60, py = 70, cw = W - 2 * px - 40, ch = 290;
      const series = [
        { c: "#22c55e", v: [15100, 15250, 15000, 15400, 12000] },
        { c: "#ef4444", v: [13600, 11200, 12900, 11600, 7340] },
        { c: "#eab308", v: [1250, 1300, 1420, 1100, 580] },
      ];
      const max = 16000;
      const xs = (i) => px + (i / 4) * cw;
      const ys = (v) => py + ch - (v / max) * ch;
      const path = (v) => {
        const p = v.map((val, i) => [xs(i), ys(val)]);
        let d = `M${p[0][0]},${p[0][1]}`;
        for (let i = 1; i < p.length; i++) {
          const [x0, y0] = p[i - 1], [x1, y1] = p[i];
          const mx = (x0 + x1) / 2;
          d += ` C${mx},${y0} ${mx},${y1} ${x1},${y1}`;
        }
        return { line: d, area: `${d} L${p[p.length - 1][0]},${py + ch} L${p[0][0]},${py + ch} Z` };
      };
      const defs = s("defs");
      const svg = s("svg", { width: W, height: H, viewBox: `0 0 ${W} ${H}` }, defs);
      series.forEach((se, i) => {
        const g = s("linearGradient", { id: `cg${i}`, x1: 0, y1: 0, x2: 0, y2: 1 },
          s("stop", { offset: "0%", "stop-color": se.c, "stop-opacity": i === 1 ? 0.75 : 0.7 }),
          s("stop", { offset: "100%", "stop-color": se.c, "stop-opacity": 0.05 }));
        defs.append(g);
      });
      for (let k = 0; k <= 4; k++) {
        const y = py + ch - (k / 4) * ch;
        svg.append(s("line", { x1: px, x2: px + cw + 40, y1: y, y2: y, stroke: "#ece8dc", "stroke-dasharray": "3 4" }));
        const lab = s("text", { x: px + cw + 48, y: y + 4, "font-size": 12, fill: "#8a8578", "text-anchor": "start" });
        lab.textContent = money(k * 4000);
        svg.append(lab);
      }
      series.forEach((se, i) => {
        const p = path(se.v);
        svg.append(s("path", { d: p.area, fill: `url(#cg${i})` }));
        svg.append(s("path", { d: p.line, fill: "none", stroke: se.c, "stroke-width": 2 }));
      });
      U.chart.months.forEach((m, i) => {
        const t = s("text", { x: xs(i), y: py + ch + 26, "font-size": 12.5, fill: "#6b675c", "text-anchor": "middle" });
        t.textContent = m;
        svg.append(t);
      });
      const legend = h("div", { style: { display: "flex", justifyContent: "center", gap: "22px", fontSize: "13px", marginTop: "-28px" } },
        ...U.chart.legend.map((l, i) => h("span", { style: { display: "inline-flex", alignItems: "center", gap: "6px" } },
          h("i", { style: { width: "9px", height: "9px", borderRadius: "2px", background: series[i].c, display: "inline-block" } }), l)));
      const el = h("div", { class: "panel chart", style: { width: `${W}px`, height: `${H + 30}px`, padding: "18px 0 0" } },
        h("div", { style: { fontSize: "21px", fontWeight: "600", padding: "0 24px" } }, U.chart.title), svg, legend);
      return { el };
    }

    // ----------------------------------------------------------- add-transaction fragment
    function txForm() {
      const F = U.form;
      const toggle = h("div", { class: "toggle" }, F.chomesh);
      const amt = h("div", { class: "field num", style: { flex: "1", fontWeight: "600" } }, money(C.data.chomeshIncome));
      const el = h("div", { class: "txform" },
        h("div", { style: { fontSize: "15px", fontWeight: "600" } }, F.type),
        h("div", { class: "seg" },
          h("div", { class: "on" }, icon("wallet", 20, 2), F.income),
          h("div", {}, icon("credit-card", 20, 2), F.expense),
          h("div", {}, icon("hand-coins", 20, 2), F.donation)),
        h("div", { style: { display: "flex", gap: "12px", marginTop: "16px", alignItems: "flex-end" } },
          h("div", { style: { flex: "1" } },
            h("div", { style: { fontSize: "14px", fontWeight: "600", marginBottom: "6px" } }, F.amount), amt),
          h("div", { style: { flex: "1" } },
            h("div", { style: { fontSize: "14px", fontWeight: "600", marginBottom: "6px" } }, " "),
            h("div", { class: "field", style: { color: "var(--fg)" } }, F.desc))),
        h("div", { style: { display: "flex", justifyContent: "center", marginTop: "18px" } }, toggle),
      );
      return { el, toggle };
    }

    // ----------------------------------------------------------- transactions table
    const COLS = R ? "120px 1.3fr 110px 110px 1fr 1.1fr 110px" : "130px 1.3fr 110px 110px 1fr 1.1fr 110px";
    function row(r) {
      const T = U.table.types;
      const dateCell = h("div", { class: "num" }, r.d);
      const el = h("div", { class: "tr", style: { gridTemplateColumns: COLS } },
        dateCell,
        h("div", {}, r.desc),
        h("div", { class: "amtc num" }, money(r.amt)),
        h("div", { class: "c" }, h("span", { class: `badge ${r.type}` }, T[r.type])),
        h("div", { class: "c" }, r.cat),
        h("div", { class: "c" }, r.pay),
        h("div", { class: "c" }, r.rec ? h("span", { class: "badge rec num" }, r.rec) : "-"),
      );
      return { el, dateCell };
    }
    function tablePage(rows) {
      const T = U.table;
      const head = h("div", { class: "tr head", style: { gridTemplateColumns: COLS } },
        ...T.cols.map((c, i) => h("div", { class: i >= 3 ? "c" : "" }, c)));
      const body = h("div", { style: { position: "relative", height: `${rows.length * 52}px` } });
      const rws = rows.map((r, i) => {
        const x = row(r);
        x.el.style.top = `${i * 52}px`;
        body.append(x.el);
        return x;
      });
      const tbl = h("div", { class: "tbl", style: { top: "222px", [R ? "right" : "left"]: "44px", width: "1286px" } }, head, body);
      const importBtn = h("div", { class: "btn" }, icon("upload", 16, 2), T.import, h("span", { class: "badge new" }, T.isNew));
      const bar = h("div", { style: { position: "absolute", top: "160px", [R ? "right" : "left"]: "44px", width: "1286px", display: "flex", justifyContent: "space-between", flexDirection: "row" } },
        h("div", { style: { display: "flex", gap: "10px" } }, h("div", { class: "btn" }, icon("download", 16, 2), T.export), importBtn),
        h("div", { class: "btn primary" }, T.showRecurring));
      const filters = h("div", { class: "panel", style: { top: "92px", [R ? "right" : "left"]: "44px", width: "1286px", height: "52px", display: "flex", alignItems: "center", gap: "12px", padding: "0 14px" } },
        h("div", { class: "field", style: { width: "300px", height: "34px", fontSize: "13.5px", color: "var(--mfg)", gap: "8px" } }, icon("search", 15, 2), T.search),
        h("div", { class: "field", style: { width: "220px", height: "34px", fontSize: "13.5px", color: "var(--mfg)", gap: "8px" } }, icon("calendar", 15, 2), "—"),
        h("div", { class: "field", style: { width: "150px", height: "34px", fontSize: "13.5px", gap: "8px" } }, icon("list-filter", 15, 2), T.types.income + " / " + T.types.donation));
      const el = h("div", { class: "page" }, h("h1", {}, T.title), filters, bar, tbl);
      return { el, rows: rws, importBtn, tbl };
    }

    // ----------------------------------------------------------- import
    function fileChip() {
      const el = h("div", { class: "filechip" },
        h("div", { class: "fi" }, icon("file-spreadsheet", 26, 1.8)),
        h("div", {}, h("div", { dir: R ? "rtl" : "ltr" }, U.importFlow.file),
          h("div", { style: { display: "flex", gap: "6px", marginTop: "4px" } }, h("span", { class: "fmt" }, ".XLSX"), h("span", { class: "fmt" }, ".CSV"))));
      return { el };
    }
    function stepper() {
      const steps = U.importFlow.steps;
      const barI = h("i");
      const bar = h("div", { class: "bar", style: { [R ? "right" : "left"]: "55px", width: `${(steps.length - 1) * 110}px` } }, barI);
      const sts = steps.map((st, i) => {
        const dot = h("div", { class: "dot num" }, String(i + 1));
        const e = h("div", { class: "st" }, dot, h("span", {}, st));
        return { e, dot };
      });
      const inner = h("div", { class: "stepper", style: { position: "relative" } }, bar, ...sts.map((x) => x.e));
      const el = h("div", { class: "panel", style: { padding: "18px 26px 16px", display: "flex", flexDirection: "column", gap: "12px" } },
        h("div", { style: { display: "flex", alignItems: "center", gap: "10px", fontSize: "18px", fontWeight: "700" } }, icon("file-text", 20, 2), U.importFlow.title),
        inner);
      inner.style.position = "relative";
      return { el, barI, sts };
    }

    // ----------------------------------------------------------- calendar
    function calendar() {
      const Rc = U.recurring;
      const mh = h("div", { class: "mh" });
      const names = Rc.monthNames.map((m) => {
        const n = h("div", { class: "mname" }, m);
        mh.append(n);
        return n;
      });
      mh.append(h("div", { style: { position: "absolute", [R ? "left" : "right"]: "0", display: "flex", gap: "6px", color: "var(--teal)" } }, icon("repeat", 20, 2)));
      const grids = Rc.monthNames.map((_, mi) => {
        const g = h("div", { class: "grid" });
        Rc.weekdays.forEach((w) => g.append(h("div", { class: "wd" }, w)));
        const cells = [];
        const first = Rc.firstDow[mi];
        for (let i = 0; i < 35; i++) {
          const d = i - first + 1;
          const valid = d >= 1 && d <= Rc.daysIn[mi];
          const c = h("div", { class: `d num${valid ? "" : " x"}` }, valid ? String(d) : "0");
          g.append(c);
          cells.push({ c, d: valid ? d : 0 });
        }
        return { g, cells };
      });
      const gridWrap = h("div", { style: { position: "relative", height: `${26 + 4 + 5 * 50}px` } });
      grids.forEach((gr) => {
        gr.g.style.position = "absolute";
        gr.g.style.left = "0"; gr.g.style.right = "0"; gr.g.style.top = "0";
        gridWrap.append(gr.g);
      });
      const mark = h("div", { class: "mark num" }, String(Rc.day));
      const bell = h("div", { class: "bell" }, icon("bell", 20, 2.2));
      gridWrap.append(mark, bell);
      const el = h("div", { class: "cal" }, mh, gridWrap);
      // cell geometry inside gridWrap (for mark placement): 7 cols over 422px, rows after weekday header
      const cellPos = (mi, day) => {
        const first = Rc.firstDow[mi];
        const idx = day - 1 + first;
        const col = idx % 7, rowI = Math.floor(idx / 7);
        const cw = (470 - 48 - 6 * 4) / 7;
        const x = R ? 470 - 48 - (col + 1) * cw - col * 4 : col * (cw + 4);
        return { x: x + cw / 2, y: 26 + 4 + rowI * 50 + 23 };
      };
      return { el, names, grids, mark, bell, cellPos };
    }
    function recRow(date, n) {
      const Rc = U.recurring;
      const badge = h("span", { class: "badge rec num" }, `${n} / ∞`);
      const el = h("div", { class: "recrow" },
        h("span", { class: "rep" }, icon("repeat", 18, 2)),
        h("span", { class: "dt num" }, date),
        h("span", { style: { fontWeight: "600" } }, Rc.label),
        h("span", { class: "badge donation" }, U.table.types.donation),
        h("span", { class: "am num" }, money(Rc.amount)),
        badge);
      return { el, badge };
    }

    // ----------------------------------------------------------- reminder email
    function email() {
      const M = U.email;
      const amt = h("span", { class: "ba num" }, money(M.amount));
      const el = h("div", { class: "email" },
        h("div", { class: "hdr" }, h("img", { src: "../../public/logo/logo-wide.svg", alt: "" }), h("div", { class: "sl" }, M.slogan)),
        h("div", { class: "body" },
          h("div", { class: "greet" }, M.greeting),
          h("div", { class: "rem" }, M.reminder),
          h("div", { class: "bal" }, h("span", { class: "bb" }, M.badge), amt, h("div", { class: "bv" }, M.verification)),
          h("div", { class: "cta" }, M.cta, h("span", { style: { marginInlineStart: "8px" } }, R ? "←" : "→"))));
      return { el, amt };
    }
    function inbox() {
      const M = U.email;
      const el = h("div", { class: "inbox" },
        h("div", { class: "av" }, h("img", { src: "../../public/logo/versions/symbol-white-cropped.svg", style: { width: "26px" } })),
        h("div", { style: { flex: "1", minWidth: "0" } }, h("div", { class: "t1" }, M.from), h("div", { class: "t2 num" }, M.subject)),
        h("span", { style: { color: "var(--teal)" } }, icon("mail", 22, 2)));
      return { el };
    }

    // ----------------------------------------------------------- halacha
    function halachaPage() {
      const Hh = U.halacha;
      const pill = h("div", { class: "pill" });
      const items = Hh.tabs.map((tb) => h("div", { class: "it" }, h("span", { html: tb })));
      const nav = h("div", { class: "hnav", style: { top: "130px", [R ? "right" : "left"]: "44px" } }, pill, ...items);
      const arts = Hh.articles.map((a, i) => {
        const e = h("div", { class: "hart", style: { top: "130px", [R ? "right" : "left"]: "390px", width: "900px" } },
          h("div", { class: "at" }, h("span", { style: { color: "var(--teal)" } }, icon("book-open", 26, 2)), h("span", { html: a.title })),
          h("div", { class: "as", html: a.sub }),
          h("div", { class: "ah", html: a.h }),
          h("div", { class: "ap", html: a.p }),
          h("div", { class: `abox${i === 2 ? " abox2" : ""}` }, h("span", { html: a.box }),
            h("div", { class: "ln", style: { width: "96%" } }), h("div", { class: "ln", style: { width: "88%" } }), h("div", { class: "ln", style: { width: "64%" } })));
        return e;
      });
      const title = h("h1", { html: Hh.title });
      const el = h("div", { class: "page" }, title, h("div", { class: "sub", html: Hh.sub }), nav, ...arts);
      return { el, pill, items, arts, title };
    }

    // ----------------------------------------------------------- contact
    function contact() {
      const K = U.contact;
      const subj = h("span", {});
      const subjCaret = h("i", { class: "caret" });
      const body = h("span", {});
      const bodyCaret = h("i", { class: "caret" });
      const bodyPh = h("span", { class: "ph" }, R ? "פרט את שאלתך עבור הרב..." : "Describe your question for the rabbi...");
      const send = h("div", { class: "btn primary lg", style: { width: "100%", justifyContent: "center", marginTop: "20px" } }, icon("send", 17, 2), K.submit);
      const tabRabbi = h("div", { class: "on" }, K.tabs[0]);
      const el = h("div", { class: "dialog" },
        h("div", { class: "dt" }, K.title), h("div", { class: "dd" }, K.desc),
        h("div", { class: "tabs" }, tabRabbi, h("div", {}, K.tabs[1])),
        h("div", { class: "flabel" }, K.subjectLabel), h("div", { class: "finput" }, subj, subjCaret),
        h("div", { class: "flabel" }, K.bodyLabel), h("div", { class: "finput area" }, bodyPh, body, bodyCaret),
        send);
      const toast = h("div", { class: "toast" }, icon("circle-check", 20, 2.2), K.toast);
      const fab = h("div", { class: "fab" }, icon("message-square-plus", 24, 2));
      return { el, subj, subjCaret, body, bodyCaret, bodyPh, send, toast, fab, tabRabbi };
    }

    return { money, sidebar, dashboard, txForm, tablePage, fileChip, stepper, calendar, recRow, email, inbox, halachaPage, contact };
  }

  window.makeUI = makeUI;
})();
