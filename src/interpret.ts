// Interpréteur de commandes du terminal.
//
// Pur et synchrone : il ne touche pas au DOM, ne fait aucune requête, ne pose aucun
// minuteur. Il rend les lignes à afficher et des descripteurs d'effets que la coquille
// applique. C'est ce qui permet de couvrir les commandes sans navigateur.

const YES = /^(?<yes>o|oui|y|yes|ok)$/iu,
  NO = /^(?<no>n|non|no|annuler|cancel)$/iu;

// Les tons sont interpolés dans un attribut style. Sans liste blanche, un ton venu du
// contenu peut fermer la déclaration et injecter du CSS, jusqu'à faire sortir une requête
// vers un serveur tiers.
export const TONES = ["acc", "fg", "fg2", "ok", "warn"] as const;

export type Tone = (typeof TONES)[number];

export type TrackValue = boolean | number | string;

export type Mood = "alert" | "happy" | "idle" | "laugh" | "sad" | "scared" | "sleep";

// Une ligne du journal : puce, couleur de puce, texte, ton. Les noms courts viennent du
// canvas et voyagent jusqu'au balisage.
export interface Line {
  c: Tone;
  m: string;
  mc: Tone;
  t: string;
}

// Un morceau colore a l'interieur d'une ligne de contenu.
export interface Token {
  c: Tone;
  t: string;
  w: string;
}

// Ce que la coquille doit faire. L'interpreteur ne touche jamais au DOM : il decrit, elle
// applique. Cette union est le contrat entre les deux seams.
export type Effect =
  | { type: "activity"; name: string }
  | { type: "ask"; query: string }
  | { type: "blowUp" }
  | { type: "clear" }
  | { type: "copy" }
  | { type: "cv" }
  | { type: "drop" }
  | { type: "email" }
  | { type: "emote"; mood: Mood }
  | { type: "matrix" }
  | { type: "options" }
  | { type: "pending"; answer?: string; payload: string }
  | { type: "power"; mode: string }
  | { type: "probeAI" }
  | { type: "replay" }
  | { type: "say"; mood: Mood; text: string }
  | { type: "send"; payload: string }
  | { type: "sendMail" }
  | { type: "share"; kind: string; url: string }
  | { type: "shareMenu" }
  | { type: "state"; patch: { jokeIndex?: number; pending?: undefined } }
  | { type: "theme" }
  | { type: "track"; event: string; props: Record<string, TrackValue> }
  | { type: "navigate"; id: string };

// Ce qu'une commande dit, avant que le dispatcher n'y ajoute son echo et sa mesure.
// Une ligne telle que content.json l'ecrit. Sept formes d'entree, dont le rendu ne tire
// que trois : bandeau, jetons, ligne simple.
export interface ContentLine {
  banner?: string;
  jq?: [string, string, number | string, string, boolean];
  jqLine?: [string, string];
  jqOpen?: [string, string];
  ls?: string;
  m?: string;
  mc?: string;
  pad?: string;
  size?: string;
  t?: string;
  tone?: string;
  w?: string;
}

// Un easter egg : son nom pour la mesure, ses lignes, et ce qu'il fait dire.
export interface Egg {
  egg: string;
  lines: Line[];
  say?: Effect;
}

export interface Told {
  effects: Effect[];
  lines: Line[];
}

export interface Outcome {
  effects: Effect[];
  lines: Line[];
}

// La cible de partage declaree dans le contenu.
export interface ShareTarget {
  id: string;
  kind: string;
  label: string;
  url: string;
}

export interface Share {
  targets?: ShareTarget[];
  text?: string;
  title?: string;
  url?: string;
}

// Ce que la coquille passe a l'interpreteur : la section ouverte, le contenu charge, et
// l'attente d'une reponse oui ou non.
export interface Entry {
  cmd?: string;
  id: string;
  label: string;
}

// Ce que la completion a besoin de connaitre : les noms qu'elle peut proposer. Elle ne
// lit que les identifiants, pas les libelles.
export interface CompletionContext {
  details: { id: string }[];
  sections: { id: string }[];
  shareTargets: string[];
}

// Ce que la coquille passe a l'interpreteur. Tout est requis : la coquille ne l'appelle
// qu'une fois le contenu charge, et un champ manquant serait un defaut de chargement,
// pas un cas a traiter ici.
export interface Context extends CompletionContext {
  columns: number;
  details: Entry[];
  sections: Entry[];
  current: { cmd?: string; id?: string; label?: string };
  feedback: Record<string, string>;
  jokeIndex: number;
  jokes: string[];
  pending?: string | undefined;
  share: Share;
}

// Une cle libre dans une table fermee. La table garde le type que l'inference lui donne,
// et l'appelant recoit undefined quand la cle n'y est pas.
const lookup = <V>(table: Readonly<Record<string, V>>, key: string): V | undefined => table[key];

const isTone = (value: string): value is Tone => TONES.some((tone) => tone === value);

export const safeTone = (tone: string | undefined, fallback: Tone = "fg"): Tone =>
  tone !== undefined && isTone(tone) ? tone : fallback;

const line = ({
    marker = "",
    markerTone = "fg2",
    text = "",
    tone = "fg",
  }: {
    marker?: string;
    markerTone?: Tone;
    text?: string;
    tone?: Tone;
  }): Line => ({
    c: tone,
    m: marker,
    mc: markerTone,
    t: text,
  }),
  info = (t: string) => line({ marker: "·", text: t }),
  muted = (t: string) => line({ marker: "·", text: t, tone: "fg2" }),
  done = (t: string) => line({ marker: "✓", markerTone: "ok", text: t }),
  failed = (t: string) => line({ marker: "✗", markerTone: "warn", text: t }),
  echoed = (t: string) => line({ marker: "›", markerTone: "acc", text: t, tone: "fg2" }),
  track = (event: string, props: Record<string, TrackValue>): Effect => ({
    event,
    props,
    type: "track",
  }),
  say = (text: string, mood: Mood): Effect => ({ mood, text, type: "say" }),
  MOODS: Record<Mood, string> = {
    alert: "surpris",
    happy: "content",
    idle: "neutre",
    laugh: "hilare",
    sad: "triste",
    scared: "apeuré",
    sleep: "endormi",
  },
  // Deux listes, et elles disent deux choses différentes. « MOODS » nomme toutes les
  // humeurs, « idle » compris, parce que « say » s'en sert pour ramener la mascotte au
  // repos. « OFFERED » est ce que la commande propose, et « idle » n'y est pas : il
  // n'aurait rien montré, la mascotte y est déjà. Ne les refusionnez pas.
  OFFERED: Mood[] = ["alert", "happy", "laugh", "sad", "scared", "sleep"],
  // Une activité demande un accessoire, là où une humeur se lit sur le visage. Le glossaire
  // les sépare, et la commande aussi : « slime activity <nom> ».
  ACTIVITIES = ["bike", "coffee", "goal", "juggle", "lift", "train"],
  HELP = [
    "ls · cd <section> · bd <section>  — naviguer",
    "theme · clear · options          — affichage",
    "ask <question>                    — interroger ce portfolio",
    "ai                                — état du modèle local",
    "cv · email · send-mail            — CV et contact",
    "share <cible>                     — LinkedIn, GitHub, lien",
    "propose [-y] <idée>               — suggérer un ajout",
    "joke · cowsay · cowthink · wtf   — le reste",
    "pet · slime <x> · matrix · shutdown — à vos risques",
  ],
  EGGS = {
    benjamin: {
      egg: "nom",
      lines: [
        info(
          "Vélo de course, code propre, et une conviction : un service doit marcher pour tout le monde.",
        ),
        muted("Si vous lisez ceci, vous avez tapé mon nom dans un terminal. On devrait se parler."),
        line({ marker: "›", markerTone: "acc", text: "benjamin.david1@hotmail.fr", tone: "acc" }),
      ],
      say: say("salut", "happy"),
    },
    coffee: {
      egg: "coffee",
      lines: [
        line({
          marker: "418",
          markerTone: "warn",
          text: "I'm a teapot. Le café se fait hors du navigateur.",
        }),
      ],
    },
    pet: {
      egg: "pet",
      lines: [
        line({
          marker: "♥",
          markerTone: "acc",
          text: "La mascotte apprécie modérément, mais elle apprécie.",
        }),
      ],
      say: say("♥", "happy"),
    },
    sudo: {
      egg: "sudo",
      lines: [failed("benjamin n'est pas dans le fichier sudoers. Cet incident sera signalé.")],
      say: say("non.", "scared"),
    },
    vim: { egg: "vim", lines: [info("Piège classique. :q! ne fonctionne pas ici non plus.")] },
    wtf: {
      egg: "wtf",
      lines: [
        info("Vous êtes dans un portfolio déguisé en terminal. Rien ne s'exécute vraiment."),
        muted("La colonne de gauche navigue, l'onglet « texte » donne la version lisible."),
        line({
          marker: "›",
          markerTone: "acc",
          text: "tapez help pour la liste complète.",
          tone: "fg2",
        }),
      ],
    },
  },
  // Les easter eggs ne repondent qu'au prefixe slash. Une vraie commande de terminal et un
  // raccourci du portfolio sont deux choses differentes, et taper « joke » sans slash ne
  // doit pas les melanger.
  SLASH_ONLY = new Set([
    "benjamin",
    "brezinben",
    "coffee",
    "cowsay",
    "cowthink",
    "joke",
    "matrix",
    "mood",
    "pet",
    "propose",
    "slime",
    "sudo",
    "vim",
    "wtf",
  ]),
  ALIASES = {
    "?": "help",
    aide: "help",
    brezinben: "benjamin",
    cat: "pet",
    cls: "clear",
    copy: "email",
    dir: "ls",
    emacs: "vim",
    exit: "shutdown",
    feedback: "propose",
    ia: "ai",
    idee: "propose",
    mascotte: "pet",
    mood: "slime",
    nano: "vim",
    partager: "share",
    poweroff: "shutdown",
    restart: "reboot",
    resume: "cv",
    sendmail: "send-mail",
    set: "options",
    write: "send-mail",
  },
  answerPending = (input: string, pending: string): Outcome => {
    if (YES.test(input)) {
      return { effects: [{ payload: pending, type: "send" }], lines: [echoed(input)] };
    }

    if (NO.test(input)) {
      return {
        effects: [
          track("proposition_refusee", {}),
          say("comme vous voulez", "idle"),
          { patch: { pending: undefined }, type: "state" },
        ],
        lines: [echoed(input), muted("annulé, rien n'a été envoyé.")],
      };
    }

    return { effects: [], lines: [muted("répondez « oui » ou « non » — Échap annule.")] };
  },
  isMood = (value: string): value is Mood => OFFERED.some((mood) => mood === value),
  slime = (argument: string, name: string): Told => {
    if (argument === "drop" || argument === "jump") {
      return { effects: [{ type: "drop" }], lines: [done("le slime tombe et s'écrase.")] };
    }

    if (argument === "kill") {
      return { effects: [{ type: "blowUp" }], lines: [done("le slime explose.")] };
    }

    if (argument === "activity") {
      if (!ACTIVITIES.includes(name)) {
        return {
          effects: [],
          lines: [info(`slime activity <nom> — ${ACTIVITIES.join(" · ")}`)],
        };
      }

      return {
        effects: [{ name, type: "activity" }],
        lines: [done(`le slime s'y met : ${name}.`)],
      };
    }

    if (!isMood(argument)) {
      return {
        effects: [],
        lines: [
          info(`slime <humeur> — ${OFFERED.join(" · ")}`),
          info(`slime activity <nom> — ${ACTIVITIES.join(" · ")}`),
          info("slime drop — le fait tomber du plafond"),
          info("slime kill — le fait exploser, il revient de lui-même"),
        ],
      };
    }

    return {
      effects: [{ mood: argument, type: "emote" }, say(MOODS[argument], argument)],
      lines: [done(`le slime est ${MOODS[argument]}.`)],
    };
  },
  // Le vocabulaire ne propose que des commandes vivantes, et les easter eggs avec leur
  // slash : sinon l'autocompletion propose ce que le dispatcher refuse.
  PLAIN = [
    "ai",
    "aide",
    "ask",
    "cd",
    "clear",
    "cls",
    "cv",
    "dir",
    "email",
    "help",
    "ls",
    "open",
    "options",
    "reboot",
    "resume",
    "send-mail",
    "share",
    "shutdown",
    "theme",
  ],
  VERBS = [...PLAIN, ...[...SLASH_ONLY].map((egg) => `/${egg}`)];

export const MAX_SUGGESTIONS = 10;

// Le vocabulaire dépend du chemin déjà tapé, et pas seulement du premier mot : « slime »
// propose des humeurs, « slime activity » propose des activités. Proposer le vocabulaire
// entier après l'un ou l'autre ferait du bruit, pas de l'aide.
const argumentsFor = (path: string, context: CompletionContext): string[] | undefined => {
  const ids = [...context.sections, ...context.details].map((entry) => entry.id),
    slimeArguments = [...OFFERED, "activity", "drop", "kill"];

  return {
    bd: ids,
    cd: ids,
    mood: slimeArguments,
    "mood activity": ACTIVITIES,
    open: ids,
    partager: context.shareTargets ?? [],
    share: context.shareTargets ?? [],
    slime: slimeArguments,
    "slime activity": ACTIVITIES,
  }[path];
};

export const candidates = (value: string, context: CompletionContext) => {
  const slash = /^[/:]/.test(value),
    bare = value.replace(/^[/:]+/, ""),
    parts = bare.split(" "),
    first = (parts[0] ?? "").toLowerCase();

  if (parts.length === 1) {
    const pool = [
        ...VERBS,
        ...context.sections.map((entry) => entry.id),
        ...context.details.map((entry) => entry.id),
      ],
      typed = slash ? `/${first}` : first;

    return {
      frag: typed,
      head: "",
      hits: [...new Set(pool)].filter((entry) => entry.startsWith(typed)).slice(0, MAX_SUGGESTIONS),
      slash: false,
    };
  }

  const command = lookup(ALIASES, first) ?? first,
    typed = parts.slice(0, -1),
    // L'alias ne porte que sur le premier mot : « mood activity » suit le meme chemin que
    // « slime activity ».
    path = [command, ...typed.slice(1)].join(" "),
    pool = argumentsFor(path, context) ?? argumentsFor(typed.join(" "), context),
    frag = (parts.at(-1) ?? "").toLowerCase();

  return {
    frag,
    head: typed.join(" "),
    hits: (pool ?? []).filter((entry) => entry.startsWith(frag)).slice(0, MAX_SUGGESTIONS),
    slash,
  };
};

// Tab complète jusqu'au plus long préfixe commun, puis laisse la liste faire le reste.
export const commonPrefix = (entries: string[]): string => {
  if (entries.length === 0) {
    return "";
  }

  return entries.reduce((prefix, entry) => {
    let index = 0;

    while (index < prefix.length && prefix[index] === entry[index]) {
      index += 1;
    }

    return prefix.slice(0, index);
  });
};

// Mise en forme des lignes de contenu venues de content.json. Pure, donc testable sans
// navigateur, au même titre que les commandes.
const JQ_TONE = { num: "warn", str: "ok" } satisfies Record<string, Tone>,
  token = (t: string, c: string | undefined, w = "400"): Token => ({ c: safeTone(c), t, w });

export const contentLine = (raw: ContentLine) => {
  if (raw.banner) {
    return { banner: raw.banner, text: raw.t ?? raw.banner, tone: "acc" as const };
  }

  if (raw.jq) {
    const [pad, key, value, kind, comma] = raw.jq;

    return {
      pad,
      tokens: [
        token(`"${key}"`, "acc", "700"),
        token(": ", "fg2"),
        token(kind === "num" ? String(value) : `"${value}"`, lookup(JQ_TONE, String(kind)) ?? "ok"),
        ...(comma ? [token(",", "fg2")] : []),
      ],
    };
  }

  if (raw.jqOpen) {
    return {
      pad: raw.jqOpen[0],
      tokens: [token(`"${raw.jqOpen[1]}"`, "acc", "700"), token(": {", "fg2")],
    };
  }

  if (raw.jqLine) {
    return { pad: raw.jqLine[0], tokens: [token(raw.jqLine[1], "fg2")] };
  }

  return {
    letterSpacing: raw.ls ?? "0",
    marker: raw.m ?? "",
    markerTone: safeTone(raw.mc, "fg2"),
    pad: raw.pad ?? "0",
    size: raw.size ?? "14px",
    text: raw.t ?? "",
    tone: safeTone(raw.tone),
    weight: raw.w ?? "400",
  };
};

// Cowsay, conforme a l'original : la bulle change de forme selon le nombre de lignes,
// et le retour a la ligne suit la largeur du volet.
const FACES_COW = {
    "-b": { eyes: "==", tongue: "  " },
    "-d": { eyes: "xx", tongue: "U " },
    "-g": { eyes: "$$", tongue: "  " },
    "-p": { eyes: "@@", tongue: "  " },
    "-s": { eyes: "**", tongue: "U " },
    "-t": { eyes: "--", tongue: "  " },
    "-w": { eyes: "OO", tongue: "  " },
    "-y": { eyes: "..", tongue: "  " },
  },
  COW_MODES = Object.keys(FACES_COW),
  wrap = (text: string, columns: number): string[] => {
    const lines = [];
    let current = "";

    for (const word of text.split(" ")) {
      if (current === "") {
        current = word;
      } else if (`${current} ${word}`.length <= columns) {
        current += ` ${word}`;
      } else {
        lines.push(current);
        current = word;
      }
    }

    if (current !== "") {
      lines.push(current);
    }

    return lines.length === 0 ? [""] : lines;
  },
  EDGES = { first: ["/", "\\"], last: ["\\", "/"], middle: ["|", "|"] },
  edgeFor = (index: number, count: number) => {
    if (index === 0) {
      return EDGES.first;
    }

    if (index === count - 1) {
      return EDGES.last;
    }

    return EDGES.middle;
  },
  bubble = (lines: string[], think: boolean): string[] => {
    const width = Math.max(...lines.map((entry) => entry.length)),
      top = ` ${"_".repeat(width + 2)}`,
      bottom = ` ${"-".repeat(width + 2)}`;

    if (think) {
      return [top, ...lines.map((entry) => `( ${entry.padEnd(width)} )`), bottom];
    }

    if (lines.length === 1) {
      return [top, `< ${lines[0]} >`, bottom];
    }

    return [
      top,
      ...lines.map((entry, index) => {
        const [left, right] = edgeFor(index, lines.length);

        return `${left} ${entry.padEnd(width)} ${right}`;
      }),
      bottom,
    ];
  };

export const cowsay = (
  text: string,
  {
    columns = 40,
    mode = "",
    think = false,
  }: { columns?: number; mode?: string; think?: boolean } = {},
): string[] => {
  const face = lookup(FACES_COW, mode) ?? { eyes: "oo", tongue: "  " },
    link = think ? "o" : "\\",
    body = wrap(text.trim() === "" ? "Moo." : text.trim(), Math.max(8, columns - 6));

  return [
    ...bubble(body, think),
    `        ${link}   ^__^`,
    `         ${link}  (${face.eyes})\\_______`,
    "            (__)\\       )\\/\\",
    `             ${face.tongue} ||----w |`,
    "                ||     ||",
  ];
};

export const COW_HEAD_MODES = COW_MODES;

// Les jetons sont substitues dans les URL de partage declarees par content.json : une
// nouvelle cible s'ajoute sans toucher au code.
export const fillTokens = (template: string, share: Share): string =>
  template
    .replaceAll("{url}", encodeURIComponent(share.url ?? ""))
    .replaceAll("{title}", encodeURIComponent(share.title ?? ""))
    .replaceAll("{text}", encodeURIComponent(share.text ?? ""));

const SAFE_SCHEMES = new Set(["https:", "http:", "mailto:"]);

// Une cible déclarée dans le contenu ne doit pas pouvoir exécuter de script. Sans ce
// contrôle, une URL en javascript: passée à open() s'exécute dans notre origine.
export const isSafeUrl = (candidate: string): boolean => {
  try {
    return SAFE_SCHEMES.has(new URL(candidate, "https://portfolio.invalid/").protocol);
  } catch {
    return false;
  }
};

export const shareTarget = (id: string, share: Share) => {
  const target = (share.targets ?? []).find((entry) => entry.id === id);

  if (!target) {
    return undefined;
  }

  const url = fillTokens(target.url ?? "", share);

  if (!isSafeUrl(url)) {
    return undefined;
  }

  return { id: target.id, kind: target.kind, label: target.label, url };
};

// Consentement en deux temps : la commande dit ce qui part, ou, et ce qui ne part pas.
// Rien n'est envoye avant un oui.
export const proposalPrompt = (text: string, feedback: Record<string, string>): Line[] => [
  line({ marker: "›", markerTone: "acc", text: `« ${text} »`, tone: "fg" }),
  line({
    marker: "·",
    text: `Destination : ${feedback.tool}, ${feedback.umamiHost}.`,
    tone: "fg2",
  }),
  line({ marker: "·", text: `Ce qui part : ${feedback.sent}`, tone: "fg2" }),
  line({ marker: "·", text: `Ce qui ne part pas : ${feedback.notSent}`, tone: "fg2" }),
  line({ marker: "?", markerTone: "acc", text: "Envoyer ? tapez oui ou non.", tone: "fg" }),
];

export const interpret = (raw: string, context: Context): Outcome => {
  const input = raw.trim().replace(/\s+/g, " ");

  if (!input) {
    return { effects: [], lines: [] };
  }

  if (context.pending) {
    return answerPending(input, context.pending);
  }

  const prefixed = /^[/:]/.test(input),
    parts = input.replace(/^[/:]+/, "").split(" "),
    typed = (parts[0] ?? "").toLowerCase(),
    command = lookup(ALIASES, typed) ?? typed,
    argument = (parts[1] ?? "").toLowerCase(),
    rest = parts.slice(1).join(" ");

  // Un easter egg tapé sans slash n'est pas une commande : on ne le reconnaît pas.
  if (SLASH_ONLY.has(command) && !prefixed) {
    return {
      effects: [track("commande_inconnue", { cmd: command }), say("connais pas", "sad")],
      lines: [
        echoed(input),
        failed(`commande introuvable : ${command} — essayez /${command} ou tapez help.`),
      ],
    };
  }

  const echo = echoed(input),
    marked = track("commande", { cmd: command }),
    out = (lines: Line[], effects: Effect[] = []): Outcome => ({
      effects: [marked, ...effects],
      lines: [echo, ...lines],
    });

  // Retaper la commande de la section en cours la rejoue : les commandes ne s'empilent pas.
  if (input === context.current.cmd) {
    return { effects: [marked, { type: "replay" }], lines: [] };
  }

  const sections = [...context.sections, ...context.details],
    target = sections.find((entry) => entry.id === command || entry.id === argument);

  if (command === "help") {
    return out(
      [
        ...HELP.map((text) => info(text)),
        line({
          marker: "›",
          markerTone: "acc",
          text: "Clavier : / cible la saisie · j / k changent de section · Tab complète · ↑ ↓ rappellent l'historique.",
          tone: "fg2",
        }),
      ],
      [say("essaie « joke »", "happy")],
    );
  }

  if (command === "ls") {
    return out([
      line({
        marker: "·",
        text: context.sections.map((entry) => entry.id).join("   "),
        tone: "acc",
      }),
      muted(context.details.map((entry) => entry.id).join("   ")),
    ]);
  }

  if (target) {
    return out(
      [done(`section « ${target.label} » chargée.`)],
      [{ id: target.id, type: "navigate" }, say(`→ ${target.label}`, "happy")],
    );
  }

  if (command === "clear") {
    return { effects: [marked, { type: "clear" }], lines: [] };
  }

  if (command === "slime") {
    const result = slime(argument, (parts[2] ?? "").toLowerCase());

    return out(result.lines, [track("easter_egg", { nom: "slime" }), ...result.effects]);
  }

  if (command === "joke") {
    const next =
      context.jokes.length < 2
        ? 0
        : (context.jokeIndex + 1 + Math.floor(Math.random() * (context.jokes.length - 1))) %
          context.jokes.length;

    return out(
      [line({ marker: "☺", markerTone: "acc", text: context.jokes[next] ?? "" })],
      [
        track("easter_egg", { nom: "joke" }),
        { mood: "laugh", type: "emote" },
        say("héhé", "laugh"),
        { patch: { jokeIndex: next }, type: "state" },
      ],
    );
  }

  if (command === "sleep") {
    return out([muted("Mise en veille de la mascotte.")], [say("zzz…", "sleep")]);
  }

  if (command === "matrix") {
    return out(
      [line({ marker: "·", text: "Réveille-toi, Néo.", tone: "ok" })],
      [
        track("easter_egg", { nom: "matrix" }),
        { mood: "scared", type: "emote" },
        { type: "matrix" },
      ],
    );
  }

  if (command === "shutdown" || command === "reboot") {
    return out(
      [line({ marker: "·", text: "Extinction du système…", tone: "warn" })],
      [{ mode: command, type: "power" }],
    );
  }

  if (command === "cowsay" || command === "cowthink") {
    // Les huit visages de l'original restent, mais sans drapeau a retenir : un portfolio
    // n'est pas une page de manuel. Le tirage rend la commande vivante a chaque appel.
    const mode = COW_MODES[Math.floor(Math.random() * COW_MODES.length)] ?? "",
      said = rest.trim();

    return out(
      cowsay(said, { columns: context.columns, mode, think: command === "cowthink" }).map((row) =>
        line({ text: row, tone: "fg" }),
      ),
      [track("easter_egg", { nom: command })],
    );
  }

  if (command === "propose") {
    const forced = /^-y(?:\s|$)/u.test(rest),
      idea = (forced ? rest.slice(2) : rest).trim();

    if (idea === "") {
      return out([info("propose [-y] <idée> — suggérer un ajout à ce portfolio.")]);
    }

    // `-y` vaut consentement : le visiteur a écrit le drapeau en même temps que l'idée.
    if (forced) {
      return out(
        [line({ marker: "›", markerTone: "acc", text: `« ${idea} »`, tone: "fg" })],
        [{ payload: idea, type: "send" }],
      );
    }

    // La réponse attendue est déjà dans la saisie : la validation tient en une touche.
    return out(proposalPrompt(idea, context.feedback ?? {}), [
      { answer: "oui", payload: idea, type: "pending" },
    ]);
  }

  if (command === "share") {
    if (argument === "") {
      const ids = (context.share?.targets ?? []).map((entry) => entry.id).join(" · ");

      return out([info(`share <cible> — ${ids}`)], [{ type: "shareMenu" }]);
    }

    const chosen = shareTarget(argument, context.share ?? {});

    if (!chosen) {
      return out([failed(`cible inconnue : ${argument}`)]);
    }

    return out(
      [done(`partage vers ${chosen.label}.`)],
      [
        track("partage", { cible: chosen.id }),
        { kind: chosen.kind, type: "share", url: chosen.url },
      ],
    );
  }

  const egg = lookup<Egg>(EGGS, command);

  if (egg) {
    return out(egg.lines, [track("easter_egg", { nom: egg.egg }), ...(egg.say ? [egg.say] : [])]);
  }

  // Ces commandes appartiennent à d'autres tickets. Elles passent quand même par le
  // dispatcher, pour qu'il reste le point unique.
  const deferred = {
      ai: { type: "probeAI" },
      ask: { query: rest, type: "ask" },
      cv: { type: "cv" },
      email: { type: "email" },
      options: { type: "options" },

      "send-mail": { type: "sendMail" },
      theme: { type: "theme" },
    } satisfies Record<string, Effect>,
    waiting = lookup<Effect>(deferred, command);

  if (waiting) {
    return out([], [waiting]);
  }

  return out(
    [failed(`commande introuvable : ${command} — tapez help.`)],
    [track("commande_inconnue", { cmd: command }), say("connais pas", "sad")],
  );
};
