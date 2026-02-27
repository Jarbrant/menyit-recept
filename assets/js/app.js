/* ============================================================
   FIL: assets/js/app.js  (HEL FIL)
   PATCH: AO-RECIPES-SEARCH-02 (FAS 1) — Fejk: articleNo + GTIN-13 + img + sök på allt
   Policy: statisk GitHub Pages, inga externa libs, XSS-safe (render via textContent i sidor)
   Notis: Den här filen används i nästa steg när vi flyttar inline-JS till page-moduler.
============================================================ */

/**
 * DATA-MODELL (MVP)
 * - "sub" = underrecept (t.ex. sås, soppa, tillbehör)
 * - "meal" = måltidsrecept som består av flera underrecept via subRecipeIds[]
 *
 * OBS:
 * - Inga personuppgifter.
 * - Keys/stuktur hålls stabila så vi kan koppla UI utan att riva upp allt.
 * - NYTT (AO-RECIPES-SEARCH-02): ingrediens får fejkfält:
 *     articleNo (artikelnummer), gtin (GTIN-13), img (data-url SVG)
 */

function svgDataUrl(label = "Produkt") {
  // Lokal, deterministisk, filfri “produktbild” (SVG) som funkar i GitHub Pages.
  // OBS: Render ska ske via <img src="..."> senare — ingen innerHTML.
  const safe = (label ?? "").toString().slice(0, 24);
  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#e9eefb"/>
      <stop offset="1" stop-color="#f7f8ff"/>
    </linearGradient>
  </defs>
  <rect x="6" y="6" width="84" height="84" rx="16" fill="url(#g)" stroke="#d6d9e6"/>
  <circle cx="48" cy="38" r="14" fill="#c9d1ff"/>
  <rect x="24" y="58" width="48" height="10" rx="5" fill="#c9d1ff"/>
  <text x="48" y="86" text-anchor="middle" font-family="Arial" font-size="10" fill="#4b5563">${safe}</text>
</svg>`.trim();
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export function getMockDB() {
  // Underrecept (5 st)
  const subRecipes = [
    {
      id: "sr1",
      type: "sub",
      name: "Remouladsås",
      mealName: "Remouladsås",
      status: "active",
      cat: "tillbehor",
      price: "8,20 kr",
      co2: "—",
      energy: "—",
      size: "—",
      desc: "Kall sås till fisk och panering.",
      ingredients: [
        { name: "Majonnäs", qty: "0.8", unit: "kg", price: "—", articleNo: "A-1001", gtin: "0731234567001", img: svgDataUrl("Majonnäs") },
        { name: "Pickles", qty: "0.2", unit: "kg", price: "—", articleNo: "A-1002", gtin: "0731234567002", img: svgDataUrl("Pickles") },
        { name: "Senap", qty: "0.05", unit: "kg", price: "—", articleNo: "A-1003", gtin: "0731234567003", img: svgDataUrl("Senap") }
      ],
      history: [{ date: "2026-02-20", change: "Pris uppdaterat (demo)" }]
    },
    {
      id: "sr2",
      type: "sub",
      name: "Kokt potatis (bas)",
      mealName: "Kokt potatis (bas)",
      status: "active",
      cat: "tillbehor",
      price: "6,10 kr",
      co2: "—",
      energy: "—",
      size: "—",
      desc: "Grundtillbehör för husman.",
      ingredients: [
        { name: "Potatis", qty: "10", unit: "kg", price: "—", articleNo: "A-2001", gtin: "0731234567011", img: svgDataUrl("Potatis") },
        { name: "Salt", qty: "0.05", unit: "kg", price: "—", articleNo: "A-2002", gtin: "0731234567012", img: svgDataUrl("Salt") }
      ],
      history: [{ date: "2026-02-12", change: "Ny leverantör (demo)" }]
    },
    {
      id: "sr3",
      type: "sub",
      name: "Broccolisoppa",
      mealName: "Broccolisoppa",
      status: "active",
      cat: "soppa",
      price: "11,90 kr",
      co2: "—",
      energy: "—",
      size: "—",
      desc: "Soppa som kan ingå som förrätt.",
      ingredients: [
        { name: "Broccoli", qty: "2.0", unit: "kg", price: "—", articleNo: "A-3001", gtin: "0731234567021", img: svgDataUrl("Broccoli") },
        { name: "Grädde", qty: "1.0", unit: "l", price: "—", articleNo: "A-3002", gtin: "0731234567022", img: svgDataUrl("Grädde") },
        { name: "Buljong", qty: "0.1", unit: "kg", price: "—", articleNo: "A-3003", gtin: "0731234567023", img: svgDataUrl("Buljong") }
      ],
      history: []
    },
    {
      id: "sr4",
      type: "sub",
      name: "Vitvinssås med ägg",
      mealName: "Vitvinssås med ägg",
      status: "inactive",
      cat: "sas",
      price: "—",
      co2: "—",
      energy: "—",
      size: "—",
      desc: "Sås till fisk. Inaktiv i demo.",
      ingredients: [
        { name: "Vitvin (matlagning)", qty: "0.3", unit: "l", price: "—", articleNo: "A-4001", gtin: "0731234567031", img: svgDataUrl("Vitvin") },
        // Här gör vi ett tydligt test-exempel:
        { name: "Ägg", qty: "10", unit: "st", price: "—", articleNo: "3464-B", gtin: "0731234567032", img: svgDataUrl("Ägg") }
      ],
      history: [{ date: "2026-02-01", change: "Markerad inaktiv (demo)" }]
    },
    {
      id: "sr5",
      type: "sub",
      name: "Panering (standard)",
      mealName: "Panering (standard)",
      status: "active",
      cat: "bas",
      price: "4,70 kr",
      co2: "—",
      energy: "—",
      size: "—",
      desc: "Standard-panering för fisk/kyckling.",
      ingredients: [
        { name: "Ströbröd", qty: "1.0", unit: "kg", price: "—", articleNo: "A-5001", gtin: "0731234567041", img: svgDataUrl("Ströbröd") },
        { name: "Ägg", qty: "12", unit: "st", price: "—", articleNo: "3464-B", gtin: "0731234567032", img: svgDataUrl("Ägg") },
        { name: "Mjöl", qty: "0.6", unit: "kg", price: "—", articleNo: "A-5003", gtin: "0731234567043", img: svgDataUrl("Mjöl") }
      ],
      history: []
    }
  ];

  // Måltidsrecept (5 st) — varje har subRecipeIds
  const mealRecipes = [
    {
      id: "mr1",
      type: "meal",
      name: "Fiskpanetter med kokt potatis och remouladsås",
      mealName: "Fiskpanetter med kokt potatis och remouladsås",
      status: "active",
      cat: "husman",
      price: "23,39 kr",
      co2: "—",
      energy: "—",
      size: "500 g",
      desc: "Klassisk husman med tre komponenter.",
      subRecipeIds: ["sr5", "sr2", "sr1"],
      ingredients: [
        // meal-level ingredienser (utöver underrecept)
        { name: "Fiskpanetter", qty: "2.5", unit: "kg", price: "—", articleNo: "A-9001", gtin: "0731234567091", img: svgDataUrl("Fisk") },
        { name: "Citron", qty: "0.2", unit: "kg", price: "—", articleNo: "A-9002", gtin: "0731234567092", img: svgDataUrl("Citron") }
      ],
      history: [{ date: "2026-02-20", change: "Leverantör uppdaterade pris (demo)" }]
    },
    {
      id: "mr2",
      type: "meal",
      name: "Kalvstek med gräddsås + rostad potatis + broccolisoppa",
      mealName: "Kalvstek med gräddsås + rostad potatis + broccolisoppa",
      status: "active",
      cat: "husman",
      price: "—",
      co2: "—",
      energy: "—",
      size: "440 g",
      desc: "Måltid med förrättssoppa.",
      subRecipeIds: ["sr3", "sr2"],
      ingredients: [
        { name: "Kalvstek", qty: "3.0", unit: "kg", price: "—", articleNo: "A-9003", gtin: "0731234567093", img: svgDataUrl("Kalv") },
        { name: "Grädde", qty: "1.0", unit: "l", price: "—", articleNo: "A-3002", gtin: "0731234567022", img: svgDataUrl("Grädde") }
      ],
      history: [{ date: "2026-02-12", change: "Ny produkt upptäckt vid nattkörning (demo)" }]
    },
    {
      id: "mr3",
      type: "meal",
      name: "Lättrimmad koljafilé med vitvinssås och kokt potatis",
      mealName: "Lättrimmad koljafilé med vitvinssås och kokt potatis",
      status: "inactive",
      cat: "husman",
      price: "—",
      co2: "—",
      energy: "—",
      size: "420 g",
      desc: "Inaktiv i demo (t.ex. utgående komponent).",
      subRecipeIds: ["sr4", "sr2"],
      ingredients: [{ name: "Koljafilé", qty: "2.5", unit: "kg", price: "—", articleNo: "A-9004", gtin: "0731234567094", img: svgDataUrl("Kolja") }],
      history: [{ date: "2026-02-01", change: "Satt inaktiv p.g.a. komponent (demo)" }]
    },
    {
      id: "mr4",
      type: "meal",
      name: "Biffstroganoff med ris + blomkålssoppa",
      mealName: "Biffstroganoff med ris + blomkålssoppa",
      status: "active",
      cat: "husman",
      price: "9,13 kr",
      co2: "—",
      energy: "—",
      size: "550 g",
      desc: "Måltid med soppa + huvudrätt.",
      subRecipeIds: ["sr3"],
      ingredients: [
        { name: "Nötstrimlor", qty: "2.0", unit: "kg", price: "—", articleNo: "A-9005", gtin: "0731234567095", img: svgDataUrl("Nöt") },
        { name: "Ris", qty: "1.8", unit: "kg", price: "—", articleNo: "A-9006", gtin: "0731234567096", img: svgDataUrl("Ris") }
      ],
      history: []
    },
    {
      id: "mr5",
      type: "meal",
      name: "Dillkött med kokt potatis",
      mealName: "Dillkött med kokt potatis",
      status: "active",
      cat: "husman",
      price: "23,39 kr",
      co2: "—",
      energy: "—",
      size: "410 g",
      desc: "Husman med tydlig såsprofil.",
      subRecipeIds: ["sr2"],
      ingredients: [
        { name: "Kött", qty: "2.5", unit: "kg", price: "—", articleNo: "A-9007", gtin: "0731234567097", img: svgDataUrl("Kött") },
        { name: "Dill", qty: "0.08", unit: "kg", price: "—", articleNo: "A-9008", gtin: "0731234567098", img: svgDataUrl("Dill") }
      ],
      history: []
    }
  ];

  // Samlad "recipes" (10 st totalt)
  const recipes = [...mealRecipes, ...subRecipes];

  // Indexar för snabb lookup
  const byId = new Map(recipes.map((r) => [r.id, r]));
  const meals = mealRecipes.map((r) => r.id);
  const subs = subRecipes.map((r) => r.id);

  return {
    version: "mockdb_v1",
    recipes,
    byId,
    meals,
    subs
  };
}

/** Hjälpare: normaliserad text */
export function norm(s) {
  return (s ?? "").toString().trim().toLowerCase();
}

function ingredientsToSearchBlob(ingredients) {
  const arr = Array.isArray(ingredients) ? ingredients : [];
  // name + articleNo + gtin gör sök testbart och framtidssäkrat.
  return arr
    .map((it) => {
      const nm = it?.name ?? "";
      const an = it?.articleNo ?? "";
      const gt = it?.gtin ?? "";
      return `${nm} ${an} ${gt}`;
    })
    .join(" ");
}

/**
 * Sök/filter i mock-DB
 * @param {object} db - från getMockDB()
 * @param {object} q  - { text, type, status, cat }
 *
 * NYTT (AO-RECIPES-SEARCH-02):
 * - text matchar även ingrediens.name + ingrediens.articleNo + ingrediens.gtin
 * - för meal matchar vi även ingredienser i subrecepten (via subRecipeIds)
 */
export function queryRecipes(db, q = {}) {
  const textQ = norm(q.text);
  const type = q.type ?? "all"; // all | meal | sub
  const status = q.status ?? "all"; // all | active | inactive
  const cat = q.cat ?? "all";

  return db.recipes.filter((r) => {
    if (type !== "all" && r.type !== type) return false;
    if (status !== "all" && r.status !== status) return false;
    if (cat !== "all" && r.cat !== cat) return false;

    if (!textQ) return true;

    const base = `${r.name} ${r.mealName} ${r.desc ?? ""} ${r.price ?? ""}`;
    let ingBlob = ingredientsToSearchBlob(r.ingredients);

    // Om måltid: inkludera subreceptens namn + ingredienser också
    if (r.type === "meal" && Array.isArray(r.subRecipeIds)) {
      for (const sid of r.subRecipeIds) {
        const sr = db.byId.get(sid);
        if (!sr) continue;
        ingBlob += ` ${sr.name ?? ""} ${ingredientsToSearchBlob(sr.ingredients)}`;
      }
    }

    const hay = norm(`${base} ${ingBlob}`);
    return hay.includes(textQ);
  });
}

/**
 * Bygg “måltidsrecept -> underrecept” träd
 * @returns {object} { meal, subs[] }
 */
export function expandMeal(db, mealId) {
  const meal = db.byId.get(mealId);
  if (!meal || meal.type !== "meal") return { meal: null, subs: [] };

  const subs = Array.isArray(meal.subRecipeIds)
    ? meal.subRecipeIds.map((id) => db.byId.get(id)).filter(Boolean)
    : [];

  return { meal, subs };
}

/**
 * Summera lite info för drawer (MVP)
 * - Här kan vi senare räkna totals (pris/CO2/energi) om data finns.
 */
export function getMealSummary(db, mealId) {
  const { meal, subs } = expandMeal(db, mealId);
  if (!meal) return null;

  return {
    mealId: meal.id,
    mealName: meal.name,
    subCount: subs.length,
    subNames: subs.map((s) => s.name),
    size: meal.size ?? "—",
    status: meal.status
  };
}

/**
 * Demo: generera “funktionshindrade ingredienser”
 * (placeholder tills riktig källa finns)
 */
export function getDisabledIngredientsMock() {
  return [
    {
      id: "di1",
      name: "Ägg lösvikt frigående M/L / 3464-B / KRONÄGG / KRONÄGG",
      sev: "p0",
      price: "32.06",
      recipes: [
        { name: "Panering (standard)", status: "active" },
        { name: "Vitvinssås med ägg", status: "inactive" },
        { name: "Fiskpanetter med kokt potatis och remouladsås", status: "active" }
      ]
    },
    {
      id: "di2",
      name: "Grädde mat 40% (saknar GTIN)",
      sev: "p1",
      price: "—",
      recipes: [
        { name: "Broccolisoppa", status: "active" },
        { name: "Kalvstek med gräddsås + rostad potatis + broccolisoppa", status: "active" }
      ]
    },
    {
      id: "di3",
      name: "Buljongtärning (utgående artikel)",
      sev: "p2",
      price: "—",
      recipes: [{ name: "Broccolisoppa", status: "active" }]
    }
  ];
}

/**
 * Demo: ersättningskatalog
 */
export function getReplacementCatalogMock() {
  return [
    { id: "c1", name: "Ägg frigående M/L 15-pack", price: "29.90" },
    { id: "c2", name: "Ägg ekologiska M/L", price: "34.50" },
    { id: "c3", name: "Äggvita pasteuriserad", price: "41.00" },
    { id: "c4", name: "Grädde mat 40% 5L", price: "—" },
    { id: "c5", name: "Buljong fond koncentrat", price: "—" }
  ];
}
