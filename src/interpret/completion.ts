// L'autocompletion : ce qu'elle propose selon le chemin deja tape, et la description
// qu'elle affiche sous la liste.

import { ACTIVITIES, OFFERED } from "./mascot.ts";
import { ALIASES, vocabulary } from "./vocabulary.ts";
import { type CompletionContext } from "./context.ts";
import { MAX_SUGGESTIONS } from "./lines.ts";
import { lookup } from "./lookup.ts";

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
};
// La liste ne montre que des noms, et un nom n'apprend rien : ni « bd », ni « goal ». Une
// ligne sous la liste dit ce que fait la proposition choisie. Les noms venus du contenu
// n'y sont pas : leur identifiant est deja leur libelle.
const HINTS = {
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
