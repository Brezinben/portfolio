// La recherche lexicale : elle départage les passages du corpus par recouvrement de
// mots, et rend la réponse que « ask » affiche quand aucun modèle local ne repond.

import { ASK, ASK_MODEL } from "./vocabulary.ts";
import { type Effect, track } from "./effects.ts";
import { done, failed, info, line, muted } from "./lines.ts";
import type { Entry } from "./context.ts";
import { fold } from "./fold.ts";

// Les mots trop fréquents pour départager deux passages. La liste est courte à dessein :
// une question posée à un portfolio tient en quelques mots, et en retirer trop la vide.
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
const words = (text: string): string[] => {
  return fold(text)
    .split(/[^\p{Letter}\p{Number}]+/u)
    .filter((mot) => {
      return mot.length > 1 && !VIDES.has(mot);
    });
};

// Un score par recouvrement de mots, sans index ni modele. Le corpus fait dix passages
// écrits à la main : tout ce qui serait plus savant coûterait plus qu'il ne rapporte.;

// Un mot du titre pèse trois fois : demander « stack » doit ouvrir la section stack, même
// si un autre passage prononce le mot plus souvent.
const search = (query: string, entries: Entry[]) => {
  const wanted = new Set(words(query));

  if (wanted.size === 0) {
    return [];
  }

  return entries
    .filter((entry) => {
      return (entry.ask ?? "") !== "";
    })
    .map((entry) => {
      const body = words(entry.ask ?? ""),
        title = new Set(words(entry.label)),
        shared = body.filter((word) => {
          return wanted.has(word);
        }),
        hitCount = shared.length,
        distinct = new Set(shared).size,
        inTitle = [...wanted].filter((word) => {
          return title.has(word);
        }).length;

      // Le nombre de mots distincts touches prime sur les répétitions : un passage qui
      // répond à toute la question vaut mieux qu'un qui martèle un seul de ses mots.
      return { entry, score: distinct * 10 + hitCount + inTitle * 30 };
    })
    .filter((hit) => {
      return hit.score > 0;
    })
    .toSorted((one, other) => {
      return other.score - one.score;
    });
};

// La réponse est toujours le texte du corpus, jamais un texte produit. Un modèle, quand il
// y en a un, ne fait que choisir parmi ces passages : il ne parle pas à la place de
// Benjamin.
export const answer = (query: string, entries: Entry[], options: { model: boolean }) => {
  const { model } = options;
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
    others = hits.slice(1, 4).map((hit) => {
      return hit.entry.label;
    }),
    // Le modèle voit tous les passages, pas seulement ceux qui partagent un mot avec la
    // question. Lui donner la liste du recouvrement le réduirait à reclasser ce que la
    // recherche lexicale a déjà trouvé, et « comment tu bosses » ne trouve rien du tout.
    answerable = entries
      .filter((entry) => {
        return (entry.ask ?? "") !== "";
      })
      .map((entry) => {
        return entry.id;
      }),
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

  // Sans modèle, la réponse part tout de suite. Avec un modèle, elle attend son choix :
  // deux réponses de suite pour une seule question se liraient comme une hesitation.
  return {
    effects: [measured, { candidates: answerable, lexical, query, type: "ask" } satisfies Effect],
    lines: [],
  };
};
