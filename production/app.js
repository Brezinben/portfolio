import { candidates, commonPrefix, contentLine, interpret, safeTone } from "./interpret.js";

// Valeurs figées après itération dans le canvas. Ne pas les transformer en réglages :
// voir DECISIONS.md, section 23.
const BOOT_MS = 2000;
const FADE_MS = 620;
const PANES = ["nav", "main", "out"];
const OPTS_KEY = "bd-term-opts";
// Six clés, et six seulement. La lecture filtre dessus : le canvas injectait dans
// l'état tout ce que le stockage contenait.
const KEPT = ["anim", "crowned", "logH", "out", "theme"];

const THEMES = [
  { acc: "#F5B83B", bg: "#242538", edge: "#33344a", id: "dark", label: "ambra" },
  { acc: "#e6a000", bg: "#fff6f6", edge: "#ded2d2", id: "light", label: "solis" },
  { acc: "#49e9a6", bg: "#052c33", edge: "#0d4148", id: "noctis", label: "noctis" },
  { acc: "#49ace9", bg: "#07273b", edge: "#0f3b52", id: "azureus", label: "azureus" },
  { acc: "#a29bfe", bg: "#211d40", edge: "#332d5c", id: "uva", label: "uva" },
  { acc: "#e0728c", bg: "#2d1b26", edge: "#452a39", id: "bordo", label: "bordo" },
  { acc: "#0f7d8c", bg: "#fdf6e7", edge: "#ddd2ba", id: "lux", label: "lux" },
  { acc: "#00707f", bg: "#f7fbfc", edge: "#cfdde1", id: "hibernus", label: "hibernus" },
];

// Les valeurs d'etat restent en anglais : c'est la langue d'un terminal.
const TOGGLES = [
  { key: "anim", label: "animations", off: "off", on: "on" },
  { key: "out", label: "output pane", off: "off", on: "on" },
];

const TYPE_CPS = 52;
const EXEC_MS = 20;
const CTX_MAX = 20;
const CTX_CELLS = 10;
// Largeur approximative d'un caractere de JetBrains Mono a 14 px.
const CHAR_PX = 8.4;

// Le contenu vit sur GitHub : le modifier ne demande plus d'acces au serveur. Si
// GitHub est injoignable ou bloque, la copie servie a cote de la page prend le
// relais, et l'ecran de panique ne s'affiche que si les deux echouent.
const REMOTE_CONTENT =
  "https://raw.githubusercontent.com/Brezinben/portfolio/main/production/content.json";
const LOCAL_CONTENT = "content.json";
const REMOTE_TIMEOUT_MS = 2500;

const TONE = {
  acc: "var(--acc)",
  fg: "var(--fg)",
  fg2: "var(--fg2)",
  ok: "var(--ok)",
  warn: "var(--warn)",
};

const GLYPHS = {
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
};

const dots = (word) => {
  const rows = ["", "", "", "", "", "", "", ""];

  for (const character of word.toUpperCase()) {
    const glyph = GLYPHS[character] ?? GLYPHS[" "];

    for (let row = 0; row < 8; row += 1) {
      rows[row] += glyph[row] + (character === " " ? "" : " ");
    }
  }

  return rows.slice(0, 7);
};

// Le bandeau est dessiné en box-shadow, comme la mascotte : aucune image, aucun
// caractère. Valeurs figées du canvas : pixel de 5 px, point de 4 px.
const BANNER_PX = 5;

const pixels = (rows, colour) => {
  const shadows = [];

  rows.forEach((row, y) => {
    [...row].forEach((character, x) => {
      if (character === "\u2588") {
        shadows.push(`${x * BANNER_PX}px ${y * BANNER_PX}px 0 ${colour}`);
      }
    });
  });

  return shadows.join(",");
};

const banner = (shaped) => {
  const rows = dots(shaped.banner);

  return {
    height: `${rows.length * BANNER_PX}px`,
    label: shaped.text,
    shadow: pixels(rows, TONE.acc),
    size: `${BANNER_PX - 1}px`,
    width: `${Math.max(...rows.map((row) => row.length)) * BANNER_PX}px`,
  };
};

const line = (raw) => {
  const shaped = contentLine(raw);

  return shaped.banner ? { ...shaped, banner: banner(shaped) } : shaped;
};

const outPane = (out) => ({
  lines: (out?.lines ?? []).map((row) => ({
    k: row[0],
    kc: safeTone(row[2], "fg2"),
    v: row[1],
    vc: safeTone(row[3]),
  })),
  title: out?.title ?? "",
});

const section = (raw) => ({
  cmd: raw.cmd ?? "",
  dot: safeTone(raw.dot, "ok"),
  id: raw.id,
  label: raw.label,
  lines: (raw.lines ?? []).map(line),
  out: outPane(raw.out),
  sub: raw.sub ?? "",
  suggest: raw.suggest ?? "",
  view: raw.view ?? "pairs",
});

// Sprite valide apres iteration : ne pas le redessiner. Deux tentatives de refonte
// ont ete annulees (DECISIONS.md, section 10).
const MASCOT = [
  "........bbbbbbbb........",
  "......bbbbbbbbbbbb......",
  ".....bbbbbbbbbbbbbb.....",
  "....bbhbbbbbbbbbbbbb....",
  "...bbhbbbbbbbbbbbbbbb...",
  "...bhbbbbbbbbbbbbbbbb...",
  "..bbbbbbbbbbbbbbbbbbbb..",
  "..bbbbbeebbbbbbeebbbbb..",
  "..bbbbbeebbbbbbeebbbbb..",
  ".bbbbbbbbbbbbbbbbbbbbbb.",
  ".bbbbbbbbbmbbmbbbbbbbbb.",
  ".bbbbbbbbbbmmbbbbbbbbbb.",
  "bbbbbbbbbbbbbbbbbbbbbbbb",
  "bbbbbbbbbbbbbbbbbbbbbbbb",
  "bbbbbbbbbbbbbbbbbbbbbbbb",
  "bbbbbbbbbbbbbbbbbbbbbbbb",
  ".ssssssssssssssssssssss.",
  "..ssssssssssssssssssss..",
];

// Couleurs fixes dans les huit themes : demande explicite.
const MASCOT_COLORS = { b: "#F5B83B", e: "#242538", h: "#FFD98A", m: "#242538", s: "#C98F1E" };

const CROWN = [
  "..........jjjj..........",
  "....r.....jjjj.....r....",
  "...rrr...gjjjjg...rrr...",
  "....r..ggggggggg..r.....",
  "....gggggggggggggggg....",
  "....gggggggggggggggg....",
  "....GGGGGGGGGGGGGGGG....",
];

const CROWN_COLORS = { G: "#C8921A", g: "#F2C230", j: "#2F7FE0", r: "#D8322B" };
const CROWN_AT = new Date().getFullYear() - 2000;
const MASCOT_PX = 2.6;

const FACES = {
  alert: [
    "..bbbbbbbbbbbbbbbbbbbb..",
    "..bbbbeeeebbbbeeeebbbb..",
    "..bbbbeeeebbbbeeeebbbb..",
    ".bbbbbbbbbbbbbbbbbbbbbb.",
    ".bbbbbbbbbmmmmbbbbbbbbb.",
    ".bbbbbbbbbmmmmbbbbbbbbb.",
  ],
  happy: [
    "..bbbbbbbbbbbbbbbbbbbb..",
    "..bbbbbmbbbbbbmbbbbbbb..",
    "..bbbbmbmbbbbmbmbbbbbb..",
    ".bbbbbbbbbbbbbbbbbbbbbb.",
    ".bbbbbbbbmbbbbmbbbbbbbb.",
    ".bbbbbbbbbmmmmbbbbbbbbb.",
  ],
  idle: [
    "..bbbbbbbbbbbbbbbbbbbb..",
    "..bbbbbeebbbbbbeebbbbb..",
    "..bbbbbeebbbbbbeebbbbb..",
    ".bbbbbbbbbbbbbbbbbbbbbb.",
    ".bbbbbbbbbmbbmbbbbbbbbb.",
    ".bbbbbbbbbbmmbbbbbbbbbb.",
  ],
  laugh: [
    "..bbbbbbbbbbbbbbbbbbbb..",
    "..bbbbmmmbbbbmmmbbbbbb..",
    "..bbbbbbbbbbbbbbbbbbbb..",
    ".bbbbbbbmmmmmmmmbbbbbbb.",
    ".bbbbbbmmmmmmmmmmbbbbbb.",
    ".bbbbbbbmmmmmmmmbbbbbbb.",
  ],
  sad: [
    "..bbmmbbbbbbbbbbbbmmbb..",
    "..bbbmmbbbbbbbbmmbbbbb..",
    "..bbbbbeebbbbbbeebbbbb..",
    ".bbbbbbbbbbbbbbbbbbbbbb.",
    ".bbbbbbbbbbmmbbbbbbbbbb.",
    ".bbbbbbbbbmbbmbbbbbbbbb.",
  ],
  scared: [
    "..bbbbbbbbbbbbbbbbbbbb..",
    "..bbbbeeeebbbbeeeebbbb..",
    "..bbbbeeeebbbbeeeebbbb..",
    ".bbbbbbbbbbbbbbbbbbbbbb.",
    ".bbbbbbbbbbmmbbbbbbbbbb.",
    ".bbbbbbbbbbmmbbbbbbbbbb.",
  ],
  sleep: [
    "..bbbbbbbbbbbbbbbbbbbb..",
    "..bbbbbbbbbbbbbbbbbbbb..",
    "..bbbbmmmmbbbbmmmmbbbb..",
    ".bbbbbbbbbbbbbbbbbbbbbb.",
    ".bbbbbbbbbbmmbbbbbbbbbb.",
    ".bbbbbbbbbbbbbbbbbbbbbb.",
  ],
};

const MOOD_LABELS = {
  alert: "surpris",
  happy: "content",
  idle: "au repos",
  laugh: "hilare",
  sad: "triste",
  scared: "apeuré",
  sleep: "endormi",
};

const sprite = (rows, colors, px) => {
  const shadows = [];

  rows.forEach((row, y) => {
    [...row].forEach((character, x) => {
      const colour = colors[character];

      if (colour) {
        shadows.push(`${(x * px).toFixed(2)}px ${(y * px).toFixed(2)}px 0 ${colour}`);
      }
    });
  });

  return shadows.join(",");
};

const faceKey = (mood, blink) => {
  // Les yeux fermes empruntent le visage endormi, sauf quand la mascotte dort deja.
  if (blink && mood !== "sleep") {
    return "sleep";
  }

  return FACES[mood] ? mood : "idle";
};

const face = (mood, blink) => {
  const rows = FACES[faceKey(mood, blink)];

  return MASCOT.map((row, y) => (y >= 6 && y <= 11 ? rows[y - 6] : row));
};

const EMPTY = { cmd: "", lines: [], out: { lines: [], title: "" }, suggest: "", view: "pairs" };

document.addEventListener("alpine:init", () => {
  // Les proprietes sont triees, les methodes suivent un ordre de lecture : chargement,
  // navigation, clavier, options, mascotte, commandes. Les trier alphabetiquement
  // disperserait chaque sujet aux quatre coins du fichier pour un gain nul.
  // eslint-disable-next-line sort-keys
  Alpine.data("terminal", () => ({
    MASCOT_PX,
    THEMES,
    TOGGLES,
    anim: true,
    at: 0,
    blink: false,
    bubble: "",
    clicks: 0,
    commands: [],
    compacting: false,
    contentSource: "remote",
    crowned: false,
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
    mood: "idle",
    more: { journal: false },
    motion: "",
    ops: 0,
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
      const ids = this.sections.map((entry) => entry.id);
      const next = ids.indexOf(this.section) + step;

      if (next >= 0 && next < ids.length) {
        this.goSection(ids[next]);
      }
    },

    // Une grille se parcourt aux quatre fleches. Les boutons d'une meme ligne
    // partagent leur position verticale : c'est ce qui donne le nombre de colonnes.
    gridMove(selector, key) {
      const cells = [...document.querySelectorAll(selector)];
      const at = cells.indexOf(document.activeElement);

      if (at === -1) {
        return false;
      }

      const top = cells[0].offsetTop;
      const columns = Math.max(1, cells.filter((cell) => cell.offsetTop === top).length);
      const step = { ArrowDown: columns, ArrowLeft: -1, ArrowRight: 1, ArrowUp: -columns }[key];

      if (step === undefined) {
        return false;
      }

      cells[Math.max(0, Math.min(cells.length - 1, at + step))]?.focus();

      return true;
    },

    // Dans une liste a une colonne, la fleche droite valide et descend vers le volet
    // suivant : c'est ce qu'un terminal fait.
    listMove(selector, key, activate) {
      const items = [...document.querySelectorAll(selector)];
      const at = items.indexOf(document.activeElement);

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

    openTimeline(index) {
      this.timelineAt = index;

      const target = this.timeline[index]?.detail;

      if (target) {
        this.goSection(target);
      }
    },

    // La jauge monte a chaque commande et a chaque changement de section. Pleine,
    // elle "compacte" avec un resume ironique, puis repart a zero.
    get ctxCells() {
      return Math.min(CTX_CELLS, Math.round((this.ops / CTX_MAX) * CTX_CELLS));
    },

    // Le journal se redimensionne au glisser, entre 44 px et la place disponible, et
    // sa hauteur est conservée sur l'appareil.
    // logH vaut 0 tant que rien n'a ete regle : la hauteur effective doit donc
    // toujours passer par ce getter, sinon un reglage part de zero.
    get logHeight() {
      return this.logH || 120;
    },

    setLogHeight(next) {
      const room = this.$refs.journal?.parentElement?.clientHeight ?? 400;

      this.logH = Math.max(44, Math.min(Math.round(next), Math.max(44, room - 160)));
      this.persist();
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

    bump() {
      this.ops += 1;

      if (this.ops < CTX_MAX) {
        return;
      }

      this.compacting = true;
      this.journal = [
        ...this.journal,
        {
          c: "warn",
          m: "·",
          mc: "warn",
          t: "fenêtre de contexte pleine — compaction automatique…",
        },
        {
          c: "fg2",
          m: "·",
          mc: "fg2",
          t: "retenu : Benjamin, développeur IA, Nantes, aime le vélo.",
        },
      ];
      this.ops = 0;
      setTimeout(() => {
        this.compacting = false;
      }, 1200);
    },

    // Extinction facon CRT, puis la sequence de boot complete.
    powerDown(mode) {
      this.power = "off";
      setTimeout(
        () => {
          this.journal = [];
          this.seen = [];
          this.ops = 0;
          this.power = "boot";
          this.load();
        },
        mode === "shutdown" ? 2200 : 900,
      );
    },

    get outStatus() {
      return this.running ? "waiting" : "live";
    },

    get mascotShadow() {
      return sprite(face(this.mood, this.blink), MASCOT_COLORS, MASCOT_PX);
    },

    get crownShadow() {
      return sprite(CROWN, CROWN_COLORS, MASCOT_PX);
    },

    get mascotLabel() {
      return `Mascotte ${MOOD_LABELS[this.mood] ?? "au repos"}${this.crowned ? ", couronnée" : ""}`;
    },

    say(text, mood) {
      this.bubble = text;
      this.emote(mood ?? "happy", 2600);
      clearTimeout(this.bubbleTimer);
      this.bubbleTimer = setTimeout(() => {
        this.bubble = "";
      }, 2600);
    },

    drop() {
      this.emote("alert", 1300);
      this.place(Math.random() * this.trackWidth());
      this.move("drop", 1100);
    },

    emote(mood, hold = 3200) {
      this.mood = mood;
      clearTimeout(this.moodTimer);
      this.moodTimer = setTimeout(() => {
        this.mood = "idle";
      }, hold);
    },

    // La couronne tombe apres l'annee courante moins 2000 clics, et reste sur
    // l'appareil.
    poke() {
      this.clicks += 1;
      this.emote(this.clicks >= CROWN_AT ? "laugh" : "happy", 1400);

      if (this.clicks >= CROWN_AT && !this.crowned) {
        this.crowned = true;
        this.persist();
      }
    },

    // La position est ecrite directement dans le style : la faire passer par l'etat
    // reactif ferait rerendre la page a chaque image.
    place(x) {
      this.at = Math.max(0, Math.min(this.trackWidth(), x));

      // La position passe par `left` et non par `transform` : les keyframes du canvas
      // pilotent `transform` pour l'écrasement et le saut, et se battraient avec elle.
      if (this.$refs.mascot) {
        this.$refs.mascot.style.left = `${this.at}px`;
      }
    },

    // Les animations viennent des keyframes du canvas, déjà dans la feuille de style.
    get mascotAnim() {
      if (!this.anim || this.reduced) {
        return "none";
      }

      // Tant qu'on la tient, elle ondule : c'est un objet visqueux. La couronne, elle,
      // est solide et garde sa forme.
      if (this.dragging) {
        return "wobble .6s ease-in-out infinite";
      }

      return (
        {
          bump: `${this.direction > 0 ? "bumpR" : "bumpL"} .5s ease both`,
          drop: "splat 1.1s both",
          grab: "startle .4s ease both",
          near: "wiggle .5s ease both",
        }[this.motion] ?? "bob 3.4s ease-in-out infinite"
      );
    },

    move(motion, hold) {
      this.motion = motion;
      clearTimeout(this.motionTimer);
      this.motionTimer = setTimeout(() => {
        this.motion = "";
      }, hold);
    },

    // Réaction élastique seulement à proximité : un seuil large donnait un
    // déclenchement fantôme, curseur encore loin du slime.
    nearby(event) {
      if (this.dragging || !this.$refs.mascot || this.motion !== "") {
        return;
      }

      const box = this.$refs.mascot.getBoundingClientRect();
      const distance = Math.hypot(
        event.clientX - (box.left + box.width / 2),
        event.clientY - (box.top + box.height / 2),
      );

      if (distance < 60) {
        this.move("near", 500);
      }
    },

    trackWidth() {
      const { track } = this.$refs;
      const sprite_width = 63;

      return track ? Math.max(0, track.clientWidth - sprite_width) : 0;
    },

    wander() {
      if (this.dragging || !this.anim || this.reduced) {
        return;
      }

      const next = this.at + this.direction * 6;

      if (next <= 0 || next >= this.trackWidth()) {
        this.direction = -this.direction;
        this.emote("alert", 700);
        this.move("bump", 500);
      }

      this.place(next);
    },

    grab(event) {
      const box = this.$refs.mascot.getBoundingClientRect();

      this.grabAt = event.clientX - box.left;
      this.dragging = true;
      this.emote("scared", 900);
      this.move("grab", 400);
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
      this.emote("happy", 900);
    },

    get reduced() {
      return globalThis.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    },

    startMascot() {
      this.blinker = setInterval(
        () => {
          this.blink = true;
          setTimeout(() => {
            this.blink = false;
          }, 140);
        },
        2600 + Math.random() * 3200,
      );
      this.walker = setInterval(() => this.wander(), 2400);
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
      const active = document.activeElement;
      const theme = this.themeButtons().indexOf(active);

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
      const buttons = this.themeButtons();
      const top = buttons[0]?.offsetTop;

      return Math.max(1, buttons.filter((button) => button.offsetTop === top).length);
    },

    moveTheme(index) {
      const buttons = this.themeButtons();
      const target = buttons[Math.max(0, Math.min(buttons.length - 1, index))];

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
        const focusable = [...document.querySelectorAll("[data-opts] [data-ctl='opt']")];
        const at = focusable.indexOf(document.activeElement);
        const next = (at + (event.shiftKey ? -1 : 1) + focusable.length) % focusable.length;

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
        const columns = this.themeColumns();
        const step = { ArrowDown: columns, ArrowLeft: -1, ArrowRight: 1, ArrowUp: -columns }[
          event.key
        ];
        const next = here.index + step;

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
      try {
        const saved = JSON.parse(globalThis.localStorage.getItem(OPTS_KEY) ?? "{}");

        for (const key of KEPT) {
          if (saved[key] !== undefined) {
            this[key] = saved[key];
          }
        }
      } catch {
        // Un stockage illisible ou refusé ne doit pas empêcher la page de démarrer.
      }
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

        return;
      }

      this.bump();
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
      this.bump();
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

      this.say("copié", "happy");
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
        this.commands.length > 0 ? [...this.commands, this.current.cmd] : [this.current.cmd];
      const next = Math.min(pool.length - 1, Math.max(-1, this.recallAt - step));

      this.recallAt = next;
      this.input = next < 0 ? "" : pool[next];
    },

    // Distant d'abord, local ensuite. Le repli n'est pas un luxe : la page dependrait
    // sinon de la disponibilite de GitHub pour afficher quoi que ce soit.
    async fetchOne(url, signal) {
      const response = await fetch(url, { signal });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      return response.json();
    },

    async fetchContent() {
      const abort = new AbortController();
      const timer = setTimeout(() => abort.abort(), REMOTE_TIMEOUT_MS);

      try {
        return await this.fetchOne(REMOTE_CONTENT, abort.signal);
      } catch {
        this.contentSource = "local";

        return this.fetchOne(LOCAL_CONTENT);
      } finally {
        clearTimeout(timer);
      }
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
