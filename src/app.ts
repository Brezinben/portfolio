import {
  type ContentLine,
  type Effect,
  type Expression,
  type Line,
  type Tone,
  type TrackValue,
  candidates,
  commonPrefix,
  contentLine,
  hintFor,
  interpret,
  safeTone,
} from "./interpret.ts";

// Le bandeau que la coquille calcule : l'interpreteur ne rend qu'un mot a dessiner, le
// balisage a besoin d'une geometrie et d'une ombre.
interface Banner {
  height: string;
  label: string;
  shadow: string;
  size: string;
  width: string;
}

// Ce que la coquille rend au balisage. Trois formes, comme en sortie de l'interpreteur,
// mais le bandeau y est un objet.
// « ShapedLine » et « shaped » viennent de « Ligne mise en forme », terme arrete par
// CONTEXT.md. Le glossaire du projet prime sur une regle qui bannit « shape » partout.
/* eslint-disable anti-slop/no-shape-in-symbol-names */
type ShapedLine =
  | { banner: Banner; text: string; tone: Tone }
  | { pad: string; tokens: { c: Tone; t: string; w: string }[] }
  | {
      letterSpacing: string;
      marker: string;
      markerTone: Tone;
      pad: string;
      size: string;
      text: string;
      tone: Tone;
      weight: string;
    };
/* eslint-enable anti-slop/no-shape-in-symbol-names */

// Tout ce dont on sait mesurer la longueur imprimee : une ligne de journal, une ligne de
// contenu, ou une ligne deja mise en forme.
interface Printable {
  t?: string;
  text?: string;
  tokens?: { t: string }[];
}

// Le volet de sortie d'une section : un titre et des paires cle/valeur colorees.
interface RawOut {
  lines?: (number | string)[][];
  title?: string;
}

// Une section ou une fiche de mission, telle que content.json l'ecrit.
interface RawSection {
  ask?: string;
  cmd?: string;
  detail?: string | null;
  dot?: string;
  id: string;
  label: string;
  lines?: ContentLine[];
  out?: RawOut;
  parent?: string;
  state?: string;
  sub?: string;
  suggest?: string;
  view?: string;
}

// Une section une fois mise en forme par la coquille : c'est ce que le balisage lit.
type Section = ReturnType<typeof section>;

// Une mission du volet gauche : sa pastille et son etat.
interface Mission {
  dot: Tone;
  id: string;
  label: string;
  state: string;
}

// Une entree de la frise.
interface Step {
  detail?: string | null;
  id: string;
  note: string;
  org: string;
  role: string;
  years: string;
}

// Un domaine de la stack et ses briques.
interface Brick {
  id: string;
  kids: string[];
  label: string;
  note?: string;
}

// La fiche attachee a une techno : ou, quoi, pourquoi.
interface TechNote {
  note: string;
  what?: string;
  where: string;
  why?: string;
}

// Le partage, tel que content.json le decrit.
interface Share {
  targets?: { id: string; kind: string; label: string; url: string }[];
  text?: string;
  title?: string;
  url?: string;
}

// Valeurs figées après itération dans le canvas. Ne pas les transformer en réglages :
// voir design/DECISIONS.md, section 23.
const BOOT_MS = 2000,
  FADE_MS = 620,
  PANES = ["nav", "main", "out"],
  VERTICAL = new Set(["ArrowDown", "ArrowUp"]),
  OPTS_KEY = "bd-term-opts",
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
  TOGGLES: { key: ToggleKey; label: string; off: string; on: string }[] = [
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
  barParts = (done: number, total: number, tick?: number) => {
    const posees = Math.max(0, Math.min(total, Math.floor(done))),
      tete = tick === undefined || posees >= total ? "" : SPINNER[tick % SPINNER.length];

    return {
      filled: FILLED.repeat(posees) + tete,
      hollow: HOLLOW.repeat(total - posees - (tete?.length ?? 0)),
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
  dots = (word: string) => {
    const rows = ["", "", "", "", "", "", "", ""];

    for (const character of word.toUpperCase()) {
      const glyph = lookup(GLYPHS, character) ?? lookup(GLYPHS, " ") ?? [];

      for (let row = 0; row < 8; row += 1) {
        rows[row] += glyph[row] + (character === " " ? "" : " ");
      }
    }

    return rows.slice(0, 7);
  },
  // Le bandeau est dessiné en box-shadow, comme la mascotte : aucune image, aucun
  // caractère. Valeurs figées du canvas : pixel de 5 px, point de 4 px.
  BANNER_PX = 5,
  pixels = (rows: string[], colour: string) => {
    const shadows: string[] = [];

    rows.forEach((row, y) => {
      [...row].forEach((character, x) => {
        if (character === "\u2588") {
          shadows.push(`${x * BANNER_PX}px ${y * BANNER_PX}px 0 ${colour}`);
        }
      });
    });

    return shadows.join(",");
  },
  /* eslint-disable anti-slop/no-shape-in-symbol-names -- terme du glossaire, voir ShapedLine */
  banner = (shaped: { banner: string; text: string }): Banner => {
    const rows = dots(shaped.banner);

    return {
      height: `${rows.length * BANNER_PX}px`,
      label: shaped.text,
      shadow: pixels(rows, TONE.acc),
      size: `${BANNER_PX - 1}px`,
      width: `${Math.max(...rows.map((row) => row.length)) * BANNER_PX}px`,
    };
  },
  rect = (node: Element) => node.getBoundingClientRect(),
  // Ce qu'une sortie a réellement imprimé, jetons compris.
  printed = (lines: Printable[]) =>
    lines.reduce((total: number, entry: Printable) => {
      const text = entry.tokens
        ? entry.tokens.map((token) => token.t).join("")
        : (entry.t ?? entry.text ?? "");

      return total + text.length;
    }, 0),
  // Le bandeau change de nature ici : l'interpreteur rend le mot a dessiner, la coquille
  // rend la geometrie et l'ombre que le balisage ne sait pas calculer.
  line = (raw: ContentLine): ShapedLine => {
    const shaped = contentLine(raw);

    if (shaped.banner !== undefined && shaped.text !== undefined && shaped.tone !== undefined) {
      return {
        banner: banner({ banner: shaped.banner, text: shaped.text }),
        text: shaped.text,
        tone: shaped.tone,
      };
    }

    return shaped;
  },
  /* eslint-enable anti-slop/no-shape-in-symbol-names */
  outPane = (out: RawOut | undefined) => ({
    lines: (out?.lines ?? []).map((row: (number | string)[]) => ({
      k: row[0],
      kc: safeTone(String(row[2] ?? ""), "fg2"),
      v: row[1],
      vc: safeTone(String(row[3] ?? "")),
    })),
    title: out?.title ?? "",
  }),
  section = (raw: RawSection) => ({
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
  // Trente-cinq feuilles de sprites remplacent le dessin en ombres portees. Les durees et
  // les images vivent dans la feuille de style : le script ne choisit que l'etat.
  // Neuf etats de vie, six expressions de commande, six activites, onze de manipulation,
  // trois transitions de forme.
  MASCOT_STATES = new Set([
    "evolveCube",
    "evolvePingouin",
    "devolve",
    "idle",
    "wink",
    "jump",
    "type",
    "load",
    "sleep",
    "morph",
    "boom",
    "reform",
    "alert",
    "happy",
    "laugh",
    "sad",
    "scared",
    "drop",
    "goal",
    "bike",
    "coffee",
    "lift",
    "juggle",
    "train",
    "grab",
    "dragLeft",
    "dragRight",
    "splatLeft",
    "splatRight",
    "splatFloor",
    "splatCeiling",
    "splatCeilingLeft",
    "splatCeilingRight",
    "splatFloorLeft",
    "splatFloorRight",
  ]),
  MASCOT_REST = "idle",
  // La chaine des formes. Chaque appel monte d'un cran, le troisieme referme le cycle. Une
  // transition se joue depuis la feuille qui la porte : « evolveCube » vit dans celle du
  // cube, « devolve » dans celle du pingouin. D'ou « sheet », qui n'est pas toujours
  // « next ».
  CHAIN = {
    cube: { next: "pingouin", sheet: "pingouin", state: "evolvePingouin" },
    pingouin: { next: "slime", sheet: "pingouin", state: "devolve" },
    slime: { next: "cube", sheet: "cube", state: "evolveCube" },
  },
  TRANSITIONS = new Set(["devolve", "evolveCube", "evolvePingouin"]),
  // Une case affichee fait 64 px, soit la hauteur de la piste.
  SPRITE = 64,
  // Sous ce pas la mascotte garderait sa prise plutot que de trembler entre deux feuilles.
  DRAG_STEP = 2,
  // Le plaquage se declenche quand le curseur sort de la piste. Or la piste a la hauteur du
  // sprite : le curseur, pris quelque part dans ces 64 px, en sortirait par le haut ou par
  // le bas en une trentaine de pixels. Un simple tremblement pendant un glisser horizontal
  // ferait clignoter le sol et le plafond a la place des feuilles de deplacement. Cette
  // marge n'existe que sur la verticale : en largeur, la piste est trop longue pour qu'on
  // en sorte par accident.
  SPLAT_MARGIN = 24,
  // Au cinquieme clic le slime explose. Il reprend forme entre cinq et dix secondes plus
  // tard : le hasard evite que l'attente devienne une horloge.
  // Combien de temps un etat de passage tient avant de rendre le repos.
  //
  // Pour une passe unique, c'est la duree de sa feuille : le minuteur n'est qu'un filet
  // derriere animationend, qu'une page en arriere-plan peut avaler.
  //
  // Pour « laugh », « sad » et « scared », qui bouclent, le minuteur est la SEULE sortie :
  // une animation infinie n'emet jamais animationend. Deux a trois cycles, puis le repos.
  // Retirer une de ces trois lignes laisse la mascotte tourner sans fin.
  //
  // « boom » n'y figure pas : l'explosion tient jusqu'a ce que le minuteur de reapparition
  // la releve.
  HOLD_MS = {
    alert: 960,
    bike: 2880,
    coffee: 1200,
    devolve: 1440,
    drop: 1440,
    evolveCube: 2400,
    evolvePingouin: 2400,
    goal: 1440,
    happy: 1200,
    juggle: 2880,
    jump: 1280,
    laugh: 4320,
    lift: 1440,
    morph: 2400,
    reform: 1600,
    sad: 5760,
    scared: 3000,
    train: 1440,
    wink: 1680,
  },
  // Le quai reste vide le temps qu'on remarque le depart, puis « drop » la ramene.
  AWAY_MS = 3000,
  BOOM_AT = 5,
  REFORM_MIN_MS = 5000,
  REFORM_SPREAD_MS = 5000,
  // La frappe rend la main au repos peu apres la derniere touche. Chaque touche relance le
  // compte a rebours : 400 ms coupaient l'animation au milieu d'une phrase, et la personne
  // qui tape regarde ses mots, pas la mascotte. La veille attend dix secondes sans geste.
  // Au repos, une chance sur vingt-cinq toutes les cinq secondes.
  TYPE_REST_MS = 800,
  // La modale retient le regard, et une passe de mue dure deux secondes et demie. La mue
  // rejoue donc tant que la modale est ouverte, puis court encore ce sursis apres.
  MORPH_HOLD_MS = 600,
  SLEEP_MS = 10_000,
  TWITCH_MS = 5000,
  TWITCH_ODDS = 0.04,
  EMPTY = { cmd: "", id: "", lines: [], out: { lines: [], title: "" }, suggest: "", view: "pairs" };

// Alpine vient du script vendu a cote de la page : il n'apporte pas ses types.
declare const Alpine: {
  data: (name: string, factory: () => State) => void;
};

// Umami est charge par une balise script tierce. Son contrat se declare ici, une fois :
// « absent » est un cas normal, un bloqueur suffit a le produire.
interface Umami {
  track?: (name: string, data?: Record<string, TrackValue>) => void;
}

declare global {
  // eslint-disable-next-line no-var, vars-on-top
  var umami: Umami | undefined;
}

// Une cle libre dans une table fermee : la table garde son type, l'appelant recoit
// undefined quand la cle n'y est pas.
const lookup = <V>(table: Readonly<Record<string, V>>, key: string): V | undefined => table[key];

// Alpine pose ses magies sur le composant apres l'avoir construit : elles ne sont pas
// dans l'objet litteral, mais « this » les voit a l'execution.
interface Magics {
  $nextTick: (callback: () => void) => void;
  $refs: Record<string, HTMLElement | undefined>;
}

// Les deux seuls reglages qui se basculent. Nommer l'union permet d'indexer l'etat par la
// cle sans effacer son type.
type ToggleKey = "anim" | "out";

// Ce que le stockage rend. Rien n'y est garanti : c'est une entree exterieure, et le canvas
// injectait dans l'etat tout ce qu'il y trouvait.
interface SavedOpts {
  anim?: unknown;
  logH?: unknown;
  out?: unknown;
  theme?: unknown;
}

// Une position, ou un pas : deux nombres qui vont toujours ensemble.
interface Point {
  x: number;
  y: number;
}

type Delay = ReturnType<typeof setTimeout>;

type Beat = ReturnType<typeof setInterval>;

// Ce que la page tient en memoire. Les minuteurs en font partie : les declarer les rend
// visibles, et dit d'un coup d'oeil ce que la page a en vol.
interface State {
  bubbleTimer: Delay | undefined;
  compactor: Delay | undefined;
  latency: Delay | undefined;
  morphTimer: Delay | undefined;
  motionTimer: Delay | undefined;
  reformer: Delay | undefined;
  returner: Delay | undefined;
  settler: Delay | undefined;
  booter: Delay | undefined;
  sleeper: Delay | undefined;
  spinner: Beat | undefined;
  ticker: Beat | undefined;
  twitcher: Beat | undefined;
  typer: Beat | undefined;
  typer_rest: Delay | undefined;
  walker: Beat | undefined;
  anim: boolean;
  at: number;
  bubble: string;
  clicks: number;
  commands: string[];
  // Le resultat d'une commande qui l'a reclame. La navigation le reprend.
  commandResult: Section | undefined;
  compacting: boolean;
  bootTick: number;
  compactTick: number;
  dataErr: boolean;
  details: Section[];
  direction: number;
  dragged: boolean;
  dragging: boolean;
  errDetail: string;
  feedback: Record<string, string>;
  focusAt: Record<string, number>;
  grabAt: number;
  grabFrom: Point;
  input: string;
  jokeIndex: number;
  jokes: string[];
  journal: Line[];
  journalOverflows: boolean;
  logH: number;
  missions: Mission[];
  gone: boolean;
  mascotState: string;
  morphHeld: boolean;
  more: { journal: boolean };
  motion: string;
  used: number;
  optsOpen: boolean;
  // La forme affichee, la forme visee pendant une transition, et les feuilles deja tirees.
  // Aucune des trois n'est persistee : chaque visite repart du slime.
  form: string;
  becoming: string;
  loaded: Set<string>;
  // Qui a ouvert la modale : le bouton de l'en-tete, ou la saisie via la commande.
  optsReturn: HTMLElement | undefined;
  out: boolean;
  pane: string;
  pending: string | undefined;
  power: string;
  profileEmail: string;
  recallAt: number;
  resizing: { height: number; y: number } | undefined;
  running: boolean;
  section: string;
  wantResult: boolean;
  sections: Section[];
  seen: string[];
  share: Share;
  shareTargets: string[];
  stack: Brick[];
  sugg: string[];
  suggAt: number;
  suggFrag: string;
  suggHead: string;
  suggOpen: boolean;
  suggSlash: boolean;
  tech: string;
  techNotes: Record<string, TechNote>;
  theme: string;
  timeline: Step[];
  timelineAt: number;
  typed: string;
}

// ThisType ajoute les magies au type de « this » sans rien changer au code produit :
// cette fonction est l'identite. L'etat vient de State, le reste du litteral vient de T :
// sans ce partage, un champ initialise a vide prendrait le type du vide.
const withMagics = <T>(
  component: State & T & ThisType<Magics & State & Omit<T, keyof State>>,
): State & Omit<T, keyof State> => component;

document.addEventListener("alpine:init", () => {
  // Les proprietes sont triees, les methodes suivent un ordre de lecture : chargement,
  // navigation, clavier, options, mascotte, commandes. Les trier alphabetiquement
  // disperserait chaque sujet aux quatre coins du fichier pour un gain nul.
  // eslint-disable-next-line sort-keys
  Alpine.data("terminal", () =>
    // eslint-disable-next-line sort-keys
    withMagics({
      THEMES,
      TOGGLES,
      bubbleTimer: undefined,
      compactor: undefined,
      latency: undefined,
      morphTimer: undefined,
      motionTimer: undefined,
      reformer: undefined,
      returner: undefined,
      settler: undefined,
      booter: undefined,
      sleeper: undefined,
      spinner: undefined,
      ticker: undefined,
      twitcher: undefined,
      typer: undefined,
      typer_rest: undefined,
      walker: undefined,
      anim: true,
      at: 0,
      bubble: "",
      clicks: 0,
      commands: [],
      commandResult: undefined,
      compacting: false,
      bootTick: 0,
      compactTick: 0,
      dataErr: false,
      details: [],
      direction: 1,
      dragged: false,
      dragging: false,
      errDetail: "",
      feedback: {},
      focusAt: { main: 0, nav: 0, out: 0 },
      grabAt: 0,
      grabFrom: { x: 0, y: 0 },
      input: "",
      jokeIndex: 0,
      jokes: [],
      journal: [],
      journalOverflows: false,
      logH: 0,
      missions: [],
      gone: false,
      mascotState: "idle",
      morphHeld: false,
      more: { journal: false },
      motion: "",
      used: 0,
      optsOpen: false,
      optsReturn: undefined,
      form: "slime",
      becoming: "",
      loaded: new Set(["slime"]),
      out: true,
      pane: "nav",
      pending: undefined,
      power: "boot",
      profileEmail: "",
      recallAt: -1,
      resizing: undefined,
      running: false,
      section: "whoami",
      wantResult: false,
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
        return this.commandResult ?? this.open;
      },

      // La sortie appartient a la section ouverte, pas a la derniere commande. Une reponse
      // qui prend le resultat ne doit pas vider le volet de droite.
      get open() {
        return this.all.find((entry: Section) => entry.id === this.section) ?? EMPTY;
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

      items(pane: string) {
        return [
          ...document.querySelectorAll<HTMLElement>(
            `[data-pane="${pane}"] button:not(:disabled), [data-pane="${pane}"] input`,
          ),
        ];
      },

      // Le focus est mémorisé par volet : y revenir repose le curseur où on l'avait
      // laissé, plutôt qu'en tête de liste.
      focusPane(pane: string) {
        const entries = this.items(pane);

        if (entries.length === 0) {
          return;
        }

        this.pane = pane;
        this.focusAt[pane] = Math.min(this.focusAt[pane] ?? 0, entries.length - 1);
        entries[this.focusAt[pane] ?? 0]?.focus();
      },

      movePane(step: number) {
        const next = PANES.indexOf(this.pane) + step;

        if (next >= 0 && next < PANES.length) {
          this.focusPane(PANES[next] ?? "nav");
        }
      },

      moveInPane(step: number) {
        const entries = this.items(this.pane);

        if (entries.length === 0) {
          return;
        }

        this.focusAt[this.pane] = Math.max(
          0,
          Math.min(entries.length - 1, (this.focusAt[this.pane] ?? 0) + step),
        );
        entries[this.focusAt[this.pane] ?? 0]?.focus();
      },

      moveSection(step: number) {
        const ids = this.sections.map((entry) => entry.id),
          next = ids.indexOf(this.section) + step;

        if (next >= 0 && next < ids.length) {
          this.goSection(ids[next] ?? "whoami");
        }
      },

      // Une grille se parcourt aux quatre fleches. La stack en compte une par domaine :
      // un pas fixe, deduit de la premiere ligne, changeait de colonne des qu'une ligne
      // etait incomplete ou qu'on passait au domaine suivant. Les lignes se lisent donc
      // sur la position reelle des cellules.
      gridMove(selector: string, key: string) {
        const cells = [...document.querySelectorAll<HTMLElement>(selector)],
          at =
            document.activeElement instanceof HTMLElement
              ? cells.indexOf(document.activeElement)
              : -1;

        if (at === -1 || !VERTICAL.has(key)) {
          return this.rowMove(cells, at, key);
        }

        // SAFETY: « at » vient de cells.indexOf et le cas -1 est sorti juste au-dessus,
        // donc l'index designe une cellule de la liste.
        const from = rect(cells[at] as HTMLElement),
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
      rowMove(cells: HTMLElement[], at: number, key: string) {
        if (at === -1 || (key !== "ArrowLeft" && key !== "ArrowRight")) {
          return false;
        }

        cells[
          Math.max(0, Math.min(cells.length - 1, at + (key === "ArrowRight" ? 1 : -1)))
        ]?.focus();

        return true;
      },

      // Dans une liste a une colonne, la fleche droite valide et descend vers le volet
      // suivant : c'est ce qu'un terminal fait.
      listMove(selector: string, key: string, activate: (at: number) => void) {
        const items = [...document.querySelectorAll<HTMLElement>(selector)],
          at =
            document.activeElement instanceof HTMLElement
              ? items.indexOf(document.activeElement)
              : -1;

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

      onKey(event: KeyboardEvent) {
        if (event.altKey || event.ctrlKey || event.metaKey) {
          return;
        }

        // La touche qui abrege le boot s'arrete la : sans cette sortie, elle partirait
        // aussi dans la saisie, et le visiteur taperait une commande sans le vouloir.
        if (this.skipBoot()) {
          event.preventDefault();

          return;
        }

        // La modale a son propre clavier. Sans cette garde, les deux gestionnaires
        // traitent la même flèche et le focus s'échappe de la modale.
        if (this.optsOpen) {
          return;
        }

        // Dans la saisie, les flèches déplacent le curseur dans le texte. Elles ne
        // rendent la main aux volets que si le champ est vide.
        if (event.target === this.$refs["cli"]) {
          const leaving =
            this.input === "" && (event.key === "ArrowLeft" || event.key === "ArrowRight");

          if (!leaving) {
            return;
          }
        }

        if (event.key === "/") {
          event.preventDefault();
          this.$refs["cli"]?.focus();

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
            const items = [...document.querySelectorAll<HTMLElement>('[data-ctl="nav"]')];

            // De gauche a droite : valider une section amene a sa premiere prise. La stack
            // ouvre sur sa premiere techno, la frise sur sa premiere entree. Une section
            // sans prise dans le resultat mene a la ligne de commande.
            // L'intention se pose avant le clic : une section deja vue s'affiche sans
            // frappe, et la prise se ferait avant que l'intention soit connue.
            this.wantResult = true;
            items[at]?.click();
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
        const bricks = this.stack.reduce(
          (total: number, root: Brick) => total + root.kids.length,
          0,
        );

        return `${this.stack.length} domaines · ${bricks} briques`;
      },

      get techNote() {
        return this.techNotes[this.tech];
      },

      // La fiche suit le focus des la premiere techno atteinte. Rien ne s'affiche
      // tant qu'aucune n'a le focus, donc aucun texte d'invite au depart.
      followTech(name: string) {
        this.tech = name;
      },

      // Chaque entree de la frise annonce la commande qui ouvre sa fiche. La commande vient
      // du contenu : la reconstruire ici la ferait mentir au premier renommage.
      missionCue(entry: Step) {
        const detail = this.details.find((item) => item.id === entry.detail);

        return detail ? `↵ ${detail.cmd}` : "— pas de fiche";
      },

      openTimeline(index: number) {
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
      weigh(entry: Section) {
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

      setLogHeight(next: number) {
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

            return (
              own.display !== "none" && own.position !== "absolute" && own.position !== "fixed"
            );
          }),
          taken = rows
            .filter((node) => node !== journal && !node.hasAttribute("data-result"))
            .reduce((total, node) => total + node.getBoundingClientRect().height, 0);

        return Math.max(
          44,
          Math.floor(inner - taken - Math.max(0, rows.length - 1) * PANE_GAP_PX - RESULT_MIN_PX),
        );
      },

      logDown(event: PointerEvent) {
        this.resizing = { height: this.logHeight, y: event.clientY };

        if (event.target instanceof Element) {
          event.target.setPointerCapture(event.pointerId);
        }
      },

      logMove(event: PointerEvent) {
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
      checkMore(name: string) {
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

      bump(cost?: number) {
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
      powerDown(mode: string) {
        this.stopCompacting();
        this.power = "off";
        setTimeout(
          () => {
            this.journal = [];
            this.seen = [];
            this.used = 0;
            // Une explosion ou un voyage en cours survivait au redemarrage : la mascotte
            // restait absente, et un minuteur de l'ancienne session la ramenait plus tard.
            clearTimeout(this.reformer);
            clearTimeout(this.returner);
            this.gone = false;
            this.power = "boot";
            this.load();
          },
          mode === "shutdown" ? 2200 : 900,
        );
      },

      get outKeyWidth() {
        const keys = this.open.out.lines.map((row: { k: unknown }) => String(row.k).length);

        return `${Math.max(3, ...keys)}ch`;
      },

      get outStatus() {
        return this.running ? "waiting" : "live";
      },

      // Reappliquer une classe ne redemarre pas son animation : il faut la retirer, forcer
      // une relecture de la geometrie, puis la remettre.
      mascotPlay(state: string) {
        const node = this.$refs["mascot"];

        if (!node || !MASCOT_STATES.has(state)) {
          return;
        }

        // Explose, le slime ne repond plus : rien ne le rejoue avant qu'il reprenne forme.
        // Une transition de forme tient ses 2,4 s : la frappe, une section, un clic ou un
        // changement de theme la couperaient au milieu. Meme forme de garde que « gone ».
        if (TRANSITIONS.has(this.mascotState) && this.mascotState !== state) {
          return;
        }

        if (this.gone && state !== "boom") {
          return;
        }

        node.className = "slime";
        void node.offsetWidth;
        node.className = `slime slime--${state}`;
        this.mascotState = state;

        clearTimeout(this.settler);

        const passe = lookup(HOLD_MS, state);

        if (passe) {
          this.settler = setTimeout(() => {
            if (this.mascotState === state) {
              this.settle();
            }
          }, passe + 100);
        }
      },

      // Une passe unique rend la main au repos. Les boucles, elles, ne finissent jamais.
      // « load » boucle sans fin : couper le minuteur de la commande sans rendre la main y
      // laisserait la mascotte pour toujours. Passer par settle() rendait aussi la main sur
      // les autres etats, et coupait le voyage en train avant son terme.
      stopLoading() {
        if (this.mascotState === "load") {
          this.settle();
        }
      },

      settle() {
        // Un plaquage tient sa derniere case tant qu'on reste colle. Sans cette sortie, son
        // animationend rendrait le repos au milieu de la prise.
        if (this.dragging) {
          return;
        }

        // Rejouer la mue plutot que la boucler en CSS lui garde le filet de ONE_SHOT_MS :
        // une boucle sans fin n'emet jamais animationend et resterait collee.
        if (this.morphHeld && this.mascotState === "morph") {
          this.mascotPlay("morph");

          return;
        }

        // Le train emmene la mascotte : sa derniere case est un quai vide. Elle n'a donc
        // pas de repos a reprendre, elle est partie.
        if (this.mascotState === "train") {
          this.leave();

          return;
        }

        // La derniere case d'une transition montre deja la forme d'arrivee : il ne reste
        // qu'a la poser, puis a rendre le repos.
        if (TRANSITIONS.has(this.mascotState)) {
          this.form = this.becoming;
          this.becoming = "";
          this.mascotState = "";
          this.mascotPlay(MASCOT_REST);

          return;
        }

        this.mascotPlay(MASCOT_REST);
      },

      // La feuille du train fait la paire avec celle de la chute : l'une emmene la
      // mascotte, l'autre la ramene. Un decor vide sans retour serait un piege.
      leave() {
        if (this.gone) {
          return;
        }

        clearTimeout(this.settler);
        this.gone = true;
        clearTimeout(this.returner);
        this.returner = setTimeout(() => {
          this.gone = false;
          this.drop();
        }, AWAY_MS);
      },

      // La ligne porte son expression : « mise en veille » doit endormir, pas faire cligner.
      // Sans expression, un clin d'oeil, et seulement si la mascotte ne fait rien d'autre.
      say(text: string, expression?: Expression) {
        // Une bulle au-dessus d'une piste vide n'a personne pour la porter.
        if (this.gone) {
          return;
        }

        this.bubble = text;

        if (expression) {
          this.emote(expression);
        } else if (this.mascotState === MASCOT_REST) {
          this.mascotPlay("wink");
        }

        clearTimeout(this.bubbleTimer);
        this.bubbleTimer = setTimeout(() => {
          this.bubble = "";
        }, 2600);
      },

      // La chute repose la mascotte ailleurs sur sa piste : elle arrive, elle ne saute pas.
      drop() {
        this.place(Math.random() * this.trackWidth());
        this.mascotPlay("drop");
      },

      // Chaque expression porte le nom de sa feuille, et l'ADR 0004 exige qu'une expression sans
      // feuille ramene au repos en coupant ce qui etait en cours. « idle » suit ce chemin :
      // le repos est deja son etat.
      emote(expression?: Expression) {
        this.mascotPlay(expression && MASCOT_STATES.has(expression) ? expression : MASCOT_REST);
      },

      poke() {
        // Un clic suit toujours le relachement du pointeur. Trainer la mascotte n'est pas
        // cliquer dessus : sans cette garde, chaque glisser rapprochait l'explosion.
        if (this.dragged) {
          this.dragged = false;

          return;
        }

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
      // La feuille d'une forme ne part qu'a la demande : le cube et le pingouin pesent chacun
      // plus que le slime, et presque personne ne tapera la commande. L'adresse empreintee
      // est posee par la construction sur la piste, qui la reecrit comme tout chemin d'actif.
      async loadForm(form: string) {
        if (this.loaded.has(form)) {
          return;
        }

        const source =
          this.$refs["mascot"]?.dataset[`sheet${form[0]?.toUpperCase()}${form.slice(1)}`];

        if (!source) {
          throw new Error(`la piste ne declare aucune feuille pour ${form}`);
        }

        this.mascotPlay("load");

        const sheet = new Image();

        sheet.src = source;
        await sheet.decode();
        this.loaded.add(form);
      },

      // Ce que la coquille sait de la mascotte, et que l'interpreteur ne peut pas deviner.
      mascotStanding(): "away" | "busy" | "here" {
        if (this.gone) {
          return "away";
        }

        return TRANSITIONS.has(this.mascotState) ? "busy" : "here";
      },

      // Un cran dans la chaine. La feuille arrive avant la transition : sans cela, les
      // premieres cases se joueraient sur une image absente.
      async evolve() {
        const step = lookup(CHAIN, this.form);

        if (!step || this.gone || TRANSITIONS.has(this.mascotState)) {
          return;
        }

        await this.loadForm(step.sheet);

        this.becoming = step.next;
        this.form = step.sheet;
        this.mascotState = "";
        this.mascotPlay(step.state);
      },

      blowUp() {
        // Deja absente, une seconde explosion repousserait son retour sans rien montrer.
        // Le clic passait par poke(), qui garde deja ; la commande arrive ici en direct.
        if (this.gone) {
          return;
        }

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
      place(x: number) {
        this.at = Math.max(0, Math.min(this.trackWidth(), x));

        const node = this.$refs["mascot"];

        if (node) {
          node.style.left = `${this.at}px`;
        }
      },

      move(motion: string, hold: number) {
        this.motion = motion;
        clearTimeout(this.motionTimer);
        this.motionTimer = setTimeout(() => {
          this.motion = "";
        }, hold);
      },

      // Reaction seulement a proximite : un seuil large donnait un declenchement fantome,
      // curseur encore loin du slime.
      nearby(event: PointerEvent) {
        if (this.dragging || !this.$refs["mascot"] || this.mascotState !== MASCOT_REST) {
          return;
        }

        const box = this.$refs["mascot"].getBoundingClientRect(),
          distance = Math.hypot(
            event.clientX - (box.left + box.width / 2),
            event.clientY - (box.top + box.height / 2),
          );

        if (distance < 60) {
          this.mascotPlay("wink");
        }
      },

      trackWidth() {
        const { track } = this.$refs;

        return track ? Math.max(0, track.clientWidth - SPRITE) : 0;
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

      // La mascotte est retenue dans sa piste. On peut l'y trainer d'un bout a l'autre, mais
      // pas l'en sortir : tirer au-dela d'un bord la plaque contre ce bord.
      grab(event: PointerEvent) {
        if (this.gone) {
          return;
        }

        const node = this.$refs["mascot"],
          box = node?.getBoundingClientRect();

        this.grabAt = event.clientX - (box?.left ?? 0);
        this.grabFrom = { x: event.clientX, y: event.clientY };
        this.dragged = false;
        this.dragging = true;
        // La capture porte tout le plaquage : l'etat se lit sur un curseur sorti de la
        // piste, et sans elle le navigateur cesserait de livrer pointermove des la sortie.
        node?.setPointerCapture(event.pointerId);
        this.mascotPlay("grab");
      },

      drag(event: PointerEvent) {
        const { track } = this.$refs;

        if (!this.dragging || !track) {
          return;
        }

        const box = track.getBoundingClientRect(),
          // Plaquee, la mascotte suit encore le curseur en abscisse : elle est retenue, pas
          // figee.
          was = this.at;

        this.place(event.clientX - box.left - this.grabAt);

        // Le sens se lit sur ce que la mascotte a parcouru, pas sur ce que le curseur a
        // parcouru : plaquee, elle ne bouge plus, et sa feuille doit le dire.
        const step = this.at - was;

        // Un glisser franc n'est pas un clic. Le verrou tient jusqu'a la prise suivante :
        // revenir au point de depart n'annule pas le deplacement.
        if (
          Math.hypot(event.clientX - this.grabFrom.x, event.clientY - this.grabFrom.y) > DRAG_STEP
        ) {
          this.dragged = true;
        }

        const next = this.dragState(event, box, step);

        // Reaffecter la meme feuille remettrait l'animation a sa premiere case : la mascotte
        // paraitrait figee pendant tout le deplacement.
        if (next !== this.mascotState) {
          this.mascotPlay(next);
        }
      },

      // Le plaquage nait du curseur qui sort de la piste, et non d'une collision entre le
      // sprite et un bord. Les quatre coins se testent avant les quatre murs : sur une
      // diagonale les deux lectures sont vraies au meme instant, et un coin place apres un
      // mur ne serait jamais atteint.
      dragState(event: PointerEvent, box: DOMRect, step: number) {
        const above = event.clientY < box.top - SPLAT_MARGIN,
          below = event.clientY > box.bottom + SPLAT_MARGIN,
          left = event.clientX < box.left,
          right = event.clientX > box.right;

        if (above && left) {
          return "splatCeilingLeft";
        }

        if (above && right) {
          return "splatCeilingRight";
        }

        if (below && left) {
          return "splatFloorLeft";
        }

        if (below && right) {
          return "splatFloorRight";
        }

        if (above) {
          return "splatCeiling";
        }

        if (below) {
          return "splatFloor";
        }

        if (left) {
          return "splatLeft";
        }

        if (right) {
          return "splatRight";
        }

        if (step > DRAG_STEP) {
          return "dragRight";
        }

        return step < -DRAG_STEP ? "dragLeft" : "grab";
      },

      release() {
        if (!this.dragging) {
          return;
        }

        this.dragging = false;
        this.mascotPlay("jump");
      },

      finishBoot() {
        clearTimeout(this.booter);
        clearInterval(this.ticker);
        this.power = "fade";
        setTimeout(
          () => {
            this.power = "on";
            // Le demarrage decouvre la mascotte : elle arrive plutot qu'elle n'apparait.
            this.mascotPlay("drop");
          },
          this.reduced ? 0 : FADE_MS,
        );
      },

      // Le boot n'est pas un spectacle obligatoire. Il ne s'abrege que quand le contenu est
      // deja la : l'ecran de panique doit rester, et son bouton doit garder ses touches.
      skipBoot() {
        if (this.power !== "boot" || this.dataErr || this.sections.length === 0) {
          return false;
        }

        this.finishBoot();

        return true;
      },

      get reduced() {
        return globalThis.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
      },

      // Le meme seuil que la requete de media qui empile les volets. Les deux doivent
      // changer ensemble : la coquille ne peut pas lire la valeur de la feuille de style.
      get stacked() {
        return globalThis.matchMedia?.("(max-width: 900px)").matches ?? false;
      },

      startMascot() {
        this.walker = setInterval(() => this.wander(), 2400);
        this.twitcher = setInterval(() => this.twitch(), TWITCH_MS);
        // La piste bouge avec la mise en page, la mascotte non : sans cette reprise, une
        // fenetre redimensionnee la laisserait hors champ.
        globalThis.addEventListener("resize", () => this.place(this.at));

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

      // Le systeme a deja tranche : sous mouvement reduit, la bascule des animations ne
      // peut plus rien changer. La laisser active ferait croire le contraire.
      lockedToggle(key: ToggleKey) {
        return key === "anim" && this.reduced;
      },

      value(key: ToggleKey) {
        return this[key] && !this.lockedToggle(key);
      },

      flip(key: ToggleKey) {
        if (this.lockedToggle(key)) {
          return;
        }

        this[key] = !this[key];
        this.persist();
      },

      setTheme(id: string, event?: MouseEvent) {
        // Le choix se fait depuis la modale, donc la mue tient jusqu'a sa fermeture. Le
        // marquer ici et non dans apply() : startViewTransition differe le rappel, et une
        // fermeture rapide passerait devant lui.
        clearTimeout(this.morphTimer);
        this.morphHeld = this.optsOpen;

        const apply = () => {
          this.theme = id;
          this.persist();
          this.mascotPlay("morph");
        };

        // Le réglage « animations off » coupe aussi la transition de thème.
        if (!this.anim || !document.startViewTransition) {
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

      // La propagation part de ce que le visiteur a touche : le bouton clique, sinon
      // l'element qui a le focus — la saisie, quand le theme vient de la commande. Un
      // point a zero ferait balayer le cercle depuis le coin haut-gauche.
      buttonCentre(event?: Event) {
        const target = event?.target instanceof Element ? event.target : document.activeElement,
          box = target instanceof Element ? target.getBoundingClientRect() : undefined;

        return box
          ? { x: box.left + box.width / 2, y: box.top + box.height / 2 }
          : { x: window.innerWidth / 2, y: window.innerHeight / 2 };
      },

      themeButtons() {
        return [...document.querySelectorAll<HTMLElement>("[data-opts] [data-theme-choice]")];
      },

      toggleButtons() {
        return [
          ...document.querySelectorAll<HTMLElement>("[data-opts] [data-toggle]:not(:disabled)"),
        ];
      },

      // Le reglage courant se lit sur l'element focalise. Le deduire d'un compteur le
      // desynchronisait des qu'on arrivait par tabulation ou a la souris : le focus
      // etait sur « animations » et la fleche droite modifiait « dense lines ».
      focused() {
        const active = document.activeElement,
          theme = active instanceof HTMLElement ? this.themeButtons().indexOf(active) : -1;

        if (theme !== -1) {
          return { group: "theme", index: theme };
        }

        const toggle = active instanceof HTMLElement ? this.toggleButtons().indexOf(active) : -1;

        return toggle !== -1 ? { group: "toggle", index: toggle } : undefined;
      },

      focusSetting() {
        const active = document.querySelector<HTMLElement>(
          "[data-opts] [data-theme-choice][aria-pressed='true']",
        );

        (active ?? this.themeButtons()[0])?.focus();
      },

      // Les themes sont sur plusieurs lignes : les quatre fleches doivent y naviguer.
      // Les boutons d'une meme ligne partagent leur position verticale.
      themeColumns() {
        const buttons = this.themeButtons(),
          top = buttons[0]?.offsetTop;

        return Math.max(1, buttons.filter((button) => button.offsetTop === top).length);
      },

      moveTheme(index: number) {
        const buttons = this.themeButtons(),
          target = buttons[Math.max(0, Math.min(buttons.length - 1, index))];

        if (!target) {
          return;
        }

        this.setTheme(target.dataset["themeChoice"] ?? "dark");
        this.$nextTick(() => target.focus());
      },

      optsKey(event: KeyboardEvent) {
        if (event.key === "Escape") {
          event.preventDefault();
          this.closeOpts();

          return;
        }

        if (event.key === "Tab") {
          const focusable = [
              ...document.querySelectorAll<HTMLElement>("[data-opts] [data-ctl='opt']"),
            ],
            at =
              document.activeElement instanceof HTMLElement
                ? focusable.indexOf(document.activeElement)
                : -1,
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
            step = { ArrowDown: columns, ArrowLeft: -1, ArrowRight: 1, ArrowUp: -columns }[
              event.key
            ],
            next = here.index + (step ?? 0);

          // Sortir de la grille par le bas mene au premier reglage suivant.
          if (next >= this.themeButtons().length) {
            this.toggleButtons()[0]?.focus();
          } else {
            this.moveTheme(next);
          }

          return;
        }

        if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
          this.flip(TOGGLES[here.index]?.key ?? "anim");

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
        let saved: SavedOpts = {};

        try {
          // SAFETY: la forme du stockage n'est pas garantie. L'affirmation ne promet rien :
          // SavedOpts ne declare que des « unknown », et chaque cle est verifiee plus bas.
          saved = JSON.parse(globalThis.localStorage.getItem(OPTS_KEY) ?? "{}") as SavedOpts;
        } catch {
          // Un stockage illisible ou refusé ne doit pas empêcher la page de démarrer.
        }

        // Quatre clés, et quatre seulement, chacune verifiee avant d'entrer dans l'etat.
        if (saved.anim === true || saved.anim === false) {
          this.anim = saved.anim;
        }

        if (saved.out === true || saved.out === false) {
          this.out = saved.out;
        }

        if (Number.isFinite(saved.logH)) {
          this.logH = Number(saved.logH);
        }

        // Un thème inconnu vaut un thème absent : la préférence du système tranche.
        this.theme = THEMES.some((entry) => entry.id === saved.theme)
          ? String(saved.theme)
          : this.preferredTheme();
      },

      // Première visite : la page suit la préférence du système. Sans préférence, elle
      // reste sombre, comme un terminal.
      preferredTheme() {
        return globalThis.matchMedia?.("(prefers-color-scheme: light)").matches ? "light" : "dark";
      },

      persist() {
        try {
          globalThis.localStorage.setItem(
            OPTS_KEY,
            JSON.stringify({ anim: this.anim, logH: this.logH, out: this.out, theme: this.theme }),
          );
        } catch {
          // Navigation privée ou stockage plein : le réglage vaut pour cette visite.
        }
      },

      openOpts() {
        this.optsReturn =
          document.activeElement instanceof HTMLElement ? document.activeElement : undefined;
        this.optsOpen = true;
        this.$nextTick(() => this.focusSetting());
      },

      closeOpts() {
        this.optsOpen = false;
        this.$nextTick(() =>
          (this.optsReturn ?? document.querySelector<HTMLElement>("[data-ctl='opts']"))?.focus(),
        );

        if (!this.morphHeld) {
          return;
        }

        // Fermer au milieu d'une passe n'en montrerait qu'un eclat. Le sursis passe, la
        // passe en cours s'acheve, et settle() rend le repos.
        clearTimeout(this.morphTimer);
        this.morphTimer = setTimeout(() => {
          this.morphHeld = false;
        }, MORPH_HOLD_MS);
      },
      fromHash() {
        const id = globalThis.location.hash.slice(1);

        this.goSection(this.all.some((entry) => entry.id === id) ? id : "whoami", false);
      },

      goSection(id: string, push = true) {
        if (!this.all.some((entry) => entry.id === id)) {
          return;
        }

        // La navigation reprend le resultat : une reponse de commande n'y survit pas.
        this.commandResult = undefined;
        this.section = id;

        if (push && globalThis.location.hash !== `#${id}`) {
          globalThis.history.pushState({}, "", `#${id}`);
        }

        this.play(id);
        // Une section plus longue que la precedente ne doit pas heriter d'un journal trop
        // haut : le resultat serait coupe des l'ouverture.
        this.$nextTick(() => {
          this.setLogHeight(this.logHeight);
          this.revealResult();
        });
      },

      // La section se tape avant de s'afficher : au tick qui suit le clic, le resultat est
      // encore vide et le focus retomberait sur la ligne de commande. Il attend la frappe.
      takeResult() {
        if (!this.wantResult) {
          return;
        }

        this.wantResult = false;
        this.$nextTick(() => {
          this.focusAt["main"] = 0;
          this.focusPane("main");
        });
      },

      // Sur la colonne empilee, les listes sont sous le volet central. Choisir une section
      // rendait donc le resultat au-dessus de l'ecran, et le visiteur restait sur la liste.
      revealResult() {
        if (!this.stacked) {
          return;
        }

        document.querySelector<HTMLElement>('[data-pane="main"]')?.scrollIntoView({
          behavior: this.anim && !this.reduced ? "smooth" : "auto",
          block: "start",
        });
      },

      get all() {
        return [...this.sections, ...this.details];
      },

      // Première visite : la commande se tape, puis s'exécute. Retour sur une section
      // déjà vue : immédiat, sans quoi l'effet devient une attente.
      play(id: string) {
        const target = this.current.cmd;

        clearInterval(this.typer);
        clearTimeout(this.latency);

        if (this.seen.includes(id)) {
          this.typed = target;
          this.running = false;
          this.stopLoading();
          this.takeResult();

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
            this.takeResult();
          }, EXEC_MS);
        }, 1000 / TYPE_CPS);
      },

      // La reponse prend la place de la section dans le resultat. La frappe en cours
      // s'arrete : sans cela, le minuteur de « play » reecrirait la commande affichee.
      showResult(raw: string, lines: ContentLine[]) {
        clearInterval(this.typer);
        clearTimeout(this.latency);
        this.typed = raw;
        this.running = false;
        this.commandResult = section({ id: raw, label: raw, lines });
        this.$nextTick(() => this.setLogHeight(this.logHeight));
      },

      submit() {
        const raw = this.input;

        if (!raw.trim()) {
          return;
        }

        const { effects, lines, result } = interpret(raw, {
          columns: Math.floor((this.$refs["cli"]?.clientWidth ?? 400) / CHAR_PX),
          current: this.current,
          details: this.details,
          feedback: this.feedback,
          jokeIndex: this.jokeIndex,
          jokes: this.jokes,
          mascot: this.mascotStanding(),
          pending: this.pending,
          sections: this.sections,
          share: this.share,
          shareTargets: this.shareTargets,
          themes: THEMES.map((entry) => entry.id),
        });

        this.input = "";
        this.closeSugg();
        this.commands = [raw, ...this.commands.filter((entry) => entry !== raw)];
        this.recallAt = -1;
        this.journal = [...this.journal, ...lines];
        this.$nextTick(() => {
          if (this.$refs["journal"]) {
            this.$refs["journal"].scrollTop = this.$refs["journal"].scrollHeight;
          }
          this.checkMore("journal");
        });
        // Le resultat compte comme le journal : deplacer une reponse ne la rend pas
        // gratuite, et la jauge mesure ce que la commande a produit.
        this.bump(printed(lines) + printed(result ?? []));

        if (result) {
          this.showResult(raw, result);
        }

        this.apply(effects);
      },

      // Marquage silencieux : Umami absent, bloqué ou en erreur ne casse rien et
      // n'écrit rien en console.
      track(event: string, props?: Record<string, TrackValue>) {
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
            text: this.share.text ?? "",
            title: this.share.title ?? "",
            url: this.share.url ?? "",
          });
        } catch {
          // Le visiteur a ferme le menu de partage : ce n'est pas une panne.
        }
      },

      // L'URL est ouverte telle qu'elle a ete construite. La decoder annulerait
      // l'encodage des jetons et pourrait lever une exception sur une sequence
      // pourcent invalide.
      shareTo(effect: { kind: string; url: string }) {
        if (effect.kind === "copy") {
          this.copy(this.share.url ?? "");

          return;
        }

        globalThis.open(effect.url, "_blank", "noopener");
      },

      async copy(text: string) {
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
      async send(text: string) {
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
              payload: {
                data: { message: text },
                name: feedback.event,
                website: feedback.websiteId,
              },
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
      apply(effects: Effect[]) {
        // Trouver un easter egg vaut une celebration. Mais plusieurs d'entre eux disent
        // deja une expression, et le but jouerait une fraction de seconde avant de se faire
        // ecraser : il ne se joue que si rien d'autre ne bouge la mascotte, et apres la
        // boucle, pour ne pas dependre de l'ordre des effets.
        const found = effects.some(
            (effect) => effect.type === "track" && effect.event === "easter_egg",
          ),
          moved = effects.some((entry) =>
            ["activity", "blowUp", "drop", "emote", "say"].includes(entry.type),
          ),
          // Une commande qui a liste son usage n'a rien fait : lire l'aide ne se celebre pas.
          listed = effects.some((entry) => entry.type === "usage");

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
          } else if (effect.type === "email") {
            this.copy(this.profileEmail);
          } else if (effect.type === "sendMail") {
            globalThis.open(`mailto:${encodeURIComponent(this.profileEmail)}`);
          } else if (effect.type === "cv") {
            // Un nouvel onglet : le terminal reste ouvert derriere, avec son journal.
            globalThis.open("texte.html", "_blank", "noopener");
          } else if (effect.type === "say") {
            this.say(effect.text, effect.expression);
          } else if (effect.type === "emote") {
            this.emote(effect.expression);
          } else if (effect.type === "drop") {
            this.drop();
          } else if (effect.type === "blowUp") {
            this.blowUp();
          } else if (effect.type === "activity") {
            this.mascotPlay(effect.name);
          } else if (effect.type === "navigate") {
            this.goSection(effect.id);
          } else if (effect.type === "clear") {
            this.journal = [];
          } else if (effect.type === "replay") {
            this.journal = [];
            this.commandResult = undefined;
            this.seen = this.seen.filter((entry) => entry !== this.section);
            this.play(this.section);
          } else if (effect.type === "state") {
            Object.assign(this, effect.patch);
          } else if (effect.type === "power") {
            this.powerDown(effect.mode);
          } else if (effect.type === "theme") {
            this.setTheme(effect.name);
          } else if (effect.type === "evolve") {
            void this.evolve();
          } else if (effect.type === "options") {
            this.openOpts();
          }
        }

        if (found && !moved && !listed) {
          this.mascotPlay("goal");
        }
      },

      suggest() {
        const result = candidates(this.input, {
          details: this.details,
          sections: this.sections,
          shareTargets: this.shareTargets,
          themes: THEMES.map((entry) => entry.id),
        });

        this.sugg = result.hits;
        this.suggFrag = result.frag;
        this.suggHead = result.head;
        this.suggSlash = result.slash;
        this.suggAt = 0;
        this.suggOpen = result.hits.length > 0 && this.input !== "";
      },

      // Le nom d'une proposition n'apprend rien a lui seul. La ligne suit la selection,
      // et se tait quand la proposition vient du contenu : son identifiant se lit deja.
      get suggHint() {
        return hintFor(this.suggHead, this.sugg[this.suggAt] ?? "");
      },

      // La fermeture reste déterministe : la liste se vide, sans compteur de génération
      // qui pourrait annuler le vidage au lieu de le protéger.
      closeSugg() {
        this.suggOpen = false;
        this.sugg = [];
        this.suggAt = 0;
      },

      rebuild(word: string) {
        const prefix = this.suggSlash ? "/" : "";

        return this.suggHead ? `${prefix}${this.suggHead} ${word}` : `${prefix}${word}`;
      },

      // La liste se rouvre sur le mot suivant : une commande completee qui attend un
      // argument montre ce qu'elle attend, sans qu'on ait a taper une lettre pour le voir.
      applySugg(index: number) {
        this.input = `${this.rebuild(this.sugg[index] ?? "")} `;
        this.closeSugg();
        this.suggest();
        this.$refs["cli"]?.focus();
      },

      // Le doigt valide en un geste : la proposition part sans passer par la touche
      // entree. Un premier mot qui attend un argument ouvre sa liste, sinon la commande
      // partirait incomplete.
      pickSugg(index: number, pointer: PointerEvent) {
        this.applySugg(index);

        if (pointer.pointerType !== "touch") {
          return;
        }

        // Une liste rouverte veut dire que la commande attend encore un mot, a n'importe
        // quel niveau. Ne regarder que le premier mot laissait partir « slime expression ».
        if (this.suggOpen) {
          return;
        }

        this.submit();
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

        // Tant que le prefixe commun avance, il avance : c'est ce que Tab sait faire de
        // moins arbitraire.
        if (shared.length > this.suggFrag.length) {
          this.input = this.rebuild(shared);
          this.suggOpen = true;

          return;
        }

        // Plus rien a gagner. La liste montre deja une ligne en avant, et refuser de la
        // prendre laissait Tab sans effet : « / » met « /slime » en tete, la tabulation
        // n'en faisait rien. Ce que la liste designe, Tab l'applique.
        this.applySugg(this.suggAt);
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
      right(event: KeyboardEvent) {
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
      recall(step: number) {
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
          this.shareTargets = (content.share?.targets ?? []).map(
            (entry: { id: string }) => entry.id,
          );
          this.timeline = content.timeline ?? [];
          this.stack = content.stack ?? [];
          this.techNotes = content.techNotes ?? {};
          this.missions = (content.missions ?? []).map((raw: Record<string, string>) => ({
            dot: safeTone(raw.dot, "ok"),
            id: raw.id,
            label: raw.label,
            state: raw.state ?? "",
          }));
        } catch (error) {
          // Le boot reste affiché : la page ne se rabat jamais sur un contenu figé.
          this.errDetail = `caused by: ${error instanceof Error ? error.message : String(error)}`;
          this.dataErr = true;

          return;
        }

        this.fromHash();

        const waited = performance.now() - started;

        // Le plancher tombe quand le visiteur demande moins de mouvement : il ne reste que
        // le temps de charger le contenu.
        this.booter = setTimeout(
          () => this.finishBoot(),
          Math.max(0, (this.reduced ? 0 : BOOT_MS) - waited),
        );
      },
    }),
  );
});
