/* ============================================================
   FIL: assets/js/pages/disabled.page.js  (HEL FIL)
   Sida 2 logik: Funktionshindrade ingredienser
   Patch:
   - Använder gemensam fejkdata via assets/js/app.js
     - getDisabledIngredientsMock()
     - getReplacementCatalogMock()
   - Samma UI-flöde som innan (sök/filters/drawer/byt ut)
   Policy: statisk GitHub Pages, inga externa libs, XSS-safe (textContent)
============================================================ */

import { getDisabledIngredientsMock, getReplacementCatalogMock, norm } from "../app.js";

/**
 * Initieras från pages/recipe-disabled-ingredients.html:
 *   import { initDisabledIngredientsPage } from '../assets/js/pages/disabled.page.js';
 *   initDisabledIngredientsPage();
 */
export function initDisabledIngredientsPage() {
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

  const elSev = $("#sevSel");
  const elOnlyActive = $("#onlyActive");
  const elCompact = $("#compactChk");

  const tabs = Array.from(document.querySelectorAll(".tab"));
  const tabViews = {
    overview: $("#tab_overview"),
    recipes: $("#tab_recipes"),
    replace: $("#tab_replace"),
  };

  // Help popover (om den finns i sidan)
  const helpBtn = $("#helpBtn");
  const helpPop = $("#helpPop");
  const helpClose = $("#helpClose");

  // Data
  const DB = getDisabledIngredientsMock();
  const CATALOG = getReplacementCatalogMock();

  const state = {
    q: "",
    sev: "all",
    onlyActive: true,
    compact: false,
    active: null,
    repQ: "",
    repPick: null,
  };

  function sevLabel(s) {
    if (s === "p0") return { t: "P0", cls: "badge badgeOk" };
    if (s === "p1") return { t: "P1", cls: "badge badgeMuted" };
    return { t: "P2", cls: "badge badgeMuted" };
  }

  function setTab(key) {
    for (const [k, el] of Object.entries(tabViews)) {
      el.style.display = k === key ? "" : "none";
    }
    tabs.forEach((t) => t.classList.toggle("active", t.dataset.tab === key));
  }

  function matches(item) {
    if (state.sev !== "all" && item.sev !== state.sev) return false;

    const q = norm(state.q);
    if (!q) return true;

    const hay = norm(`${item.name} ${item.recipes.map((r) => r.name).join(" ")}`);
    return hay.includes(q);
  }

  function render() {
    const rows = DB.filter(matches);
    elMeta.textContent = `${rows.length} träffar`;

    elTbody.textContent = "";
    for (const it of rows) {
      const tr = document.createElement("tr");

      const tdName = document.createElement("td");
      tdName.textContent = it.name;

      const tdSev = document.createElement("td");
      const s = sevLabel(it.sev);
      const b = document.createElement("span");
      b.className = s.cls;
      b.textContent = s.t;
      tdSev.appendChild(b);

      const tdCount = document.createElement("td");
      tdCount.textContent = String(it.recipes.length);

      const tdPrice = document.createElement("td");
      tdPrice.textContent = it.price;

      const tdAct = document.createElement("td");
      tdAct.className = "actions";
      const btn = document.createElement("button");
      btn.className = "btn";
      btn.textContent = "Byt ut";
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        openDrawer(it);
        setTab("replace");
      });
      tdAct.appendChild(btn);

      tr.appendChild(tdName);
      tr.appendChild(tdSev);
      tr.appendChild(tdCount);
      tr.appendChild(tdPrice);
      tr.appendChild(tdAct);

      if (state.compact) {
        tr.querySelectorAll("td").forEach((td) => (td.style.padding = "9px 12px"));
      }

      tr.addEventListener("click", () => openDrawer(it));
      elTbody.appendChild(tr);
    }
  }

  function renderRecipeList() {
    const it = state.active;
    const body = $("#rBody");
    body.textContent = "";
    if (!it) {
      $("#rMeta").textContent = "—";
      return;
    }

    const list = state.onlyActive ? it.recipes.filter((r) => r.status === "active") : it.recipes;
    $("#rMeta").textContent = `${list.length} st`;

    for (const r of list) {
      const tr = document.createElement("tr");

      const td1 = document.createElement("td");
      td1.textContent = r.name;

      const td2 = document.createElement("td");
      const b = document.createElement("span");
      b.className = "badge " + (r.status === "active" ? "badgeOk" : "badgeMuted");
      b.textContent = r.status === "active" ? "Aktiv" : "Inaktiv";
      td2.appendChild(b);

      tr.appendChild(td1);
      tr.appendChild(td2);
      body.appendChild(tr);
    }
  }

  function renderRepList() {
    const body = $("#repBody");
    body.textContent = "";

    const q = norm(state.repQ);
    const rows = CATALOG.filter((x) => !q || norm(x.name).includes(q));

    for (const x of rows) {
      const tr = document.createElement("tr");

      const td1 = document.createElement("td");
      td1.textContent = x.name;

      const td2 = document.createElement("td");
      td2.textContent = x.price;

      const td3 = document.createElement("td");
      td3.className = "actions";
      const btn = document.createElement("button");
      btn.className = "btn";
      btn.textContent = state.repPick && state.repPick.id === x.id ? "Vald" : "Välj";
      btn.addEventListener("click", () => {
        state.repPick = x;
        $("#repDo").disabled = false;
        renderRepList();
      });
      td3.appendChild(btn);

      tr.appendChild(td1);
      tr.appendChild(td2);
      tr.appendChild(td3);
      body.appendChild(tr);
    }
  }

  function openDrawer(it) {
    state.active = it;
    state.repPick = null;
    $("#repDo").disabled = true;
    $("#repNote").textContent = "";

    elDTitle.textContent = "Detaljer";
    elDSub.textContent = "Byt ut ingrediens i recept";

    $("#ovName").textContent = it.name;
    const s = sevLabel(it.sev);
    const sevEl = $("#ovSev");
    sevEl.className = s.cls;
    sevEl.textContent = s.t;

    $("#ovCount").textContent = String(it.recipes.length);
    $("#ovPrice").textContent = it.price;

    renderRecipeList();
    renderRepList();

    elOverlay.classList.add("open");
    elDrawer.classList.add("open");
    elOverlay.setAttribute("aria-hidden", "false");
  }

  function closeDrawer() {
    elOverlay.classList.remove("open");
    elDrawer.classList.remove("open");
    elOverlay.setAttribute("aria-hidden", "true");
  }

  // Help popover
  function openHelp() {
    if (!helpPop || !helpBtn) return;
    helpPop.style.display = "";
    helpBtn.setAttribute("aria-expanded", "true");
    setTimeout(() => {
      const onDoc = (e) => {
        if (!helpPop.contains(e.target) && e.target !== helpBtn) {
          document.removeEventListener("mousedown", onDoc);
          closeHelp();
        }
      };
      document.addEventListener("mousedown", onDoc);
    }, 0);
  }
  function closeHelp() {
    if (!helpPop || !helpBtn) return;
    helpPop.style.display = "none";
    helpBtn.setAttribute("aria-expanded", "false");
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
      closeHelp();
    }
  });

  elQ?.addEventListener("input", () => {
    state.q = elQ.value;
    render();
  });

  elSev?.addEventListener("change", () => {
    state.sev = elSev.value;
    render();
  });

  elOnlyActive?.addEventListener("change", () => {
    state.onlyActive = !!elOnlyActive.checked;
    renderRecipeList();
  });

  elCompact?.addEventListener("change", () => {
    state.compact = !!elCompact.checked;
    render();
  });

  elOverlay?.addEventListener("click", closeDrawer);
  elDClose?.addEventListener("click", closeDrawer);

  tabs.forEach((t) => t.addEventListener("click", () => setTab(t.dataset.tab)));

  $("#repQ")?.addEventListener("input", () => {
    state.repQ = $("#repQ").value;
    renderRepList();
  });

  $("#repCancel")?.addEventListener("click", () => {
    state.repPick = null;
    $("#repDo").disabled = true;
    $("#repNote").textContent = "";
    $("#repQ").value = "";
    state.repQ = "";
    renderRepList();
  });

  $("#repDo")?.addEventListener("click", () => {
    if (!state.active || !state.repPick) return;
    $("#repNote").textContent = `Bytte ut (demo): "${state.active.name}" → "${state.repPick.name}".`;
  });

  $("#exportBtn")?.addEventListener("click", () => {
    alert("Exportera (MVP): koppla senare till riktig export.");
  });

  helpBtn?.addEventListener("click", () => {
    const open = helpPop && helpPop.style.display !== "none" && helpPop.style.display !== "";
    if (open) closeHelp();
    else openHelp();
  });
  helpClose?.addEventListener("click", closeHelp);

  // Boot
  setTab("overview");
  render();
}
