// La recherche globale : l'ouverture, le clavier et le lancement d'une trouvaille.
//
// Elle n'execute rien. Une trouvaille pose sa commande sur la ligne de saisie et la soumet :
// l'echo, le resultat, le journal et les succes restent ceux du terminal. Ce qui n'est pas
// une commande ouvre la zone qui lui correspond.

import { type GlobalEntry, globalIndex } from "../../interpret.ts";
import type { Shell } from "../shell.ts";
import { THEMES } from "../settings.ts";

export interface GlobalSearchState {
  globalAt: number;
  globalIndexed: GlobalEntry[];
  globalOpen: boolean;
  globalQuery: string;
  globalReturn: HTMLElement | undefined;
}

export interface GlobalSearchApi {
  closeGlobal(): void;
  globalComplete(): void;
  globalKey(event: KeyboardEvent): void;
  globalMove(step: number): void;
  openGlobal(): void;
  reindexGlobal(): void;
  runGlobal(entry: GlobalEntry | undefined): void;
}

export const globalSearchSlice = () => {
  return {
    closeGlobal(this: Shell) {
      this.globalOpen = false;
      // Le nœud qui a ouvert la zone a pu partir entre-temps. Un nœud détaché reste vrai :
      // sans « isConnected », le focus tombe sur le corps de la page.
      this.$nextTick(() => {
        const back = this.globalReturn?.isConnected === true ? this.globalReturn : undefined;

        (back ?? this.$refs["cli"])?.focus();
      });
    },

    globalComplete(this: Shell) {
      if (this.globalGhost === "") {
        return;
      }

      this.globalQuery = `${this.globalQuery}${this.globalGhost}`;
      this.globalAt = 0;
    },

    globalKey(this: Shell, event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        this.closeGlobal();

        return;
      }

      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        this.globalMove(event.key === "ArrowDown" ? 1 : -1);

        return;
      }

      // Tab accepte le fantôme quand il y en a un. Sans fantôme, le focus reste enfermé : la
      // zone est modale, et les deux autres bouclent déjà de la même façon.
      if (event.key === "Tab") {
        event.preventDefault();

        if (!event.shiftKey && this.globalGhost !== "") {
          this.globalComplete();

          return;
        }

        const close = this.$refs["globalClose"];

        (document.activeElement === close ? this.$refs["globalField"] : close)?.focus();

        return;
      }

      if (event.key === "Enter") {
        event.preventDefault();
        this.runGlobal(this.globalHits[this.globalAt]);
      }
    },

    globalMove(this: Shell, step: number) {
      const found = this.globalHits.length;

      if (found === 0) {
        return;
      }

      this.globalAt = (this.globalAt + step + found) % found;
      // La selection doit rester visible. « nearest » ne bouge que le conteneur qui defile :
      // la page, elle, ne defile pas, donc rien d'autre ne se deplace sous les yeux.
      this.$nextTick(() => {
        document
          .querySelector(`#global-row-${this.globalAt}`)
          ?.scrollIntoView({ block: "nearest" });
      });
    },

    openGlobal(this: Shell) {
      this.track("recherche_globale");
      this.globalReturn =
        document.activeElement instanceof HTMLElement ? document.activeElement : undefined;
      this.globalQuery = "";
      this.globalAt = 0;
      this.globalOpen = true;
      this.$nextTick(() => {
        return this.$refs["globalField"]?.focus();
      });
    },

    reindexGlobal(this: Shell) {
      this.globalIndexed = globalIndex({
        details: this.details,
        missions: this.missions,
        model: this.modelState === "available",
        sections: this.sections,
        techNotes: this.techNotes,
        themes: THEMES,
      });
    },

    runGlobal(this: Shell, entry: GlobalEntry | undefined) {
      if (!entry) {
        return;
      }

      if (entry.kind === "achievement") {
        this.closeGlobal();
        this.openAchievements("recherche");

        return;
      }

      if (entry.needsArgument) {
        this.input = `${entry.cmd} `;
        this.closeGlobal();

        return;
      }

      this.input = entry.cmd;
      this.closeGlobal();
      this.submit({ typed: false });
      this.unlock("global-search");

      // Sans le tick, la grille de la stack n'existe pas encore et la fiche se perd.
      if (entry.tech !== "") {
        this.$nextTick(() => {
          this.tech = entry.tech;
        });
      }
    },
  };
};
