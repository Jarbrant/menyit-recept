/* ============================================================
   FIL: assets/js/pages/recipes.page.js  (HEL FIL)
   Sida 1 logik: Receptlista
   Patch (UI småfix):
   - NY: Länk från drawer → meal-recipe-detail.html?id=<mrId> (bara för måltidsrecept)
   - NY: 5:e flik i drawer: “Måltidsvy” (visas bara när aktivt recept är måltid)
   - Behåller XSS-safe rendering (textContent + createElement)
============================================================ */

import { getMockDB, queryRecipes, getMealSummary, expandMeal } from "../app.js";

/**
 * Initieras från pages/recipes.html:
 *   import { initRecipesPage } from '../assets/js/pages/recipes.page.js';
 *   initRecipesPage();
 */
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

  // Drawer fields
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

  // Buttons
  const createBtn = $("#createBtn");
  const saveBtn = $("#saveBtn");
  const dupBtn = $("#dupBtn");
  const bulkInactive = $("#bulkInactive");
  const bulkOpen = $("#bulkOpen");

  // DB
  const db = getMockDB();

  const state = {
    q: "",
    type: "all",
    status: "active",
    cat: "all",
    compact: false,
    selected: new Map(), // id -> recipe
    activeId: null,
  };

  function text(v) {
    return (v ?? "").toString();
  }

  function ensureMealViewTab() {
    // Skapa en 5:e flik "Måltidsvy" + content div utan att patcha HTML
    if (document.querySelector('.tab[data-tab="mealview"]')) return;

    const tabsBar = document.querySelector(".tabs");
    if (!tabsBar) return;

    const btn = document.createElement("button");
    btn.className = "tab";
    btn.type = "button";
    btn.dataset.tab = "mealview";
    btn.textContent = "Måltidsvy";
    btn.style.display = "none"; // visas bara för måltidsrecept

    tabsBar.appendChild(btn);

    const body = tabsBar.parentElement; // drawerBody
    const view = document.createElement("div");
    view.id = "tab_mealview";
    view.style.display = "none";

    // Innehåll skapas i openDrawer() per måltid
    const box = document.createElement("div");
    box.className = "card";
    box.style.padding = "14px";
    box.style.boxShadow = "none";
    box.id = "mealViewBox";
    view.appendChild(box);

    body.appendChild(view);

    tabViews.mealview = view;

    // refresh tabs cache + bind click
    tabs = Array.from(document.querySelectorAll(".tab"));
    btn.addEventListener("click", () => setTab("mealview"));
  }

  function setTab(key) {
    for (const [k, el] of Object.entries(tabViews)) {
      if (!el) continue;
      el.style.display = k === key ? "" : "none";
    }
    tabs.forEach((t) => t.classList.toggle("active", t.dataset.tab === key));
  }

  function render() {
    const rows = queryRecipes(db, {
      text: state.q,
      type: state.type,
      status: state.status,
      cat: state.cat,
    });

    elMeta.textContent = `${rows.length} träffar`;
    elTbody.textContent = "";

    for (const r of rows) {
      const tr = document.createElement("tr");

      // Name + checkbox
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

      // MealName
      const tdMeal = document.createElement("td");
      tdMeal.textContent = r.mealName;

      // Type
      const tdType = document.createElement("td");
      tdType.textContent = r.type === "meal" ? "Måltid" : "Under";

      // Price
      const tdPrice = document.createElement("td");
      tdPrice.textContent = r.price ?? "—";

      // Status
      const tdStatus = document.createElement("td");
      const b = document.createElement("span");
      b.className = "badge " + (r.status === "active" ? "badgeOk" : "badgeMuted");
      b.textContent = r.status === "active" ? "Aktiv" : "Inaktiv";
      tdStatus.appendChild(b);

      // Actions
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

      if (state.compact) {
        tr.querySelectorAll("td").forEach((td) => (td.style.padding = "9px 12px"));
      }

      tr.addEventListener("click", () => openDrawer(r.id));
      elTbody.appendChild(tr);
    }
  }

  function renderSelectionPanel() {
    const n = state.selected.size;
    elSelCount.textContent = String(n);

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
        li.textContent = `${it.name} • ${it.qty} ${it.unit}`;
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
        li.textContent = `${it.name} • ${it.qty} ${it.unit}`;
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

    mealTabBtn.style.display = ""; // visa 5:e fliken

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

  function hideMealViewTabIfAny() {
    const mealTabBtn = document.querySelector('.tab[data-tab="mealview"]');
    const view = tabViews.mealview;
    const box = document.querySelector("#mealViewBox");
    if (mealTabBtn) mealTabBtn.style.display = "none";
    if (view) view.style.display = "none";
    if (box) box.textContent = "";
  }

  function openDrawer(id) {
    const r = db.byId.get(id);
    if (!r) return;

    ensureMealViewTab(); // skapa 5:e fliken om den inte finns
    state.activeId = id;
    saveNote.textContent = "";
    eName.style.display = "none";

    elDTitle.textContent = r.name;

    // Subtitle + (NY) länk i subtitle-raden (utan innerHTML)
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

    // Fill fields
    fName.value = text(r.name);
    fMealName.value = text(r.mealName);
    fStatus.value = r.status;
    fDesc.value = text(r.desc);

    // Climate badges (placeholder)
    co2Badge.textContent = text(r.co2 || "—");
    energyBadge.textContent = text(r.energy || "—");
    sizeBadge.textContent = text(r.size || "—");

    // Tabs content
    renderIngredientsTab(r);
    renderHistoryTab(r);

    // Mealview (5:e tab) show/hide
    if (r.type === "meal") renderMealViewTab(id);
    else hideMealViewTabIfAny();

    // Open
    elOverlay.classList.add("open");
    elDrawer.classList.add("open");
    elOverlay.setAttribute("aria-hidden", "false");

    // Default tab
    setTab("overview");
  }

  function closeDrawer() {
    elOverlay.classList.remove("open");
    elDrawer.classList.remove("open");
    elOverlay.setAttribute("aria-hidden", "true");
  }

  // Buttons actions
  function doSave() {
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
    // uppdatera subtitle och mealview om måltid
    openDrawer(r.id);
  }

  function doDuplicate() {
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

  // Events
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
    render();
  });

  elType?.addEventListener("change", () => {
    state.type = elType.value;
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

  // Bind tab clicks (inkl ev mealview när den skapas)
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
    const first = state.selected.values().next().value;
    if (first) openDrawer(first.id);
  });

  bulkInactive?.addEventListener("click", () => {
    for (const r of state.selected.values()) {
      r.status = "inactive";
    }
    state.selected.clear();
    renderSelectionPanel();
    render();
  });

  // Boot
  setTab("overview");
  render();
  renderSelectionPanel();
}
