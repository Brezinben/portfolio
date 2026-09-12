// La recherche lexicale : elle departage les passages du corpus par recouvrement de
// mots, et rend la reponse que « ask » affiche quand aucun modele local ne repond.

import { ASK, ASK_MODEL } from "./vocabulary.ts";
import { type Effect, track } from "./effects.ts";
import { done, failed, info, line, muted } from "./lines.ts";
import type { Entry } from "./context.ts";

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
]);
// Une recherche ne doit pas dependre des accents ni de la casse : « éco-conception » se
// cherche « eco conception ».
const words = (text: string): string[] =>
  text
    .normalize("NFD")
    .replaceAll(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .split(/[^\p{Letter}\p{Number}]+/u)
    .filter((mot) => mot.length > 1 && !VIDES.has(mot));

// Un score par recouvrement de mots, sans index ni modele. Le corpus fait dix passages
// ecrits a la main : tout ce qui serait plus savant couterait plus qu'il ne rapporte.;

// Un mot du titre pese trois fois : demander « stack » doit ouvrir la section stack, meme
// si un autre passage prononce le mot plus souvent.
const search = (query: string, entries: Entry[]) => {
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
export const answer = (query: string, entries: Entry[], model: boolean) => {
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
