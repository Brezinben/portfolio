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

// Dix propositions au maximum, sans défilement. Le même seuil décide si une aide en
// ligne peut lister ses valeurs ou doit renvoyer à la tabulation.
export const MAX_SUGGESTIONS = 10;

export type TrackValue = boolean | number | string;

export type Expression = "alert" | "happy" | "idle" | "laugh" | "sad" | "scared" | "sleep";

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
  // « lexical » n'est rempli que si un modele doit choisir avant d'afficher. La coquille
  // le garde sous la main : il sort si le modele echoue ou depasse son delai.
  | { candidates: string[]; query: string; type: "ask"; lexical?: Line[] }
  | { type: "blowUp" }
  | { type: "clear" }
  | { type: "cv" }
  | { type: "drop" }
  | { type: "email" }
  | { type: "emote"; expression: Expression }
  | { type: "usage" }
  | { type: "evolve" }
  | { type: "options" }
  | { type: "pending"; answer?: string; payload: string }
  | { type: "power"; mode: string }
  | { type: "replay" }
  | { type: "say"; expression: Expression; text: string }
  | { type: "send"; payload: string }
  | { type: "sendMail" }
  | { type: "share"; kind: string; url: string }
  | { type: "shareMenu" }
  | { type: "state"; patch: { jokeIndex?: number; pending?: undefined } }
  | { type: "theme"; name: string }
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
  // Une commande peut reclamer le resultat au lieu du journal. Le journal garde l'echo, le
  // corps de la reponse va dans le volet central, ou la place existe.
  result?: ContentLine[];
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
  // Le resume que la recherche interroge. Il est ecrit a la main dans content.json : c'est
  // la seule prose du site qui repond a une question au lieu de decrire un ecran.
  ask?: string;
  cmd?: string;
  id: string;
  label: string;
}

// Ce que la completion a besoin de connaitre : les noms qu'elle peut proposer. Elle ne
// lit que les identifiants, pas les libelles.
export interface CompletionContext {
  // Un modele local installe et disponible. La coquille l'apprend d'un appel asynchrone au
  // demarrage, que l'interpreteur ne peut pas faire : il est pur et synchrone.
  model: boolean;
  details: { id: string }[];
  sections: { id: string }[];
  shareTargets: string[];
  themes: string[];
}

// Ce que la coquille passe a l'interpreteur. Tout est requis : la coquille ne l'appelle
// qu'une fois le contenu charge, et un champ manquant serait un defaut de chargement,
// pas un cas a traiter ici.
export interface Context extends CompletionContext {
  columns: number;
  // La mascotte est absente pendant son explosion et pendant son voyage en train. Sans
  // cette information, l'interpreteur annonce des gestes que la coquille ne joue pas.
  // « away » : explosee ou partie en train. « busy » : en train de changer de forme, donc
  // presente mais indisponible. « asleep » : le reseau est coupe, elle dort jusqu'a son
  // retour. La coquille sait, l'interpreteur ne devine pas.
  mascot: "asleep" | "away" | "busy" | "here";
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
const lookup = <V>(table: Readonly<Record<string, V>>, key: string): V | undefined =>
    Object.hasOwn(table, key) ? table[key] : undefined,
  isTone = (value: string): value is Tone => TONES.some((tone) => tone === value);

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
  // Sous dix valeurs, la liste tient sur une ligne et se lit d'un coup. Au-dela, elle
  // deborde du volet : la completion la montre mieux, et la ligne apprend la touche.
  offer = (usage: string, values: string[]) =>
    info(
      values.length < MAX_SUGGESTIONS
        ? `${usage} — ${values.join(" · ")}`
        : `${usage} — Tab propose les ${Math.min(values.length, MAX_SUGGESTIONS)} valeurs`,
    ),
  track = (event: string, props: Record<string, TrackValue>): Effect => ({
    event,
    props,
    type: "track",
  }),
  say = (text: string, expression: Expression): Effect => ({ expression, text, type: "say" }),
  EXPRESSIONS: Record<Expression, string> = {
    alert: "surpris",
    happy: "content",
    idle: "neutre",
    laugh: "hilare",
    sad: "triste",
    scared: "apeuré",
    sleep: "endormi",
  },
  // Deux listes, et elles disent deux choses différentes. « EXPRESSIONS » nomme toutes les
  // expressions, « idle » compris, parce que « say » s'en sert pour ramener la mascotte au
  // repos. « OFFERED » est ce que la commande propose, et « idle » n'y est pas : il
  // n'aurait rien montré, la mascotte y est déjà. Ne les refusionnez pas.
  OFFERED: Expression[] = ["alert", "happy", "laugh", "sad", "scared", "sleep"],
  // Une activité demande un accessoire, là où une expression se lit sur le visage. Le glossaire
  // les sépare, et la commande aussi : « slime activity <nom> ».
  ACTIVITIES = ["bike", "coffee", "goal", "juggle", "lift", "train"],
  // La recherche porte deux noms, jamais les deux a la fois. Sans modele elle repond par
  // recouvrement de mots ; avec un modele, c'est lui qui choisit le passage, et l'etincelle
  // le dit. Une commande « ai » separee obligeait a demander si le modele etait la : le nom
  // de la commande le montre maintenant.
  ASK = "ask",
  ASK_MODEL = "ask✨",
  // L'etincelle occupe deux colonnes dans une police a chasse fixe. Sans ce comptage, la
  // ligne d'aide qui la porte decalerait son tiret d'une colonne.
  displayWidth = (text: string) => text.length + (text.includes("✨") ? 1 : 0),
  askLine = (model: boolean) => {
    const shown = `${model ? ASK_MODEL : ASK} <question>`;

    return `${shown}${" ".repeat(Math.max(1, 34 - displayWidth(shown)))}— chercher dans le site`;
  },
  helpLines = (model: boolean) => [
    "ls · cd <section> · bd <section>  — naviguer",
    askLine(model),
    "theme <nom> · clear · options     — affichage",
    "cv · email · send-mail            — CV et contact",
    "share <cible>                     — LinkedIn, GitHub, lien",
    "/propose [-y] <idée>              — suggérer un ajout",
    "/joke · /cowsay                   — le reste",
    "/slime · /matrix · shutdown       — à vos risques",
  ],
  KEYBOARD =
    "Clavier : / cible la saisie · j / k changent de section · Tab complète · ↑ ↓ rappellent l'historique.",
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
    sudo: {
      egg: "sudo",
      lines: [failed("benjamin n'est pas dans le fichier sudoers. Cet incident sera signalé.")],
      say: say("non.", "scared"),
    },
    vim: { egg: "vim", lines: [info("Piège classique. :q! ne fonctionne pas ici non plus.")] },
  },
  // Les easter eggs ne repondent qu'au prefixe slash. Une vraie commande de terminal et un
  // raccourci du portfolio sont deux choses differentes, et taper « joke » sans slash ne
  // doit pas les melanger.
  //
  // L'ordre decide de ce qui se decouvre : taper « / » n'ouvre que dix propositions, et
  // cette liste en porte exactement dix. Les plus riches d'abord, l'alias en dernier : un
  // onzieme egg pousserait donc l'alias hors de vue, et lui seul.
  SLASH_ONLY = new Set([
    "slime",
    "joke",
    "cowsay",
    "propose",
    "benjamin",
    "matrix",
    "sudo",
    "vim",
    "coffee",
    "brezinben",
  ]),
  ALIASES = {
    "?": "help",
    aide: "help",
    [ASK_MODEL]: ASK,
    brezinben: "benjamin",
    cat: "slime",
    cls: "clear",
    copy: "email",
    dir: "ls",
    emacs: "vim",
    exit: "shutdown",
    feedback: "propose",
    idee: "propose",
    mascotte: "slime",
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
  isExpression = (value: string): value is Expression =>
    OFFERED.some((expression) => expression === value),
  emoted = (expression: Expression): Told => ({
    effects: [{ expression, type: "emote" }, say(EXPRESSIONS[expression], expression)],
    lines: [done(`le slime est ${EXPRESSIONS[expression]}.`)],
  }),
  absent: Told = {
    effects: [{ type: "usage" }],
    lines: [failed("le slime n'est pas la : attendez qu'il revienne.")],
  },
  changing: Told = {
    effects: [{ type: "usage" }],
    lines: [failed("la mascotte change de forme : laissez-la finir.")],
  },
  dozing: Told = {
    effects: [{ type: "usage" }],
    lines: [
      failed("la mascotte dort tant que le réseau est coupé."),
      muted("elle se réveille d'elle-même au retour du réseau."),
    ],
  },
  // Quatre etats possibles, un seul a la fois : la coquille dit lequel plutot que de passer
  // trois booleens dont la plupart des combinaisons n'existent pas.
  slime = (argument: string, name: string, mascot: Context["mascot"]): Told => {
    // Annoncer « le slime explose » pendant qu'il est deja parti fait mentir le journal :
    // la coquille avale le geste, la ligne reste. Endormie, elle avale tout de meme.
    if (mascot === "asleep") {
      return dozing;
    }

    if (mascot === "away") {
      return absent;
    }

    if (mascot === "busy") {
      return changing;
    }

    if (argument === "evolve") {
      return {
        effects: [{ type: "evolve" }],
        lines: [done("la mascotte change de forme.")],
      };
    }

    if (argument === "drop") {
      return { effects: [{ type: "drop" }], lines: [done("le slime tombe et s'écrase.")] };
    }

    if (argument === "kill") {
      return { effects: [{ type: "blowUp" }], lines: [done("le slime explose.")] };
    }

    if (argument === "activity") {
      if (!ACTIVITIES.includes(name)) {
        return {
          effects: [{ type: "usage" }],
          lines: [offer("/slime activity <nom>", ACTIVITIES)],
        };
      }

      return {
        effects: [{ name, type: "activity" }],
        lines: [done(`le slime s'y met : ${name}.`)],
      };
    }

    if (argument === "expression") {
      return isExpression(name)
        ? emoted(name)
        : { effects: [{ type: "usage" }], lines: [offer("/slime expression <nom>", OFFERED)] };
    }

    // « /slime happy » reste un raccourci : il marche, mais l'aide annonce le chemin long,
    // symetrique de « /slime activity <nom> ».
    if (!isExpression(argument)) {
      return {
        effects: [{ type: "usage" }],
        lines: [
          offer("/slime expression <nom>", OFFERED),
          offer("/slime activity <nom>", ACTIVITIES),
          info("/slime evolve — lui fait changer de forme"),
          info("/slime drop — le fait tomber du plafond"),
          info("/slime kill — le fait exploser, il revient de lui-même"),
        ],
      };
    }

    return emoted(argument);
  },
  // Trois verbes naviguent vers leur argument, et eux seuls. Sans ce filtre, n'importe quel
  // mot suivi d'un identifiant de section y menait : « share contact » partait naviguer au
  // lieu de partager, et « /sudo stack » n'affichait jamais son texte.
  NAVIGATORS = new Set(["bd", "cd", "open"]),
  // Le vocabulaire ne propose que des commandes vivantes, et les easter eggs avec leur
  // slash : sinon l'autocompletion propose ce que le dispatcher refuse.
  PLAIN = [
    "?",
    "aide",
    "bd",
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
    "sleep",
    "theme",
  ],
  VERBS = [...PLAIN, ...[...SLASH_ONLY].map((egg) => `/${egg}`)],
  // Les deux noms de la recherche ne s'offrent jamais ensemble : le vocabulaire ne porte
  // que celui qui correspond a l'etat du modele.
  vocabulary = (model: boolean) => [model ? ASK_MODEL : ASK, ...VERBS],
  // Le vocabulaire dépend du chemin déjà tapé, et pas seulement du premier mot : « slime »
  // propose ses sous-commandes, « slime expression » les expressions, « slime activity » les
  // activités. Proposer le vocabulaire entier après l'un ou l'autre ferait du bruit.
  argumentsFor = (path: string, context: CompletionContext): string[] | undefined => {
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
  bubble = (lines: string[]): string[] => {
    const width = Math.max(...lines.map((entry) => entry.length)),
      top = ` ${"_".repeat(width + 2)}`,
      bottom = ` ${"-".repeat(width + 2)}`;

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
  { columns = 40, mode = "" }: { columns?: number; mode?: string } = {},
): string[] => {
  const face = lookup(FACES_COW, mode) ?? { eyes: "oo", tongue: "  " },
    body = wrap(text.trim() === "" ? "Moo." : text.trim(), Math.max(8, columns - 6));

  return [
    ...bubble(body),
    String.raw`        \   ^__^`,
    `         \\  (${face.eyes})\\_______`,
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
