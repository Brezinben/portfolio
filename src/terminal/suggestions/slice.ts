// Les propositions de la ligne de commande : la liste, la tabulation, le rappel de
// l'historique aux flèches.

import { MAX_SUGGESTIONS, candidates, commonPrefix } from "../../interpret.ts";
import { type Shell, slice } from "../shell.ts";
import { THEMES } from "../settings.ts";
import { windowTop } from "../suggest.ts";

// Ce que les propositions gardent dans l'etat du composant.
export interface SuggestionsState {
  commands: string[];
  recallAt: number;
  sugg: string[];
  suggAt: number;
  suggFrag: string;
  // La liste vient d'etre calculee par une frappe, et non deplacee par une fleche. Seule
  // une liste fraiche s'anime : voir surgir chaque entree revelee par la fenetre qui glisse
  // transformerait un deplacement en clignotement.
  suggFresh: boolean;
  suggHead: string;
  suggOpen: boolean;
  suggSlash: boolean;
  suggTop: number;
}

export interface SuggestionsApi {
  applySugg(index: number): void;
  closeSugg(): void;
  complete(): void;
  down(): void;
  onEscape(): void;
  pickSugg(index: number, pointer: PointerEvent): void;
  rebuild(word: string): string;
  recall(step: number): void;
  right(event: KeyboardEvent): void;
  suggest(): void;
  tab(event: KeyboardEvent): void;
  up(): void;
}

export const suggestionsSlice = () => {
  return slice<SuggestionsApi>({
    // La liste se rouvre sur le mot suivant : une commande completee qui attend un
    // argument montre ce qu'elle attend, sans qu'on ait a taper une lettre pour le voir.
    applySugg(this: Shell, index: number) {
      this.input = `${this.rebuild(this.sugg[index] ?? "")} `;
      this.closeSugg();
      this.suggest();
      this.$refs.cli?.focus();
    },

    // La fermeture reste déterministe : la liste se vide, sans compteur de génération
    // qui pourrait annuler le vidage au lieu de le protéger.
    closeSugg(this: Shell) {
      this.suggOpen = false;
      this.sugg = [];
      this.suggAt = 0;
      this.suggTop = 0;
    },

    complete(this: Shell) {
      if (this.sugg.length === 0) {
        return;
      }

      this.unlock("tab");

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

    down(this: Shell) {
      if (this.suggOpen) {
        this.suggAt = (this.suggAt + 1) % this.sugg.length;
        this.suggTop = windowTop(this.suggTop, this.suggAt, MAX_SUGGESTIONS);
        this.suggFresh = false;
      } else {
        this.recall(1);
      }
    },

    onEscape(this: Shell) {
      if (this.suggOpen) {
        this.closeSugg();
      } else {
        this.input = "";
      }
    },

    // Le doigt valide en un geste : la proposition part sans passer par la touche
    // entree. Un premier mot qui attend un argument ouvre sa liste, sinon la commande
    // partirait incomplete.
    pickSugg(this: Shell, index: number, pointer: PointerEvent) {
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

    rebuild(this: Shell, word: string) {
      const prefix = this.suggSlash ? "/" : "";

      return this.suggHead ? `${prefix}${this.suggHead} ${word}` : `${prefix}${word}`;
    },

    // La première flèche haut rappelle la commande de la section, puis l'historique.
    // La commande de section n'arrive en tete que tant que rien n'a ete tape : c'est
    // « la premiere fois dans une section » du journal de conception, pas toujours.
    recall(this: Shell, step: number) {
      const pool =
          this.commands.length > 0 ? [...this.commands, this.current.cmd] : [this.current.cmd],
        next = Math.min(pool.length - 1, Math.max(-1, this.recallAt - step));

      this.recallAt = next;
      this.input = next < 0 ? "" : (pool[next] ?? "");

      // Une fleche qui ne ramene rien n'a rien rappele : la ligne vide ne compte pas.
      if (next >= 0) {
        this.unlock("history");
      }
    },

    // La fleche droite valide la proposition choisie, comme la tabulation. Curseur
    // deja en fin de ligne, elle n'a rien d'autre a faire.
    right(this: Shell, event: KeyboardEvent) {
      if (!this.suggOpen) {
        return;
      }

      event.preventDefault();
      this.complete();
    },

    suggest(this: Shell) {
      const result = candidates(this.input, {
        details: this.details,
        model: this.modelState === "available",
        sections: this.sections,
        shareTargets: this.shareTargets,
        themes: THEMES.map((entry) => {
          return entry.id;
        }),
      });

      this.sugg = result.hits;
      this.suggFrag = result.frag;
      this.suggHead = result.head;
      this.suggSlash = result.slash;
      this.suggAt = 0;
      this.suggTop = 0;
      this.suggFresh = true;
      this.suggOpen = result.hits.length > 0 && this.input !== "";
    },

    // Sans proposition, Tab garde son role de navigation : l'avaler enfermait le
    // visiteur dans la ligne. Shift+Tab n'est jamais une completion.
    tab(this: Shell, event: KeyboardEvent) {
      if (event.shiftKey || this.sugg.length === 0) {
        return;
      }

      event.preventDefault();
      this.complete();
    },

    up(this: Shell) {
      if (this.suggOpen) {
        this.suggAt = (this.suggAt - 1 + this.sugg.length) % this.sugg.length;
        this.suggTop = windowTop(this.suggTop, this.suggAt, MAX_SUGGESTIONS);
        this.suggFresh = false;
      } else {
        this.recall(-1);
      }
    },
  });
};
