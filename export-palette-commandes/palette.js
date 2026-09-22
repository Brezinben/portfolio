/* palette de commandes — moteur autonome.
   Aucune dépendance, aucun build. Expose window.commandPalette.
   Le moteur crée son propre DOM au premier open() et le retire à la fermeture. */
(function (global) {
  "use strict";

  /* ── utilitaires ─────────────────────────────────────────────── */

  // « Élève » et « eleve » doivent matcher : on retire les diacritiques.
  const fold = (s) => String(s == null ? "" : s).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, (c) => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]
  ));

  // Loupe en pixels : un seul <span> de 4,5 px répété en box-shadow.
  // Moins coûteux qu'un SVG et se recolore avec le thème.
  const GLASS = [
    "......oooo....", "....oo....oo..", "...o........o.", "...o........o.",
    "..o.....g....o", "..o.....gg...o", "..o..........o", "..o..........o",
    "...o........o.", "...o........o.", "....oo....oo..", "....h.oooo....",
    "...hh.........", "..hh..........", ".hh...........", "hh............"
  ];
  const GLASS_COLORS = { o: "var(--acc, #f5b83b)", g: "var(--fg, #fff6f6)", h: "var(--fg2, #9b9db8)" };

  function glassShadow(px) {
    const out = [];
    GLASS.forEach((row, y) => {
      for (let x = 0; x < row.length; x++) {
        const c = GLASS_COLORS[row[x]];
        if (c) out.push(x * px + "px " + y * px + "px 0 0 " + c);
      }
    });
    return out.join(",");
  }

  const DEFAULT_GROUPS = [
    { kind: "action", label: "actions", tag: "action" },
    { kind: "section", label: "sections", tag: "section" },
    { kind: "mission", label: "missions", tag: "mission" },
    { kind: "stack", label: "stack", tag: "techno" },
    { kind: "theme", label: "thèmes", tag: "thème" },
    { kind: "succes", label: "succès", tag: "succès" },
    { kind: "commande", label: "commandes", tag: "cmd" }
  ];

  const TEXTS = {
    placeholder: "Vous recherchez quelque chose ?",
    idle: "Tapez pour chercher dans tout le portfolio.",
    empty: "aucun résultat",
    offer: "rechercher avec un modèle local",
    offerTag: "local",
    find: "rechercher « %s » dans la page",
    findTag: "si disponible",
    running: "exécution…",
    navigate: "naviguer",
    complete: "compléter",
    run: "exécuter",
    rerun: "relancer",
    close: "fermer",
    back: "revenir",
    result: "résultat",
    results: "résultats"
  };

  const PANEL_HTML = [
    '<div class="pal-panel" role="dialog" aria-modal="true" aria-label="Palette de commandes">',
    '  <div class="pal-head">',
    '    <span class="pal-glyph" aria-hidden="true">›</span>',
    '    <div class="pal-field">',
    '      <label class="pal-sr" for="pal-q">Recherche globale</label>',
    '      <input class="pal-input" id="pal-q" type="text" autocomplete="off" spellcheck="false"',
    '             role="combobox" aria-expanded="false" aria-controls="pal-list" aria-autocomplete="both">',
    '      <span class="pal-ghost" aria-hidden="true"><span class="pal-ghost-typed"></span><span class="pal-ghost-rest"></span></span>',
    '    </div>',
    '    <span class="pal-meta"><span class="pal-kbd" hidden>tab</span><span class="pal-count"></span></span>',
    '  </div>',
    '  <div class="pal-list" id="pal-list" role="listbox" aria-label="Résultats"></div>',
    '  <div class="pal-run pal-hidden" aria-live="polite">',
    '    <p class="pal-echo"><span aria-hidden="true">›</span><span><span class="pal-echo-text"></span><span class="pal-caret" aria-hidden="true">▌</span></span></p>',
    '    <p class="pal-busy pal-hidden"><span class="pal-busy-dot" aria-hidden="true">▚</span>',
    '      <span class="pal-busy-body"><span class="pal-busy-label"></span>',
    '        <span class="pal-bar" aria-hidden="true">██████████<span></span></span></span></p>',
    '    <div class="pal-out pal-hidden"><p class="pal-out-title"></p><div class="pal-out-lines"></div></div>',
    '  </div>',
    '  <div class="pal-foot"></div>',
    '</div>'
  ].join("\n");

  /* ── instance ────────────────────────────────────────────────── */

  function create(options) {
    const o = Object.assign({
      index: [],
      groups: DEFAULT_GROUPS,
      texts: {},
      hotkey: "meta",          // "meta" = ⌘K et Ctrl+K · "ctrl" = Ctrl+K seul · null = pas d'écouteur
      maxResults: 5,
      findThreshold: 5,        // sous ce nombre de résultats, on propose la recherche dans la page
      root: document.body,
      typeSpeed: 19,           // ms par caractère de l'écho
      runDelay: 460,           // durée de la barre « exécution… »
      onOpen: null, onClose: null, onSelect: null,
      onRun: null,             // item exécuté dans le volet (retour false = ne pas afficher la sortie)
      onAction: null,          // item kind:"action" — ferme la palette, à vous de rediriger
      onTheme: null,           // item avec themeId — ferme la palette
      onAsk: null, onFind: null
    }, options || {});

    const T = Object.assign({}, TEXTS, o.texts);
    const st = { open: false, closing: false, q: "", at: 0, mode: "search", item: null, hits: [] };
    let back = null, panel = null, input = null, list = null, runPane = null;
    let ghostTyped = null, ghostRest = null, tabHint = null, count = null, foot = null;
    let echoText = null, caret = null, busy = null, busyLabel = null, out = null, outTitle = null, outLines = null;
    let lastFocus = null, tType = null, tRun = null, tClose = null;

    /* — recherche — */

    const query = () => st.q.replace(/^[/:]/, "").replace(/\s+/g, " ").trim();

    // Classement par nature du match, pas par score flou : préfixe de
    // libellé, puis préfixe de commande, puis libellé contenant, puis
    // le reste (mots-clés, description) départagé par la position.
    function search() {
      const q = fold(query());
      if (!q) return [];
      const scored = [];
      o.index.forEach((i) => {
        const lab = fold(i.label), cmd = fold(i.cmd), hay = fold(i.label + " " + i.desc + " " + (i.keys || "") + " " + i.cmd);
        let s = -1;
        if (lab.indexOf(q) === 0) s = 0;
        else if (cmd.indexOf(q) === 0) s = 1;
        else if (lab.indexOf(q) > 0) s = 2;
        else { const at = hay.indexOf(q); if (at >= 0) s = 3 + at / 1000; }
        if (s >= 0) scored.push({ i: i, s: s });
      });
      scored.sort((a, b) => a.s - b.s);
      return scored.map((x) => x.i).slice(0, o.maxResults);
    }

    // Complétion fantôme : seulement si le premier résultat commence par
    // la saisie, sinon on afficherait un mot sans rapport.
    function ghost() {
      const q = query();
      if (!q || st.mode !== "search") return "";
      const first = st.hits[0];
      if (!first || fold(first.label).indexOf(fold(q)) !== 0) return "";
      return first.label.slice(q.length);
    }

    /* — rendu — */

    function rowHTML(i, at, tag) {
      const q = query();
      const cut = q && fold(i.label).indexOf(fold(q)) === 0 ? q.length : 0;
      const label = cut ? "<b>" + esc(i.label.slice(0, cut)) + "</b>" + esc(i.label.slice(cut)) : esc(i.label);
      const sw = i.swatch
        ? '<span class="pal-sw" aria-hidden="true" style="background:' + esc(i.swatchBg || "transparent") + ';border:1px solid ' + esc(i.swatch) + '"></span>'
        : "";
      return '<button type="button" class="pal-row" role="option" aria-selected="false" id="pal-row-' + at + '" data-at="' + at + '"' +
        ' style="animation-delay:' + Math.min(at, 9) * 18 + 'ms">' +
        '<span class="pal-row-caret" aria-hidden="true">›</span>' +
        '<span class="pal-row-name">' + sw + '<span class="pal-row-label">' + label + "</span></span>" +
        '<span class="pal-row-desc">' + esc(i.desc) + "</span>" +
        '<span class="pal-row-tag">' + esc(tag) + "</span></button>";
    }

    function renderList() {
      st.hits = search();
      const q = query();
      const html = [];

      o.groups.forEach((g) => {
        const rows = st.hits.filter((i) => i.kind === g.kind);
        if (!rows.length) return;
        html.push('<div class="pal-group" role="group" aria-label="' + esc(g.label) + '">');
        html.push('<p class="pal-group-label"><span>' + esc(g.label) + "</span><span>" + rows.length + "</span></p>");
        rows.forEach((i) => html.push(rowHTML(i, st.hits.indexOf(i), g.tag)));
        html.push("</div>");
      });

      if (!q) {
        html.push('<div class="pal-idle"><span class="pal-glass" aria-hidden="true"><span style="box-shadow:' +
          glassShadow(4.5) + '"></span></span><p>' + esc(T.idle) + "</p></div>");
      } else if (!st.hits.length) {
        html.push('<div class="pal-group"><p class="pal-group-label"><span>' + esc(T.empty) + "</span><span>0</span></p>" +
          '<button type="button" class="pal-row is-offer" data-ask="1">' +
          '<span class="pal-row-caret" aria-hidden="true">›</span>' +
          '<span class="pal-row-name"><span class="pal-row-label">' + esc(T.offer) + "</span></span>" +
          '<span class="pal-row-desc">« ' + esc(q) + " »</span>" +
          '<span class="pal-row-tag">' + esc(T.offerTag) + "</span></button></div>");
      }

      if (q && st.hits.length < o.findThreshold) {
        html.push('<button type="button" class="pal-find" data-find="1">' +
          '<span aria-hidden="true" style="color:var(--acc, #f5b83b)">⌕</span>' +
          '<span class="pal-find-text">' + esc(T.find.replace("%s", q)) + "</span>" +
          '<span class="pal-find-tag">' + esc(T.findTag) + "</span></button>");
      }

      list.innerHTML = html.join("");
      if (st.at >= st.hits.length) st.at = 0;
      syncSelection();

      input.setAttribute("aria-expanded", st.hits.length ? "true" : "false");
      count.textContent = !q ? "" : st.hits.length + " " + (st.hits.length > 1 ? T.results : T.result);
      if (!st.hits.length) input.removeAttribute("aria-activedescendant");
      const g = ghost();
      tabHint.hidden = !g;
      ghostTyped.textContent = g ? st.q : "";
      ghostRest.textContent = g;
    }

    function syncSelection() {
      const rows = list.querySelectorAll(".pal-row[data-at]");
      let active = null;
      rows.forEach((r) => {
        const on = Number(r.dataset.at) === st.at;
        r.classList.toggle("is-sel", on);
        r.setAttribute("aria-selected", on ? "true" : "false");
        if (on) active = r;
      });
      if (active) {
        input.setAttribute("aria-activedescendant", active.id);
        // scrollIntoView déplacerait toute la page : on ajuste le conteneur.
        const rb = active.getBoundingClientRect(), pb = list.getBoundingClientRect();
        if (rb.bottom > pb.bottom) list.scrollTop += rb.bottom - pb.bottom + 6;
        else if (rb.top < pb.top) list.scrollTop -= pb.top - rb.top + 26;
        if (o.onSelect) o.onSelect(st.hits[st.at]);
      }
    }

    function renderFoot() {
      const run = st.mode === "run";
      foot.innerHTML =
        "<span><b>↑ ↓</b> " + esc(T.navigate) + "</span>" +
        "<span><b>⏎</b> " + esc(run ? T.rerun : T.run) + "</span>" +
        "<span><b>tab</b> " + esc(T.complete) + "</span>" +
        "<span><b>échap</b> " + esc(run ? T.back : T.close) + "</span>";
    }

    /* — exécution — */

    function execute(item) {
      if (!item) return;

      // Actions et thèmes ne produisent pas de sortie : ils ferment la
      // palette et rendent la main au site (navigation, thème, presse-papier).
      if (item.kind === "action" || item.themeId) {
        if (item.themeId && o.onTheme) o.onTheme(item.themeId, item);
        else if (o.onAction) o.onAction(item);
        close();
        return;
      }

      if (o.onRun && o.onRun(item) === false) { close(); return; }

      clearInterval(tType);
      clearTimeout(tRun);
      st.mode = "run";
      st.item = item;
      panel.classList.add("is-run");
      list.classList.add("pal-hidden");
      runPane.classList.remove("pal-hidden");
      busy.classList.add("pal-hidden");
      out.classList.add("pal-hidden");
      caret.classList.remove("pal-hidden");
      count.textContent = "";
      tabHint.hidden = true;
      ghostRest.textContent = "";
      input.readOnly = true;
      input.value = "";
      input.placeholder = "";
      panel.querySelector(".pal-glyph").textContent = "⌕";
      renderFoot();

      // Écho « tapé » : la position est dérivée du temps écoulé, pas d'un
      // compteur d'intervalles — un onglet ralenti ne désynchronise rien.
      const full = String(item.cmd || "");
      const t0 = Date.now();
      echoText.textContent = "";
      tType = setInterval(() => {
        const n = Math.max(1, Math.round((Date.now() - t0) / o.typeSpeed));
        if (n >= full.length) {
          clearInterval(tType);
          echoText.textContent = full;
          showBusy(item);
        } else echoText.textContent = full.slice(0, n);
      }, o.typeSpeed);
    }

    function showBusy(item) {
      busy.classList.remove("pal-hidden");
      busyLabel.textContent = T.running;
      busy.querySelector(".pal-bar span").style.animation = "pal-fill " + o.runDelay / 1000 + "s linear both";
      tRun = setTimeout(() => {
        busy.classList.add("pal-hidden");
        caret.classList.add("pal-hidden");
        outTitle.textContent = item.title || "";
        outLines.innerHTML = (item.out || []).map((l, n) =>
          '<p class="pal-out-line" style="animation-delay:' + n * 45 + 'ms">' +
          '<span class="pal-out-k"' + (l.kc ? ' style="color:' + esc(l.kc) + '"' : "") + ">" + esc(l.k) + "</span>" +
          '<span class="pal-out-v"' + (l.c ? ' style="color:' + esc(l.c) + '"' : "") + ">" + esc(l.v) + "</span></p>"
        ).join("");
        out.classList.remove("pal-hidden");
      }, o.runDelay);
    }

    function backToSearch() {
      clearInterval(tType);
      clearTimeout(tRun);
      st.mode = "search";
      st.item = null;
      panel.classList.remove("is-run");
      runPane.classList.add("pal-hidden");
      list.classList.remove("pal-hidden");
      input.readOnly = false;
      input.placeholder = T.placeholder;
      input.value = st.q;
      panel.querySelector(".pal-glyph").textContent = "›";
      renderFoot();
      renderList();
      input.focus();
    }

    /* — clavier — */

    function onKey(e) {
      if (st.mode === "run") {
        // stopPropagation : sans ça l'écouteur global voit un Échap en mode
        // « search » (déjà rétabli ici) et referme tout le panneau.
        if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); backToSearch(); }
        else if (e.key === "Enter" && st.item) { e.preventDefault(); execute(st.item); }
        return;
      }
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        const n = st.hits.length;
        if (!n) return;
        st.at = (st.at + (e.key === "ArrowDown" ? 1 : -1) + n) % n;
        syncSelection();
      } else if (e.key === "Home" || e.key === "End") {
        e.preventDefault();
        st.at = e.key === "Home" ? 0 : Math.max(0, st.hits.length - 1);
        syncSelection();
      } else if (e.key === "Tab") {
        const g = ghost();
        if (!g) return;              // sans complétion, Tab garde son rôle normal
        e.preventDefault();
        st.q = query() + g;
        st.at = 0;
        input.value = st.q;
        renderList();
      } else if (e.key === "Enter") {
        e.preventDefault();
        const it = st.hits[st.at];
        if (it) execute(it);
        else if (query() && o.onAsk) { o.onAsk(query()); close(); }
      }
    }

    function onInput() {
      st.q = input.value.replace(/\s{2,}/g, " ").replace(/^\s+/, "");
      input.value = st.q;
      st.at = 0;
      renderList();
    }

    function onListClick(e) {
      const row = e.target.closest("[data-at],[data-ask],[data-find]");
      if (!row) return;
      if (row.dataset.find) { if (o.onFind) o.onFind(query()); close(); return; }
      if (row.dataset.ask) { if (o.onAsk) o.onAsk(query()); close(); return; }
      execute(st.hits[Number(row.dataset.at)]);
    }

    function onListHover(e) {
      const row = e.target.closest("[data-at]");
      if (!row) return;
      const at = Number(row.dataset.at);
      if (at === st.at) return;
      st.at = at;
      syncSelection();
    }

    /* — cycle de vie — */

    function build() {
      back = document.createElement("div");
      back.className = "pal-back";
      back.innerHTML = PANEL_HTML;
      panel = back.querySelector(".pal-panel");
      input = back.querySelector(".pal-input");
      list = back.querySelector(".pal-list");
      runPane = back.querySelector(".pal-run");
      ghostTyped = back.querySelector(".pal-ghost-typed");
      ghostRest = back.querySelector(".pal-ghost-rest");
      tabHint = back.querySelector(".pal-kbd");
      count = back.querySelector(".pal-count");
      foot = back.querySelector(".pal-foot");
      echoText = back.querySelector(".pal-echo-text");
      caret = back.querySelector(".pal-caret");
      busy = back.querySelector(".pal-busy");
      busyLabel = back.querySelector(".pal-busy-label");
      out = back.querySelector(".pal-out");
      outTitle = back.querySelector(".pal-out-title");
      outLines = back.querySelector(".pal-out-lines");

      const lab = back.querySelector(".pal-sr");
      lab.setAttribute("style", "position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)");
      input.placeholder = T.placeholder;

      back.addEventListener("mousedown", (e) => { if (e.target === back) close(); });
      input.addEventListener("keydown", onKey);
      input.addEventListener("input", onInput);
      list.addEventListener("click", onListClick);
      list.addEventListener("mousemove", onListHover);
      // Le focus ne sort jamais du panneau tant qu'il est ouvert.
      panel.addEventListener("focusout", (e) => {
        if (st.open && !panel.contains(e.relatedTarget)) setTimeout(() => st.open && input.focus(), 0);
      });
    }

    function open() {
      if (st.open) return;
      clearTimeout(tClose);
      if (!back) build();
      lastFocus = document.activeElement;
      st.open = true; st.q = ""; st.at = 0; st.mode = "search"; st.item = null;
      back.classList.remove("is-closing");
      input.value = "";
      input.readOnly = false;
      panel.classList.remove("is-run");
      runPane.classList.add("pal-hidden");
      list.classList.remove("pal-hidden");
      panel.querySelector(".pal-glyph").textContent = "›";
      (o.root || document.body).appendChild(back);
      renderFoot();
      renderList();
      input.focus();
      if (o.onOpen) o.onOpen();
    }

    function close() {
      if (!st.open) return;
      st.open = false;
      clearInterval(tType);
      clearTimeout(tRun);
      back.classList.add("is-closing");
      tClose = setTimeout(() => {
        if (back.parentNode) back.parentNode.removeChild(back);
        back.classList.remove("is-closing");
      }, 140);
      if (lastFocus && lastFocus.focus) lastFocus.focus();
      if (o.onClose) o.onClose();
    }

    // L'écouteur global est le seul point d'entrée clavier hors panneau :
    // ⌘K/Ctrl+K bascule, Échap ferme (ou revient depuis le volet d'exécution).
    function onGlobalKey(e) {
      const mod = o.hotkey === "ctrl" ? e.ctrlKey : (e.metaKey || e.ctrlKey);
      if (mod && (e.key === "k" || e.key === "K")) {
        e.preventDefault();
        st.open ? close() : open();
        return;
      }
      if (e.key === "Escape" && st.open) {
        e.preventDefault();
        st.mode === "run" ? backToSearch() : close();
      }
    }
    if (o.hotkey) window.addEventListener("keydown", onGlobalKey);

    return {
      open: open,
      close: close,
      toggle: () => (st.open ? close() : open()),
      isOpen: () => st.open,
      run: (labelOrItem) => {
        const it = typeof labelOrItem === "string"
          ? o.index.filter((i) => i.label === labelOrItem || i.cmd === labelOrItem)[0]
          : labelOrItem;
        if (!it) return false;
        if (!st.open) open();
        execute(it);
        return true;
      },
      setIndex: (items) => { o.index = items || []; if (st.open && st.mode === "search") renderList(); },
      destroy: () => {
        if (o.hotkey) window.removeEventListener("keydown", onGlobalKey);
        clearInterval(tType); clearTimeout(tRun); clearTimeout(tClose);
        if (back && back.parentNode) back.parentNode.removeChild(back);
        st.open = false;
      }
    };
  }

  global.commandPalette = { create: create, fold: fold, DEFAULT_GROUPS: DEFAULT_GROUPS };
})(window);
