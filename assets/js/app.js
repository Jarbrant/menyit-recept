/* ============================================================
   FIL: assets/js/app.js  (HEL FIL)
   Syfte: Gemensamma helpers + FEJKDATA (10 recept) inkl. måltidsrecept som består av underrecept
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
 */

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
        { name: "Majonnäs", qty: "0.8", unit: "kg", price: "—" },
        { name: "Pickles", qty: "0.2", unit: "kg", price: "—" },
        { name: "Senap", qty: "0.05", unit: "kg", price: "—" }
      ],
      history: [
        { date: "2026-02-20", change: "Pris uppdaterat (demo)" }
      ]
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
        { name: "Potatis", qty: "10", unit: "kg", price: "—" },
        { name: "Salt", qty: "0.05", unit: "kg", price: "—" }
      ],
      history: [
        { date: "2026-02-12", change: "Ny leverantör (demo)" }
      ]
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
        { name: "Broccoli", qty: "2.0", unit: "kg", price: "—" },
        { name: "Grädde", qty: "1.0", unit: "l", price: "—" },
        { name: "Buljong", qty: "0.1", unit: "kg", price: "—" }
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
        { name: "Vitvin (matlagning)", qty: "0.3", unit: "l", price: "—" },
        { name: "Ägg", qty: "10", unit: "st", price: "—" }
      ],
      history: [
        { date: "2026-02-01", change: "Markerad inaktiv (demo)" }
      ]
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
        { name: "Ströbröd", qty: "1.0", unit: "kg", price: "—" },
        { name: "Ägg", qty: "12", unit: "st", price: "—" },
        { name: "Mjöl", qty: "0.6", unit: "kg", price: "—" }
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
        { name: "Fiskpanetter", qty: "2.5", unit: "kg", price: "—" },
        { name: "Citron", qty: "0.2", unit: "kg", price: "—" }
      ],
      history: [
        { date: "2026-02-20", change: "Leverantör uppdaterade pris (demo)" }
      ]
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
        { name: "Kalvstek", qty: "3.0", unit: "kg", price: "—" },
        { name: "Grädde", qty: "1.0", unit: "l", price: "—" }
      ],
      history: [
        { date: "2026-02-12", change: "Ny produkt upptäckt vid nattkörning (demo)" }
      ]
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
      ingredients: [
        { name: "Koljafilé", qty: "2.5", unit: "kg", price: "—" }
      ],
      history: [
        { date: "2026-02-01", change: "Satt inaktiv p.g.a. komponent (demo)" }
      ]
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
        { name: "Nötstrimlor", qty: "2.0", unit: "kg", price: "—" },
        { name: "Ris", qty: "1.8", unit: "kg", price: "—" }
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
        { name: "Kött", qty: "2.5", unit: "kg", price: "—" },
        { name: "Dill", qty: "0.08", unit: "kg", price: "—" }
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

/**
 * Sök/filter i mock-DB
 * @param {object} db - från getMockDB()
 * @param {object} q  - { text, type, status, cat }
 */
export function queryRecipes(db, q = {}) {
  const textQ = norm(q.text);
  const type = q.type ?? "all";      // all | meal | sub
  const status = q.status ?? "all";  // all | active | inactive
  const cat = q.cat ?? "all";

  return db.recipes.filter((r) => {
    if (type !== "all" && r.type !== type) return false;
    if (status !== "all" && r.status !== status) return false;
    if (cat !== "all" && r.cat !== cat) return false;

    if (!textQ) return true;
    const hay = norm(`${r.name} ${r.mealName} ${r.desc ?? ""} ${r.price ?? ""}`);
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
