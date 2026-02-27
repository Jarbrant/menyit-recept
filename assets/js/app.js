/* ============================================================
   FIL: assets/js/app.js  (HEL FIL)
   PATCH: AO-RECIPES-MOCKMODEL-01 (FAS 1) — Komplett fejkmodell (5 måltidsrecept)
   Policy: statisk GitHub Pages, inga externa libs, XSS-safe (render via textContent i sidor)

   MÅL: “Komplett fejkmodell” för:
   - Måltidsrecept (5 st)
   - Underrecept (delkomponenter)
   - Ingredienser (med produktkort + leverantör + artikel/GTIN + pris + bild)
   - Instruktioner (title/desc/steps/note) för både meal + sub
   - Näringsvärde (per portion + per 100g) för meal + sub
   - CO₂e (total + per portion) för meal + sub + ingrediens (per kg)
   - Spårbarhet: supplierUpdatedAt, updatedAt, history

   OBS:
   - UI kan välja att visa/fälla ut olika fält; modellen finns här oavsett.
============================================================ */

/* -----------------------------
   Helpers
----------------------------- */

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

export function norm(s) {
  return (s ?? "").toString().trim().toLowerCase();
}

function num(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function todayISO() {
  // Stabil demo (kan bytas mot new Date().toISOString().slice(0,10) om du vill)
  return "2026-02-27";
}

/**
 * Produktkort-meta (UI kan visa dessa fält på en “produktkort”-yta)
 */
function productCardMeta(name) {
  const nm = (name ?? "").toString().trim();
  const base = {
    displayName: nm || "Produkt",
    brandLine: "Demo-leverantör, Färskvaror",
    comparePrice: "Jmf. —",
    offerLabel: "",
    co2PerKgLabel: "",
  };

  const low = nm.toLowerCase();

  if (low === "ägg") {
    return {
      ...base,
      displayName: "Ägg M Frigående 15-pack Inomhus",
      brandLine: "Stjärnägg, Färskvaror",
      comparePrice: "Jmf. 39,27 kr/kg",
      offerLabel: "Anbud",
      co2PerKgLabel: "2.2 kg CO₂e/kg",
    };
  }
  if (low.includes("vitvin")) {
    return {
      ...base,
      displayName: "Vitvin matlagning (alkoholfritt) 1L",
      brandLine: "DemoWine, Skafferi",
      comparePrice: "Jmf. 29,90 kr/l",
      offerLabel: "",
      co2PerKgLabel: "0.8 kg CO₂e/kg",
    };
  }
  if (low === "grädde") {
    return {
      ...base,
      displayName: "Grädde mat 40% 5L",
      brandLine: "MejeriX, Mejeri",
      comparePrice: "Jmf. 24,90 kr/l",
      offerLabel: "",
      co2PerKgLabel: "5.1 kg CO₂e/kg",
    };
  }
  if (low === "potatis") {
    return {
      ...base,
      displayName: "Potatis fast 10kg",
      brandLine: "Svensk Potatis, Färskvaror",
      comparePrice: "Jmf. 7,90 kr/kg",
      offerLabel: "",
      co2PerKgLabel: "0.2 kg CO₂e/kg",
    };
  }

  return base;
}

/**
 * Standardiserad ingrediensmodell
 * (UI ska kunna rendera även om fält saknas, men här finns “allt”)
 */
function makeIngredient(input) {
  const it = input || {};
  const nm = (it.name ?? "—").toString();

  const meta = productCardMeta(nm);

  const supplier = it.supplier ?? {
    supplierId: "SUP-DEMO-01",
    supplierName: "DemoGross AB",
  };

  const co2ePerKg = num(it.co2ePerKg, 0); // kg CO2e per kg

  return {
    // Identity
    id: it.id ?? "",

    // Core
    name: nm,
    status: it.status ?? "active", // active/inactive

    // Trade
    articleNo: (it.articleNo ?? "").toString(),
    gtin: (it.gtin ?? "").toString(),
    supplier,

    // Image
    img: it.img ?? svgDataUrl(nm.slice(0, 10)),

    // Quantity (in recipe context)
    qty: (it.qty ?? "").toString(),   // string for UI
    unit: (it.unit ?? "").toString(), // g/kg/l/dl/st

    // Pricing (demo)
    priceSek: num(it.priceSek, 0),
    priceLabel: it.priceLabel ?? (it.priceSek ? `${it.priceSek.toFixed(2)} kr` : "—"),
    unitPriceSek: num(it.unitPriceSek, 0), // per kg or per l (demo)
    packSize: it.packSize ?? "", // e.g. "10 kg", "5 L"

    // Product card (display fields)
    displayName: meta.displayName,
    brandLine: meta.brandLine,
    comparePrice: meta.comparePrice,
    offerLabel: meta.offerLabel,
    co2PerKgLabel: meta.co2PerKgLabel,

    // Sustainability / nutrition (ingredient-level)
    co2ePerKg, // numeric
    nutritionPer100g: it.nutritionPer100g ?? {
      kcal: 0,
      proteinG: 0,
      fatG: 0,
      carbsG: 0,
      saltG: 0,
      fiberG: 0,
    },

    // Traceability
    supplierUpdatedAt: it.supplierUpdatedAt ?? "2026-02-20",
    updatedAt: it.updatedAt ?? todayISO(),
  };
}

function makeInstructions(input) {
  const x = input || {};
  return {
    title: (x.title ?? "").toString(),
    desc: (x.desc ?? "").toString(),
    steps: Array.isArray(x.steps) ? x.steps.map(s => (s ?? "").toString()) : [],
    note: (x.note ?? "").toString(),
  };
}

function makeNutrition(input) {
  const x = input || {};
  const perPortion = x.perPortion ?? {};
  const per100g = x.per100g ?? {};
  return {
    perPortion: {
      kcal: num(perPortion.kcal, 0),
      proteinG: num(perPortion.proteinG, 0),
      fatG: num(perPortion.fatG, 0),
      carbsG: num(perPortion.carbsG, 0),
      saltG: num(perPortion.saltG, 0),
      fiberG: num(perPortion.fiberG, 0),
    },
    per100g: {
      kcal: num(per100g.kcal, 0),
      proteinG: num(per100g.proteinG, 0),
      fatG: num(per100g.fatG, 0),
      carbsG: num(per100g.carbsG, 0),
      saltG: num(per100g.saltG, 0),
      fiberG: num(per100g.fiberG, 0),
    },
  };
}

function makeCo2(input) {
  const x = input || {};
  return {
    totalKg: num(x.totalKg, 0),
    perPortionKg: num(x.perPortionKg, 0),
    note: (x.note ?? "").toString(),
  };
}

/* -----------------------------
   DB
----------------------------- */

export function getMockDB() {
  const SUP = {
    supplierId: "SUP-DEMO-01",
    supplierName: "DemoGross AB",
  };

  // UNDERRECEPT (delkomponenter)
  const subRecipes = [
    // --- MR1 ---
    {
      id: "sr_fish",
      type: "sub",
      name: "Fiskpanetter",
      mealName: "Fiskpanetter",
      status: "active",
      cat: "protein",
      size: "—",
      desc: "Fiskkomponent, serveras med citron.",
      supplier: SUP,
      supplierUpdatedAt: "2026-02-20",
      updatedAt: todayISO(),
      price: "—",
      priceSek: 0,
      ingredients: [
        makeIngredient({
          name: "Fiskpanetter",
          qty: "2.5",
          unit: "kg",
          articleNo: "A-9001",
          gtin: "0731234567091",
          img: svgDataUrl("Fisk"),
          status: "active",
          supplier: SUP,
          priceSek: 245.0,
          priceLabel: "245,00 kr",
          unitPriceSek: 98.0,
          packSize: "2,5 kg",
          co2ePerKg: 5.4,
          nutritionPer100g: { kcal: 210, proteinG: 12, fatG: 10, carbsG: 18, saltG: 1.2, fiberG: 1.0 },
          supplierUpdatedAt: "2026-02-18",
          updatedAt: todayISO(),
        }),
        makeIngredient({
          name: "Citron",
          qty: "0.2",
          unit: "kg",
          articleNo: "A-9002",
          gtin: "0731234567092",
          img: svgDataUrl("Citron"),
          status: "active",
          supplier: SUP,
          priceSek: 18.0,
          priceLabel: "18,00 kr",
          unitPriceSek: 90.0,
          packSize: "1 kg",
          co2ePerKg: 0.6,
          nutritionPer100g: { kcal: 29, proteinG: 1.1, fatG: 0.3, carbsG: 9.3, saltG: 0.0, fiberG: 2.8 },
          supplierUpdatedAt: "2026-02-19",
          updatedAt: todayISO(),
        }),
      ],
      instructions: makeInstructions({
        title: "Fiskpanetter",
        desc: "Tillaga panetterna så de blir krispiga och genomvarma.",
        steps: [
          "Värm ugnen till 200°C (eller använd bleck/ugn enligt rutin).",
          "Lägg panetter på bleck med bakplåtspapper.",
          "Tillaga 12–15 min, vänd efter halva tiden.",
          "Servera med citronklyfta vid upplägg.",
        ],
        note: "Undvik överbakning – håll koll på färg/temperatur.",
      }),
      nutrition: makeNutrition({
        perPortion: { kcal: 290, proteinG: 18, fatG: 12, carbsG: 28, saltG: 1.6, fiberG: 1.5 },
        per100g: { kcal: 210, proteinG: 12, fatG: 10, carbsG: 18, saltG: 1.2, fiberG: 1.0 },
      }),
      co2: makeCo2({
        totalKg: 13.8,
        perPortionKg: 0.55,
        note: "Demo-beräkning baserad på co2ePerKg * mängd.",
      }),
      history: [
        { date: "2026-02-20", change: "Underrecept skapad och kopplad (demo)" },
      ],
    },
    {
      id: "sr_potatis_kokt",
      type: "sub",
      name: "Kokt potatis (bas)",
      mealName: "Kokt potatis (bas)",
      status: "active",
      cat: "tillbehor",
      size: "—",
      desc: "Kokt potatis med salt.",
      supplier: SUP,
      supplierUpdatedAt: "2026-02-12",
      updatedAt: todayISO(),
      price: "6,10 kr",
      priceSek: 6.10,
      ingredients: [
        makeIngredient({
          name: "Potatis",
          qty: "10",
          unit: "kg",
          articleNo: "A-2001",
          gtin: "0731234567011",
          img: svgDataUrl("Potatis"),
          supplier: SUP,
          priceSek: 79.0,
          priceLabel: "79,00 kr",
          unitPriceSek: 7.9,
          packSize: "10 kg",
          co2ePerKg: 0.2,
          nutritionPer100g: { kcal: 77, proteinG: 2.0, fatG: 0.1, carbsG: 17.0, saltG: 0.0, fiberG: 2.2 },
          supplierUpdatedAt: "2026-02-10",
          updatedAt: todayISO(),
        }),
        makeIngredient({
          name: "Salt",
          qty: "0.05",
          unit: "kg",
          articleNo: "A-2002",
          gtin: "0731234567012",
          img: svgDataUrl("Salt"),
          supplier: SUP,
          priceSek: 6.0,
          priceLabel: "6,00 kr",
          unitPriceSek: 120.0,
          packSize: "1 kg",
          co2ePerKg: 0.1,
          nutritionPer100g: { kcal: 0, proteinG: 0, fatG: 0, carbsG: 0, saltG: 100.0, fiberG: 0 },
          supplierUpdatedAt: "2026-02-05",
          updatedAt: todayISO(),
        }),
      ],
      instructions: makeInstructions({
        title: "Kokt potatis",
        desc: "Koka potatisen mjuk men inte sönder.",
        steps: [
          "Skölj potatis och lägg i gryta.",
          "Täck med vatten och tillsätt salt.",
          "Koka 20–25 min tills mjuk.",
          "Häll av och håll varm till servering.",
        ],
        note: "Justera koktid efter storlek.",
      }),
      nutrition: makeNutrition({
        perPortion: { kcal: 190, proteinG: 4.5, fatG: 0.3, carbsG: 42.0, saltG: 0.6, fiberG: 4.0 },
        per100g: { kcal: 77, proteinG: 2.0, fatG: 0.1, carbsG: 17.0, saltG: 0.0, fiberG: 2.2 },
      }),
      co2: makeCo2({
        totalKg: 2.0,
        perPortionKg: 0.08,
        note: "Domineras av potatis (lågt).",
      }),
      history: [{ date: "2026-02-12", change: "Ny leverantör (demo)" }],
    },
    {
      id: "sr_remoulad",
      type: "sub",
      name: "Remouladsås",
      mealName: "Remouladsås",
      status: "active",
      cat: "tillbehor",
      size: "—",
      desc: "Kall sås till fisk.",
      supplier: SUP,
      supplierUpdatedAt: "2026-02-20",
      updatedAt: todayISO(),
      price: "8,20 kr",
      priceSek: 8.20,
      ingredients: [
        makeIngredient({
          name: "Majonnäs",
          qty: "0.8",
          unit: "kg",
          articleNo: "A-1001",
          gtin: "0731234567001",
          img: svgDataUrl("Majonnäs"),
          supplier: SUP,
          priceSek: 64.0,
          priceLabel: "64,00 kr",
          unitPriceSek: 80.0,
          packSize: "0,8 kg",
          co2ePerKg: 3.1,
          nutritionPer100g: { kcal: 680, proteinG: 1.0, fatG: 75.0, carbsG: 1.0, saltG: 1.2, fiberG: 0 },
          supplierUpdatedAt: "2026-02-15",
          updatedAt: todayISO(),
        }),
        makeIngredient({
          name: "Pickles",
          qty: "0.2",
          unit: "kg",
          articleNo: "A-1002",
          gtin: "0731234567002",
          img: svgDataUrl("Pickles"),
          supplier: SUP,
          priceSek: 18.0,
          priceLabel: "18,00 kr",
          unitPriceSek: 90.0,
          packSize: "0,2 kg",
          co2ePerKg: 0.9,
          nutritionPer100g: { kcal: 22, proteinG: 0.7, fatG: 0.2, carbsG: 4.4, saltG: 1.4, fiberG: 1.2 },
          supplierUpdatedAt: "2026-02-11",
          updatedAt: todayISO(),
        }),
        makeIngredient({
          name: "Senap",
          qty: "0.05",
          unit: "kg",
          articleNo: "A-1003",
          gtin: "0731234567003",
          img: svgDataUrl("Senap"),
          supplier: SUP,
          priceSek: 9.0,
          priceLabel: "9,00 kr",
          unitPriceSek: 180.0,
          packSize: "0,05 kg",
          co2ePerKg: 1.4,
          nutritionPer100g: { kcal: 66, proteinG: 4.4, fatG: 4.0, carbsG: 5.0, saltG: 4.5, fiberG: 3.3 },
          supplierUpdatedAt: "2026-02-08",
          updatedAt: todayISO(),
        }),
      ],
      instructions: makeInstructions({
        title: "Remouladsås",
        desc: "Blanda och låt stå kallt innan servering.",
        steps: [
          "Hacka pickles fint.",
          "Blanda majonnäs, pickles och senap.",
          "Smaka av (ev. lite extra senap).",
          "Förvara kallt till servering.",
        ],
        note: "Håll hygien och kylkedja.",
      }),
      nutrition: makeNutrition({
        perPortion: { kcal: 160, proteinG: 0.6, fatG: 17.0, carbsG: 1.2, saltG: 0.8, fiberG: 0.2 },
        per100g: { kcal: 540, proteinG: 1.0, fatG: 58.0, carbsG: 2.0, saltG: 2.8, fiberG: 0.4 },
      }),
      co2: makeCo2({
        totalKg: 1.9,
        perPortionKg: 0.08,
        note: "Demo baserad på majonnäsens co2e.",
      }),
      history: [{ date: "2026-02-20", change: "Pris uppdaterat (demo)" }],
    },

    // --- MR2 / MR3 / MR4 / MR5 underrecept ---
    {
      id: "sr_broccoli_soup",
      type: "sub",
      name: "Broccolisoppa",
      mealName: "Broccolisoppa",
      status: "active",
      cat: "soppa",
      size: "—",
      desc: "Soppa som kan ingå som förrätt.",
      supplier: SUP,
      supplierUpdatedAt: "2026-02-14",
      updatedAt: todayISO(),
      price: "11,90 kr",
      priceSek: 11.90,
      ingredients: [
        makeIngredient({ name: "Broccoli", qty: "2.0", unit: "kg", articleNo: "A-3001", gtin: "0731234567021", img: svgDataUrl("Broccoli"), supplier: SUP, priceSek: 58, unitPriceSek: 29, packSize: "2 kg", co2ePerKg: 0.5, nutritionPer100g: { kcal: 34, proteinG: 2.8, fatG: 0.4, carbsG: 7.0, saltG: 0.0, fiberG: 2.6 }, supplierUpdatedAt: "2026-02-09", updatedAt: todayISO() }),
        makeIngredient({ name: "Grädde", qty: "1.0", unit: "l", articleNo: "A-3002", gtin: "0731234567022", img: svgDataUrl("Grädde"), supplier: SUP, priceSek: 62, unitPriceSek: 62, packSize: "1 L", co2ePerKg: 5.1, nutritionPer100g: { kcal: 380, proteinG: 2.0, fatG: 40.0, carbsG: 3.0, saltG: 0.1, fiberG: 0 }, supplierUpdatedAt: "2026-02-06", updatedAt: todayISO() }),
        makeIngredient({ name: "Buljong", qty: "0.1", unit: "kg", articleNo: "A-3003", gtin: "0731234567023", img: svgDataUrl("Buljong"), supplier: SUP, priceSek: 12, unitPriceSek: 120, packSize: "0,1 kg", co2ePerKg: 1.2, nutritionPer100g: { kcal: 240, proteinG: 10.0, fatG: 3.0, carbsG: 40.0, saltG: 20.0, fiberG: 0 }, supplierUpdatedAt: "2026-02-01", updatedAt: todayISO() }),
      ],
      instructions: makeInstructions({
        title: "Broccolisoppa",
        desc: "Koka, mixa och justera konsistens.",
        steps: [
          "Koka broccoli mjuk i buljong.",
          "Mixa slät.",
          "Tillsätt grädde och sjud kort.",
          "Smaka av och servera.",
        ],
        note: "Sila vid behov för extra slät soppa.",
      }),
      nutrition: makeNutrition({
        perPortion: { kcal: 220, proteinG: 5.0, fatG: 18.0, carbsG: 10.0, saltG: 1.2, fiberG: 3.0 },
        per100g: { kcal: 90, proteinG: 2.0, fatG: 7.0, carbsG: 4.0, saltG: 0.5, fiberG: 1.2 },
      }),
      co2: makeCo2({ totalKg: 2.6, perPortionKg: 0.13, note: "Grädde driver upp CO₂e." }),
      history: [],
    },
    {
      id: "sr_vitvin_sauce",
      type: "sub",
      name: "Vitvinssås med ägg",
      mealName: "Vitvinssås med ägg",
      status: "inactive",
      cat: "sas",
      size: "—",
      desc: "Sås till fisk. Inaktiv i demo.",
      supplier: SUP,
      supplierUpdatedAt: "2026-02-01",
      updatedAt: todayISO(),
      price: "—",
      priceSek: 0,
      ingredients: [
        makeIngredient({ name: "Vitvin (matlagning)", qty: "0.3", unit: "l", articleNo: "A-4001", gtin: "0731234567031", img: svgDataUrl("Vitvin"), supplier: SUP, priceSek: 9, unitPriceSek: 30, packSize: "1 L", co2ePerKg: 0.8, nutritionPer100g: { kcal: 18, proteinG: 0, fatG: 0, carbsG: 3.0, saltG: 0, fiberG: 0 }, supplierUpdatedAt: "2026-01-28", updatedAt: todayISO() }),
        makeIngredient({ name: "Ägg", qty: "10", unit: "st", articleNo: "3464-B", gtin: "0731234567032", img: svgDataUrl("Ägg"), supplier: SUP, priceSek: 29, unitPriceSek: 39.27, packSize: "15-pack", co2ePerKg: 2.2, nutritionPer100g: { kcal: 143, proteinG: 13.0, fatG: 10.0, carbsG: 1.1, saltG: 0.36, fiberG: 0 }, supplierUpdatedAt: "2026-01-20", updatedAt: todayISO() }),
      ],
      instructions: makeInstructions({
        title: "Vitvinssås",
        desc: "Reducerad sås, bind med ägg.",
        steps: [
          "Reducera vin enligt rutin.",
          "Vispa i ägg under låg värme.",
          "Smaka av.",
        ],
        note: "Får ej koka efter ägg.",
      }),
      nutrition: makeNutrition({
        perPortion: { kcal: 90, proteinG: 3.0, fatG: 7.0, carbsG: 3.0, saltG: 0.2, fiberG: 0 },
        per100g: { kcal: 120, proteinG: 4.0, fatG: 9.0, carbsG: 4.0, saltG: 0.3, fiberG: 0 },
      }),
      co2: makeCo2({ totalKg: 0.9, perPortionKg: 0.05, note: "Inaktiv – visas som referens." }),
      history: [{ date: "2026-02-01", change: "Markerad inaktiv (demo)" }],
    },
    {
      id: "sr_graddsas",
      type: "sub",
      name: "Gräddsås (bas)",
      mealName: "Gräddsås (bas)",
      status: "active",
      cat: "sas",
      size: "—",
      desc: "Bas-sås till husman.",
      supplier: SUP,
      supplierUpdatedAt: "2026-02-12",
      updatedAt: todayISO(),
      price: "—",
      priceSek: 0,
      ingredients: [
        makeIngredient({ name: "Grädde", qty: "1.0", unit: "l", articleNo: "A-3002", gtin: "0731234567022", img: svgDataUrl("Grädde"), supplier: SUP, priceSek: 62, unitPriceSek: 62, packSize: "1 L", co2ePerKg: 5.1, nutritionPer100g: { kcal: 380, proteinG: 2.0, fatG: 40.0, carbsG: 3.0, saltG: 0.1, fiberG: 0 }, supplierUpdatedAt: "2026-02-06", updatedAt: todayISO() }),
        makeIngredient({ name: "Buljong", qty: "0.05", unit: "kg", articleNo: "A-3003", gtin: "0731234567023", img: svgDataUrl("Buljong"), supplier: SUP, priceSek: 6, unitPriceSek: 120, packSize: "0,05 kg", co2ePerKg: 1.2, nutritionPer100g: { kcal: 240, proteinG: 10.0, fatG: 3.0, carbsG: 40.0, saltG: 20.0, fiberG: 0 }, supplierUpdatedAt: "2026-02-01", updatedAt: todayISO() }),
      ],
      instructions: makeInstructions({
        title: "Gräddsås",
        desc: "Koka ihop och smaka av.",
        steps: [
          "Värm grädde och tillsätt buljong.",
          "Sjud 5–10 min tills rätt smak.",
          "Smaka av salt/peppar vid behov.",
        ],
        note: "Kan redas vid behov i senare fas.",
      }),
      nutrition: makeNutrition({
        perPortion: { kcal: 140, proteinG: 1.5, fatG: 14.0, carbsG: 2.0, saltG: 0.8, fiberG: 0 },
        per100g: { kcal: 220, proteinG: 2.0, fatG: 22.0, carbsG: 3.0, saltG: 1.2, fiberG: 0 },
      }),
      co2: makeCo2({ totalKg: 1.1, perPortionKg: 0.06, note: "Grädde dominerar CO₂e." }),
      history: [{ date: "2026-02-12", change: "Uppdaterad bas (demo)" }],
    },
    {
      id: "sr_potatis_rostad",
      type: "sub",
      name: "Rostad potatis",
      mealName: "Rostad potatis",
      status: "active",
      cat: "tillbehor",
      size: "—",
      desc: "Ugnsrostad potatis som tillbehör.",
      supplier: SUP,
      supplierUpdatedAt: "2026-02-12",
      updatedAt: todayISO(),
      price: "—",
      priceSek: 0,
      ingredients: [
        makeIngredient({ name: "Potatis", qty: "10", unit: "kg", articleNo: "A-2001", gtin: "0731234567011", img: svgDataUrl("Potatis"), supplier: SUP, priceSek: 79, unitPriceSek: 7.9, packSize: "10 kg", co2ePerKg: 0.2, nutritionPer100g: { kcal: 77, proteinG: 2.0, fatG: 0.1, carbsG: 17.0, saltG: 0.0, fiberG: 2.2 }, supplierUpdatedAt: "2026-02-10", updatedAt: todayISO() }),
        makeIngredient({ name: "Olivolja", qty: "0.3", unit: "l", articleNo: "A-8002", gtin: "0731234567082", img: svgDataUrl("Olivolja"), supplier: SUP, priceSek: 45, unitPriceSek: 150, packSize: "0,3 L", co2ePerKg: 3.0, nutritionPer100g: { kcal: 884, proteinG: 0, fatG: 100.0, carbsG: 0, saltG: 0, fiberG: 0 }, supplierUpdatedAt: "2026-02-03", updatedAt: todayISO() }),
      ],
      instructions: makeInstructions({
        title: "Rostad potatis",
        desc: "Klyfta och rosta gyllene.",
        steps: [
          "Sätt ugnen på 220°C.",
          "Klyfta potatis och vänd i olja.",
          "Rosta 25–35 min, rör om 1–2 ggr.",
        ],
        note: "Justera tid beroende på storlek.",
      }),
      nutrition: makeNutrition({
        perPortion: { kcal: 230, proteinG: 4.0, fatG: 8.0, carbsG: 36.0, saltG: 0.3, fiberG: 4.0 },
        per100g: { kcal: 120, proteinG: 2.0, fatG: 4.0, carbsG: 19.0, saltG: 0.1, fiberG: 2.0 },
      }),
      co2: makeCo2({ totalKg: 2.4, perPortionKg: 0.10, note: "Oljan ger en del CO₂e." }),
      history: [],
    },
    {
      id: "sr_ris_bas",
      type: "sub",
      name: "Kokt ris (bas)",
      mealName: "Kokt ris (bas)",
      status: "active",
      cat: "tillbehor",
      size: "—",
      desc: "Basris till husman.",
      supplier: SUP,
      supplierUpdatedAt: "2026-02-10",
      updatedAt: todayISO(),
      price: "—",
      priceSek: 0,
      ingredients: [
        makeIngredient({ name: "Ris", qty: "1.8", unit: "kg", articleNo: "A-9006", gtin: "0731234567096", img: svgDataUrl("Ris"), supplier: SUP, priceSek: 54, unitPriceSek: 30, packSize: "1,8 kg", co2ePerKg: 2.7, nutritionPer100g: { kcal: 365, proteinG: 7.1, fatG: 0.7, carbsG: 80.0, saltG: 0.0, fiberG: 1.3 }, supplierUpdatedAt: "2026-02-07", updatedAt: todayISO() }),
        makeIngredient({ name: "Salt", qty: "0.02", unit: "kg", articleNo: "A-2002", gtin: "0731234567012", img: svgDataUrl("Salt"), supplier: SUP, priceSek: 2.4, unitPriceSek: 120, packSize: "0,02 kg", co2ePerKg: 0.1, nutritionPer100g: { kcal: 0, proteinG: 0, fatG: 0, carbsG: 0, saltG: 100.0, fiberG: 0 }, supplierUpdatedAt: "2026-02-05", updatedAt: todayISO() }),
      ],
      instructions: makeInstructions({
        title: "Kokt ris",
        desc: "Koka enligt rutin.",
        steps: [
          "Skölj ris.",
          "Koka med rätt mängd vatten och salt.",
          "Låt vila 5 min.",
        ],
        note: "Håll varm fram till servering.",
      }),
      nutrition: makeNutrition({
        perPortion: { kcal: 210, proteinG: 4.0, fatG: 0.8, carbsG: 46.0, saltG: 0.2, fiberG: 0.8 },
        per100g: { kcal: 130, proteinG: 2.5, fatG: 0.5, carbsG: 29.0, saltG: 0.1, fiberG: 0.5 },
      }),
      co2: makeCo2({ totalKg: 5.0, perPortionKg: 0.20, note: "Ris har högre CO₂e än potatis (demo)." }),
      history: [],
    },
  ];

  // MÅLTIDSRECEPT (5 st)
  const mealRecipes = [
    {
      id: "mr1",
      type: "meal",
      name: "Fiskpanetter med kokt potatis och remouladsås",
      mealName: "Fiskpanetter med kokt potatis och remouladsås",
      status: "active",
      cat: "husman",
      size: "500 g",
      desc: "Klassisk husman med tre komponenter.",
      supplier: SUP,
      supplierUpdatedAt: "2026-02-20",
      updatedAt: todayISO(),
      price: "23,39 kr",
      priceSek: 23.39,

      // Exakt 3 underrecept (som du ville)
      subRecipeIds: ["sr_fish", "sr_potatis_kokt", "sr_remoulad"],

      // Meal-level ingredienser (tom för att undvika “extra sektion”)
      ingredients: [],

      instructions: makeInstructions({
        title: "Montering & servering",
        desc: "Bygg tallriken med tre komponenter.",
        steps: [
          "Portionera kokt potatis.",
          "Lägg upp fiskpanetter bredvid.",
          "Tillsätt remouladsås.",
          "Garnityr: citron.",
        ],
        note: "Kontrollera temperatur och portionvikt.",
      }),
      nutrition: makeNutrition({
        perPortion: { kcal: 640, proteinG: 26, fatG: 29, carbsG: 71, saltG: 2.4, fiberG: 6 },
        per100g: { kcal: 128, proteinG: 5.2, fatG: 5.8, carbsG: 14.2, saltG: 0.48, fiberG: 1.2 },
      }),
      co2: makeCo2({
        totalKg: 17.7,
        perPortionKg: 0.71,
        note: "Summering av underrecept (demo).",
      }),
      history: [{ date: "2026-02-20", change: "Leverantör uppdaterade pris (demo)" }],
    },
    {
      id: "mr2",
      type: "meal",
      name: "Kalvstek med gräddsås + rostad potatis + broccolisoppa",
      mealName: "Kalvstek med gräddsås + rostad potatis + broccolisoppa",
      status: "active",
      cat: "husman",
      size: "440 g",
      desc: "Måltid med förrättssoppa.",
      supplier: SUP,
      supplierUpdatedAt: "2026-02-12",
      updatedAt: todayISO(),
      price: "—",
      priceSek: 0,
      subRecipeIds: ["sr_graddsas", "sr_potatis_rostad", "sr_broccoli_soup"],
      ingredients: [
        makeIngredient({ name: "Kalvstek", qty: "3.0", unit: "kg", articleNo: "A-9003", gtin: "0731234567093", img: svgDataUrl("Kalv"), supplier: SUP, priceSek: 420, unitPriceSek: 140, packSize: "3 kg", co2ePerKg: 27.0, nutritionPer100g: { kcal: 180, proteinG: 26, fatG: 8, carbsG: 0, saltG: 0.2, fiberG: 0 }, supplierUpdatedAt: "2026-02-11", updatedAt: todayISO() }),
      ],
      instructions: makeInstructions({
        title: "Montering & servering",
        desc: "Servera soppa först, därefter huvudrätt.",
        steps: [
          "Servera broccolisoppan i skål (förrätt).",
          "Lägg upp rostad potatis.",
          "Skiva kalvstek och lägg på tallrik.",
          "Ringla gräddsås över.",
        ],
        note: "Säkerställ varmhållning och portionsvikt.",
      }),
      nutrition: makeNutrition({
        perPortion: { kcal: 780, proteinG: 42, fatG: 44, carbsG: 55, saltG: 2.6, fiberG: 6 },
        per100g: { kcal: 177, proteinG: 9.5, fatG: 10.0, carbsG: 12.5, saltG: 0.6, fiberG: 1.4 },
      }),
      co2: makeCo2({
        totalKg: 45.0,
        perPortionKg: 1.80,
        note: "Kalvstek driver CO₂e (demo).",
      }),
      history: [{ date: "2026-02-12", change: "Ny produkt upptäckt vid nattkörning (demo)" }],
    },
    {
      id: "mr3",
      type: "meal",
      name: "Lättrimmad koljafilé med vitvinssås och kokt potatis",
      mealName: "Lättrimmad koljafilé med vitvinssås och kokt potatis",
      status: "inactive",
      cat: "husman",
      size: "420 g",
      desc: "Inaktiv i demo (t.ex. utgående komponent).",
      supplier: SUP,
      supplierUpdatedAt: "2026-02-01",
      updatedAt: todayISO(),
      price: "—",
      priceSek: 0,
      subRecipeIds: ["sr_vitvin_sauce", "sr_potatis_kokt"],
      ingredients: [
        makeIngredient({ name: "Koljafilé", qty: "2.5", unit: "kg", articleNo: "A-9004", gtin: "0731234567094", img: svgDataUrl("Kolja"), supplier: SUP, priceSek: 260, unitPriceSek: 104, packSize: "2,5 kg", co2ePerKg: 4.2, nutritionPer100g: { kcal: 90, proteinG: 19, fatG: 1, carbsG: 0, saltG: 0.2, fiberG: 0 }, supplierUpdatedAt: "2026-01-30", updatedAt: todayISO() }),
      ],
      instructions: makeInstructions({
        title: "Montering & servering",
        desc: "Servera fisk med sås och potatis.",
        steps: [
          "Lägg upp kokt potatis.",
          "Servera koljafilé varm.",
          "Toppa med vitvinssås.",
        ],
        note: "Inaktiv – används som referens i demo.",
      }),
      nutrition: makeNutrition({
        perPortion: { kcal: 610, proteinG: 38, fatG: 22, carbsG: 62, saltG: 2.1, fiberG: 5 },
        per100g: { kcal: 145, proteinG: 9.0, fatG: 5.2, carbsG: 14.8, saltG: 0.5, fiberG: 1.2 },
      }),
      co2: makeCo2({
        totalKg: 12.0,
        perPortionKg: 0.60,
        note: "Fisk + sås (demo).",
      }),
      history: [{ date: "2026-02-01", change: "Satt inaktiv p.g.a. komponent (demo)" }],
    },
    {
      id: "mr4",
      type: "meal",
      name: "Biffstroganoff med ris + broccolisoppa",
      mealName: "Biffstroganoff med ris + broccolisoppa",
      status: "active",
      cat: "husman",
      size: "550 g",
      desc: "Måltid med soppa + huvudrätt.",
      supplier: SUP,
      supplierUpdatedAt: "2026-02-18",
      updatedAt: todayISO(),
      price: "9,13 kr",
      priceSek: 9.13,
      subRecipeIds: ["sr_ris_bas", "sr_broccoli_soup"],
      ingredients: [
        makeIngredient({ name: "Nötstrimlor", qty: "2.0", unit: "kg", articleNo: "A-9005", gtin: "0731234567095", img: svgDataUrl("Nöt"), supplier: SUP, priceSek: 320, unitPriceSek: 160, packSize: "2 kg", co2ePerKg: 30.0, nutritionPer100g: { kcal: 190, proteinG: 26, fatG: 9, carbsG: 0, saltG: 0.2, fiberG: 0 }, supplierUpdatedAt: "2026-02-16", updatedAt: todayISO() }),
        makeIngredient({ name: "Tomatpuré", qty: "0.3", unit: "kg", articleNo: "A-8001", gtin: "0731234567081", img: svgDataUrl("Tomat"), supplier: SUP, priceSek: 18, unitPriceSek: 60, packSize: "0,3 kg", co2ePerKg: 1.1, nutritionPer100g: { kcal: 82, proteinG: 4.3, fatG: 0.5, carbsG: 18.9, saltG: 0.1, fiberG: 4.1 }, supplierUpdatedAt: "2026-02-10", updatedAt: todayISO() }),
      ],
      instructions: makeInstructions({
        title: "Montering & servering",
        desc: "Soppa först, sedan stroganoff med ris.",
        steps: [
          "Servera broccolisoppa.",
          "Portionera ris.",
          "Lägg stroganoff på ris.",
        ],
        note: "Håll koll på varm- och kallhållning.",
      }),
      nutrition: makeNutrition({
        perPortion: { kcal: 860, proteinG: 46, fatG: 36, carbsG: 88, saltG: 2.9, fiberG: 7 },
        per100g: { kcal: 156, proteinG: 8.4, fatG: 6.5, carbsG: 16.0, saltG: 0.53, fiberG: 1.3 },
      }),
      co2: makeCo2({
        totalKg: 62.0,
        perPortionKg: 2.48,
        note: "Nöt driver CO₂e (demo).",
      }),
      history: [],
    },
    {
      id: "mr5",
      type: "meal",
      name: "Dillkött med kokt potatis",
      mealName: "Dillkött med kokt potatis",
      status: "active",
      cat: "husman",
      size: "410 g",
      desc: "Husman med tydlig såsprofil.",
      supplier: SUP,
      supplierUpdatedAt: "2026-02-22",
      updatedAt: todayISO(),
      price: "23,39 kr",
      priceSek: 23.39,
      subRecipeIds: ["sr_potatis_kokt"],
      ingredients: [
        makeIngredient({ name: "Kött", qty: "2.5", unit: "kg", articleNo: "A-9007", gtin: "0731234567097", img: svgDataUrl("Kött"), supplier: SUP, priceSek: 310, unitPriceSek: 124, packSize: "2,5 kg", co2ePerKg: 18.0, nutritionPer100g: { kcal: 175, proteinG: 24, fatG: 8, carbsG: 0, saltG: 0.2, fiberG: 0 }, supplierUpdatedAt: "2026-02-21", updatedAt: todayISO() }),
        makeIngredient({ name: "Dill", qty: "0.08", unit: "kg", articleNo: "A-9008", gtin: "0731234567098", img: svgDataUrl("Dill"), supplier: SUP, priceSek: 12, unitPriceSek: 150, packSize: "0,08 kg", co2ePerKg: 0.7, nutritionPer100g: { kcal: 43, proteinG: 3.5, fatG: 1.1, carbsG: 7.0, saltG: 0.1, fiberG: 2.1 }, supplierUpdatedAt: "2026-02-20", updatedAt: todayISO() }),
      ],
      instructions: makeInstructions({
        title: "Montering & servering",
        desc: "Kött + såsprofil och potatis som bas.",
        steps: [
          "Portionera kokt potatis.",
          "Lägg dillkött på tallrik.",
          "Justera sås/sky vid servering (demo).",
        ],
        note: "Dill kan tillsättas sent för fräsch smak.",
      }),
      nutrition: makeNutrition({
        perPortion: { kcal: 740, proteinG: 44, fatG: 34, carbsG: 60, saltG: 2.2, fiberG: 5 },
        per100g: { kcal: 180, proteinG: 10.7, fatG: 8.3, carbsG: 14.6, saltG: 0.54, fiberG: 1.2 },
      }),
      co2: makeCo2({
        totalKg: 40.0,
        perPortionKg: 1.60,
        note: "Kött dominerar CO₂e (demo).",
      }),
      history: [],
    },
  ];

  // Frikopplad ingredienskatalog (sökbar) — “masterdata”
  const ingredientsCatalog = [
    makeIngredient({ id: "ic01", name: "Ägg", articleNo: "3464-B", gtin: "0731234567032", img: svgDataUrl("Ägg"), status: "active", supplier: SUP, co2ePerKg: 2.2, supplierUpdatedAt: "2026-02-05" }),
    makeIngredient({ id: "ic02", name: "Grädde", articleNo: "A-3002", gtin: "0731234567022", img: svgDataUrl("Grädde"), status: "active", supplier: SUP, co2ePerKg: 5.1, supplierUpdatedAt: "2026-02-06" }),
    makeIngredient({ id: "ic03", name: "Buljong", articleNo: "A-3003", gtin: "0731234567023", img: svgDataUrl("Buljong"), status: "active", supplier: SUP, co2ePerKg: 1.2, supplierUpdatedAt: "2026-02-01" }),
    makeIngredient({ id: "ic04", name: "Potatis", articleNo: "A-2001", gtin: "0731234567011", img: svgDataUrl("Potatis"), status: "active", supplier: SUP, co2ePerKg: 0.2, supplierUpdatedAt: "2026-02-10" }),
    makeIngredient({ id: "ic05", name: "Senap", articleNo: "A-1003", gtin: "0731234567003", img: svgDataUrl("Senap"), status: "active", supplier: SUP, co2ePerKg: 1.4, supplierUpdatedAt: "2026-02-08" }),
    makeIngredient({ id: "ic06", name: "Mjöl", articleNo: "A-5003", gtin: "0731234567043", img: svgDataUrl("Mjöl"), status: "active", supplier: SUP, co2ePerKg: 0.9, supplierUpdatedAt: "2026-02-07" }),
    makeIngredient({ id: "ic07", name: "Ströbröd", articleNo: "A-5001", gtin: "0731234567041", img: svgDataUrl("Ströbröd"), status: "active", supplier: SUP, co2ePerKg: 1.0, supplierUpdatedAt: "2026-02-07" }),
    makeIngredient({ id: "ic08", name: "Citron", articleNo: "A-9002", gtin: "0731234567092", img: svgDataUrl("Citron"), status: "active", supplier: SUP, co2ePerKg: 0.6, supplierUpdatedAt: "2026-02-19" }),
    makeIngredient({ id: "ic09", name: "Tomatpuré", articleNo: "A-8001", gtin: "0731234567081", img: svgDataUrl("Tomat"), status: "active", supplier: SUP, co2ePerKg: 1.1, supplierUpdatedAt: "2026-02-10" }),
    makeIngredient({ id: "ic10", name: "Olivolja", articleNo: "A-8002", gtin: "0731234567082", img: svgDataUrl("Olivolja"), status: "active", supplier: SUP, co2ePerKg: 3.0, supplierUpdatedAt: "2026-02-03" }),
    makeIngredient({ id: "ic11", name: "Vitlök", articleNo: "A-8003", gtin: "0731234567083", img: svgDataUrl("Vitlök"), status: "active", supplier: SUP, co2ePerKg: 0.4, supplierUpdatedAt: "2026-02-12" }),
    makeIngredient({ id: "ic12", name: "Sojasås", articleNo: "A-8004", gtin: "0731234567084", img: svgDataUrl("Soja"), status: "inactive", supplier: SUP, co2ePerKg: 1.8, supplierUpdatedAt: "2026-02-09" }),
  ];

  const recipes = [...mealRecipes, ...subRecipes];

  const byId = new Map(recipes.map((r) => [r.id, r]));
  const meals = mealRecipes.map((r) => r.id);
  const subs = subRecipes.map((r) => r.id);

  return {
    version: "mockdb_v2_fullmodel",
    recipes,
    byId,
    meals,
    subs,
    ingredientsCatalog,
  };
}

/* -----------------------------
   Search / Query
----------------------------- */

function ingredientsToSearchBlob(ingredients) {
  const arr = Array.isArray(ingredients) ? ingredients : [];
  return arr
    .map((it) => {
      const nm = it?.name ?? "";
      const an = it?.articleNo ?? "";
      const gt = it?.gtin ?? "";
      const dn = it?.displayName ?? "";
      const bl = it?.brandLine ?? "";
      return `${nm} ${dn} ${bl} ${an} ${gt}`;
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

    // include underrecept + deras ingredienser
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

/* -----------------------------
   Ingredients index
----------------------------- */

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

        // produktkort
        displayName: it.displayName ?? "",
        brandLine: it.brandLine ?? "",
        comparePrice: it.comparePrice ?? "",
        offerLabel: it.offerLabel ?? "",
        co2PerKgLabel: it.co2PerKgLabel ?? "",

        // extra (fullmodell)
        supplierName: it?.supplier?.supplierName ?? "",
        supplierId: it?.supplier?.supplierId ?? "",
        co2ePerKg: num(it.co2ePerKg, 0),
        supplierUpdatedAt: it.supplierUpdatedAt ?? "",
      });
      return;
    }

    if (!curr.articleNo && it.articleNo) curr.articleNo = it.articleNo;
    if (!curr.gtin && it.gtin) curr.gtin = it.gtin;
    if (!curr.img && it.img) curr.img = it.img;
    if (!curr.status && it.status) curr.status = it.status;

    if (!curr.displayName && it.displayName) curr.displayName = it.displayName;
    if (!curr.brandLine && it.brandLine) curr.brandLine = it.brandLine;
    if (!curr.comparePrice && it.comparePrice) curr.comparePrice = it.comparePrice;
    if (!curr.offerLabel && it.offerLabel) curr.offerLabel = it.offerLabel;
    if (!curr.co2PerKgLabel && it.co2PerKgLabel) curr.co2PerKgLabel = it.co2PerKgLabel;

    if (!curr.supplierName && it?.supplier?.supplierName) curr.supplierName = it.supplier.supplierName;
    if (!curr.supplierId && it?.supplier?.supplierId) curr.supplierId = it.supplier.supplierId;
    if (!curr.co2ePerKg && it.co2ePerKg) curr.co2ePerKg = num(it.co2ePerKg, 0);
    if (!curr.supplierUpdatedAt && it.supplierUpdatedAt) curr.supplierUpdatedAt = it.supplierUpdatedAt;

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
      const hay = norm(`${it.name ?? ""} ${it.articleNo ?? ""} ${it.gtin ?? ""} ${it.displayName ?? ""} ${it.brandLine ?? ""} ${it.supplierName ?? ""}`);
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

/* -----------------------------
   Expand / Summary
----------------------------- */

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
    status: meal.status,
    supplierUpdatedAt: meal.supplierUpdatedAt ?? "",
  };
}

/* -----------------------------
   Mock: disabled / replacement
----------------------------- */

export function getDisabledIngredientsMock() {
  return [
    {
      id: "di1",
      name: "Ägg lösvikt frigående M/L / 3464-B / KRONÄGG / KRONÄGG",
      sev: "p0",
      price: "32.06",
      recipes: [
        { name: "Vitvinssås med ägg", status: "inactive" },
        { name: "Biffstroganoff med ris + broccolisoppa", status: "active" }
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
