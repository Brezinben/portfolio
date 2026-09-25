// La question posée à « ask » et l'idée envoyée par « /propose » : ce qui part
// du navigateur, vers le modèle local ou vers la mesure d'audience.

import { type Shell, slice } from "../shell.ts";
import { ASK_MS } from "../settings.ts";
import type { Line } from "../../interpret.ts";

// Ce que la question et l'idée gardent dans l'etat du composant.
export interface AskState {
  // La question en vol. L'annuler coupe le modèle au lieu d'attendre sa réponse.
  asker: AbortController | undefined;
  feedback: Record<string, string>;
  // L'idée qui attend son oui.
  pending: string | undefined;
  // Le modele cherche, et rien n'est encore affiche : sa reponse remplacera l'attente.
  thinking: boolean;
}

export interface AskApi {
  answerWithModel(query: string, candidateIds: string[], lexical?: Line[]): Promise<void>;
  askPrompt(query: string, candidateIds: string[]): string;
  learnModel(): Promise<void>;
  refuseOffline(what: string, instead: string): void;
  send(text: string): Promise<void>;
  showAskChoice(id: string, lexical: Line[], asker: AbortController): void;
}

// « responseConstraint » fait rendre du JSON : un identifiant en sort entre guillemets. Le
// comparer tel quel ne trouvait jamais le passage, et la reponse du corpus sortait a chaque
// fois. Un modele qui ignore la contrainte rend du texte brut, qui reste utilisable.
// Un identifiant du corpus n'a ni guillemet ni echappement : retirer la paire suffit, et
// evite de decoder du JSON pour en tirer une chaine. L'identifiant est de toute facon
// cherche dans le corpus, ou un inconnu ne designe rien.
const readChoice = (raw: string) => {
  const trimmed = raw.trim();

  return trimmed.startsWith('"') && trimmed.endsWith('"') ? trimmed.slice(1, -1) : trimmed;
};

// L'attente depassee et le refus ne se reparent pas de la meme facon : l'une demande de
// patienter, l'autre de regarder l'etat du modele.
const askFailure = (cause: unknown) => {
  return cause instanceof DOMException && cause.name === "TimeoutError"
    ? `le modèle local n'a pas répondu en ${ASK_MS / 1000} s.`
    : "le modèle local a refusé de répondre.";
};

export const askSlice = () => {
  return slice<AskApi>({
    // Le modele local choisit un identifiant dans une liste fermee, jamais du texte libre :
    // cela evite d'inventer sur le parcours de Benjamin, et rattrape les recherches par
    // mots qui ratent un passage reformule. « lexical » n'arrive que si l'interpreteur a garde sa reponse pour laisser le modele choisir ; elle sort telle quelle des qu'il echoue, refuse ou tarde.
    async answerWithModel(query: string, candidateIds: string[], lexical?: Line[]) {
      if (lexical === undefined || !("LanguageModel" in globalThis)) {
        return;
      }

      const asker = new AbortController();

      this.asker = asker;
      this.thinking = true;

      // Une session fermee de travers ne doit pas faire repasser la question par le repli :
      // la reponse est deja affichee, elle sortirait deux fois.
      let answered = false;

      try {
        const session = await LanguageModel.create({
          // La question et les passages sont en francais. Le declarer laisse le navigateur
          // refuser tout de suite plutot que de repondre depuis un modele d'une autre langue.
          expectedInputs: [{ languages: ["fr"], type: "text" }],
          signal: AbortSignal.any([asker.signal, AbortSignal.timeout(ASK_MS)]),
        });

        try {
          const choice = await session.prompt(this.askPrompt(query, candidateIds), {
            responseConstraint: { enum: candidateIds, type: "string" },
            signal: AbortSignal.any([asker.signal, AbortSignal.timeout(ASK_MS)]),
          });

          this.showAskChoice(readChoice(choice), lexical, asker);
          answered = true;
        } finally {
          session.destroy();
        }
      } catch (error) {
        // Le modele muet, refuse ou trop lent ne doit pas laisser la question sans reponse :
        // celle du corpus la remplace, sauf si une autre question a deja pris sa place. Son
        // echec se dit aussi : « rien ne repond » et « le modele a lache » se lisaient pareil, et menaient a chercher le defaut du mauvais cote.
        if (!answered && this.asker === asker) {
          this.journal = [
            ...this.journal,
            { c: "warn", m: "✗", mc: "warn", t: askFailure(error) } satisfies Line,
            ...lexical,
          ];
        }
      } finally {
        // La question coupee n'eteint pas l'attente de celle qui l'a remplacee.
        if (this.asker === asker) {
          this.thinking = false;
        }
      }
    },

    // « m-transway » ne dit rien de ce que la mission couvre. Sans le texte en face, le
    // modele choisit sur la forme de l'identifiant, et perd l'avantage qu'il avait sur le
    // recouvrement de mots. La contrainte de reponse, elle, reste sur les identifiants.
    askPrompt(this: Shell, query: string, candidateIds: string[]) {
      const corpus = [...this.sections, ...this.details],
        topics = candidateIds.map((id) => {
          const found = corpus.find((entry) => {
            return entry.id === id;
          });

          return `${id} : ${found?.label ?? id} — ${found?.ask ?? ""}`;
        });

      return [
        `Question : « ${query} ».`,
        "Voici les sujets de ce portfolio, chacun précédé de son identifiant.",
        ...topics,
        "Réponds uniquement par l'identifiant du sujet qui répond le mieux.",
      ].join("\n");
    },

    // « availability » est asynchrone, l'interpreteur ne l'est pas : sans cette lecture au
    // demarrage, la premiere question partirait en croyant qu'aucun modele n'est la.
    async learnModel(this: Shell) {
      if (!("LanguageModel" in globalThis)) {
        return;
      }

      try {
        this.modelState = await LanguageModel.availability();
        // Le vocabulaire porte « ask » ou « ask✨ », jamais les deux. L'index se refait, sinon
        // la recherche globale garderait le nom d'avant la detection.
        this.reindexGlobal();
      } catch {
        // Un refus au demarrage laisse « unknown » : « ask » repond alors sans modele,
        // ce qui est le comportement sans API.
      }
    },

    // Le site entier tient en memoire une fois charge : seules les commandes qui partent
    // ailleurs cassent. Le refus les nomme, et il nomme ce qui marche encore.
    refuseOffline(this: Shell, what: string, instead: string) {
      this.journal = [
        ...this.journal,
        { c: "warn", m: "✗", mc: "warn", t: `${what} demande le réseau, et il est coupé.` },
        { c: "fg2", m: "·", mc: "fg2", t: instead },
      ];
    },

    // Trois chemins dans l'ordre : marquage GoatCounter, puis appel direct, puis
    // mailto. Le texte est le nom de l'événement : GoatCounter ne transporte aucune
    // donnée libre.
    async send(this: Shell, text: string) {
      this.pending = undefined;

      const feedback = this.feedback ?? {};

      if (globalThis.goatcounter?.count) {
        this.track(text);
        this.journal = [...this.journal, { c: "ok", m: "✓", mc: "ok", t: "idée envoyée. merci." }];

        return;
      }

      try {
        const response = await fetch(`${feedback.host}/count?p=${encodeURIComponent(text)}&e=true`);

        if (!response.ok) {
          throw new Error(String(response.status));
        }

        this.journal = [...this.journal, { c: "ok", m: "✓", mc: "ok", t: "idée envoyée. merci." }];
      } catch {
        globalThis.open(
          `mailto:${feedback.fallbackEmail}?subject=Id%C3%A9e&body=${encodeURIComponent(text)}`,
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

    // Le choix du modele designe un passage du corpus, et c'est ce passage qui s'affiche.
    // Un identifiant inconnu ne designe rien : la reponse du corpus reprend la main.
    showAskChoice(id: string, lexical: Line[], asker: AbortController) {
      if (this.asker !== asker) {
        return;
      }

      const found = [...this.sections, ...this.details].find((entry) => {
        return entry.id === id;
      });

      this.journal =
        !found || (found.ask ?? "") === ""
          ? [...this.journal, ...lexical]
          : [
              ...this.journal,
              { c: "fg", m: "✓", mc: "ok", t: found.label } satisfies Line,
              { c: "fg", m: " ", mc: "fg2", t: found.ask ?? "" } satisfies Line,
            ];
    },
  });
};
