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
  moveInPane(step: number): void;
  movePane(step: number): void;
  moveSection(step: number): void;
  onKey(event: KeyboardEvent): void;
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

const items = (pane: string) => {
  return [
    ...document.querySelectorAll<HTMLElement>(
      `[data-pane="${pane}"] button:not(:disabled), [data-pane="${pane}"] input`,
    ),
  ];
};

// Une grille se parcourt aux quatre flèches. La stack compte une grille par domaine. Un pas
// fixe, déduit de la première ligne, changerait de colonne sur une ligne incomplète ou au
// domaine suivant. Les lignes se lisent donc sur la position réelle des cellules.
const gridMove = (selector: string, key: string) => {
  const cells = [...document.querySelectorAll<HTMLElement>(selector)],
    at = document.activeElement instanceof HTMLElement ? cells.indexOf(document.activeElement) : -1;

  if (at === -1 || !VERTICAL.has(key)) {
    return rowMove(cells, at, key);
  }

  // SAFETY: « at » vient de cells.indexOf et le cas -1 est sorti juste au-dessus,
  // donc l'index designe une cellule de la liste.
  const from = rect(cells[at] as HTMLElement),
    beyond = cells.filter((cell) => {
      return key === "ArrowDown" ? rect(cell).top > from.top + 1 : rect(cell).top < from.top - 1;
    });

  if (beyond.length === 0) {
    return true;
  }

  // La colonne prime sur la ligne. Une dernière ligne courte n'a pas de cellule sous le curseur.
  // Viser cette ligne ferait glisser le curseur à gauche, et la frappe suivante partirait de là.
  // Le curseur saute donc cette ligne pour retrouver sa colonne.
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
};

const globalShortcut = (shell: Shell, event: KeyboardEvent): boolean => {
  // Ctrl et Cmd ouvrent tous les deux : la page sert les deux systèmes.
  if ((event.metaKey || event.ctrlKey) && (event.key === "k" || event.key === "K")) {
    event.preventDefault();

    if (shell.globalOpen) {
      shell.closeGlobal();
    } else if (!shell.booting && !shell.modalOpen) {
      shell.openGlobal();
    }

    return true;
  }

  return false;
};

// Les touches que le gestionnaire de la page ne traite pas : un modificateur, une touche
// déjà consommée, Entrée répétée, la fin du boot, une modale, une saisie.
const passesKey = (shell: Shell, event: KeyboardEvent): boolean => {
  // Un element qui traite sa touche l'a deja consommee. Sans cette sortie, la
  // fleche de la poignee deplace aussi le focus de volet.
  if (event.altKey || event.ctrlKey || event.metaKey || event.defaultPrevented) {
    return true;
  }

  // Entrée maintenue : le système répète la touche, et le navigateur fabrique un clic
  // par répétition. Sans cette garde, un geste au clavier enverrait dix mesures.
  // Les flèches gardent leur répétition, qui sert à parcourir une liste.
  if (event.repeat && event.key === "Enter") {
    event.preventDefault();

    return true;
  }

  // La touche qui abrege le boot s'arrete la : sans cette sortie, elle partirait
  // aussi dans la saisie, et le visiteur taperait une commande sans le vouloir.
  if (shell.skipBoot()) {
    event.preventDefault();

    return true;
  }

  // Une modale a son propre clavier. Sans cette garde, les deux gestionnaires
  // traitent la même flèche et le focus s'échappe de la modale.
  if (shell.modalOpen) {
    return true;
  }

  // Toute saisie garde ses touches : « j », « k » et « / » s'y tapent, et les flèches
  // y déplacent le curseur. Seule la ligne de commande vide rend la main aux volets.
  // Sans cette garde, le champ de seed serait impossible à corriger.
  if (event.target instanceof HTMLInputElement) {
    const leaving =
      event.target === shell.$refs.cli &&
      shell.input === "" &&
      (event.key === "ArrowLeft" || event.key === "ArrowRight");

    if (!leaving) {
      return true;
    }
  }

  return false;
};

// Shift pour le glitch, puis les raccourcis « / », « j » et « k ».
const characterKey = (shell: Shell, event: KeyboardEvent): boolean => {
  // Cinq appuis sur Shift corrompent l'affichage. Une majuscule tapée dans une saisie ne
  // compte pas : passesKey() arrête cette touche avant characterKey().
  if (event.key === "Shift") {
    // Le système répète une touche maintenue. Sans cette sortie, Shift maintenu
    // armerait l'egg tout seul en une fraction de seconde.
    if (!event.repeat) {
      shell.glitchShift();
    }

    return true;
  }

  // La bascule ne coupe que les touches de caractere : les fleches restent la
  // navigation elle-meme, pas un raccourci.
  if (shell.shortcuts && event.key === "/") {
    event.preventDefault();
    shell.$refs.cli?.focus();

    return true;
  }

  if (shell.shortcuts && (event.key === "j" || event.key === "k")) {
    event.preventDefault();
    shell.moveSection(event.key === "j" ? 1 : -1);

    return true;
  }

  return false;
};

const navigationKey = (shell: Shell, event: KeyboardEvent): void => {
  // Chaque zone a sa logique. La stack est une grille, les sections et la frise
  // sont des listes ou la fleche droite valide, le reste change de volet.
  const handled =
    gridMove("[data-tech]", event.key) ||
    listMove('[data-ctl="nav"]', event.key, (at) => {
      const entries = [...document.querySelectorAll<HTMLElement>('[data-ctl="nav"]')];

      // Valider une section amène à sa première prise (stack, frise), sinon à la ligne de
      // commande. L'intention se pose avant le clic. Une section déjà vue s'affiche sans
      // frappe : sans cette intention posée avant le clic, la prise se ferait trop tôt.
      shell.wantResult = true;
      entries[at]?.click();
    }) ||
    listMove('[data-ctl="tl"]', event.key, (at) => {
      shell.openTimeline(at);
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
      shell.moveInPane(1);
    },
    ArrowLeft: () => {
      shell.movePane(-1);
    },
    ArrowRight: () => {
      shell.movePane(1);
    },
    ArrowUp: () => {
      shell.moveInPane(-1);
    },
  }[event.key];

  if (!fallback) {
    return;
  }

  event.preventDefault();
  fallback();
};

export const keyboardSlice = () => {
  return slice<KeyboardApi>({
    // Le focus est mémorisé par volet : y revenir repose le curseur où on l'avait
    // laissé, plutôt qu'en tête de liste.
    focusPane(this: Shell, pane: string) {
      const entries = items(pane);

      if (entries.length === 0) {
        return;
      }

      this.pane = pane;
      this.focusAt[pane] = Math.min(this.focusAt[pane] ?? 0, entries.length - 1);
      entries[this.focusAt[pane] ?? 0]?.focus();
    },

    // Le volet courant se lit sur le focus : Tab et la souris deplacent le focus sans
    // passer par focusPane.
    moveInPane(this: Shell, step: number) {
      const pane = paneOf(document.activeElement) ?? this.pane,
        entries = items(pane);

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

    // « globalShortcut » passe avant « passesKey ». Sans cet ordre, la sortie sur les
    // modificateurs avalerait Ctrl + K.
    onKey(this: Shell, event: KeyboardEvent) {
      if (globalShortcut(this, event) || passesKey(this, event) || characterKey(this, event)) {
        return;
      }

      navigationKey(this, event);
    },
  });
};
