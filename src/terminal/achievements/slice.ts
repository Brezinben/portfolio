// Les succès : ce qui les débloque, la file des alertes, et la liste.
//
// La tranche ne porte aucun accesseur : elle écrit dans l'état, et le balisage lit l'état.
// Le seul point d'accroche des commandes est « submit », qui lui passe les effets rendus
// par l'interpréteur. Trente appels dispersés deviendraient trente dettes.

import {
  ACTIVITIES,
  ACTIVITY_MARK,
  type Effect,
  SECTION_MARK,
  SEEN_MARK,
  THEME_MARK,
  unlockedBy,
  wonCount,
} from "../../interpret.ts";
import {
  ALERT_COLUMNS,
  ALERT_IN_GRAIN_MS,
  ALERT_IN_MS,
  ALERT_MS,
  ALERT_OUT_GRAIN_MS,
  ALERT_OUT_MS,
  ALERT_OUT_TOTAL_MS,
  ALERT_ROWS,
  THEMES,
} from "../settings.ts";
import type { Delay, Shell } from "../shell.ts";
import { addMark, setMark } from "./store.ts";

// Ce que les succès gardent dans l'état du composant. L'état vit dans app.ts, comme tout
// le reste ; app.ts reprend cette interface pour ne pas déclarer les mêmes champs deux fois.
export interface AchievementsState {
  // Les clés acquises et les marques de progression, dans un seul tableau.
  achievements: string[];
  achievementsOpen: boolean;
  achievementsReturn: HTMLElement | undefined;
  // La clé du succès que l'alerte montre. Vide, il n'y a pas d'alerte.
  alert: string;
  // Les retards de la grille, tirés une fois par déblocage. Recalculés à chaque rendu, ils
  // repartent de zéro au moindre changement d'état voisin.
  alertCells: string[];
  alertLeaving: boolean;
  alertQueue: string[];
  alertTimer: Delay | undefined;
}

export interface AchievementsApi {
  achievementsKey(event: KeyboardEvent): void;
  alertNext(): void;
  alertOut(): void;
  closeAchievements(): void;
  markActivity(name: string): void;
  markSection(id: string): void;
  markTheme(id: string): void;
  openAchievements(via: string): void;
  unlock(key: string): void;
  unlockFrom(effects: Effect[], source: { typed: boolean }): void;
}

// Une case bascule en « steps(1) » : aucune fonction de temps ne s'applique à elle, et le
// rythme du front vient donc des seuls retards. La racine carrée est l'inverse d'un carré :
// le front avance en « ease-in », lentement d'abord, vite à la fin.
const eased = (ratio: number) => {
  return Math.sqrt(ratio);
};

// La grille couvre le bandeau entier, bords compris, et s'efface case par case de gauche à
// droite. Le grain empêche le front d'être une ligne droite : sans lui, l'effet redevient
// un balayage, qui est justement ce qu'on ne voulait pas.
const cells = () => {
  return Array.from({ length: ALERT_COLUMNS * ALERT_ROWS }, (_, index) => {
    const ratio = (index % ALERT_COLUMNS) / ALERT_COLUMNS,
      entering = eased(ratio) * ALERT_IN_MS + Math.random() * ALERT_IN_GRAIN_MS,
      leaving = eased(1 - ratio) * ALERT_OUT_MS + Math.random() * ALERT_OUT_GRAIN_MS;

    return `--in:${Math.round(entering)}ms;--out:${Math.round(leaving)}ms`;
  });
};

const rowNodes = () => {
  return [...document.querySelectorAll<HTMLElement>("[data-ach-row]")];
};
// Les flèches parcourent les entrées. La tabulation n'en garde qu'une : celle qui a le focus,
// sinon la première. Le bouton de fermeture reste dans la boucle, sinon Échap est la seule sortie.
const focusables = (active: HTMLElement | undefined) => {
  const rows = rowNodes(),
    row = active && rows.includes(active) ? active : rows[0];

  return [
    ...(row ? [row] : []),
    ...document.querySelectorAll<HTMLElement>("[data-ach] button[data-ctl]"),
  ];
};

export const achievementsSlice = () => {
  return {
    // Le focus entre dans la liste à l'ouverture, sinon échap et tab restent à la page
    // derrière. Les flèches la parcourent comme celle des sections.
    achievementsKey(this: Shell, event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        this.closeAchievements();

        return;
      }

      const active =
        document.activeElement instanceof HTMLElement ? document.activeElement : undefined;

      if (event.key === "Tab") {
        const all = focusables(active),
          from = active ? all.indexOf(active) : -1;

        event.preventDefault();
        all[(from + (event.shiftKey ? -1 : 1) + all.length) % all.length]?.focus();

        return;
      }

      if (event.key !== "ArrowDown" && event.key !== "ArrowUp") {
        return;
      }

      const rows = rowNodes(),
        at = active ? rows.indexOf(active) : -1;

      event.preventDefault();
      rows[
        Math.max(0, Math.min(rows.length - 1, at + (event.key === "ArrowDown" ? 1 : -1)))
      ]?.focus();
    },

    alertNext(this: Shell) {
      const [key, ...rest] = this.alertQueue;

      clearTimeout(this.alertTimer);
      this.alertLeaving = false;
      this.alert = key ?? "";

      if (!key) {
        return;
      }

      this.alertQueue = rest;
      this.alertCells = cells();
      this.alertTimer = setTimeout(() => {
        this.alertOut();
      }, ALERT_MS);
    },

    // La sortie n'est jouée que si rien n'attend derrière. Jouer une disparition pour la
    // recouvrir aussitôt ne se voit pas, et retarde chaque entrée de la file.
    alertOut(this: Shell) {
      // Une alerte sous le focus ou sous le pointeur reste affichée. Sans cette garde, le
      // bouton disparaît et le focus tombe sur le corps de la page (WCAG 2.2.1).
      if (document.querySelector("[data-ach-alert]")?.matches(":focus-within, :hover") === true) {
        this.alertTimer = setTimeout(() => {
          this.alertOut();
        }, ALERT_MS);

        return;
      }

      if (this.alertQueue.length > 0 || !this.anim || this.reduced) {
        this.alertNext();

        return;
      }

      this.alertLeaving = true;
      this.alertTimer = setTimeout(() => {
        this.alertNext();
      }, ALERT_OUT_TOTAL_MS);
    },

    closeAchievements(this: Shell) {
      this.achievementsOpen = false;
      // L'alerte qui a ouvert la liste a pu disparaître entre-temps : elle ne tient que dix
      // secondes. Un nœud détaché reste vrai, donc sans « isConnected » le repli ne part
      // jamais et le focus tombe sur le corps de la page.
      this.$nextTick(() => {
        const back =
          this.achievementsReturn?.isConnected === true ? this.achievementsReturn : undefined;

        (back ?? document.querySelector<HTMLElement>("[data-ctl='ach']"))?.focus();
      });
    },

    markActivity(this: Shell, name: string) {
      this.achievements = addMark(`${ACTIVITY_MARK}${name}`);

      if (
        ACTIVITIES.every((entry) => {
          return this.achievements.includes(`${ACTIVITY_MARK}${entry}`);
        })
      ) {
        this.unlock("activities");
      }
    },

    // La première section ouverte, puis les six. Le compteur vit dans le même tableau que
    // les clés : une marque préfixée s'en distingue, et se compte sans second stockage.
    markSection(this: Shell, id: string) {
      this.achievements = addMark(`${SECTION_MARK}${id}`);
      this.unlock("first-section");

      if (
        this.sections.every((entry) => {
          return this.achievements.includes(`${SECTION_MARK}${entry.id}`);
        })
      ) {
        this.unlock("all-sections");
      }
    },

    markTheme(this: Shell, id: string) {
      this.achievements = addMark(`${THEME_MARK}${id}`);

      if (
        THEMES.every((entry) => {
          return this.achievements.includes(`${THEME_MARK}${entry.id}`);
        })
      ) {
        this.unlock("all-themes");
      }
    },

    openAchievements(this: Shell, via: string) {
      this.track("succes_ouverts", { via });
      this.achievementsReturn =
        document.activeElement instanceof HTMLElement ? document.activeElement : undefined;
      this.achievementsOpen = true;
      // Ouvrir la liste marque tout l'acquis comme vu, et la relance du badge s'arrête. C'est
      // le seul endroit qui écrit ce compte.
      this.achievements = setMark(SEEN_MARK, String(wonCount(this.achievements)));
      this.$nextTick(() => {
        return rowNodes()[0]?.focus();
      });
    },

    unlock(this: Shell, key: string) {
      if (this.achievements.includes(key)) {
        return;
      }

      this.achievements = addMark(key);
      this.track("succes", { cle: key });
      this.alertQueue = [...this.alertQueue, key];

      if (this.alert === "") {
        this.alertNext();
      }
    },

    // Le seul point d'accroche des commandes. Le nom canonique se lit dans l'effet de
    // mesure, alias déjà résolus par le répartiteur. Les quatre succès de la mascotte se
    // lisent sur le type des effets, sans analyser la ligne une seconde fois.
    unlockFrom(this: Shell, effects: Effect[], source: { typed: boolean }) {
      const measured = effects.find((effect) => {
          return effect.type === "track" && effect.event === "commande";
        }),
        // Le répartiteur rend « commande » même pour une ligne qu'il refuse : « out » pose la
        // mesure avant de savoir. Une faute de frappe ne débloque donc rien.
        refused = effects.some((effect) => {
          return effect.type === "track" && effect.event === "commande_inconnue";
        }),
        command = measured?.type === "track" ? String(measured.props.cmd) : "";

      if (command === "" || refused) {
        return;
      }

      // « une commande tapee, pas cliquee » : une trouvaille lancee a la souris ne compte pas.
      if (source.typed) {
        this.unlock("first-command");
      }

      const found = unlockedBy(command);

      if (found) {
        this.unlock(found);
      }

      for (const effect of effects) {
        if (effect.type === "activity") {
          this.markActivity(effect.name);
        } else if (effect.type === "evolve") {
          this.unlock("evolve");
        } else if (effect.type === "blowUp") {
          this.unlock("kill");
        } else if (effect.type === "emote" && command === "slime") {
          this.unlock("expression");
        }
      }
    },
  };
};
