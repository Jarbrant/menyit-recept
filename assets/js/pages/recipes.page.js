/* ============================================================
   FIL: assets/js/pages/recipes.page.js  (HEL FIL)
   PATCH: AO-RECIPES-PRODCARD-02 (FAS 1)
   - Ingrediens-drawer: produktkort i header (bild + titel + rader + badges)
   - Recept-drawer: göm produktkort
   - Behåller: Typ=Alla visar ingredienser + recept
   - Behåller: Ingrediens visar endast "Byt ingrediens"
   Policy: UI-only, XSS-safe (textContent), inga externa libs
============================================================ */

import {
  getMockDB,
  queryRecipes,
  getMealSummary,
  expandMeal,
  listIngredients
} from "../app.js";

export function initRecipesPage() {
  const $ = (sel) => document.querySelector(sel);

  const elBack = $("#backBtn");
  const elQ = $("#q");
  const elTbody = $("#tbody");
  const elMeta = $("#meta");

  const elOverlay = $("#overlay");
  const elDrawer = $("#drawer");
  const elDTitle = $("#dTitle");
  const elDSub = $("#dSub");
  const elDClose = $("#dClose");

  const elSelPanel = $("#selPanel");
  const elSelCount = $("#selCount");
  const elSelBody = $("#selBody");
  const elSelClose = $("#selClose");

  const elType = $("#typeSel");
  const elStatus = $("#statusSel");
  const elCat = $("#catSel");
  const elCompact = $("#compactChk");

  let tabs = Array.from(document.querySelectorAll(".tab"));
  const tabViews = {
    overview: $("#tab_overview"),
    climate: $("#tab_climate"),
    ingredients: $("#tab_ingredients"),
    history: $("#tab_history"),
    // mealview skapas dynamiskt
  };

  const fName = $("#fName");
  const fMealName = $("#fMealName");
  const fStatus = $("#fStatus");
  const fDesc = $("#fDesc");
  const eName = $("#eName");
  const saveNote = $("#saveNote");

  const co2Badge = $("#co2Badge");
  const energyBadge = $("#energyBadge");
  const sizeBadge = $("#sizeBadge");

  const ingList = $("#ingList");
  const histList = $("#histList");

  const createBtn = $("#createBtn");
  const saveBtn = $("#saveBtn");
  const dupBtn = $("#dupBtn");
  const bulkInactive = $("#bulkInactive");
  const bulkOpen = $("#bulkOpen");

  const db = getMockDB();
  const MIN_QUERY_CHARS = 1;

  const state = {
    q: "",
    type: "all",        // all | meal | sub | ingredient
    status: "active",   // all | active | inactive
    cat: "all",
    compact: false,
    selected: new Map(),  // används bara för recept-rader
    activeId: null,
    activeIngKey: null,
  };

  function text(v) { return (v ?? "").toString(); }
  function norm(v) { return (v ?? "").toString().trim().toLowerCase(); }
  function isIngredientMode() { return state.type === "ingredient"; }
  function shouldShowResultsNow() { return (state.q || "").trim().length >= MIN_QUERY_CHARS; }

  function setTab(key) {
    for (const [k, el] of Object.entries(tabViews)) {
      if (!el) continue;
      el.style.display = k === key ? "" : "none";
    }
    tabs.forEach((t) => t.classList.toggle("active", t.dataset.tab === key));
  }

  function ensureMealViewTab() {
    if (document.querySelector('.tab[data-tab="mealview"]')) return;

    const tabsBar = document.querySelector(".tabs");
    if (!tabsBar) return;

    const btn = document.createElement("button");
    btn.className = "tab";
    btn.type = "button";
    btn.dataset.tab = "mealview";
    btn.textContent = "Måltidsvy";
    btn.style.display = "none";

    tabsBar.appendChild(btn);

    const body = tabsBar.parentElement;
    const view = document.createElement("div");
    view.id = "tab_mealview";
    view.style.display = "none";

    const box = document.createElement("div");
    box.className = "card";
    box.style.padding = "14px";
    box.style.boxShadow = "none";
    box.id = "mealViewBox";
    view.appendChild(box);

    body.appendChild(view);

    tabViews.mealview = view;

    tabs = Array.from(document.querySelectorAll(".tab"));
    btn.addEventListener("click", () => setTab("mealview"));
  }

  function hideMealViewTabIfAny() {
    const mealTabBtn = document.querySelector('.tab[data-tab="mealview"]');
    const view = tabViews.mealview;
    const box = document.querySelector("#mealViewBox");
    if (mealTabBtn) mealTabBtn.style.display = "none";
    if (view) view.style.display = "none";
    if (box) box.textContent = "";
  }

  function applyModeUI() {
    if (elCat) {
      elCat.disabled = isIngredientMode();
      if (isIngredientMode()) elCat.value = "all";
    }
    if (isIngredientMode()) {
      state.selected.clear();
      renderSelectionPanel();
      elSelPanel.classList.remove("open");
    }
  }

  function badgeForStatus(statusValue) {
    const tdStatus = document.createElement("td");
    const b = document.createElement("span");
    const st = (statusValue || "").toLowerCase();
    const isOk = !st || st === "active";
    b.className = "badge " + (isOk ? "badgeOk" : "badgeMuted");
    b.textContent = isOk ? "Aktiv" : "Inaktiv";
    tdStatus.appendChild(b);
    return tdStatus;
  }

  /* ============================================================
     Produktkort i drawerHeader (endast ingrediens)
  ============================================================ */

  function ensureProdCard() {
    const header = elDrawer?.querySelector?.(".drawerHeader");
    if (!header) return null;

    // om redan skapad
    let wrap = header.querySelector("#prodCardWrap");
    if (wrap) return wrap;

    // Gör header flex så kortet hamnar snyggt
    header.style.display = "flex";
    header.style.alignItems = "flex-start";
    header.style.gap = "12px";

    // Skapa wrapper
    wrap = document.createElement("div");
    wrap.id = "prodCardWrap";
    wrap.style.display = "none";
    wrap.style.width = "100%";
    wrap.style.paddingRight = "6px";

    // Rad: bild + textblock
    const row = document.createElement("div");
    row.id = "prodCardRow";
    row.style.display = "flex";
    row.style.alignItems = "center";
    row.style.gap = "12px";

    const img = document.createElement("img");
    img.id = "prodCardImg";
    img.alt = "";
    img.loading = "lazy";
    img.decoding = "async";
    img.style.width = "56px";
    img.style.height = "56px";
    img.style.borderRadius = "14px";
    img.style.objectFit = "cover";
    img.style.border = "1px solid var(--border)";
    img.style.background = "var(--card)";
    img.style.flex = "0 0 auto";

    const txt = document.createElement("div");
    txt.id = "prodCardTxt";
    txt.style.minWidth = "0";

    const title = document.createElement("div");
    title.id = "prodCardTitle";
    title.style.fontWeight = "900";
    title.style.fontSize = "16px";
    title.style.lineHeight = "1.2";
    title.style.whiteSpace = "nowrap";
    title.style.overflow = "hidden";
    title.style.textOverflow = "ellipsis";

    const sub1 = document.createElement("div");
    sub1.id = "prodCardSub1";
    sub1.className = "muted small";
    sub1.style.whiteSpace = "nowrap";
    sub1.style.overflow = "hidden";
    sub1.style.textOverflow = "ellipsis";

    const sub2 = document.createElement("div");
    sub2.id = "prodCardSub2";
    sub2.className = "muted small";
    sub2.style.whiteSpace = "nowrap";
    sub2.style.overflow = "hidden";
    sub2.style.textOverflow = "ellipsis";

    txt.appendChild(title);
    txt.appendChild(sub1);
    txt.appendChild(sub2);

    row.appendChild(img);
    row.appendChild(txt);

    // Badgesrad (CO2 + Anbud)
    const badges = document.createElement("div");
    badges.id = "prodCardBadges";
    badges.style.display = "flex";
    badges.style.gap = "8px";
    badges.style.alignItems = "center";
    badges.style.marginTop = "8px";
    badges.style.flexWrap = "wrap";

    const co2 = document.createElement("span");
    co2.id = "prodCardCo2";
    co2.className = "badge badgeMuted";

    const offer = document.createElement("span");
    offer.id = "prodCardOffer";
    offer.className = "badge badgeOk";

    badges.appendChild(co2);
    badges.appendChild(offer);

    wrap.appendChild(row);
    wrap.appendChild(badges);

    // Sätt wrappern först i header
    header.insertBefore(wrap, header.firstChild);

    // Flytta titelblock (dTitle/dSub) inuti wrap? NEJ – vi använder egna fält i prod card,
    // så vi kan dölja dTitle/dSub visuellt när prodcard visas.
    return wrap;
  }

  function hideProdCard() {
    const wrap = ensureProdCard();
    if (!wrap) return;

    wrap.style.display = "none";

    // Återställ standardtitel
    if (elDTitle) elDTitle.style.display = "";
    if (elDSub) elDSub.style.display = "";
  }

  function showProdCard(it) {
    const wrap = ensureProdCard();
    if (!wrap) return;

    const img = document.querySelector("#prodCardImg");
    const title = document.querySelector("#prodCardTitle");
    const sub1 = document.querySelector("#prodCardSub1");
    const sub2 = document.querySelector("#prodCardSub2");
    const co2 = document.querySelector("#prodCardCo2");
    const offer = document.querySelector("#prodCardOffer");

    // Bild
    const src = it?.img || "";
    if (img) {
      if (src) {
        img.src = src;
        img.alt = (it?.displayName || it?.name || "Produkt").toString();
        img.style.display = "";
      } else {
        img.removeAttribute("src");
        img.alt = "";
        img.style.display = "none";
      }
    }

    // Text (som i din bild)
    const t = (it?.displayName || it?.name || "Produkt").toString();
    const bline = (it?.brandLine || "").toString();
    const art = (it?.articleNo || "").toString();
    const cmp = (it?.comparePrice || "").toString();

    if (title) title.textContent = t;

    // Rad 1: brandline + Art.nr
    const s1 = [bline, art ? `Art.nr. ${art}` : ""].filter(Boolean).join(", ");
    if (sub1) sub1.textContent = s1 || "—";

    // Rad 2: jämförpris
    if (sub2) sub2.textContent = cmp || "Jmf. —";

    // Badges
    const co2Txt = (it?.co2PerKg || "").toString().trim();
    if (co2) {
      if (co2Txt) {
        co2.textContent = co2Txt;
        co2.style.display = "";
      } else {
        co2.textContent = "";
        co2.style.display = "none";
      }
    }

    const offerTxt = (it?.offerLabel || "").toString().trim();
    if (offer) {
      if (offerTxt) {
        offer.textContent = offerTxt;
        offer.style.display = "";
      } else {
        offer.textContent = "";
        offer.style.display = "none";
      }
    }

    // Visa prodcard och dölj standardtitel
    wrap.style.display = "";
    if (elDTitle) elDTitle.style.display = "none";
    if (elDSub) elDSub.style.display = "none";
  }

  /* ============================================================
     Actions-rad vid tabs (Byt ingrediens)
     - Ingrediens: visa ENDAST "Byt ingrediens"
     - Recept: göm raden
  ============================================================ */
  function ensureDrawerActionsRow() {
    const tabsBar = document.querySelector(".tabs");
    if (!tabsBar) return null;

    let row = document.querySelector("#drawerActionsRow");
    if (row) return row;

    row = document.createElement("div");
    row.id = "drawerActionsRow";
    row.style.display = "none";
    row.style.margin = "10px 0 8px";
    row.style.alignItems = "center";
    row.style.justifyContent = "flex-end";
    row.style.gap = "10px";

    const swapBtn = document.createElement("a");
    swapBtn.id = "swapIngBtn";
    swapBtn.className = "btn";
    swapBtn.href = "#";
    swapBtn.textContent = "Byt ingrediens";
    swapBtn.title = "Gå till sida för att byta/ersätta ingrediens (demo)";
    row.appendChild(swapBtn);

    tabsBar.parentElement.insertBefore(row, tabsBar);
    return row;
  }

  function showSwapOnlyForIngredient(it) {
    const row = ensureDrawerActionsRow();
    if (!row) return;

    const swapBtn = document.querySelector("#swapIngBtn");
    const q = encodeURIComponent(it?.gtin || it?.articleNo || it?.name || "");
    if (swapBtn) swapBtn.href = `./recipe-used-ingredients.html?q=${q}`;

    row.style.display = "flex";
  }

  function hideDrawerActionsRow() {
    const row = document.querySelector("#drawerActionsRow");
    if (row) row.style.display = "none";
  }

  /* =========================
     INGREDIENS: Drawer
  ========================== */
  function openIngredientDrawer(it) {
    if (!it) return;

    state.activeId = null;
    state.activeIngKey = it.key || null;

    // Produktkort i header (allt)
    showProdCard(it);

    // Visa ENDAST “Byt ingrediens”
    showSwapOnlyForIngredient(it);

    saveNote.textContent = "";
    eName.style.display = "none";

    // Behåll formfält (read-only) som innan
    fName.value = text(it.name);
    fMealName.value = text(it.articleNo ? `Artikel: ${it.articleNo}` : "Artikel: —");
    fStatus.value = (it.status && it.status.toLowerCase() === "inactive") ? "inactive" : "active";
    fDesc.value = text(it.gtin ? `GTIN: ${it.gtin}` : "GTIN: —");

    fName.disabled = true;
    fMealName.disabled = true;
    fStatus.disabled = true;
    fDesc.disabled = true;
    if (saveBtn) saveBtn.disabled = true;
    if (dupBtn) dupBtn.disabled = true;

    // Klimatfält = —
    co2Badge.textContent = "—";
    energyBadge.textContent = "—";
    sizeBadge.textContent = "—";

    // Ingrediens-tab: enkel info + “produktkort-data”
    ingList.textContent = "";
    const box = document.createElement("div");
    box.className = "card";
    box.style.padding = "12px";
    box.style.boxShadow = "none";

    const h = document.createElement("div");
    h.style.fontWeight = "900";
    h.textContent = "Produktdata (demo)";
    box.appendChild(h);

    const l1 = document.createElement("div");
    l1.className = "muted small";
    l1.style.marginTop = "6px";
    l1.textContent = `Artikelnummer: ${it.articleNo || "—"} • GTIN: ${it.gtin || "—"}`;
    box.appendChild(l1);

    const l2 = document.createElement("div");
    l2.className = "muted small";
    l2.style.marginTop = "6px";
    l2.textContent = `Används i ${Number(it.usedCount ?? 0)} recept.`;
    box.appendChild(l2);

    // Visa extra rader om finns
    const extra = [];
    if (it.brandLine) extra.push(`Info: ${it.brandLine}`);
    if (it.comparePrice) extra.push(it.comparePrice);
    if (it.co2PerKg) extra.push(it.co2PerKg);
    if (it.offerLabel) extra.push(it.offerLabel);

    if (extra.length) {
      const l3 = document.createElement("div");
      l3.className = "muted small";
      l3.style.marginTop = "6px";
      l3.textContent = extra.join(" • ");
      box.appendChild(l3);
    }

    ingList.appendChild(box);

    histList.textContent = "—";
    hideMealViewTabIfAny();

    elOverlay.classList.add("open");
    elDrawer.classList.add("open");
    elOverlay.setAttribute("aria-hidden", "false");

    setTab("overview");
  }

  /* =========================
     RECEPT: Drawer
  ========================== */
  function renderIngredientsTab(r) {
    ingList.textContent = "";

    const box = document.createElement("div");
    box.className = "card";
    box.style.padding = "12px";
    box.style.boxShadow = "none";

    if (r.type === "meal") {
      const { subs } = expandMeal(db, r.id);

      const h = document.createElement("div");
      h.style.fontWeight = "900";
      h.textContent = `Underrecept (${subs.length})`;
      box.appendChild(h);

      const ul = document.createElement("ul");
      ul.style.margin = "8px 0 14px 18px";
      for (const s of subs) {
        const li = document.createElement("li");
        li.textContent = s.name + (s.status === "inactive" ? " (inaktiv)" : "");
        ul.appendChild(li);
      }
      box.appendChild(ul);

      const h2 = document.createElement("div");
      h2.style.fontWeight = "900";
      h2.textContent = "Ingredienser (måltidsnivå)";
      box.appendChild(h2);

      const ul2 = document.createElement("ul");
      ul2.style.margin = "8px 0 0 18px";
      for (const it of Array.isArray(r.ingredients) ? r.ingredients : []) {
        const li = document.createElement("li");
        const meta = `${it.name} • ${it.qty} ${it.unit}`;
        const extra = `${it.articleNo ? " • " + it.articleNo : ""}${it.gtin ? " • " + it.gtin : ""}`;
        li.textContent = meta + extra;
        ul2.appendChild(li);
      }
      box.appendChild(ul2);
    } else {
      const h = document.createElement("div");
      h.style.fontWeight = "900";
      h.textContent = "Ingredienser";
      box.appendChild(h);

      const ul = document.createElement("ul");
      ul.style.margin = "8px 0 0 18px";
      for (const it of Array.isArray(r.ingredients) ? r.ingredients : []) {
        const li = document.createElement("li");
        const meta = `${it.name} • ${it.qty} ${it.unit}`;
        const extra = `${it.articleNo ? " • " + it.articleNo : ""}${it.gtin ? " • " + it.gtin : ""}`;
        li.textContent = meta + extra;
        ul.appendChild(li);
      }
      box.appendChild(ul);
    }

    ingList.appendChild(box);
  }

  function renderHistoryTab(r) {
    histList.textContent = "";

    const arr = Array.isArray(r.history) ? r.history : [];
    if (arr.length === 0) {
      histList.textContent = "—";
      return;
    }

    const box = document.createElement("div");
    box.className = "card";
    box.style.padding = "12px";
    box.style.boxShadow = "none";

    for (const h of arr) {
      const line = document.createElement("div");
      line.style.padding = "10px 0";
      line.style.borderBottom = "1px solid var(--border)";
      line.textContent = `${h.date} • ${h.change}`;
      box.appendChild(line);
    }
    histList.appendChild(box);
  }

  function renderMealViewTab(mealId) {
    const mealTabBtn = document.querySelector('.tab[data-tab="mealview"]');
    const box = document.querySelector("#mealViewBox");
    if (!mealTabBtn || !box) return;

    const r = db.byId.get(mealId);
    if (!r || r.type !== "meal") {
      mealTabBtn.style.display = "none";
      box.textContent = "";
      return;
    }

    mealTabBtn.style.display = "";

    const sum = getMealSummary(db, mealId);
    const { subs } = expandMeal(db, mealId);

    box.textContent = "";

    const title = document.createElement("div");
    title.style.fontWeight = "900";
    title.textContent = "Öppna måltidsrecept";
    box.appendChild(title);

    const p = document.createElement("div");
    p.className = "muted small";
    p.style.marginTop = "6px";
    p.textContent = `Den här måltiden består av ${sum?.subCount ?? subs.length} underrecept.`;
    box.appendChild(p);

    const link = document.createElement("a");
    link.className = "btn btnPrimary";
    link.style.marginTop = "12px";
    link.style.display = "inline-flex";
    link.style.alignItems = "center";
    link.href = `./meal-recipe-detail.html?id=${encodeURIComponent(mealId)}`;
    link.textContent = "Öppna måltidsvy";
    box.appendChild(link);

    const ulTitle = document.createElement("div");
    ulTitle.style.fontWeight = "900";
    ulTitle.style.marginTop = "14px";
    ulTitle.textContent = "Underrecept";
    box.appendChild(ulTitle);

    const ul = document.createElement("ul");
    ul.style.margin = "8px 0 0 18px";
    for (const s of subs) {
      const li = document.createElement("li");
      li.textContent = s.name + (s.status === "inactive" ? " (inaktiv)" : "");
      ul.appendChild(li);
    }
    box.appendChild(ul);
  }

  function openDrawer(id) {
    const r = db.byId.get(id);
    if (!r) return;

    // Recept: göm ingrediens-actions + göm produktkort
    hideDrawerActionsRow();
    hideProdCard();

    state.activeIngKey = null;

    fName.disabled = false;
    fMealName.disabled = false;
    fStatus.disabled = false;
    fDesc.disabled = false;
    if (saveBtn) saveBtn.disabled = false;
    if (dupBtn) dupBtn.disabled = false;

    ensureMealViewTab();
    state.activeId = id;
    saveNote.textContent = "";
    eName.style.display = "none";

    elDTitle.textContent = r.name;

    elDSub.textContent = "";
    const subText = document.createElement("span");

    if (r.type === "meal") {
      const sum = getMealSummary(db, id);
      subText.textContent = `Måltidsrecept • ${r.status === "active" ? "Aktiv" : "Inaktiv"} • ${sum?.subCount ?? 0} underrecept`;
    } else {
      subText.textContent = `Underrecept • ${r.status === "active" ? "Aktiv" : "Inaktiv"}`;
    }
    elDSub.appendChild(subText);

    if (r.type === "meal") {
      const sep = document.createElement("span");
      sep.textContent = " • ";
      sep.className = "muted";
      elDSub.appendChild(sep);

      const a = document.createElement("a");
      a.href = `./meal-recipe-detail.html?id=${encodeURIComponent(id)}`;
      a.textContent = "Öppna måltidsvy";
      a.style.fontWeight = "800";
      elDSub.appendChild(a);
    }

    fName.value = text(r.name);
    fMealName.value = text(r.mealName);
    fStatus.value = r.status;
    fDesc.value = text(r.desc);

    co2Badge.textContent = text(r.co2 || "—");
    energyBadge.textContent = text(r.energy || "—");
    sizeBadge.textContent = text(r.size || "—");

    renderIngredientsTab(r);
    renderHistoryTab(r);

    if (r.type === "meal") renderMealViewTab(id);
    else hideMealViewTabIfAny();

    elOverlay.classList.add("open");
    elDrawer.classList.add("open");
    elOverlay.setAttribute("aria-hidden", "false");

    setTab("overview");
  }

  function closeDrawer() {
    elOverlay.classList.remove("open");
    elDrawer.classList.remove("open");
    elOverlay.setAttribute("aria-hidden", "true");
  }

  function doSave() {
    if (isIngredientMode()) return;

    const r = db.byId.get(state.activeId);
    if (!r) return;

    const name = fName.value.trim();
    if (!name) {
      eName.style.display = "";
      eName.textContent = "Namn krävs.";
      return;
    }
    eName.style.display = "none";

    r.name = name;
    r.mealName = fMealName.value.trim() || name;
    r.status = fStatus.value;
    r.desc = fDesc.value;

    saveNote.textContent = "Sparat (demo).";
    render();
    openDrawer(r.id);
  }

  function doDuplicate() {
    if (isIngredientMode()) return;

    const r = db.byId.get(state.activeId);
    if (!r) return;

    const id = (r.type === "meal" ? "mr" : "sr") + Math.random().toString(16).slice(2);
    const copy = JSON.parse(JSON.stringify(r));
    copy.id = id;
    copy.name = r.name + " (kopia)";

    db.recipes.unshift(copy);
    db.byId.set(copy.id, copy);

    saveNote.textContent = "Duplicerat (demo).";
    render();
  }

  /* =========================
     RENDER (Typ=Alla => ingredienser + recept)
  ========================== */

  function filterIngredientsByStatus(arr) {
    return arr.filter((it) => {
      if (state.status === "all") return true;
      const st = (it.status || "").toLowerCase();
      if (!st) return state.status === "active";
      return st === state.status;
    });
  }

  function renderIngredientRow(it) {
    const tr = document.createElement("tr");

    const tdName = document.createElement("td");
    const spacer = document.createElement("span");
    spacer.style.display = "inline-block";
    spacer.style.width = "22px";
    spacer.style.marginRight = "10px";
    tdName.appendChild(spacer);

    const a = document.createElement("a");
    a.href = "#";
    a.textContent = it.name || "—";
    a.addEventListener("click", (e) => {
      e.preventDefault();
      openIngredientDrawer(it);
    });
    tdName.appendChild(a);

    const tdMeal = document.createElement("td");
    tdMeal.textContent = `Används i ${Number(it.usedCount ?? 0)} recept`;

    const tdType = document.createElement("td");
    tdType.textContent = "Ingrediens";

    const tdPrice = document.createElement("td");
    tdPrice.textContent = "—";

    const tdStatus = badgeForStatus(it.status);

    const tdAct = document.createElement("td");
    tdAct.className = "actions";
    const btn = document.createElement("button");
    btn.className = "iconBtn";
    btn.title = "Detaljer";
    btn.textContent = "⋯";
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      openIngredientDrawer(it);
    });
    tdAct.appendChild(btn);

    tr.appendChild(tdName);
    tr.appendChild(tdMeal);
    tr.appendChild(tdType);
    tr.appendChild(tdPrice);
    tr.appendChild(tdStatus);
    tr.appendChild(tdAct);

    if (state.compact) tr.querySelectorAll("td").forEach((td) => (td.style.padding = "9px 12px"));

    tr.addEventListener("click", () => openIngredientDrawer(it));
    elTbody.appendChild(tr);
  }

  function renderRecipeRow(r) {
    const tr = document.createElement("tr");

    const tdName = document.createElement("td");

    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.style.marginRight = "10px";
    cb.checked = state.selected.has(r.id);
    cb.addEventListener("click", (e) => {
      e.stopPropagation();
      if (cb.checked) state.selected.set(r.id, r);
      else state.selected.delete(r.id);
      renderSelectionPanel();
    });

    const a = document.createElement("a");
    a.href = "#";
    a.textContent = r.name;
    a.addEventListener("click", (e) => {
      e.preventDefault();
      openDrawer(r.id);
    });

    tdName.appendChild(cb);
    tdName.appendChild(a);

    const tdMeal = document.createElement("td");
    tdMeal.textContent = r.mealName;

    const tdType = document.createElement("td");
    tdType.textContent = r.type === "meal" ? "Måltid" : "Under";

    const tdPrice = document.createElement("td");
    tdPrice.textContent = r.price ?? "—";

    const tdStatus = document.createElement("td");
    const b = document.createElement("span");
    b.className = "badge " + (r.status === "active" ? "badgeOk" : "badgeMuted");
    b.textContent = r.status === "active" ? "Aktiv" : "Inaktiv";
    tdStatus.appendChild(b);

    const tdAct = document.createElement("td");
    tdAct.className = "actions";
    const btn = document.createElement("button");
    btn.className = "iconBtn";
    btn.title = "Detaljer";
    btn.textContent = "⋯";
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      openDrawer(r.id);
    });
    tdAct.appendChild(btn);

    tr.appendChild(tdName);
    tr.appendChild(tdMeal);
    tr.appendChild(tdType);
    tr.appendChild(tdPrice);
    tr.appendChild(tdStatus);
    tr.appendChild(tdAct);

    if (state.compact) tr.querySelectorAll("td").forEach((td) => (td.style.padding = "9px 12px"));

    tr.addEventListener("click", () => openDrawer(r.id));
    elTbody.appendChild(tr);
  }

  function renderIngredientOnly() {
    const rows = filterIngredientsByStatus(listIngredients(db, { text: state.q }));
    elMeta.textContent = `${rows.length} träffar`;
    elTbody.textContent = "";
    for (const it of rows) renderIngredientRow(it);
  }

  function renderRecipesOnly() {
    const rows = queryRecipes(db, {
      text: state.q,
      type: state.type,
      status: state.status,
      cat: state.cat,
    });
    elMeta.textContent = `${rows.length} träffar`;
    elTbody.textContent = "";
    for (const r of rows) renderRecipeRow(r);
  }

  function renderMixedAll() {
    const ing = filterIngredientsByStatus(listIngredients(db, { text: state.q }));
    const rec = queryRecipes(db, {
      text: state.q,
      type: "all",
      status: state.status,
      cat: state.cat,
    });

    elMeta.textContent = `${ing.length + rec.length} träffar`;
    elTbody.textContent = "";

    for (const it of ing) renderIngredientRow(it);
    for (const r of rec) renderRecipeRow(r);
  }

  function render() {
    if (!shouldShowResultsNow()) {
      elMeta.textContent = `0 träffar`;
      elTbody.textContent = "";
      return;
    }

    if (isIngredientMode()) return renderIngredientOnly();
    if (state.type === "all") return renderMixedAll();
    return renderRecipesOnly();
  }

  function renderSelectionPanel() {
    const n = state.selected.size;
    elSelCount.textContent = String(n);

    if (!shouldShowResultsNow()) {
      elSelPanel.classList.remove("open");
      elSelBody.textContent = "";
      state.selected.clear();
      return;
    }

    if (isIngredientMode()) {
      elSelPanel.classList.remove("open");
      elSelBody.textContent = "";
      state.selected.clear();
      return;
    }

    if (n === 0) {
      elSelPanel.classList.remove("open");
      elSelBody.textContent = "";
      return;
    }

    elSelPanel.classList.add("open");
    elSelBody.textContent = "";

    for (const r of state.selected.values()) {
      const row = document.createElement("div");
      row.className = "selectionItem";

      const left = document.createElement("div");
      const nm = document.createElement("div");
      nm.className = "name";
      nm.textContent = r.name;

      const sub = document.createElement("div");
      sub.className = "sub";
      sub.textContent =
        (r.status === "active" ? "Aktiv" : "Inaktiv") +
        " • " +
        (r.type === "meal" ? "Måltid" : "Under");

      left.appendChild(nm);
      left.appendChild(sub);

      const del = document.createElement("button");
      del.className = "iconBtn";
      del.title = "Ta bort";
      del.textContent = "🗑";
      del.addEventListener("click", () => {
        state.selected.delete(r.id);
        renderSelectionPanel();
        render();
      });

      row.appendChild(left);
      row.appendChild(del);
      elSelBody.appendChild(row);
    }
  }

  /* =========================
     Events
  ========================== */
  elBack?.addEventListener("click", () => history.back());

  window.addEventListener("keydown", (e) => {
    if (e.key === "/" && document.activeElement !== elQ) {
      e.preventDefault();
      elQ.focus();
    }
    if (e.key === "Escape") {
      closeDrawer();
      elSelPanel.classList.remove("open");
    }
  });

  elQ?.addEventListener("input", () => {
    state.q = elQ.value;
    if (!shouldShowResultsNow()) {
      state.selected.clear();
      renderSelectionPanel();
    }
    render();
  });

  elType?.addEventListener("change", () => {
    state.type = elType.value;
    applyModeUI();
    closeDrawer();
    render();
  });

  elStatus?.addEventListener("change", () => {
    state.status = elStatus.value;
    render();
  });

  elCat?.addEventListener("change", () => {
    state.cat = elCat.value;
    render();
  });

  elCompact?.addEventListener("change", () => {
    state.compact = !!elCompact.checked;
    render();
  });

  elOverlay?.addEventListener("click", closeDrawer);
  elDClose?.addEventListener("click", closeDrawer);

  tabs.forEach((t) =>
    t.addEventListener("click", () => {
      setTab(t.dataset.tab);
    })
  );

  saveBtn?.addEventListener("click", doSave);
  dupBtn?.addEventListener("click", doDuplicate);

  createBtn?.addEventListener("click", () => {
    alert("Skapa ny (nästa steg): koppla till create-flow.");
  });

  elSelClose?.addEventListener("click", () => {
    state.selected.clear();
    renderSelectionPanel();
    render();
  });

  bulkOpen?.addEventListener("click", () => {
    if (isIngredientMode()) return;
    const first = state.selected.values().next().value;
    if (first) openDrawer(first.id);
  });

  bulkInactive?.addEventListener("click", () => {
    if (isIngredientMode()) return;
    for (const r of state.selected.values()) r.status = "inactive";
    state.selected.clear();
    renderSelectionPanel();
    render();
  });

  // Boot
  applyModeUI();
  setTab("overview");
  render();
  renderSelectionPanel();
}
