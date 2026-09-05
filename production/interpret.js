// Interpréteur de commandes du terminal.
//
// Pur et synchrone : il ne touche pas au DOM, ne fait aucune requête, ne pose aucun
// minuteur. Il rend les lignes à afficher et des descripteurs d'effets que la coquille
// applique. C'est ce qui permet de couvrir les commandes sans navigateur.

const YES = /^(?<yes>o|oui|y|yes|ok)$/iu;
const NO = /^(?<no>n|non|no|annuler|cancel)$/iu;

const line = ({ marker = "", markerTone = "fg2", text, tone = "fg" }) => ({
  c: tone,
  m: marker,
  mc: markerTone,
  t: text,
});
const info = (t) => line({ marker: "·", text: t });
const muted = (t) => line({ marker: "·", text: t, tone: "fg2" });
const done = (t) => line({ marker: "✓", markerTone: "ok", text: t });
const failed = (t) => line({ marker: "✗", markerTone: "warn", text: t });
const echoed = (t) => line({ marker: "›", markerTone: "acc", text: t, tone: "fg2" });

const track = (event, props) => ({ event, props, type: "track" });
const say = (text, mood) => ({ mood, text, type: "say" });

const MOODS = {
  alert: "surpris",
  happy: "content",
  idle: "neutre",
  laugh: "hilare",
  sad: "triste",
  scared: "apeuré",
  sleep: "endormi",
};

const HELP = [
  "ls · cd <section> · bd <section>  — naviguer",
  "theme · clear · options          — affichage",
  "ask <question>                    — interroger ce portfolio",
  "ai                                — état du modèle local",
  "cv · email · send-mail            — CV et contact",
  "share <cible>                     — LinkedIn, GitHub, lien",
  "propose <idée>                    — suggérer un ajout",
  "joke · cowsay [-bdgpstwy] · wtf   — le reste",
  "pet · slime <x> · matrix · shutdown — à vos risques",
];

const EGGS = {
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
};

const ALIASES = {
  "?": "help",
  aide: "help",
  blague: "joke",
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
};

const answerPending = (input, pending) => {
  if (YES.test(input)) {
    return { effects: [{ payload: pending, type: "send" }], lines: [echoed(input)] };
  }

  if (NO.test(input)) {
    return {
      effects: [track("proposition_refusee", {}), say("comme vous voulez", "idle")],
      lines: [echoed(input), muted("annulé, rien n'a été envoyé.")],
    };
  }

  return { effects: [], lines: [muted("répondez « oui » ou « non » — Échap annule.")] };
};

const slime = (argument) => {
  if (argument === "drop" || argument === "jump") {
    return { effects: [{ type: "drop" }], lines: [done("le slime saute et s'écrase.")] };
  }

  if (!MOODS[argument]) {
    return {
      effects: [],
      lines: [
        info(`slime <humeur> — ${Object.keys(MOODS).join(" · ")}`),
        info("slime drop — le fait tomber du plafond"),
      ],
    };
  }

  return {
    effects: [{ mood: argument, type: "emote" }, say(MOODS[argument], argument)],
    lines: [done(`le slime est ${MOODS[argument]}.`)],
  };
};

const VERBS = [
  "ai",
  "aide",
  "ask",
  "benjamin",
  "blague",
  "brezinben",
  "cd",
  "clear",
  "cls",
  "coffee",
  "copy",
  "cowsay",
  "cowthink",
  "cv",
  "dir",
  "email",
  "emacs",
  "exit",
  "feedback",
  "help",
  "idee",
  "ia",
  "joke",
  "ls",
  "mascotte",
  "matrix",
  "mood",
  "nano",
  "open",
  "options",
  "partager",
  "pet",
  "poweroff",
  "propose",
  "reboot",
  "restart",
  "resume",
  "send-mail",
  "sendmail",
  "set",
  "share",
  "shutdown",
  "slime",
  "sleep",
  "sudo",
  "theme",
  "vim",
  "wtf",
];

export const MAX_SUGGESTIONS = 10;

// Le second mot n'a de sens que pour certaines commandes. Proposer le vocabulaire entier
// après « slime » ferait du bruit, pas de l'aide.
const argumentsFor = (command, context) => {
  const ids = [...context.sections, ...context.details].map((entry) => entry.id);

  return {
    bd: ids,
    cd: ids,
    cowsay: COW_MODES,
    cowthink: COW_MODES,
    mood: [...Object.keys(MOODS), "drop"],
    open: ids,
    partager: context.shareTargets ?? [],
    share: context.shareTargets ?? [],
    slime: [...Object.keys(MOODS), "drop"],
  }[command];
};

export const candidates = (value, context) => {
  const slash = /^[/:]/.test(value);
  const bare = value.replace(/^[/:]+/, "");
  const parts = bare.split(" ");
  const first = parts[0].toLowerCase();

  if (parts.length === 1) {
    const pool = [
      ...VERBS,
      ...context.sections.map((entry) => entry.id),
      ...context.details.map((entry) => entry.id),
    ];

    return {
      frag: first,
      head: "",
      hits: [...new Set(pool)].filter((entry) => entry.startsWith(first)).slice(0, MAX_SUGGESTIONS),
      slash,
    };
  }

  const command = ALIASES[first] ?? first;
  const pool = argumentsFor(command, context) ?? argumentsFor(first, context);
  const frag = parts.at(-1).toLowerCase();

  return {
    frag,
    head: parts.slice(0, -1).join(" "),
    hits: (pool ?? []).filter((entry) => entry.startsWith(frag)).slice(0, MAX_SUGGESTIONS),
    slash,
  };
};

// Tab complète jusqu'au plus long préfixe commun, puis laisse la liste faire le reste.
export const commonPrefix = (entries) => {
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
const JQ_TONE = { num: "warn", str: "ok" };

const token = (t, c, w = "400") => ({ c, t, w });

export const contentLine = (raw) => {
  if (raw.banner) {
    return { banner: raw.banner, text: raw.t ?? raw.banner, tone: "acc" };
  }

  if (raw.jq) {
    const [pad, key, value, kind, comma] = raw.jq;

    return {
      pad,
      tokens: [
        token(`"${key}"`, "acc", "700"),
        token(": ", "fg2"),
        token(kind === "num" ? String(value) : `"${value}"`, JQ_TONE[kind] ?? "ok"),
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
    markerTone: raw.mc ?? "fg2",
    pad: raw.pad ?? "0",
    size: raw.size ?? "14px",
    text: raw.t ?? "",
    tone: raw.tone ?? "fg",
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
};

const COW_MODES = Object.keys(FACES_COW);

const wrap = (text, columns) => {
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
};

const EDGES = { first: ["/", "\\"], last: ["\\", "/"], middle: ["|", "|"] };

const edgeFor = (index, count) => {
  if (index === 0) {
    return EDGES.first;
  }

  if (index === count - 1) {
    return EDGES.last;
  }

  return EDGES.middle;
};

const bubble = (lines, think) => {
  const width = Math.max(...lines.map((entry) => entry.length));
  const top = ` ${"_".repeat(width + 2)}`;
  const bottom = ` ${"-".repeat(width + 2)}`;

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

export const cowsay = (text, { columns = 40, mode = "", think = false } = {}) => {
  const face = FACES_COW[mode] ?? { eyes: "oo", tongue: "  " };
  const link = think ? "o" : "\\";
  const body = wrap(text.trim() === "" ? "Moo." : text.trim(), Math.max(8, columns - 6));

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
export const fillTokens = (template, share) =>
  template
    .replaceAll("{url}", encodeURIComponent(share.url ?? ""))
    .replaceAll("{title}", encodeURIComponent(share.title ?? ""))
    .replaceAll("{text}", encodeURIComponent(share.text ?? ""));

export const shareTarget = (id, share) => {
  const target = (share.targets ?? []).find((entry) => entry.id === id);

  if (!target) {
    return undefined;
  }

  return {
    id: target.id,
    kind: target.kind,
    label: target.label,
    url: fillTokens(target.url ?? "", share),
  };
};

// Consentement en deux temps : la commande dit ce qui part, ou, et ce qui ne part pas.
// Rien n'est envoye avant un oui.
export const proposalPrompt = (text, feedback) => [
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

export const interpret = (raw, context) => {
  const input = raw.trim().replace(/\s+/g, " ");

  if (!input) {
    return { effects: [], lines: [] };
  }

  if (context.pending) {
    return answerPending(input, context.pending);
  }

  const parts = input.replace(/^[/:]+/, "").split(" ");
  const command = ALIASES[parts[0].toLowerCase()] ?? parts[0].toLowerCase();
  const argument = (parts[1] ?? "").toLowerCase();
  const rest = parts.slice(1).join(" ");
  const echo = echoed(input);
  const marked = track("commande", { cmd: command });
  const out = (lines, effects = []) => ({ effects: [marked, ...effects], lines: [echo, ...lines] });

  // Retaper la commande de la section en cours la rejoue : les commandes ne s'empilent pas.
  if (input === context.current.cmd) {
    return { effects: [marked, { type: "replay" }], lines: [] };
  }

  const sections = [...context.sections, ...context.details];
  const target = sections.find((entry) => entry.id === command || entry.id === argument);

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
    const result = slime(argument);

    return out(result.lines, [track("easter_egg", { nom: "slime" }), ...result.effects]);
  }

  if (command === "joke") {
    const next = (context.jokeIndex + 1) % context.jokes.length;

    return out(
      [line({ marker: "☺", markerTone: "acc", text: context.jokes[next] })],
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
    const mode = COW_MODES.includes(argument) ? argument : "";
    const said = rest.replace(mode, "").trim();

    return out(
      cowsay(said, { columns: context.columns, mode, think: command === "cowthink" }).map((row) =>
        line({ text: row, tone: "fg" }),
      ),
      [track("easter_egg", { nom: command })],
    );
  }

  if (command === "propose") {
    if (rest.trim() === "") {
      return out([info("propose <idée> — suggérer un ajout à ce portfolio.")]);
    }

    return out(proposalPrompt(rest, context.feedback ?? {}), [{ payload: rest, type: "pending" }]);
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

  const egg = EGGS[command];

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
  }[command];

  if (deferred) {
    return out([], [deferred]);
  }

  return out(
    [failed(`commande introuvable : ${command} — tapez help.`)],
    [track("commande_inconnue", { cmd: command }), say("connais pas", "sad")],
  );
};
