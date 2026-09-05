// Interpréteur de commandes du terminal.
//
// Pur et synchrone : il ne touche pas au DOM, ne fait aucune requête, ne pose aucun
// minuteur. Il rend les lignes à afficher et des descripteurs d'effets que la coquille
// applique. C'est ce qui permet de couvrir les commandes sans navigateur.

const YES = /^(o|oui|y|yes|ok)$/i;
const NO = /^(n|non|no|annuler|cancel)$/i;

const line = (m, mc, t, c) => ({ c, m, mc, t });
const info = (t) => line("·", "fg2", t, "fg");
const muted = (t) => line("·", "fg2", t, "fg2");
const done = (t) => line("✓", "ok", t, "fg");
const failed = (t) => line("✗", "warn", t, "fg");
const echoed = (t) => line("›", "acc", t, "fg2");

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
      line("›", "acc", "benjamin.david1@hotmail.fr", "acc"),
    ],
    say: say("salut", "happy"),
  },
  coffee: {
    egg: "coffee",
    lines: [line("418", "warn", "I'm a teapot. Le café se fait hors du navigateur.", "fg")],
  },
  pet: {
    egg: "pet",
    lines: [line("♥", "acc", "La mascotte apprécie modérément, mais elle apprécie.", "fg")],
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
      line("›", "acc", "tapez help pour la liste complète.", "fg2"),
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

function answerPending(input, pending) {
  if (YES.test(input))
    return { effects: [{ payload: pending, type: "send" }], lines: [echoed(input)] };

  if (NO.test(input)) {
    return {
      effects: [track("proposition_refusee", {}), say("comme vous voulez", "idle")],
      lines: [echoed(input), muted("annulé, rien n'a été envoyé.")],
    };
  }

  return { effects: [], lines: [muted("répondez « oui » ou « non » — Échap annule.")] };
}

function slime(argument) {
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
}

export function interpret(raw, context) {
  const input = raw.trim().replace(/\s+/g, " ");

  if (!input) return { effects: [], lines: [] };
  if (context.pending) return answerPending(input, context.pending);

  const parts = input.replace(/^[/:]+/, "").split(" ");
  const command = ALIASES[parts[0].toLowerCase()] ?? parts[0].toLowerCase();
  const argument = (parts[1] ?? "").toLowerCase();
  const rest = parts.slice(1).join(" ");
  const echo = echoed(input);
  const marked = track("commande", { cmd: command });
  const out = (lines, effects = []) => ({ effects: [marked, ...effects], lines: [echo, ...lines] });

  // Retaper la commande de la section en cours la rejoue : les commandes ne s'empilent pas.
  if (input === context.current.cmd) return { effects: [marked, { type: "replay" }], lines: [] };

  const sections = [...context.sections, ...context.details];
  const target = sections.find((entry) => entry.id === command || entry.id === argument);

  if (command === "help") {
    return out(
      [
        ...HELP.map((text) => info(text)),
        line(
          "›",
          "acc",
          "Clavier : / cible la saisie · j / k changent de section · Tab complète · ↑ ↓ rappellent l'historique.",
          "fg2",
        ),
      ],
      [say("essaie « joke »", "happy")],
    );
  }

  if (command === "ls") {
    return out([
      line("·", "fg2", context.sections.map((entry) => entry.id).join("   "), "acc"),
      muted(context.details.map((entry) => entry.id).join("   ")),
    ]);
  }

  if (target) {
    return out(
      [done(`section « ${target.label} » chargée.`)],
      [{ id: target.id, type: "navigate" }, say(`→ ${target.label}`, "happy")],
    );
  }

  if (command === "clear") return { effects: [marked, { type: "clear" }], lines: [] };
  if (command === "slime") {
    const result = slime(argument);

    return out(result.lines, [track("easter_egg", { nom: "slime" }), ...result.effects]);
  }

  if (command === "joke") {
    const next = (context.jokeIndex + 1) % context.jokes.length;

    return out(
      [line("☺", "acc", context.jokes[next], "fg")],
      [
        track("easter_egg", { nom: "joke" }),
        { mood: "laugh", type: "emote" },
        say("héhé", "laugh"),
        { patch: { jokeIndex: next }, type: "state" },
      ],
    );
  }

  if (command === "sleep")
    return out([muted("Mise en veille de la mascotte.")], [say("zzz…", "sleep")]);

  if (command === "matrix") {
    return out(
      [line("·", "fg2", "Réveille-toi, Néo.", "ok")],
      [
        track("easter_egg", { nom: "matrix" }),
        { mood: "scared", type: "emote" },
        { type: "matrix" },
      ],
    );
  }

  if (command === "shutdown" || command === "reboot") {
    return out(
      [line("·", "fg2", "Extinction du système…", "warn")],
      [{ mode: command, type: "power" }],
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
    cowsay: { text: rest, type: "cowsay", width: context.paneWidth },
    cowthink: { text: rest, think: true, type: "cowsay", width: context.paneWidth },
    cv: { type: "cv" },
    email: { type: "email" },
    options: { type: "options" },
    propose: { text: rest, type: "propose" },
    "send-mail": { type: "sendMail" },
    share: { target: argument, type: "share" },
    theme: { type: "theme" },
  }[command];

  if (deferred) return out([], [deferred]);

  return out(
    [failed(`commande introuvable : ${command} — tapez help.`)],
    [track("commande_inconnue", { cmd: command }), say("connais pas", "sad")],
  );
}
