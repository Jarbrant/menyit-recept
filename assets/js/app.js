/* ============================================================
   FIL: assets/js/app.js  (HEL FIL)
   PATCH: AO-RECIPES-PRODCARD-01 (FAS 1) — Fejk “produktkort-data” för ingredienser
   Policy: statisk GitHub Pages, inga externa libs, XSS-safe (render via textContent i sidor)

   NYTT:
   - Ingrediens får fejkfält för produktkort:
       displayName   (t.ex. “Ägg M Frigående 15-pack Inomhus”)
       brandLine     (t.ex. “Stjärnägg, Färskvaror”)
       comparePrice  (t.ex. “Jmf. 39,27kr/kg”)
       offerLabel    (t.ex. “Anbud”)
       co2PerKg      (t.ex. “2.2 kg CO₂e/kg”)
   - Behåller: articleNo, gtin, img (data-url SVG)

   PATCH v2 (STÄDNING underrecept):
   - mr1 (“Fiskpanetter med kokt potatis och remouladsås”) ska ha EXAKT 3 underrecept:
       1 Fiskpanetter
       2 Kokt potatis (bas)
       3 Remouladsås
   - Tar bort “Panering (standard)” ur fejkdata (sr5) och ur referenser.
   - Flyttar “Fiskpanetter” + “Citron” från mr1.ingredients -> underrecept “Fiskpanetter”.
============================================================ */

function svgDataUrl(label = "Produkt") {
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

/**
 * Fejk “produktkort-meta” per ingrediens.
 * Viktigt: UI ska kunna rendera utan dessa (fallback), men när de finns kan vi visa hela rutan.
 */
function productCardMeta(name, articleNo, gtin) {
  const nm = (name ?? "").toString().trim();

  // Default (generiskt)
  const base = {
    displayName: nm || "Produkt",
    brandLine: "Demo-leverantör, Färskvaror",
    comparePrice: "Jmf. —",
    offerLabel: "",
    co2PerKg: ""
  };

  // Specifika exempel (som din bild)
  if (nm.toLowerCase() === "ägg") {
    return {
      ...base,
      displayName: "Ägg M Frigående 15-pack Inomhus",
      brandLine: "Stjärnägg, Färskvaror",
      comparePrice: "Jmf. 39,27kr/kg",
      offerLabel: "Anbud",
      co2PerKg: "2.2 kg CO₂e/kg"
    };
  }

  if (nm.toLowerCase().includes("vitvin")) {
    return {
      ...base,
      displayName: "Vitvin matlagning (alkoholfritt) 1L",
      brandLine: "DemoWine, Skafferi",
      comparePrice: "Jmf. 29,90kr/l",
      offerLabel: "",
      co2PerKg: "0.8 kg CO₂e/kg"
    };
  }

  if (nm.toLowerCase() === "grädde") {
    return {
      ...base,
      displayName: "Grädde mat 40% 5L",
      brandLine: "MejeriX, Mejeri",
      comparePrice: "Jmf. 24,90kr/l",
      offerLabel: "",
      co2PerKg: "5.1 kg CO₂e/kg"
    };
  }

  if (nm.toLowerCase() === "potatis") {
    return {
      ...base,
      displayName: "Potatis fast 10kg",
      brandLine: "Svensk Potatis, Färskvaror",
      comparePrice: "Jmf. 7,90kr/kg",
      offerLabel: "",
      co2PerKg: "0.2 kg CO₂e/kg"
    };
  }

  // Om vi vill kunna skilja varianter med artikel/gtin i framtiden
  if ((articleNo ?? "").toString().trim() || (gtin ?? "").toString().trim()) {
    return base;
  }

  return base;
}

function withProductCardFields(it) {
  if (!it) return it;
  const meta = productCardMeta(it.name, it.articleNo, it.gtin);
  return { ...it, ...meta };
}

export function getMockDB() {
  // Underrecept (5 st) — PATCH v2: ersätter Panering med Fiskpanetter
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
      desc: "Kall sås till fisk.",
      ingredients: [
        withProductCardFields({ name: "Majonnäs", qty: "0.8", unit: "kg", price: "—", articleNo: "A-1001", gtin: "0731234567001", img: svgDataUrl("Majonnäs"), status: "active" }),
        withProductCardFields({ name: "Pickles", qty: "0.2", unit: "kg", price: "—", articleNo: "A-1002", gtin: "0731234567002", img: svgDataUrl("Pickles"), status: "active" }),
        withProductCardFields({ name: "Senap", qty: "0.05", unit: "kg", price: "—", articleNo: "A-1003", gtin: "0731234567003", img: svgDataUrl("Senap"), status: "active" })
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
        withProductCardFields({ name: "Potatis", qty: "10", unit: "kg", price: "—", articleNo: "A-2001", gtin: "0731234567011", img: svgDataUrl("Potatis"), status: "active" }),
        withProductCardFields({ name: "Salt", qty: "0.05", unit: "kg", price: "—", articleNo: "A-2002", gtin: "0731234567012", img: svgDataUrl("Salt"), status: "active" })
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
        withProductCardFields({ name: "Broccoli", qty: "2.0", unit: "kg", price: "—", articleNo: "A-3001", gtin: "0731234567021", img: svgDataUrl("Broccoli"), status: "active" }),
        withProductCardFields({ name: "Grädde", qty: "1.0", unit: "l", price: "—", articleNo: "A-3002", gtin: "0731234567022", img: svgDataUrl("Grädde"), status: "active" }),
        withProductCardFields({ name: "Buljong", qty: "0.1", unit: "kg", price: "—", articleNo: "A-3003", gtin: "0731234567023", img: svgDataUrl("Buljong"), status: "active" })
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
        withProductCardFields({ name: "Vitvin (matlagning)", qty: "0.3", unit: "l", price: "—", articleNo: "A-4001", gtin: "0731234567031", img: svgDataUrl("Vitvin"), status: "active" }),
        withProductCardFields({ name: "Ägg", qty: "10", unit: "st", price: "—", articleNo: "3464-B", gtin: "0731234567032", img: svgDataUrl("Ägg"), status: "active" })
      ],
      history: [{ date: "2026-02-01", change: "Markerad inaktiv (demo)" }]
    },

    // NYTT (PATCH v2): Fiskpanetter som eget underrecept
    {
      id: "sr6",
      type: "sub",
      name: "Fiskpanetter",
      mealName: "Fiskpanetter",
      status: "active",
      cat: "protein",
      price: "—",
      co2: "—",
      energy: "—",
      size: "—",
      desc: "Fiskkomponent till husman.",
      ingredients: [
        withProductCardFields({ name: "Fiskpanetter", qty: "2.5", unit: "kg", price: "—", articleNo: "A-9001", gtin: "0731234567091", img: svgDataUrl("Fisk"), status: "active" }),
        withProductCardFields({ name: "Citron", qty: "0.2", unit: "kg", price: "—", articleNo: "A-9002", gtin: "0731234567092", img: svgDataUrl("Citron"), status: "active" })
      ],
      history: [{ date: "2026-02-20", change: "Underrecept skapat (demo)" }]
    }
  ];

  // Måltidsrecept (5 st)
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
      // PATCH v2: exakt 3 underrecept (Fiskpanetter, Potatis, Remoulad)
      subRecipeIds: ["sr6", "sr2", "sr1"],
      // PATCH v2: inga “meal-level” ingredienser här (för att inte skapa extra dump-sektion)
      ingredients: [],
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
        withProductCardFields({ name: "Kalvstek", qty: "3.0", unit: "kg", price: "—", articleNo: "A-9003", gtin: "0731234567093", img: svgDataUrl("Kalv"), status: "active" }),
        withProductCardFields({ name: "Grädde", qty: "1.0", unit: "l", price: "—", articleNo: "A-3002", gtin: "0731234567022", img: svgDataUrl("Grädde"), status: "active" })
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
      ingredients: [
        withProductCardFields({ name: "Koljafilé", qty: "2.5", unit: "kg", price: "—", articleNo: "A-9004", gtin: "0731234567094", img: svgDataUrl("Kolja"), status: "active" })
      ],
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
        withProductCardFields({ name: "Nötstrimlor", qty: "2.0", unit: "kg", price: "—", articleNo: "A-9005", gtin: "0731234567095", img: svgDataUrl("Nöt"), status: "active" }),
        withProductCardFields({ name: "Ris", qty: "1.8", unit: "kg", price: "—", articleNo: "A-9006", gtin: "0731234567096", img: svgDataUrl("Ris"), status: "active" })
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
        withProductCardFields({ name: "Kött", qty: "2.5", unit: "kg", price: "—", articleNo: "A-9007", gtin: "0731234567097", img: svgDataUrl("Kött"), status: "active" }),
        withProductCardFields({ name: "Dill", qty: "0.08", unit: "kg", price: "—", articleNo: "A-9008", gtin: "0731234567098", img: svgDataUrl("Dill"), status: "active" })
      ],
      history: []
    }
  ];

  // Frikopplad ingredienskatalog (sökbar)
  const ingredientsCatalog = [
    withProductCardFields({ id: "ic01", name: "Ägg", articleNo: "3464-B", gtin: "0731234567032", img: svgDataUrl("Ägg"), status: "active" }),
    withProductCardFields({ id: "ic02", name: "Grädde", articleNo: "A-3002", gtin: "0731234567022", img: svgDataUrl("Grädde"), status: "active" }),
    withProductCardFields({ id: "ic03", name: "Buljong", articleNo: "A-3003", gtin: "0731234567023", img: svgDataUrl("Buljong"), status: "active" }),
    withProductCardFields({ id: "ic04", name: "Potatis", articleNo: "A-2001", gtin: "0731234567011", img: svgDataUrl("Potatis"), status: "active" }),
    withProductCardFields({ id: "ic05", name: "Senap", articleNo: "A-1003", gtin: "0731234567003", img: svgDataUrl("Senap"), status: "active" }),
    withProductCardFields({ id: "ic06", name: "Mjöl", articleNo: "A-5003", gtin: "0731234567043", img: svgDataUrl("Mjöl"), status: "active" }),
    withProductCardFields({ id: "ic07", name: "Ströbröd", articleNo: "A-5001", gtin: "0731234567041", img: svgDataUrl("Ströbröd"), status: "active" }),
    withProductCardFields({ id: "ic08", name: "Citron", articleNo: "A-9002", gtin: "0731234567092", img: svgDataUrl("Citron"), status: "active" }),

    // Catalog-only
    withProductCardFields({ id: "ic09", name: "Tomatpuré", articleNo: "A-8001", gtin: "0731234567081", img: svgDataUrl("Tomat"), status: "active" }),
    withProductCardFields({ id: "ic10", name: "Olivolja", articleNo: "A-8002", gtin: "0731234567082", img: svgDataUrl("Olivolja"), status: "active" }),
    withProductCardFields({ id: "ic11", name: "Vitlök", articleNo: "A-8003", gtin: "0731234567083", img: svgDataUrl("Vitlök"), status: "active" }),
    withProductCardFields({ id: "ic12", name: "Sojasås", articleNo: "A-8004", gtin: "0731234567084", img: svgDataUrl("Soja"), status: "inactive" })
  ];

  const recipes = [...mealRecipes, ...subRecipes];

  const byId = new Map(recipes.map((r) => [r.id, r]));
  const meals = mealRecipes.map((r) => r.id);
  const subs = subRecipes.map((r) => r.id);

  return {
    version: "mockdb_v1",
    recipes,
    byId,
    meals,
    subs,
    ingredientsCatalog
  };
}

/** Hjälpare: normaliserad text */
export function norm(s) {
  return (s ?? "").toString().trim().toLowerCase();
}

function ingredientsToSearchBlob(ingredients) {
  const arr = Array.isArray(ingredients) ? ingredients : [];
  return arr
    .map((it) => {
      const nm = it?.name ?? "";
      const an = it?.articleNo ?? "";
      const gt = it?.gtin ?? "";
      return `${nm} ${an} ${gt}`;
    })
    .join(" ");
}

export function queryRecipes(db, q = {}) {
  const textQ = norm(q.text);
  const type = q.type ?? "all";
  const status = q.status ?? "all";
  const cat = q.cat ?? "all";

  return db.recipes.filter((r) => {
    if (type !== "all" && r.type !== type) return false;
    if (status !== "all" && r.status !== status) return false;
    if (cat !== "all" && r.cat !== cat) return false;

    if (!textQ) return true;

    const base = `${r.name} ${r.mealName} ${r.desc ?? ""} ${r.price ?? ""}`;
    let ingBlob = ingredientsToSearchBlob(r.ingredients);

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

export function buildIngredientsIndex(db) {
  const idx = new Map();

  const mkKey = (it) => {
    const gt = (it?.gtin ?? "").toString().trim();
    if (gt) return `gtin:${gt}`;
    const nm = norm(it?.name);
    const an = (it?.articleNo ?? "").toString().trim();
    return `na:${nm}|${an}`;
  };

  const upsert = (it, usedInRecipe) => {
    if (!it) return;
    const key = mkKey(it);
    if (!key) return;

    const curr = idx.get(key);
    if (!curr) {
      idx.set(key, {
        key,
        id: it.id ?? key,
        name: it.name ?? "—",
        articleNo: it.articleNo ?? "",
        gtin: it.gtin ?? "",
        img: it.img ?? "",
        status: it.status ?? "",
        usedCount: usedInRecipe ? 1 : 0,

        // produktkort-fält
        displayName: it.displayName ?? "",
        brandLine: it.brandLine ?? "",
        comparePrice: it.comparePrice ?? "",
        offerLabel: it.offerLabel ?? "",
        co2PerKg: it.co2PerKg ?? ""
      });
      return;
    }

    if (!curr.articleNo && it.articleNo) curr.articleNo = it.articleNo;
    if (!curr.gtin && it.gtin) curr.gtin = it.gtin;
    if (!curr.img && it.img) curr.img = it.img;
    if (!curr.status && it.status) curr.status = it.status;

    // fyll på produktkort-data om saknas
    if (!curr.displayName && it.displayName) curr.displayName = it.displayName;
    if (!curr.brandLine && it.brandLine) curr.brandLine = it.brandLine;
    if (!curr.comparePrice && it.comparePrice) curr.comparePrice = it.comparePrice;
    if (!curr.offerLabel && it.offerLabel) curr.offerLabel = it.offerLabel;
    if (!curr.co2PerKg && it.co2PerKg) curr.co2PerKg = it.co2PerKg;

    if (usedInRecipe) curr.usedCount += 1;
  };

  const cat = Array.isArray(db?.ingredientsCatalog) ? db.ingredientsCatalog : [];
  for (const it of cat) upsert(it, false);

  const recipes = Array.isArray(db?.recipes) ? db.recipes : [];
  for (const r of recipes) {
    const ing = Array.isArray(r?.ingredients) ? r.ingredients : [];
    for (const it of ing) upsert(it, true);

    if (r?.type === "meal" && Array.isArray(r?.subRecipeIds)) {
      for (const sid of r.subRecipeIds) {
        const sr = db?.byId?.get?.(sid);
        const ing2 = Array.isArray(sr?.ingredients) ? sr.ingredients : [];
        for (const it of ing2) upsert(it, true);
      }
    }
  }

  return idx;
}

export function listIngredients(db, q = {}) {
  const textQ = norm(q.text);
  const idx = buildIngredientsIndex(db);
  let arr = Array.from(idx.values());

  if (textQ) {
    arr = arr.filter((it) => {
      const hay = norm(`${it.name ?? ""} ${it.articleNo ?? ""} ${it.gtin ?? ""} ${it.displayName ?? ""} ${it.brandLine ?? ""}`);
      return hay.includes(textQ);
    });
  }

  arr.sort((a, b) => {
    const ua = Number(a.usedCount ?? 0);
    const ub = Number(b.usedCount ?? 0);
    if (ub !== ua) return ub - ua;
    return norm(a.name).localeCompare(norm(b.name), "sv");
  });

  return arr;
}

export function expandMeal(db, mealId) {
  const meal = db.byId.get(mealId);
  if (!meal || meal.type !== "meal") return { meal: null, subs: [] };

  const subs = Array.isArray(meal.subRecipeIds)
    ? meal.subRecipeIds.map((id) => db.byId.get(id)).filter(Boolean)
    : [];

  return { meal, subs };
}

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

export function getDisabledIngredientsMock() {
  return [
    {
      id: "di1",
      name: "Ägg lösvikt frigående M/L / 3464-B / KRONÄGG / KRONÄGG",
      sev: "p0",
      price: "32.06",
      recipes: [
        // PATCH v2: “Panering (standard)” bortstädad
        { name: "Fiskpanetter", status: "active" },
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

export function getReplacementCatalogMock() {
  return [
    { id: "c1", name: "Ägg frigående M/L 15-pack", price: "29.90" },
    { id: "c2", name: "Ägg ekologiska M/L", price: "34.50" },
    { id: "c3", name: "Äggvita pasteuriserad", price: "41.00" },
    { id: "c4", name: "Grädde mat 40% 5L", price: "—" },
    { id: "c5", name: "Buljong fond koncentrat", price: "—" }
  ];
}
