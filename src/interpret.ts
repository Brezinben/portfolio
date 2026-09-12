// Interpréteur de commandes du terminal.
//
// Pur et synchrone : il ne touche pas au DOM, ne fait aucune requête, ne pose aucun
// minuteur. Il rend les lignes à afficher et des descripteurs d'effets que la coquille
// applique. C'est ce qui permet de couvrir les commandes sans navigateur.

import { ACTIVITIES, OFFERED, slime } from "./interpret/mascot.ts";
import {
  ALIASES,
  ASK,
  ASK_MODEL,
  KEYBOARD,
  NAVIGATORS,
  SLASH_ONLY,
  helpLines,
  vocabulary,
} from "./interpret/vocabulary.ts";
import { COW_MODES, cowsay } from "./interpret/cowsay.ts";
import type { CompletionContext, Context, Entry } from "./interpret/context.ts";
import { EGGS, type Egg } from "./interpret/eggs.ts";
import { type Effect, type Outcome, say, track } from "./interpret/effects.ts";
import {
  type Line,
  MAX_SUGGESTIONS,
  done,
  echoed,
  failed,
  info,
  line,
  muted,
  offer,
} from "./interpret/lines.ts";
import { lookup } from "./interpret/lookup.ts";
import { shareTarget } from "./interpret/share.ts";

// La facade : les tests et la coquille passent par cette porte, jamais par un module de
// « interpret/ ». Elle n'expose que ce qui a un consommateur.
export { type ContentLine, type Token, contentLine } from "./interpret/content.ts";
export {
  type Effect,
  type Expression,
  type Outcome,
  type TrackValue,
} from "./interpret/effects.ts";
export { type CompletionContext, type Context, type Entry } from "./interpret/context.ts";
export { COW_HEAD_MODES, cowsay } from "./interpret/cowsay.ts";
export { MAX_SUGGESTIONS, type Line } from "./interpret/lines.ts";
export { TONES, type Tone, safeTone } from "./interpret/tone.ts";
export {
  type Share,
  type ShareTarget,
  fillTokens,
  isSafeUrl,
  shareTarget,
} from "./interpret/share.ts";

const YES = /^(?<yes>o|oui|y|yes|ok)$/iu,
  NO = /^(?<no>n|non|no|annuler|cancel)$/iu;

const answerPending = (input: string, pending: string): Outcome => {
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
};

// Le vocabulaire dépend du chemin déjà tapé, et pas seulement du premier mot : « slime »
// propose ses sous-commandes, « slime expression » les expressions, « slime activity » les
// activités. Proposer le vocabulaire entier après l'un ou l'autre ferait du bruit.
const argumentsFor = (path: string, context: CompletionContext): string[] | undefined => {
    const ids = [...context.sections, ...context.details].map((entry) => entry.id),
      // Quatre sous-commandes claires valent mieux que dix mots melanges : les expressions
      // vivent un niveau plus bas, derriere « expression ».
      slimeArguments = ["expression", "activity", "evolve", "drop", "kill"];

    return {
      bd: ids,
      cd: ids,
      open: ids,
      share: context.shareTargets ?? [],
      slime: slimeArguments,
      "slime activity": ACTIVITIES,
      "slime expression": OFFERED,
      theme: context.themes,
    }[path];
  },
  // La liste ne montre que des noms, et un nom n'apprend rien : ni « bd », ni « goal ». Une
  // ligne sous la liste dit ce que fait la proposition choisie. Les noms venus du contenu
  // n'y sont pas : leur identifiant est deja leur libelle.
  HINTS = {
    "": {
      "/benjamin": "qui je suis, en trois lignes",
      "/brezinben": "qui je suis, en trois lignes",
      "/coffee": "un café ? pas ici",
      "/cowsay": "une vache dit ce que vous tapez",
      "/joke": "une blague de développeur",
      "/matrix": "réveille-toi, Néo",
      "/propose": "suggérez un ajout à ce portfolio",
      "/slime": "commande la mascotte",
      "/sudo": "non.",
      "/vim": "le piège classique",
      "?": "la liste des commandes",
      aide: "la liste des commandes",
      ask: "cherche dans le texte du site",
      "ask✨": "un modèle local choisit la réponse",
      bd: "ouvre une section",
      cd: "ouvre une section",
      clear: "vide le journal",
      cls: "vide le journal",
      cv: "mon CV",
      dir: "liste les sections et les fiches",
      email: "copie mon adresse",
      help: "la liste des commandes",
      ls: "liste les sections et les fiches",
      open: "ouvre une section",
      options: "ouvre les réglages",
      reboot: "redémarre le terminal",
      resume: "mon CV",
      "send-mail": "ouvre votre logiciel de courrier",
      share: "partage ce portfolio",
      shutdown: "éteint le terminal",
      sleep: "endort la mascotte",
      theme: "change de thème",
    },
    slime: {
      activity: "lui donne une occupation",
      drop: "le fait tomber du plafond",
      evolve: "lui fait changer de forme",
      expression: "change son visage",
      kill: "le fait exploser, il revient",
    },
    "slime activity": {
      bike: "il pédale",
      coffee: "il prend un café",
      goal: "il marque un but",
      juggle: "il jongle",
      lift: "il soulève de la fonte",
      train: "il prend le train",
    },
    "slime expression": {
      alert: "il sursaute",
      happy: "il est content",
      laugh: "il rit",
      sad: "il est triste",
      scared: "il prend peur",
      sleep: "il s'endort",
    },
  };

export const hintFor = (head: string, value: string): string =>
  lookup(lookup<Record<string, string>>(HINTS, head) ?? {}, value) ?? "";

export const candidates = (value: string, context: CompletionContext) => {
  // L'interpréteur normalise les espaces avant de lire la commande. La complétion suit le
  // même chemin, sinon un espace de trop la rend muette. L'espace final, lui, reste : c'est
  // lui qui annonce l'argument suivant.
  const input = value.replace(/^\s+/u, "").replace(/\s+/gu, " "),
    slash = /^[/:]/.test(input),
    bare = input.replace(/^[/:]+/, ""),
    parts = bare.split(" "),
    first = (parts[0] ?? "").toLowerCase();

  // Une saisie faite d'espaces se normalise en chaine vide. Sans ce garde, appuyer sur la
  // barre d'espace dans une ligne vide ouvrirait le vocabulaire entier.
  if (input === "" && value !== "") {
    return { frag: "", head: "", hits: [], slash: false };
  }

  if (parts.length === 1) {
    const pool = [
        ...vocabulary(context.model),
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
    typed = parts.slice(0, -1).map((word) => word.toLowerCase()),
    // L'alias ne porte que sur le premier mot : « mascotte activity » suivrait le meme
    // chemin que « slime activity ».
    path = [command, ...typed.slice(1)].join(" "),
    pool = argumentsFor(path, context),
    frag = (parts.at(-1) ?? "").toLowerCase();

  return {
    frag,
    head: typed.join(" "),
    hits: (pool ?? []).filter((entry) => entry.startsWith(frag)).slice(0, MAX_SUGGESTIONS),
    slash,
  };
};

// Tab complète jusqu'au plus long préfixe commun, puis laisse la liste faire le reste.
// Les mots trop frequents pour departager deux passages. La liste est courte a dessein :
// une question posee a un portfolio tient en quelques mots, et en retirer trop la vide.
const VIDES = new Set([
    "a",
    "au",
    "aux",
    "avec",
    "ce",
    "ces",
    "dans",
    "de",
    "des",
    "du",
    "elle",
    "en",
    "et",
    "il",
    "je",
    "la",
    "le",
    "les",
    "leur",
    "lui",
    "ma",
    "mais",
    "me",
    "mes",
    "mon",
    "ne",
    "nous",
    "on",
    "ou",
    "par",
    "pas",
    "pour",
    "qu",
    "que",
    "qui",
    "sa",
    "se",
    "ses",
    "son",
    "sur",
    "ta",
    "te",
    "tes",
    "toi",
    "ton",
    "tu",
    "un",
    "une",
    "vos",
    "votre",
    "vous",
    "y",
  ]),
  // Une recherche ne doit pas dependre des accents ni de la casse : « éco-conception » se
  // cherche « eco conception ».
  words = (text: string): string[] =>
    text
      .normalize("NFD")
      .replaceAll(/\p{Diacritic}/gu, "")
      .toLowerCase()
      .split(/[^\p{Letter}\p{Number}]+/u)
      .filter((mot) => mot.length > 1 && !VIDES.has(mot));

// Un score par recouvrement de mots, sans index ni modele. Le corpus fait dix passages
// ecrits a la main : tout ce qui serait plus savant couterait plus qu'il ne rapporte.
//
// Un mot du titre pese trois fois : demander « stack » doit ouvrir la section stack, meme
// si un autre passage prononce le mot plus souvent.
export const search = (query: string, entries: Entry[]) => {
  const wanted = new Set(words(query));

  if (wanted.size === 0) {
    return [];
  }

  return entries
    .filter((entry) => (entry.ask ?? "") !== "")
    .map((entry) => {
      const body = words(entry.ask ?? ""),
        title = new Set(words(entry.label)),
        shared = body.filter((word) => wanted.has(word)),
        hitCount = shared.length,
        distinct = new Set(shared).size,
        inTitle = [...wanted].filter((word) => title.has(word)).length;

      // Le nombre de mots distincts touches prime sur les repetitions : un passage qui
      // repond a toute la question vaut mieux qu'un qui martele un seul de ses mots.
      return { entry, score: distinct * 10 + hitCount + inTitle * 30 };
    })
    .filter((hit) => hit.score > 0)
    .toSorted((one, other) => other.score - one.score);
};

// La reponse est toujours le texte du corpus, jamais un texte produit. Un modele, quand il
// y en a un, ne fait que choisir parmi ces passages : il ne parle pas a la place de
// Benjamin.
const answer = (query: string, entries: Entry[], model: boolean) => {
  const shown = model ? ASK_MODEL : ASK;

  if (query.trim() === "") {
    return {
      effects: [],
      lines: [
        info(`${shown} — posez une question en français. Par exemple : ${shown} accessibilité`),
      ],
    };
  }

  const hits = search(query, entries),
    [best] = hits,
    others = hits.slice(1, 4).map((hit) => hit.entry.label),
    // Le modele voit tous les passages, pas seulement ceux qui partagent un mot avec la
    // question. Lui donner la liste du recouvrement le reduirait a reclasser ce que la
    // recherche lexicale a deja trouve, et « comment tu bosses » ne trouve rien du tout.
    answerable = entries.filter((entry) => (entry.ask ?? "") !== "").map((entry) => entry.id),
    lexical = best
      ? [
          done(best.entry.label),
          line({ text: best.entry.ask ?? "" }),
          ...(others.length > 0 ? [muted(`voir aussi : ${others.join(" · ")}`)] : []),
        ]
      : [
          failed("rien ne répond à cette question dans ce portfolio."),
          muted("help donne la liste des commandes."),
        ],
    measured = track(best ? "ask" : "ask_sans_reponse", { query });

  if (!model || answerable.length === 0) {
    return { effects: [measured], lines: lexical };
  }

  // Sans modele, la reponse part tout de suite. Avec un modele, elle attend son choix :
  // deux reponses de suite pour une seule question se liraient comme une hesitation.
  return {
    effects: [measured, { candidates: answerable, lexical, query, type: "ask" } satisfies Effect],
    lines: [],
  };
};

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
    target = sections.find(
      (entry) => entry.id === command || (NAVIGATORS.has(command) && entry.id === argument),
    );

  // Sept lignes ne tiennent pas dans le journal d'un ecran large. La reponse va donc dans
  // le resultat, et le journal ne garde que l'echo.
  if (command === "help") {
    return {
      ...out([], [say("essaie « /joke »", "happy")]),
      result: [
        ...helpLines(context.model).map((text) => ({ m: "·", t: text })),
        { m: "›", mc: "acc", t: KEYBOARD, tone: "fg2" },
      ],
    };
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

  if (NAVIGATORS.has(command)) {
    const ids = sections.map((entry) => entry.id),
      usage = offer(`${command} <section>`, ids);

    return out(argument === "" ? [usage] : [failed(`section inconnue : ${argument}`), usage]);
  }

  if (command === "clear") {
    return { effects: [marked, { type: "clear" }], lines: [] };
  }

  if (command === "slime") {
    const result = slime(argument, (parts[2] ?? "").toLowerCase(), context.mascot);

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
        { expression: "laugh", type: "emote" },
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
      [track("easter_egg", { nom: "matrix" }), { expression: "scared", type: "emote" }],
    );
  }

  if (command === "shutdown" || command === "reboot") {
    const said = command === "reboot" ? "Redémarrage du système…" : "Extinction du système…";

    return out(
      [line({ marker: "·", text: said, tone: "warn" })],
      [{ mode: command, type: "power" }],
    );
  }

  if (command === "cowsay") {
    // Les huit visages de l'original restent, mais sans drapeau a retenir : un portfolio
    // n'est pas une page de manuel. Le tirage rend la commande vivante a chaque appel.
    const mode = COW_MODES[Math.floor(Math.random() * COW_MODES.length)] ?? "",
      said = rest.trim();

    return out(
      cowsay(said, { columns: context.columns, mode }).map((row) =>
        line({ text: row, tone: "fg" }),
      ),
      [track("easter_egg", { nom: command })],
    );
  }

  if (command === "propose") {
    const forced = /^-y(?:\s|$)/u.test(rest),
      idea = (forced ? rest.slice(2) : rest).trim();

    if (idea === "") {
      return out([info("/propose [-y] <idée> — suggérer un ajout à ce portfolio.")]);
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

  // Il n'y a pas de PDF a servir, et la version texte porte deja tout le parcours. La
  // commande l'ouvre, et l'annonce : une navigation muette se lit comme une commande cassee.
  if (command === "cv") {
    return out([info("le parcours complet s'ouvre dans la version texte.")], [{ type: "cv" }]);
  }

  if (command === "theme") {
    if (argument === "") {
      return out([offer("theme <nom>", context.themes)]);
    }

    if (!context.themes.includes(argument)) {
      return out([failed(`thème inconnu : ${argument}`), offer("theme <nom>", context.themes)]);
    }

    return out([done(`thème « ${argument} ».`)], [{ name: argument, type: "theme" }]);
  }

  if (command === "share") {
    const targets = (context.share?.targets ?? []).map((entry) => entry.id);

    if (argument === "") {
      return out([offer("share <cible>", targets)], [{ type: "shareMenu" }]);
    }

    const chosen = shareTarget(argument, context.share ?? {});

    if (!chosen) {
      return out([failed(`cible inconnue : ${argument}`), offer("share <cible>", targets)]);
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

  if (command === "ask") {
    const trouve = answer(rest, sections, context.model);

    return out(trouve.lines, trouve.effects);
  }

  // Ces commandes appartiennent à d'autres tickets. Elles passent quand même par le
  // dispatcher, pour qu'il reste le point unique.
  const deferred = {
      email: { type: "email" },
      options: { type: "options" },

      "send-mail": { type: "sendMail" },
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
