// La modale des options : le thème, les bascules, et leur stockage sur l'appareil.

import { type Delay, type Shell, type TrackSource, slice } from "../shell.ts";
import { OPTS_KEY, TOGGLES, type ToggleKey } from "../settings.ts";
import { knownTheme, readOpts } from "../opts.ts";
import { readMarks, writeMarks } from "../achievements/store.ts";
import { MORPH_HOLD_MS } from "../mascot/constants.ts";
import { keepKnown } from "../../interpret.ts";

// Ce que les options gardent dans l'etat du composant.
export interface OptionsState {
  // La mue du thème tient jusqu'à la fermeture de la modale, puis ce sursis.
  morphTimer: Delay | undefined;
  optsOpen: boolean;
  // Qui a ouvert la modale : le bouton de l'en-tete, ou la saisie via la commande.
  optsReturn: HTMLElement | undefined;
  theme: string;
}

export interface OptionsApi {
  closeOpts(): void;
  flip(key: ToggleKey): void;
  focusSetting(): void;
  focused(): { group: string; index: number } | undefined;
  lockedToggle(key: ToggleKey): boolean;
  moveTheme(index: number): void;
  openOpts(via?: TrackSource): void;
  optsArrow(event: KeyboardEvent, here: { group: string; index: number }): void;
  optsKey(event: KeyboardEvent): void;
  persist(): void;
  restore(): void;
  setTheme(id: string, via?: TrackSource): void;
  themeColumns(): number;
  value(key: ToggleKey): boolean;
}

const themeButtons = () => {
  return [...document.querySelectorAll<HTMLElement>("[data-opts] [data-theme-choice]")];
};

const toggleButtons = () => {
  return [...document.querySelectorAll<HTMLElement>("[data-opts] [data-toggle]:not(:disabled)")];
};

// La grille des thèmes se parcourt aux flèches : Tab n'y garde qu'un arrêt, le thème qui a
// le focus, sinon le thème choisi.
const trapTab = (event: KeyboardEvent) => {
  const active = document.activeElement,
    inThemes = active instanceof HTMLElement && active.matches("[data-theme-choice]"),
    focusable = [
      ...document.querySelectorAll<HTMLElement>("[data-opts] [data-ctl='opt']:not(:disabled)"),
    ].filter((node) => {
      if (!node.matches("[data-theme-choice]")) {
        return true;
      }

      return inThemes ? node === active : node.getAttribute("aria-pressed") === "true";
    }),
    at = active instanceof HTMLElement ? focusable.indexOf(active) : -1,
    next = (at + (event.shiftKey ? -1 : 1) + focusable.length) % focusable.length;

  event.preventDefault();
  focusable[next]?.focus();
};

export const optionsSlice = () => {
  return slice<OptionsApi>({
    closeOpts(this: Shell) {
      this.optsOpen = false;
      // « isConnected » : « options » lancé depuis la recherche globale a capturé le champ
      // de la zone, que la fermeture détache. Un nœud détaché reste vrai, et le focus
      // tomberait sur le corps de la page. Même garde que les deux autres modales.
      this.$nextTick(() => {
        const back = this.optsReturn?.isConnected === true ? this.optsReturn : undefined;

        (back ?? document.querySelector<HTMLElement>("[data-ctl='opts']"))?.focus();
      });

      if (!this.morphHeld) {
        return;
      }

      // Fermer au milieu d'une passe n'en montrerait qu'un eclat. Le sursis passe, la
      // passe en cours s'acheve, et settle() rend le repos.
      clearTimeout(this.morphTimer);
      this.morphTimer = setTimeout(() => {
        this.morphHeld = false;
      }, MORPH_HOLD_MS);
    },

    flip(this: Shell, key: ToggleKey) {
      if (this.lockedToggle(key)) {
        return;
      }

      this[key] = !this[key];
      this.track("option", { cle: key, valeur: this[key] });
      this.persist();

      // La boucle de rendu de la radio s'arrete quand l'animation se coupe. Rien ne la
      // rallumerait sans cet appel : le depot ne porte aucun observateur de reglage.
      if (key === "anim" && this.radioOn) {
        this.radioDraw();
      }

      // Le volet de sortie est la seule surface de la radio, et « /radio » le rallume pour
      // cette raison. L'eteindre la laisserait jouer sans rien pour l'arreter.
      if (key === "out" && !this.out) {
        this.radioStop();
      }
    },

    focusSetting(this: Shell) {
      const active = document.querySelector<HTMLElement>(
        "[data-opts] [data-theme-choice][aria-pressed='true']",
      );

      (active ?? themeButtons()[0])?.focus();
    },

    // Le réglage courant se lit sur l'élément focalisé. Un compteur se désynchroniserait après
    // une tabulation ou un clic. Le focus serait sur « animations », et la flèche droite
    // modifierait « dense lines ».
    focused(this: Shell) {
      const active = document.activeElement,
        theme = active instanceof HTMLElement ? themeButtons().indexOf(active) : -1;

      if (theme !== -1) {
        return { group: "theme", index: theme };
      }

      const toggle = active instanceof HTMLElement ? toggleButtons().indexOf(active) : -1;

      return toggle === -1 ? undefined : { group: "toggle", index: toggle };
    },

    // Le systeme a deja tranche : sous mouvement reduit, la bascule des animations ne
    // peut plus rien changer. La laisser active ferait croire le contraire.
    lockedToggle(this: Shell, key: ToggleKey) {
      return key === "anim" && this.reduced;
    },

    moveTheme(this: Shell, index: number) {
      const buttons = themeButtons(),
        target = buttons[Math.max(0, Math.min(buttons.length - 1, index))];

      if (!target) {
        return;
      }

      this.setTheme(target.dataset.themeChoice ?? "dark");
      this.$nextTick(() => {
        target.focus();
      });
    },

    openOpts(this: Shell, via: TrackSource = "interface") {
      this.track("options_ouvertes", { via });
      this.optsReturn =
        document.activeElement instanceof HTMLElement ? document.activeElement : undefined;
      this.optsOpen = true;
      this.$nextTick(() => {
        this.focusSetting();
      });
    },

    // Dans la grille, les flèches suivent les colonnes. Dans les bascules, gauche et droite
    // changent la valeur, haut et bas changent de réglage.
    optsArrow(this: Shell, event: KeyboardEvent, here: { group: string; index: number }) {
      if (here.group === "theme") {
        const columns = this.themeColumns(),
          step = { ArrowDown: columns, ArrowLeft: -1, ArrowRight: 1, ArrowUp: -columns }[event.key],
          next = here.index + (step ?? 0);

        // Sortir de la grille par le bas mene au premier reglage suivant.
        if (next >= themeButtons().length) {
          toggleButtons()[0]?.focus();
        } else {
          this.moveTheme(next);
        }

        return;
      }

      if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
        this.flip(TOGGLES[here.index]?.key ?? "anim");

        return;
      }

      const next = here.index + (event.key === "ArrowDown" ? 1 : -1);

      if (next < 0) {
        this.focusSetting();
      } else {
        toggleButtons()[next]?.focus();
      }
    },

    optsKey(this: Shell, event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        this.closeOpts();

        return;
      }

      if (event.key === "Tab") {
        trapTab(event);

        return;
      }

      const here = this.focused();

      if (!here || !["ArrowDown", "ArrowLeft", "ArrowRight", "ArrowUp"].includes(event.key)) {
        return;
      }

      event.preventDefault();
      this.optsArrow(event, here);
    },

    persist(this: Shell) {
      try {
        globalThis.localStorage.setItem(
          OPTS_KEY,
          JSON.stringify({
            anim: this.anim,
            logH: this.logH,
            out: this.out,
            shortcuts: this.shortcuts,
            theme: this.theme,
          }),
        );
      } catch {
        // Navigation privée ou stockage plein : le réglage vaut pour cette visite.
      }
    },

    restore(this: Shell) {
      const saved = readOpts();

      // Cinq clés, et cinq seulement, chacune verifiee avant d'entrer dans l'etat.
      if (saved.anim === true || saved.anim === false) {
        this.anim = saved.anim;
      }

      if (saved.out === true || saved.out === false) {
        this.out = saved.out;
      }

      if (saved.shortcuts === true || saved.shortcuts === false) {
        this.shortcuts = saved.shortcuts;
      }

      if (Number.isFinite(saved.logH)) {
        this.logH = Number(saved.logH);
      }

      this.theme = knownTheme(saved);

      // Le catalogue bouge, le stockage non : une clé retirée disparaît sans laisser
      // d'orphelin. Les pages annexes écrivent ici, depuis un autre onglet.
      const stored = readMarks();

      this.achievements = keepKnown(stored);

      // Le nettoyage se réécrit, et ne reste pas en mémoire. « addMark » relit le stockage
      // brut avant d'écrire : sans cette passe, l'orphelin reviendrait au premier déblocage.
      if (this.achievements.length !== stored.length) {
        writeMarks(this.achievements);
      }
    },

    setTheme(this: Shell, id: string, via: TrackSource = "interface") {
      this.track("theme", { nom: id, via });
      this.markTheme(id);

      // Le choix se fait depuis la modale, donc la mue tient jusqu'a sa fermeture. Le
      // marquer ici et non dans apply() : startViewTransition differe le rappel, et une
      // fermeture rapide passerait devant lui.
      clearTimeout(this.morphTimer);
      this.morphHeld = this.optsOpen;

      const apply = () => {
        this.theme = id;
        this.persist();
        this.mascotPlay("morph");
      };

      // Le réglage « animations off » et la préférence système coupent aussi le fondu.
      if (!this.anim || this.reduced || !("startViewTransition" in document)) {
        apply();

        return;
      }

      document.startViewTransition(() => {
        apply();
      });
    },

    // Les themes sont sur plusieurs lignes : les quatre fleches doivent y naviguer.
    // Les boutons d'une meme ligne partagent leur position verticale.
    themeColumns(this: Shell) {
      const buttons = themeButtons(),
        top = buttons[0]?.offsetTop;

      return Math.max(
        1,
        buttons.filter((button) => {
          return button.offsetTop === top;
        }).length,
      );
    },

    value(this: Shell, key: ToggleKey) {
      return this[key] && !this.lockedToggle(key);
    },
  });
};
