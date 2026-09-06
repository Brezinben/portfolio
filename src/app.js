import { candidates, commonPrefix, contentLine, interpret, safeTone } from "./interpret.ts";

// Valeurs figées après itération dans le canvas. Ne pas les transformer en réglages :
// voir design/DECISIONS.md, section 23.
const BOOT_MS = 2000,
  FADE_MS = 620,
  PANES = ["nav", "main", "out"],
  VERTICAL = new Set(["ArrowDown", "ArrowUp"]),
  OPTS_KEY = "bd-term-opts",
  // Quatre clés, et quatre seulement. La lecture filtre dessus : le canvas injectait dans
  // l'état tout ce que le stockage contenait.
  KEPT = ["anim", "logH", "out", "theme"],
  THEMES = [
    { acc: "#F5B83B", bg: "#242538", edge: "#33344a", id: "dark", label: "ambra" },
    { acc: "#e6a000", bg: "#fff6f6", edge: "#ded2d2", id: "light", label: "solis" },
    { acc: "#49e9a6", bg: "#052c33", edge: "#0d4148", id: "noctis", label: "noctis" },
    { acc: "#49ace9", bg: "#07273b", edge: "#0f3b52", id: "azureus", label: "azureus" },
    { acc: "#a29bfe", bg: "#211d40", edge: "#332d5c", id: "uva", label: "uva" },
    { acc: "#e0728c", bg: "#2d1b26", edge: "#452a39", id: "bordo", label: "bordo" },
    { acc: "#0f7d8c", bg: "#fdf6e7", edge: "#ddd2ba", id: "lux", label: "lux" },
    { acc: "#00707f", bg: "#f7fbfc", edge: "#cfdde1", id: "hibernus", label: "hibernus" },
  ],
  // Les valeurs d'etat restent en anglais : c'est la langue d'un terminal.
  TOGGLES = [
    { key: "anim", label: "animations", off: "off", on: "on" },
    { key: "out", label: "output pane", off: "off", on: "on" },
  ],
  TYPE_CPS = 52,
  EXEC_MS = 20,
  // La fenetre de contexte se compte en caracteres imprimes, pas en commandes : une
  // section longue coute plus qu'un « ok ». Budget et plancher figes apres essai.
  CTX_BUDGET = 2600,
  CTX_FLOOR = 60,
  CTX_CELLS = 10,
  // Compacter prend du temps, et ca doit se voir. La barre se remplit d'une case toutes
  // les 520 ms pendant que sa tete tourne a chaque battement : dix cases, cinq secondes.
  COMPACT_MS = 5200,
  COMPACT_TICK_MS = 130,
  // Les huit frames braille du rotateur. Une fois la tete passee, la case se pose pleine :
  // une case a qui il manque un point donne une barre trouee, pas une barre remplie.
  SPINNER = ["⣾", "⣽", "⣻", "⢿", "⡿", "⣟", "⣯", "⣷"],
  FILLED = "⣿",
  HOLLOW = "░",
  // Le demarrage dessine sa barre sur vingt-quatre cases, comme le canvas.
  BOOT_CELLS = 24,
  // Une seule barre pour toute la page : les cases posees, la tete qui tourne tant qu'il
  // reste a faire, les cases vides. Rendue en deux morceaux, chacun avec sa couleur.
  // Sans `tick`, la barre ne progresse pas : elle n'a alors pas de tete.
  barParts = (done, total, tick) => {
    const posees = Math.max(0, Math.min(total, Math.floor(done))),
      tete = tick === undefined || posees >= total ? "" : SPINNER[tick % SPINNER.length];

    return {
      filled: FILLED.repeat(posees) + tete,
      hollow: HOLLOW.repeat(total - posees - tete.length),
    };
  },
  // Le journal ne prend jamais la place du resultat : celui-ci garde ce plancher.
  RESULT_MIN_PX = 120,
  PANE_GAP_PX = 10,
  // Largeur approximative d'un caractere de JetBrains Mono a 14 px.
  CHAR_PX = 8.4,
  // Le contenu est servi a cote de la page. Le depot est prive : la copie distante
  // rendait 404 et ne servait plus qu'a retarder le demarrage.
  CONTENT_URL = "content.json",
  TONE = {
    acc: "var(--acc)",
    fg: "var(--fg)",
    fg2: "var(--fg2)",
    ok: "var(--ok)",
    warn: "var(--warn)",
  },
  GLYPHS = {
    " ": ["  ", "  ", "  ", "  ", "  ", "  ", "  ", "  "],
    A: [" ██ ", "█  █", "█  █", "████", "█  █", "█  █", "█  █", "    "],
    B: ["███ ", "█  █", "█  █", "███ ", "█  █", "█  █", "███ ", "    "],
    D: ["███ ", "█  █", "█  █", "█  █", "█  █", "█  █", "███ ", "    "],
    E: ["████", "█   ", "█   ", "███ ", "█   ", "█   ", "████", "    "],
    I: ["████", "  █ ", "  █ ", "  █ ", "  █ ", "  █ ", "████", "    "],
    J: ["████", "   █", "   █", "   █", "   █", "█  █", " ██ ", "    "],
    M: ["█  █", "████", "████", "█  █", "█  █", "█  █", "█  █", "    "],
    N: ["█  █", "██ █", "██ █", "█ ██", "█ ██", "█  █", "█  █", "    "],
    V: ["█  █", "█  █", "█  █", "█  █", "█  █", " ██ ", "  █ ", "    "],
  },
  dots = (word) => {
    const rows = ["", "", "", "", "", "", "", ""];

    for (const character of word.toUpperCase()) {
      const glyph = GLYPHS[character] ?? GLYPHS[" "];

      for (let row = 0; row < 8; row += 1) {
        rows[row] += glyph[row] + (character === " " ? "" : " ");
      }
    }

    return rows.slice(0, 7);
  },
  // Le bandeau est dessiné en box-shadow, comme la mascotte : aucune image, aucun
  // caractère. Valeurs figées du canvas : pixel de 5 px, point de 4 px.
  BANNER_PX = 5,
  pixels = (rows, colour) => {
    const shadows = [];

    rows.forEach((row, y) => {
      [...row].forEach((character, x) => {
        if (character === "\u2588") {
          shadows.push(`${x * BANNER_PX}px ${y * BANNER_PX}px 0 ${colour}`);
        }
      });
    });

    return shadows.join(",");
  },
  banner = (shaped) => {
    const rows = dots(shaped.banner);

    return {
      height: `${rows.length * BANNER_PX}px`,
      label: shaped.text,
      shadow: pixels(rows, TONE.acc),
      size: `${BANNER_PX - 1}px`,
      width: `${Math.max(...rows.map((row) => row.length)) * BANNER_PX}px`,
    };
  },
  rect = (node) => node.getBoundingClientRect(),
  // Ce qu'une sortie a réellement imprimé, jetons compris.
  printed = (lines) =>
    lines.reduce((total, entry) => {
      const text = entry.tokens
        ? entry.tokens.map((token) => token.t).join("")
        : (entry.t ?? entry.text ?? "");

      return total + text.length;
    }, 0),
  line = (raw) => {
    const shaped = contentLine(raw);

    return shaped.banner ? { ...shaped, banner: banner(shaped) } : shaped;
  },
  outPane = (out) => ({
    lines: (out?.lines ?? []).map((row) => ({
      k: row[0],
      kc: safeTone(row[2], "fg2"),
      v: row[1],
      vc: safeTone(row[3]),
    })),
    title: out?.title ?? "",
  }),
  section = (raw) => ({
    cmd: raw.cmd ?? "",
    dot: safeTone(raw.dot, "ok"),
    id: raw.id,
    label: raw.label,
    lines: (raw.lines ?? []).map(line),
    out: outPane(raw.out),
    sub: raw.sub ?? "",
    suggest: raw.suggest ?? "",
    view: raw.view ?? "pairs",
  }),
  // Neuf feuilles de sprites remplacent le dessin en ombres portees. Les durees et les
  // images vivent dans la feuille de style : le script ne choisit que l'etat.
  MASCOT_STATES = new Set([
    "idle",
    "wink",
    "jump",
    "type",
    "load",
    "sleep",
    "morph",
    "boom",
    "reform",
  ]),
  MASCOT_REST = "idle",
  // Le vocabulaire d'humeurs de l'interpreteur se traduit en etats de feuille.
  // « idle » n'y figure pas : le repos depend de la couronne, il se lit sur mascotRest.
  // Aucune feuille ne dit la tristesse ; la veille, paupieres closes, en approche le plus.
  MOOD_STATE = {
    alert: "wink",
    happy: "jump",
    laugh: "jump",
    sad: "sleep",
    scared: "jump",
    sleep: "sleep",
  },
  // Au cinquieme clic le slime explose. Il reprend forme entre cinq et dix secondes plus
  // tard : le hasard evite que l'attente devienne une horloge.
  // Duree de chaque passe unique. « boom » n'y figure pas : l'explosion tient jusqu'a ce
  // que le minuteur de reapparition la releve.
  ONE_SHOT_MS = { jump: 1280, morph: 2400, reform: 1600, wink: 1680 },
  BOOM_AT = 5,
  REFORM_MIN_MS = 5000,
  REFORM_SPREAD_MS = 5000,
  // La frappe rend la main au repos peu apres la derniere touche. Chaque touche relance le
  // compte a rebours : 400 ms coupaient l'animation au milieu d'une phrase, et la personne
  // qui tape regarde ses mots, pas la mascotte. La veille attend dix secondes sans geste.
  // Au repos, une chance sur vingt-cinq toutes les cinq secondes.
  TYPE_REST_MS = 800,
  SLEEP_MS = 10_000,
  TWITCH_MS = 5000,
  TWITCH_ODDS = 0.04,
  EMPTY = { cmd: "", lines: [], out: { lines: [], title: "" }, suggest: "", view: "pairs" };

document.addEventListener("alpine:init", () => {
  // Les proprietes sont triees, les methodes suivent un ordre de lecture : chargement,
  // navigation, clavier, options, mascotte, commandes. Les trier alphabetiquement
  // disperserait chaque sujet aux quatre coins du fichier pour un gain nul.
  // eslint-disable-next-line sort-keys
  Alpine.data("terminal", () => ({
    THEMES,
    TOGGLES,
    anim: true,
    at: 0,
    bubble: "",
    clicks: 0,
    commands: [],
    compacting: false,
    bootTick: 0,
    compactTick: 0,
    dataErr: false,
    details: [],
    direction: 1,
    dragging: false,
    errDetail: "",
    feedback: {},
    focusAt: { main: 0, nav: 0, out: 0 },
    grabAt: 0,
    input: "",
    jokeIndex: 0,
    jokes: [],
    journal: [],
    journalOverflows: false,
    logH: 0,
    missions: [],
    gone: false,
    mascotState: "idle",
    more: { journal: false },
    motion: "",
    used: 0,
    optsOpen: false,
    out: true,
    pane: "nav",
    pending: undefined,
    power: "boot",
    profileEmail: "",
    recallAt: -1,
    resizing: undefined,
    running: false,
    section: "whoami",
    sections: [],
    seen: [],
    share: {},
    shareTargets: [],
    stack: [],
    sugg: [],
    suggAt: 0,
    suggFrag: "",
    suggHead: "",
    suggOpen: false,
    suggSlash: false,
    tech: "",
    techNotes: {},
    theme: "dark",
    timeline: [],
    timelineAt: 0,
    typed: "",
    get booting() {
      return this.power !== "on";
    },

    get current() {
      return this.all.find((entry) => entry.id === this.section) ?? EMPTY;
    },

    init() {
      this.restore();
      this.ticker = setInterval(() => {
        this.bootTick += 1;
      }, COMPACT_TICK_MS);
      this.startMascot();
      globalThis.addEventListener("popstate", () => this.fromHash());
      globalThis.addEventListener("resize", () => this.setLogHeight(this.logHeight));
      this.load();
    },

    items(pane) {
      return [
        ...document.querySelectorAll(
          `[data-pane="${pane}"] button:not(:disabled), [data-pane="${pane}"] input`,
        ),
      ];
    },

    // Le focus est mémorisé par volet : y revenir repose le curseur où on l'avait
    // laissé, plutôt qu'en tête de liste.
    focusPane(pane) {
      const entries = this.items(pane);

      if (entries.length === 0) {
        return;
      }

      this.pane = pane;
      this.focusAt[pane] = Math.min(this.focusAt[pane], entries.length - 1);
      entries[this.focusAt[pane]].focus();
    },

    movePane(step) {
      const next = PANES.indexOf(this.pane) + step;

      if (next >= 0 && next < PANES.length) {
        this.focusPane(PANES[next]);
      }
    },

    moveInPane(step) {
      const entries = this.items(this.pane);

      if (entries.length === 0) {
        return;
      }

      this.focusAt[this.pane] = Math.max(
        0,
        Math.min(entries.length - 1, this.focusAt[this.pane] + step),
      );
      entries[this.focusAt[this.pane]].focus();
    },

    moveSection(step) {
      const ids = this.sections.map((entry) => entry.id),
        next = ids.indexOf(this.section) + step;

      if (next >= 0 && next < ids.length) {
        this.goSection(ids[next]);
      }
    },

    // Une grille se parcourt aux quatre fleches. La stack en compte une par domaine :
    // un pas fixe, deduit de la premiere ligne, changeait de colonne des qu'une ligne
    // etait incomplete ou qu'on passait au domaine suivant. Les lignes se lisent donc
    // sur la position reelle des cellules.
    gridMove(selector, key) {
      const cells = [...document.querySelectorAll(selector)],
        at = cells.indexOf(document.activeElement);

      if (at === -1 || !VERTICAL.has(key)) {
        return this.rowMove(cells, at, key);
      }

      const from = rect(cells[at]),
        beyond = cells.filter((cell) =>
          key === "ArrowDown" ? rect(cell).top > from.top + 1 : rect(cell).top < from.top - 1,
        );

      if (beyond.length === 0) {
        return true;
      }

      const tops = beyond.map((cell) => rect(cell).top),
        edge = key === "ArrowDown" ? Math.min(...tops) : Math.max(...tops),
        row = beyond.filter((cell) => Math.abs(rect(cell).top - edge) < 1);

      row
        .reduce((best, cell) =>
          Math.abs(rect(cell).left - from.left) < Math.abs(rect(best).left - from.left)
            ? cell
            : best,
        )
        .focus();

      return true;
    },

    // Gauche et droite suivent l'ordre du document : c'est l'ordre de lecture.
    rowMove(cells, at, key) {
      if (at === -1 || (key !== "ArrowLeft" && key !== "ArrowRight")) {
        return false;
      }

      cells[Math.max(0, Math.min(cells.length - 1, at + (key === "ArrowRight" ? 1 : -1)))]?.focus();

      return true;
    },

    // Dans une liste a une colonne, la fleche droite valide et descend vers le volet
    // suivant : c'est ce qu'un terminal fait.
    listMove(selector, key, activate) {
      const items = [...document.querySelectorAll(selector)],
        at = items.indexOf(document.activeElement);

      if (at === -1) {
        return false;
      }

      if (key === "ArrowRight") {
        activate(at);

        return true;
      }

      if (key === "ArrowUp" || key === "ArrowDown") {
        items[
          Math.max(0, Math.min(items.length - 1, at + (key === "ArrowDown" ? 1 : -1)))
        ]?.focus();

        return true;
      }

      return false;
    },

    onKey(event) {
      if (event.altKey || event.ctrlKey || event.metaKey) {
        return;
      }

      // La modale a son propre clavier. Sans cette garde, les deux gestionnaires
      // traitent la même flèche et le focus s'échappe de la modale.
      if (this.optsOpen) {
        return;
      }

      // Dans la saisie, les flèches déplacent le curseur dans le texte. Elles ne
      // rendent la main aux volets que si le champ est vide.
      if (event.target === this.$refs.cli) {
        const leaving =
          this.input === "" && (event.key === "ArrowLeft" || event.key === "ArrowRight");

        if (!leaving) {
          return;
        }
      }

      if (event.key === "/") {
        event.preventDefault();
        this.$refs.cli.focus();

        return;
      }

      if (event.key === "j" || event.key === "k") {
        event.preventDefault();
        this.moveSection(event.key === "j" ? 1 : -1);

        return;
      }

      // Chaque zone a sa logique. La stack est une grille, les sections et la frise
      // sont des listes ou la fleche droite valide, le reste change de volet.
      const handled =
        this.gridMove("[data-tech]", event.key) ||
        this.listMove('[data-ctl="nav"]', event.key, (at) => {
          const items = [...document.querySelectorAll('[data-ctl="nav"]')];

          items[at].click();
          // De gauche a droite : valider une section amene a la ligne de commande.
          this.$nextTick(() => this.$refs.cli?.focus());
        }) ||
        this.listMove('[data-ctl="tl"]', event.key, (at) => this.openTimeline(at));

      if (handled) {
        event.preventDefault();

        return;
      }

      const fallback = {
        ArrowDown: () => this.moveInPane(1),
        ArrowLeft: () => this.movePane(-1),
        ArrowRight: () => this.movePane(1),
        ArrowUp: () => this.moveInPane(-1),
      }[event.key];

      if (!fallback) {
        return;
      }

      event.preventDefault();
      fallback();
    },

    // La stack s'arme à la première validation, puis suit le focus. Avant l'armement,
    // aucun texte d'invite ne s'affiche.
    get stackSummary() {
      const bricks = this.stack.reduce((total, root) => total + root.kids.length, 0);

      return `${this.stack.length} domaines · ${bricks} briques`;
    },

    get techNote() {
      return this.techNotes[this.tech];
    },

    // La fiche suit le focus des la premiere techno atteinte. Rien ne s'affiche
    // tant qu'aucune n'a le focus, donc aucun texte d'invite au depart.
    followTech(name) {
      this.tech = name;
    },

    // Chaque entree de la frise annonce la commande qui ouvre sa fiche. La commande vient
    // du contenu : la reconstruire ici la ferait mentir au premier renommage.
    missionCue(entry) {
      const detail = this.details.find((item) => item.id === entry.detail);

      return detail ? `↵ ${detail.cmd}` : "— pas de fiche";
    },

    openTimeline(index) {
      this.timelineAt = index;

      const target = this.timeline[index]?.detail;

      if (target) {
        this.goSection(target);
      }
    },

    // La jauge monte de ce que la sortie a imprime. Pleine, elle "compacte" avec un
    // resume ironique, puis repart a zero.
    get ctxCells() {
      return Math.min(CTX_CELLS, Math.round((this.used / CTX_BUDGET) * CTX_CELLS));
    },

    get ctxPct() {
      return `${Math.min(100, Math.round((this.used / CTX_BUDGET) * 100))}%`;
    },

    // Sans animation, la barre s'affiche pleine : le temps d'attente reste le meme, il
    // ne se raconte simplement plus.
    get compactBar() {
      if (!this.anim || this.reduced) {
        return barParts(CTX_CELLS, CTX_CELLS);
      }

      return barParts(
        (this.compactTick * COMPACT_TICK_MS * CTX_CELLS) / COMPACT_MS,
        CTX_CELLS,
        this.compactTick,
      );
    },

    // Meme forme que la compaction, memes durees qu'avant : la barre se remplit sur le
    // temps minimum du demarrage, puis attend le contenu, pleine.
    get bootBar() {
      return barParts(
        (this.bootTick * COMPACT_TICK_MS * BOOT_CELLS) / BOOT_MS,
        BOOT_CELLS,
        this.bootTick,
      );
    },

    // La frise et l'arbre n'impriment aucune ligne : leur poids vient de ce qu'ils
    // affichent, sans quoi les deux sections les plus denses coûteraient le minimum.
    weigh(entry) {
      if (entry.view === "timeline") {
        return printed(
          this.timeline.map((item) => ({
            text: `${item.years}${item.org}${item.role}${item.note}`,
          })),
        );
      }

      if (entry.view === "tree") {
        return printed(
          this.stack.map((root) => ({
            text: `${root.label}${root.note ?? ""}${root.kids.join("")}`,
          })),
        );
      }

      return printed(entry.lines);
    },

    // Le journal se redimensionne au glisser, entre 44 px et la place disponible, et
    // sa hauteur est conservée sur l'appareil.
    // logH vaut 0 tant que rien n'a ete regle : la hauteur effective doit donc
    // toujours passer par ce getter, sinon un reglage part de zero.
    get logHeight() {
      return this.logH || 120;
    },

    setLogHeight(next) {
      this.logH = Math.max(44, Math.min(Math.round(next), this.logRoom()));
      this.persist();
    },

    // La borne haute se mesure sur les freres du journal. Un nombre magique la sous-estimait
    // de pres de cent pixels : le resultat tombait a zero et le volet central debordait.
    logRoom() {
      const { journal } = this.$refs,
        pane = journal?.parentElement;

      if (!pane) {
        return 400;
      }

      const style = globalThis.getComputedStyle(pane),
        inner =
          pane.clientHeight -
          Number.parseFloat(style.paddingTop) -
          Number.parseFloat(style.paddingBottom),
        // Seules les lignes de la colonne comptent : ni les gabarits, ni les reglages
        // masques, ni le calque de balayage qui se superpose au volet.
        rows = [...pane.children].filter((node) => {
          const own = globalThis.getComputedStyle(node);

          return own.display !== "none" && own.position !== "absolute" && own.position !== "fixed";
        }),
        taken = rows
          .filter((node) => node !== journal && !node.hasAttribute("data-result"))
          .reduce((total, node) => total + node.getBoundingClientRect().height, 0);

      return Math.max(
        44,
        Math.floor(inner - taken - Math.max(0, rows.length - 1) * PANE_GAP_PX - RESULT_MIN_PX),
      );
    },

    logDown(event) {
      this.resizing = { height: this.logHeight, y: event.clientY };
      event.target.setPointerCapture(event.pointerId);
    },

    logMove(event) {
      if (!this.resizing) {
        return;
      }

      this.setLogHeight(this.resizing.height + (this.resizing.y - event.clientY));
    },

    logUp() {
      this.resizing = undefined;
    },

    // L'indicateur remplace la barre de défilement, masquée pour l'esthétique
    // terminale. Sans lui, rien ne dit qu'il reste du contenu.
    checkMore(name) {
      const node = this.$refs[name];

      if (!node) {
        return;
      }

      this.more = {
        ...this.more,
        [name]: node.scrollHeight - node.scrollTop - node.clientHeight > 4,
      };

      if (name === "journal") {
        this.journalOverflows = node.scrollHeight > node.clientHeight + 4;
      }
    },

    bump(cost) {
      if (this.compacting) {
        return;
      }

      this.used += Math.max(CTX_FLOOR, cost ?? 0);

      if (this.used < CTX_BUDGET) {
        return;
      }

      this.compacting = true;
      this.compactTick = 0;

      if (this.anim && !this.reduced) {
        this.spinner = setInterval(() => {
          this.compactTick += 1;
        }, COMPACT_TICK_MS);
      }

      this.journal = [
        ...this.journal,
        {
          c: "warn",
          m: "·",
          mc: "warn",
          t: "fenêtre de contexte pleine (100 %) — compaction automatique…",
        },
      ];
      this.compactor = setTimeout(() => {
        clearInterval(this.spinner);
        this.compacting = false;
        this.used = 0;
        this.journal = [
          ...this.journal,
          {
            c: "fg2",
            m: "·",
            mc: "fg2",
            t: "retenu : Benjamin, développeur IA, Nantes, aime le vélo.",
          },
        ];
      }, COMPACT_MS);
    },

    // Un redemarrage annule la compaction : sinon son resume s'ecrit dans un journal
    // qu'on vient de vider, et sa barre s'affiche par-dessus l'ecran de demarrage.
    stopCompacting() {
      clearInterval(this.spinner);
      clearTimeout(this.compactor);
      this.compacting = false;
      this.compactTick = 0;
    },

    // Extinction facon CRT, puis la sequence de boot complete.
    powerDown(mode) {
      this.stopCompacting();
      this.power = "off";
      setTimeout(
        () => {
          this.journal = [];
          this.seen = [];
          this.used = 0;
          this.power = "boot";
          this.load();
        },
        mode === "shutdown" ? 2200 : 900,
      );
    },

    get outKeyWidth() {
      const keys = this.current.out.lines.map((row) => String(row.k).length);

      return `${Math.max(3, ...keys)}ch`;
    },

    get outStatus() {
      return this.running ? "waiting" : "live";
    },

    // Reappliquer une classe ne redemarre pas son animation : il faut la retirer, forcer
    // une relecture de la geometrie, puis la remettre.
    mascotPlay(state) {
      const node = this.$refs.mascot;

      if (!node || !MASCOT_STATES.has(state)) {
        return;
      }

      // Explose, le slime ne repond plus : rien ne le rejoue avant qu'il reprenne forme.
      if (this.gone && state !== "boom") {
        return;
      }

      node.className = "slime";
      void node.offsetWidth;
      node.className = `slime slime--${state}`;
      this.mascotState = state;

      clearTimeout(this.settler);

      // Filet pour les passes uniques : un `animationend` perdu — page en arriere-plan,
      // machine chargee — laisserait la mascotte collee sur sa feuille.
      if (ONE_SHOT_MS[state]) {
        this.settler = setTimeout(() => {
          if (this.mascotState === state) {
            this.settle();
          }
        }, ONE_SHOT_MS[state] + 100);
      }
    },

    // Une passe unique rend la main au repos. Les boucles, elles, ne finissent jamais.
    settle() {
      this.mascotPlay(MASCOT_REST);
    },

    // La ligne porte son humeur : « mise en veille » doit endormir, pas faire cligner.
    // Sans humeur, un clin d'oeil, et seulement si la mascotte ne fait rien d'autre.
    say(text, mood) {
      this.bubble = text;

      if (mood) {
        this.emote(mood);
      } else if (this.mascotState === MASCOT_REST) {
        this.mascotPlay("wink");
      }

      clearTimeout(this.bubbleTimer);
      this.bubbleTimer = setTimeout(() => {
        this.bubble = "";
      }, 2600);
    },

    drop() {
      this.place(Math.random() * this.trackWidth());
      this.mascotPlay("jump");
    },

    emote(mood) {
      this.mascotPlay(MOOD_STATE[mood] ?? MASCOT_REST);
    },

    poke() {
      if (this.gone) {
        return;
      }

      this.clicks += 1;

      if (this.clicks >= BOOM_AT) {
        this.blowUp();

        return;
      }

      this.mascotPlay("wink");
    },

    // Le compte repart de zero : le slime peut exploser autant de fois qu'on veut.
    blowUp() {
      this.clicks = 0;
      this.gone = true;
      this.mascotPlay("boom");
      clearTimeout(this.reformer);
      this.reformer = setTimeout(
        () => {
          this.gone = false;
          this.mascotPlay("reform");
        },
        REFORM_MIN_MS + Math.random() * REFORM_SPREAD_MS,
      );
    },

    // La position est ecrite directement dans le style : la faire passer par l'etat
    // reactif ferait rerendre la page a chaque image.
    place(x) {
      this.at = Math.max(0, Math.min(this.trackWidth(), x));

      if (this.$refs.mascot) {
        this.$refs.mascot.style.left = `${this.at}px`;
      }
    },

    move(motion, hold) {
      this.motion = motion;
      clearTimeout(this.motionTimer);
      this.motionTimer = setTimeout(() => {
        this.motion = "";
      }, hold);
    },

    // Reaction seulement a proximite : un seuil large donnait un declenchement fantome,
    // curseur encore loin du slime.
    nearby(event) {
      if (this.dragging || !this.$refs.mascot || this.mascotState !== MASCOT_REST) {
        return;
      }

      const box = this.$refs.mascot.getBoundingClientRect(),
        distance = Math.hypot(
          event.clientX - (box.left + box.width / 2),
          event.clientY - (box.top + box.height / 2),
        );

      if (distance < 60) {
        this.mascotPlay("wink");
      }
    },

    trackWidth() {
      const { track } = this.$refs,
        sheet = 64;

      return track ? Math.max(0, track.clientWidth - sheet) : 0;
    },

    wander() {
      if (this.dragging || this.gone || !this.anim || this.reduced) {
        return;
      }

      const next = this.at + this.direction * 6;

      if (next <= 0 || next >= this.trackWidth()) {
        this.direction = -this.direction;
        this.move("bump", 500);
      }

      this.place(next);
    },

    // On garde le glisser. La deformation visqueuse, elle, appartenait au dessin en
    // ombres portees : pendant le glissement la mascotte joue son repos.
    grab(event) {
      if (this.gone) {
        return;
      }

      this.grabAt = event.clientX - this.$refs.mascot.getBoundingClientRect().left;
      this.dragging = true;
      this.settle();
      this.$refs.mascot.setPointerCapture(event.pointerId);
    },

    drag(event) {
      if (!this.dragging || !this.$refs.track) {
        return;
      }

      this.place(event.clientX - this.$refs.track.getBoundingClientRect().left - this.grabAt);
    },

    release() {
      if (!this.dragging) {
        return;
      }

      this.dragging = false;
      this.mascotPlay("jump");
    },

    get reduced() {
      return globalThis.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    },

    startMascot() {
      this.walker = setInterval(() => this.wander(), 2400);
      this.twitcher = setInterval(() => this.twitch(), TWITCH_MS);

      for (const event of ["pointermove", "keydown", "wheel"]) {
        globalThis.addEventListener(event, () => this.rouse(), { passive: true });
      }

      this.rouse();
    },

    // La veille a la priorite la plus basse : le moindre geste la repousse.
    rouse() {
      clearTimeout(this.sleeper);

      if (this.mascotState === "sleep") {
        this.settle();
      }

      this.sleeper = setTimeout(() => this.mascotPlay("sleep"), SLEEP_MS);
    },

    // La frappe se voit tant qu'on tape, puis la mascotte revient au repos.
    typing() {
      if (this.mascotState !== "type") {
        this.mascotPlay("type");
      }

      clearTimeout(this.typer_rest);
      // Rendre la main seulement si la frappe tient encore l'ecran : une commande a pu
      // demander autre chose entre-temps, « sleep » par exemple.
      this.typer_rest = setTimeout(() => {
        if (this.mascotState === "type") {
          this.settle();
        }
      }, TYPE_REST_MS);
    },

    // Un clin d'oeil ou un saut de temps en temps, jamais pendant autre chose.
    twitch() {
      if (this.mascotState !== MASCOT_REST || Math.random() >= TWITCH_ODDS) {
        return;
      }

      this.mascotPlay(Math.random() < 0.5 ? "wink" : "jump");
    },

    value(key) {
      return this[key];
    },

    flip(key) {
      this[key] = !this[key];
      this.persist();
    },

    setTheme(id, event) {
      const apply = () => {
        this.theme = id;
        this.persist();
        this.mascotPlay("morph");
      };

      // Le réglage « animations off » coupe aussi la transition de thème.
      if (!this.anim || typeof document.startViewTransition !== "function") {
        apply();

        return;
      }

      const origin = event?.clientX
        ? { x: event.clientX, y: event.clientY }
        : this.buttonCentre(event);

      document.documentElement.style.setProperty("--vt-x", `${origin.x}px`);
      document.documentElement.style.setProperty("--vt-y", `${origin.y}px`);
      document.startViewTransition(() => apply());
    },

    // Au clavier, la propagation part du centre du bouton et non d'un point à zéro.
    buttonCentre(event) {
      const box = event?.target?.getBoundingClientRect?.();

      return box ? { x: box.left + box.width / 2, y: box.top + box.height / 2 } : { x: 0, y: 0 };
    },

    themeButtons() {
      return [...document.querySelectorAll("[data-opts] [data-theme-choice]")];
    },

    toggleButtons() {
      return [...document.querySelectorAll("[data-opts] [data-toggle]")];
    },

    // Le reglage courant se lit sur l'element focalise. Le deduire d'un compteur le
    // desynchronisait des qu'on arrivait par tabulation ou a la souris : le focus
    // etait sur « animations » et la fleche droite modifiait « dense lines ».
    focused() {
      const active = document.activeElement,
        theme = this.themeButtons().indexOf(active);

      if (theme !== -1) {
        return { group: "theme", index: theme };
      }

      const toggle = this.toggleButtons().indexOf(active);

      return toggle !== -1 ? { group: "toggle", index: toggle } : undefined;
    },

    focusSetting() {
      const active = document.querySelector("[data-opts] [data-theme-choice][aria-pressed='true']");

      (active ?? this.themeButtons()[0])?.focus();
    },

    // Les themes sont sur plusieurs lignes : les quatre fleches doivent y naviguer.
    // Les boutons d'une meme ligne partagent leur position verticale.
    themeColumns() {
      const buttons = this.themeButtons(),
        top = buttons[0]?.offsetTop;

      return Math.max(1, buttons.filter((button) => button.offsetTop === top).length);
    },

    moveTheme(index) {
      const buttons = this.themeButtons(),
        target = buttons[Math.max(0, Math.min(buttons.length - 1, index))];

      if (!target) {
        return;
      }

      this.setTheme(target.dataset.themeChoice);
      this.$nextTick(() => target.focus());
    },

    optsKey(event) {
      if (event.key === "Escape") {
        event.preventDefault();
        this.closeOpts();

        return;
      }

      if (event.key === "Tab") {
        const focusable = [...document.querySelectorAll("[data-opts] [data-ctl='opt']")],
          at = focusable.indexOf(document.activeElement),
          next = (at + (event.shiftKey ? -1 : 1) + focusable.length) % focusable.length;

        event.preventDefault();
        focusable[next]?.focus();

        return;
      }

      const here = this.focused();

      if (!here || !["ArrowDown", "ArrowLeft", "ArrowRight", "ArrowUp"].includes(event.key)) {
        return;
      }

      event.preventDefault();

      if (here.group === "theme") {
        const columns = this.themeColumns(),
          step = { ArrowDown: columns, ArrowLeft: -1, ArrowRight: 1, ArrowUp: -columns }[event.key],
          next = here.index + step;

        // Sortir de la grille par le bas mene au premier reglage suivant.
        if (next >= this.themeButtons().length) {
          this.toggleButtons()[0]?.focus();
        } else {
          this.moveTheme(next);
        }

        return;
      }

      if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
        this.flip(TOGGLES[here.index].key);

        return;
      }

      const next = here.index + (event.key === "ArrowDown" ? 1 : -1);

      if (next < 0) {
        this.focusSetting();
      } else {
        this.toggleButtons()[next]?.focus();
      }
    },

    get themeLabel() {
      return THEMES.find((entry) => entry.id === this.theme)?.label ?? "";
    },

    restore() {
      let saved = {};

      try {
        saved = JSON.parse(globalThis.localStorage.getItem(OPTS_KEY) ?? "{}");

        for (const key of KEPT) {
          if (saved[key] !== undefined) {
            this[key] = saved[key];
          }
        }
      } catch {
        // Un stockage illisible ou refusé ne doit pas empêcher la page de démarrer.
      }

      if (saved?.theme === undefined) {
        this.theme = this.preferredTheme();
      }
    },

    // Première visite : la page suit la préférence du système. Sans préférence, elle
    // reste sombre, comme un terminal.
    preferredTheme() {
      return globalThis.matchMedia?.("(prefers-color-scheme: light)").matches ? "light" : "dark";
    },

    persist() {
      try {
        const saved = Object.fromEntries(KEPT.map((key) => [key, this[key]]));

        globalThis.localStorage.setItem(OPTS_KEY, JSON.stringify(saved));
      } catch {
        // Navigation privée ou stockage plein : le réglage vaut pour cette visite.
      }
    },

    openOpts() {
      this.optsOpen = true;
      this.$nextTick(() => this.focusSetting());
    },

    closeOpts() {
      this.optsOpen = false;
      this.$nextTick(() => document.querySelector("[data-ctl='opts']")?.focus());
    },
    fromHash() {
      const id = globalThis.location.hash.slice(1);

      this.goSection(this.all.some((entry) => entry.id === id) ? id : "whoami", false);
    },

    goSection(id, push = true) {
      if (!this.all.some((entry) => entry.id === id)) {
        return;
      }

      this.section = id;

      if (push && globalThis.location.hash !== `#${id}`) {
        globalThis.history.pushState({}, "", `#${id}`);
      }

      this.play(id);
      // Une section plus longue que la precedente ne doit pas heriter d'un journal trop
      // haut : le resultat serait coupe des l'ouverture.
      this.$nextTick(() => this.setLogHeight(this.logHeight));
    },

    get all() {
      return [...this.sections, ...this.details];
    },

    // Première visite : la commande se tape, puis s'exécute. Retour sur une section
    // déjà vue : immédiat, sans quoi l'effet devient une attente.
    play(id) {
      const target = this.current.cmd;

      clearInterval(this.typer);
      clearTimeout(this.latency);

      if (this.seen.includes(id)) {
        this.typed = target;
        this.running = false;
        // « load » boucle sans fin : couper le minuteur de la commande sans rendre la
        // main y laisserait la mascotte pour toujours.
        this.settle();

        return;
      }

      // L'ecran de demarrage couvre la mascotte : tirer sa feuille d'attente a ce
      // moment-la chargerait deux feuilles au premier rendu au lieu d'une.
      if (!this.booting) {
        this.mascotPlay("load");
      }

      this.bump(this.weigh(this.current));
      this.seen = [...this.seen, id];

      if (this.current.suggest) {
        this.input = this.current.suggest;
      }

      this.typed = "";
      this.running = true;

      let typedCount = 0;

      this.typer = setInterval(() => {
        typedCount += 1;
        this.typed = target.slice(0, typedCount);

        if (typedCount < target.length) {
          return;
        }

        clearInterval(this.typer);
        this.latency = setTimeout(() => {
          this.running = false;
          this.settle();
        }, EXEC_MS);
      }, 1000 / TYPE_CPS);
    },

    submit() {
      const raw = this.input;

      if (!raw.trim()) {
        return;
      }

      const { effects, lines } = interpret(raw, {
        columns: Math.floor((this.$refs.cli?.clientWidth ?? 400) / CHAR_PX),
        current: this.current,
        details: this.details,
        feedback: this.feedback,
        jokeIndex: this.jokeIndex,
        jokes: this.jokes,
        pending: this.pending,
        sections: this.sections,
        share: this.share,
      });

      this.input = "";
      this.closeSugg();
      this.commands = [raw, ...this.commands.filter((entry) => entry !== raw)];
      this.recallAt = -1;
      this.journal = [...this.journal, ...lines];
      this.$nextTick(() => {
        if (this.$refs.journal) {
          this.$refs.journal.scrollTop = this.$refs.journal.scrollHeight;
        }
        this.checkMore("journal");
      });
      this.bump(printed(lines));
      this.apply(effects);
    },

    // Marquage silencieux : Umami absent, bloqué ou en erreur ne casse rien et
    // n'écrit rien en console.
    track(event, props) {
      try {
        globalThis.umami?.track?.(event, props);
      } catch {
        // Un bloqueur a mange le script : ce n'est pas une panne du portfolio.
      }
    },

    async nativeShare() {
      if (!globalThis.navigator?.share) {
        return;
      }

      try {
        await globalThis.navigator.share({
          text: this.share.text,
          title: this.share.title,
          url: this.share.url,
        });
      } catch {
        // Le visiteur a ferme le menu de partage : ce n'est pas une panne.
      }
    },

    // L'URL est ouverte telle qu'elle a ete construite. La decoder annulerait
    // l'encodage des jetons et pourrait lever une exception sur une sequence
    // pourcent invalide.
    shareTo(effect) {
      if (effect.kind === "copy") {
        this.copy(this.share.url ?? "");

        return;
      }

      globalThis.open(effect.url, "_blank", "noopener");
    },

    async copy(text) {
      try {
        await globalThis.navigator?.clipboard?.writeText?.(text);
      } catch {
        this.journal = [
          ...this.journal,
          { c: "warn", m: "✗", mc: "warn", t: `copie refusée — ${text}` },
        ];

        return;
      }

      this.say("copié");
    },

    // Trois chemins dans l'ordre : marquage Umami, puis POST, puis mailto.
    async send(text) {
      this.pending = undefined;

      const feedback = this.feedback ?? {};

      if (globalThis.umami?.track) {
        this.track(feedback.event ?? "proposition", { message: text });
        this.journal = [
          ...this.journal,
          { c: "ok", m: "✓", mc: "ok", t: "proposition envoyée. merci." },
        ];

        return;
      }

      try {
        const response = await fetch(`${feedback.umamiHost}/api/send`, {
          body: JSON.stringify({
            payload: { data: { message: text }, name: feedback.event, website: feedback.websiteId },
            type: "event",
          }),
          headers: { "content-type": "application/json" },
          method: "POST",
        });

        if (!response.ok) {
          throw new Error(String(response.status));
        }

        this.journal = [
          ...this.journal,
          { c: "ok", m: "✓", mc: "ok", t: "proposition envoyée. merci." },
        ];
      } catch {
        globalThis.open(
          `mailto:${feedback.fallbackEmail}?subject=Proposition&body=${encodeURIComponent(text)}`,
        );
        this.journal = [
          ...this.journal,
          {
            c: "fg2",
            m: "·",
            mc: "fg2",
            t: "envoi direct impossible — votre client de courrier prend le relais.",
          },
        ];
      }
    },

    // La coquille applique ce que l'interpréteur décrit. Les effets des tickets à
    // venir sont ignorés ici plutôt que simulés.
    apply(effects) {
      for (const effect of effects) {
        if (effect.type === "track") {
          this.track(effect.event, effect.props);
        } else if (effect.type === "pending") {
          this.pending = effect.payload;
          this.input = effect.answer ?? "";
        } else if (effect.type === "send") {
          this.send(effect.payload);
        } else if (effect.type === "share") {
          this.shareTo(effect);
        } else if (effect.type === "shareMenu") {
          this.nativeShare();
        } else if (effect.type === "email" || effect.type === "copy") {
          this.copy(this.profileEmail);
        } else if (effect.type === "sendMail") {
          globalThis.open(`mailto:${encodeURIComponent(this.profileEmail)}`);
        } else if (effect.type === "cv") {
          this.goSection("whoami");
        } else if (effect.type === "say") {
          this.say(effect.text, effect.mood);
        } else if (effect.type === "emote") {
          this.emote(effect.mood);
        } else if (effect.type === "drop") {
          this.drop();
        } else if (effect.type === "navigate") {
          this.goSection(effect.id);
        } else if (effect.type === "clear") {
          this.journal = [];
        } else if (effect.type === "replay") {
          this.journal = [];
        } else if (effect.type === "state") {
          Object.assign(this, effect.patch);
        } else if (effect.type === "power") {
          this.powerDown(effect.mode);
        } else if (effect.type === "matrix") {
          this.emote("scared", 3200);
        }
      }
    },

    suggest() {
      const result = candidates(this.input, {
        details: this.details,
        sections: this.sections,
        shareTargets: this.shareTargets,
      });

      this.sugg = result.hits;
      this.suggFrag = result.frag;
      this.suggHead = result.head;
      this.suggSlash = result.slash;
      this.suggAt = 0;
      this.suggOpen = result.hits.length > 0 && this.input !== "";
    },

    // La fermeture reste déterministe : la liste se vide, sans compteur de génération
    // qui pourrait annuler le vidage au lieu de le protéger.
    closeSugg() {
      this.suggOpen = false;
      this.sugg = [];
      this.suggAt = 0;
    },

    rebuild(word) {
      const prefix = this.suggSlash ? "/" : "";

      return this.suggHead ? `${prefix}${this.suggHead} ${word}` : `${prefix}${word}`;
    },

    applySugg(index) {
      this.input = `${this.rebuild(this.sugg[index])} `;
      this.closeSugg();
      this.$refs.cli.focus();
    },

    complete() {
      if (this.sugg.length === 0) {
        return;
      }

      // Une proposition choisie a la fleche doit s'appliquer telle quelle : c'est
      // pour cela qu'on l'a choisie.
      if (this.sugg.length === 1 || this.suggAt > 0) {
        this.applySugg(this.suggAt);

        return;
      }

      const shared = commonPrefix(this.sugg);

      if (shared.length > this.suggFrag.length) {
        this.input = this.rebuild(shared);
      }

      this.suggOpen = true;
    },

    up() {
      if (this.suggOpen) {
        this.suggAt = (this.suggAt - 1 + this.sugg.length) % this.sugg.length;
      } else {
        this.recall(-1);
      }
    },

    down() {
      if (this.suggOpen) {
        this.suggAt = (this.suggAt + 1) % this.sugg.length;
      } else {
        this.recall(1);
      }
    },

    // La fleche droite valide la proposition choisie, comme la tabulation. Curseur
    // deja en fin de ligne, elle n'a rien d'autre a faire.
    right(event) {
      if (!this.suggOpen) {
        return;
      }

      event.preventDefault();
      this.complete();
    },

    onEscape() {
      if (this.suggOpen) {
        this.closeSugg();
      } else {
        this.input = "";
      }
    },

    // La première flèche haut rappelle la commande de la section, puis l'historique.
    // La commande de section n'arrive en tete que tant que rien n'a ete tape : c'est
    // « la premiere fois dans une section » du journal de conception, pas toujours.
    recall(step) {
      const pool =
          this.commands.length > 0 ? [...this.commands, this.current.cmd] : [this.current.cmd],
        next = Math.min(pool.length - 1, Math.max(-1, this.recallAt - step));

      this.recallAt = next;
      this.input = next < 0 ? "" : pool[next];
    },

    // Distant d'abord, local ensuite. Le repli n'est pas un luxe : la page dependrait
    // sinon de la disponibilite de GitHub pour afficher quoi que ce soit.
    async fetchContent() {
      const response = await fetch(CONTENT_URL);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      return response.json();
    },

    async load() {
      this.dataErr = false;
      const started = performance.now();

      try {
        const content = await this.fetchContent();

        if (!Array.isArray(content.sections) || content.sections.length === 0) {
          throw new Error("sections manquantes ou vides");
        }

        this.sections = content.sections.map(section);
        this.details = (content.details ?? []).map(section);
        this.jokes = content.jokes ?? [];
        this.share = content.share ?? {};
        this.feedback = content.feedback ?? {};
        this.profileEmail = content.profile?.email ?? "";
        this.shareTargets = (content.share?.targets ?? []).map((entry) => entry.id);
        this.timeline = content.timeline ?? [];
        this.stack = content.stack ?? [];
        this.techNotes = content.techNotes ?? {};
        this.missions = (content.missions ?? []).map((raw) => ({
          dot: safeTone(raw.dot, "ok"),
          id: raw.id,
          label: raw.label,
          state: raw.state ?? "",
        }));
      } catch (error) {
        // Le boot reste affiché : la page ne se rabat jamais sur un contenu figé.
        this.errDetail = `caused by: ${error.message}`;
        this.dataErr = true;

        return;
      }

      this.fromHash();

      const waited = performance.now() - started;

      setTimeout(
        () => {
          clearInterval(this.ticker);
          this.power = "fade";
          setTimeout(() => {
            this.power = "on";
          }, FADE_MS);
        },
        Math.max(0, BOOT_MS - waited),
      );
    },
  }));
});
