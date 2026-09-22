// La recherche globale : l'ouverture, le clavier et le lancement d'une trouvaille.
//
// Elle n'execute rien. Une trouvaille pose sa commande sur la ligne de saisie et la soumet :
// l'echo, le resultat, le journal et les succes restent ceux du terminal. Ce qui n'est pas
// une commande ouvre la zone qui lui correspond.

import { type GlobalEntry, ghostFor, globalIndex } from "../../interpret.ts";
import type { Shell } from "../shell.ts";
import { THEMES } from "../settings.ts";

export interface GlobalSearchState {
  // Le rang de la trouvaille selectionnee, dans la liste affichee.
  globalAt: number;
  // L'index cherchable, calcule une fois le contenu charge.
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
  openGlobal(via: string): void;
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

    // Tab accepte la complétion fantôme, et rien d'autre : compléter vers un libellé qui ne
    // commence pas par la saisie se lirait comme une erreur de frappe.
    globalComplete(this: Shell) {
      const ghost = ghostFor(this.globalQuery, this.globalHits);

      if (ghost === "") {
        return;
      }

      this.globalQuery = `${this.globalQuery.trim()}${ghost}`;
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

      // Sans fantôme, Tab garde son rôle de navigation : le retenir piégerait le focus dans
      // un champ qui ne propose rien.
      if (event.key === "Tab" && !event.shiftKey) {
        if (ghostFor(this.globalQuery, this.globalHits) !== "") {
          event.preventDefault();
          this.globalComplete();
        }

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

    openGlobal(this: Shell, via: string) {
      this.track("recherche_globale", { via });
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

      // Un succès s'ouvre, il ne se lance pas : le catalogue n'a pas de commande.
      if (entry.kind === "achievement") {
        this.closeGlobal();
        this.openAchievements("recherche");

        return;
      }

      // Un nom qui attend un argument ne veut rien dire seul. La ligne se remplit, et le
      // visiteur finit de taper : le soumettre rendrait une erreur ou l'aide.
      if (entry.needsArgument) {
        this.input = `${entry.cmd} `;
        this.closeGlobal();

        return;
      }

      this.input = entry.cmd;
      this.closeGlobal();
      this.submit({ typed: false });
      this.unlock("global-search");

      // La brique n'a pas de commande à elle : la section stack s'ouvre, puis sa fiche se
      // pose. Sans le tick, la grille n'existe pas encore et la fiche se perd.
      if (entry.tech !== "") {
        this.$nextTick(() => {
          this.tech = entry.tech;
        });
      }
    },
  };
};
