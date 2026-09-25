// Le clavier de la page : les volets, les listes, la grille de la stack, les raccourcis.

import { PANES, VERTICAL } from "../settings.ts";
import { type Shell, slice } from "../shell.ts";

// Ce que le clavier garde dans l'etat du composant. Le focus est memorise par volet.
export interface KeyboardState {
  focusAt: Record<string, number>;
  pane: string;
}

export interface KeyboardApi {
  focusPane(pane: string): void;
  gridMove(selector: string, key: string): boolean;
  items(pane: string): HTMLElement[];
  moveInPane(step: number): void;
  movePane(step: number): void;
  moveSection(step: number): void;
  characterKey(event: KeyboardEvent): boolean;
  globalShortcut(event: KeyboardEvent): boolean;
  navigationKey(event: KeyboardEvent): void;
  onKey(event: KeyboardEvent): void;
  passesKey(event: KeyboardEvent): boolean;
}

const rect = (node: Element) => {
    return node.getBoundingClientRect();
  },
  paneOf = (node: Element | null) => {
    return node?.closest<HTMLElement>("[data-pane]")?.dataset.pane;
  },
  isScrollRegion = (node: EventTarget | null) => {
    return node instanceof Element && node.matches('[role="region"][tabindex="0"], [role="log"]');
  };
// Gauche et droite suivent l'ordre du document : c'est l'ordre de lecture.
const rowMove = (cells: HTMLElement[], at: number, key: string): boolean => {
  if (at === -1 || (key !== "ArrowLeft" && key !== "ArrowRight")) {
    return false;
  }

  cells[Math.max(0, Math.min(cells.length - 1, at + (key === "ArrowRight" ? 1 : -1)))]?.focus();

  return true;
};

// Dans une liste a une colonne, la fleche droite valide et descend vers le volet
// suivant : c'est ce qu'un terminal fait.
const listMove = (selector: string, key: string, activate: (at: number) => void): boolean => {
  const items = [...document.querySelectorAll<HTMLElement>(selector)],
    at = document.activeElement instanceof HTMLElement ? items.indexOf(document.activeElement) : -1;

  if (at === -1) {
    return false;
  }

  if (key === "ArrowRight") {
    activate(at);

    return true;
  }

  if (key === "ArrowUp" || key === "ArrowDown") {
    items[Math.max(0, Math.min(items.length - 1, at + (key === "ArrowDown" ? 1 : -1)))]?.focus();

    return true;
  }

  return false;
};

export const keyboardSlice = () => {
  return slice<KeyboardApi>({
    // Les raccourcis de caractere : Shift pour le glitch, « / », « j » et « k ».
    characterKey(this: Shell, event: KeyboardEvent) {
      // Cinq appuis sur Shift corrompent l'affichage. La garde ci-dessus laisse deja
      // passer la majuscule tapee dans la ligne de commande : elle ne compte pas.
      if (event.key === "Shift") {
        // Le systeme repete une touche maintenue : sans cette sortie, garder Shift
        // enfonce armait l'egg tout seul en une fraction de seconde.
        if (!event.repeat) {
          this.glitchShift();
        }

        return true;
      }

      // La bascule ne coupe que les touches de caractere : les fleches restent la
      // navigation elle-meme, pas un raccourci.
      if (this.shortcuts && event.key === "/") {
        event.preventDefault();
        this.$refs.cli?.focus();

        return true;
      }

      if (this.shortcuts && (event.key === "j" || event.key === "k")) {
        event.preventDefault();
        this.moveSection(event.key === "j" ? 1 : -1);

        return true;
      }

      return false;
    },

    // Le focus est mémorisé par volet : y revenir repose le curseur où on l'avait
    // laissé, plutôt qu'en tête de liste.
    focusPane(this: Shell, pane: string) {
      const entries = this.items(pane);

      if (entries.length === 0) {
        return;
      }

      this.pane = pane;
      this.focusAt[pane] = Math.min(this.focusAt[pane] ?? 0, entries.length - 1);
      entries[this.focusAt[pane] ?? 0]?.focus();
    },

    // Ctrl ou Cmd + K ouvre et ferme la recherche globale.
    globalShortcut(this: Shell, event: KeyboardEvent) {
      // Le raccourci de la recherche globale passe avant la sortie sur les modificateurs,
      // qui l'avalerait. Ctrl et Cmd ouvrent tous les deux : la page sert les deux systemes.
      if ((event.metaKey || event.ctrlKey) && (event.key === "k" || event.key === "K")) {
        event.preventDefault();

        if (this.globalOpen) {
          this.closeGlobal();
        } else if (!this.booting && !this.modalOpen) {
          this.openGlobal();
        }

        return true;
      }

      return false;
    },

    // Une grille se parcourt aux quatre fleches. La stack en compte une par domaine : un pas
    // fixe, deduit de la premiere ligne, changeait de colonne des qu'une ligne etait incomplete
    // ou qu'on passait au domaine suivant. Les lignes se lisent donc sur la position reelle des cellules.
    gridMove(this: Shell, selector: string, key: string) {
      const cells = [...document.querySelectorAll<HTMLElement>(selector)],
        at =
          document.activeElement instanceof HTMLElement
            ? cells.indexOf(document.activeElement)
            : -1;

      if (at === -1 || !VERTICAL.has(key)) {
        return rowMove(cells, at, key);
      }

      // SAFETY: « at » vient de cells.indexOf et le cas -1 est sorti juste au-dessus,
      // donc l'index designe une cellule de la liste.
      const from = rect(cells[at] as HTMLElement),
        beyond = cells.filter((cell) => {
          return key === "ArrowDown"
            ? rect(cell).top > from.top + 1
            : rect(cell).top < from.top - 1;
        });

      if (beyond.length === 0) {
        return true;
      }

      // La colonne prime sur la ligne. Une derniere ligne plus courte n'a pas de cellule dans la
      // colonne du curseur : viser la ligne d'a cote le faisait glisser tout a gauche, et les
      // frappes suivantes partaient d'ailleurs. Le curseur saute donc cette ligne pour retrouver sa colonne.
      const inColumn = beyond.filter((cell) => {
        return Math.abs(rect(cell).left - from.left) < 1;
      });

      if (inColumn.length > 0) {
        inColumn
          .reduce((best, cell) => {
            return Math.abs(rect(cell).top - from.top) < Math.abs(rect(best).top - from.top)
              ? cell
              : best;
          })
          .focus();

        return true;
      }

      // Plus rien dans cette colonne : le curseur prend la cellule la plus proche de la
      // premiere ligne atteignable, plutot que de rester sur place.
      const tops = beyond.map((cell) => {
          return rect(cell).top;
        }),
        edge = key === "ArrowDown" ? Math.min(...tops) : Math.max(...tops),
        row = beyond.filter((cell) => {
          return Math.abs(rect(cell).top - edge) < 1;
        });

      row
        .reduce((best, cell) => {
          return Math.abs(rect(cell).left - from.left) < Math.abs(rect(best).left - from.left)
            ? cell
            : best;
        })
        .focus();

      return true;
    },

    items(this: Shell, pane: string) {
      return [
        ...document.querySelectorAll<HTMLElement>(
          `[data-pane="${pane}"] button:not(:disabled), [data-pane="${pane}"] input`,
        ),
      ];
    },

    // Le volet courant se lit sur le focus : Tab et la souris deplacent le focus sans
    // passer par focusPane.
    moveInPane(this: Shell, step: number) {
      const pane = paneOf(document.activeElement) ?? this.pane,
        entries = this.items(pane);

      if (entries.length === 0) {
        return;
      }

      const active = document.activeElement,
        here = active instanceof HTMLElement ? entries.indexOf(active) : -1,
        from = here === -1 ? (this.focusAt[pane] ?? 0) : here;

      this.pane = pane;
      this.focusAt[pane] = Math.max(0, Math.min(entries.length - 1, from + step));
      entries[this.focusAt[pane] ?? 0]?.focus();
    },

    movePane(this: Shell, step: number) {
      const next = PANES.indexOf(paneOf(document.activeElement) ?? this.pane) + step;

      if (next >= 0 && next < PANES.length) {
        this.focusPane(PANES[next] ?? "nav");
      }
    },

    moveSection(this: Shell, step: number) {
      const ids = this.sections.map((entry) => {
          return entry.id;
        }),
        next = ids.indexOf(this.section) + step;

      if (next >= 0 && next < ids.length) {
        this.goSection(ids[next] ?? "whoami");
      }
    },

    // Les fleches : les listes, la grille, les regions qui defilent, puis les volets.
    navigationKey(this: Shell, event: KeyboardEvent) {
      // Chaque zone a sa logique. La stack est une grille, les sections et la frise
      // sont des listes ou la fleche droite valide, le reste change de volet.
      const handled =
        this.gridMove("[data-tech]", event.key) ||
        listMove('[data-ctl="nav"]', event.key, (at) => {
          const items = [...document.querySelectorAll<HTMLElement>('[data-ctl="nav"]')];

          // De gauche a droite : valider une section amene a sa premiere prise (stack, frise), ou a
          // la ligne de commande si elle n'en a pas. L'intention se pose avant le clic : une section
          // deja vue s'affiche sans frappe, et la prise se ferait avant que l'intention soit connue.
          this.wantResult = true;
          items[at]?.click();
        }) ||
        listMove('[data-ctl="tl"]', event.key, (at) => {
          this.openTimeline(at);
        });

      if (handled) {
        event.preventDefault();

        return;
      }

      // Une region qui defile garde ses fleches verticales : c'est pour les lire qu'elle
      // prend le focus.
      if (VERTICAL.has(event.key) && isScrollRegion(event.target)) {
        return;
      }

      const fallback = {
        ArrowDown: () => {
          this.moveInPane(1);
        },
        ArrowLeft: () => {
          this.movePane(-1);
        },
        ArrowRight: () => {
          this.movePane(1);
        },
        ArrowUp: () => {
          this.moveInPane(-1);
        },
      }[event.key];

      if (!fallback) {
        return;
      }

      event.preventDefault();
      fallback();
    },

    onKey(this: Shell, event: KeyboardEvent) {
      if (this.globalShortcut(event) || this.passesKey(event) || this.characterKey(event)) {
        return;
      }

      this.navigationKey(event);
    },

    // Les touches que la page laisse passer : un modificateur, une touche deja consommee,
    // le boot, une modale, une saisie.
    passesKey(this: Shell, event: KeyboardEvent) {
      // Un element qui traite sa touche l'a deja consommee. Sans cette sortie, la
      // fleche de la poignee deplace aussi le focus de volet.
      if (event.altKey || event.ctrlKey || event.metaKey || event.defaultPrevented) {
        return true;
      }

      // Entrée maintenue : le système répète la touche, et le navigateur fabrique un clic
      // par répétition. Valider au clavier envoyait alors dix mesures pour un seul geste.
      // Les flèches gardent leur répétition, qui sert à parcourir une liste.
      if (event.repeat && event.key === "Enter") {
        event.preventDefault();

        return true;
      }

      // La touche qui abrege le boot s'arrete la : sans cette sortie, elle partirait
      // aussi dans la saisie, et le visiteur taperait une commande sans le vouloir.
      if (this.skipBoot()) {
        event.preventDefault();

        return true;
      }

      // Une modale a son propre clavier. Sans cette garde, les deux gestionnaires
      // traitent la même flèche et le focus s'échappe de la modale.
      if (this.modalOpen) {
        return true;
      }

      // Toute saisie garde ses touches : « j », « k » et « / » s'y tapent, et les flèches
      // y déplacent le curseur. Seule la ligne de commande vide rend la main aux volets.
      // Sans cette garde, le champ de seed devenait impossible à corriger.
      if (event.target instanceof HTMLInputElement) {
        const leaving =
          event.target === this.$refs.cli &&
          this.input === "" &&
          (event.key === "ArrowLeft" || event.key === "ArrowRight");

        if (!leaving) {
          return true;
        }
      }

      return false;
    },
  });
};
