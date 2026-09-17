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
import { addMark, setMark } from "./store.ts";
import type { Shell } from "../shell.ts";

type Delay = ReturnType<typeof setTimeout>;

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
  unlockFrom(effects: Effect[]): void;
}

// La grille couvre le bandeau entier, bords compris, et s'efface case par case de gauche à
// droite. Le grain empêche le front d'être une ligne droite : sans lui, l'effet redevient
// un balayage, qui est justement ce qu'on ne voulait pas.
const cells = () =>
  Array.from({ length: ALERT_COLUMNS * ALERT_ROWS }, (_, index) => {
    const ratio = (index % ALERT_COLUMNS) / ALERT_COLUMNS,
      entering = ratio * ALERT_IN_MS + Math.random() * ALERT_IN_GRAIN_MS,
      leaving = (1 - ratio) * ALERT_OUT_MS + Math.random() * ALERT_OUT_GRAIN_MS;

    return `--in:${Math.round(entering)}ms;--out:${Math.round(leaving)}ms`;
  });

const rowNodes = () => [...document.querySelectorAll<HTMLElement>("[data-ach-row]")];

export const achievementsSlice = () => ({
  // Le focus entre dans la liste à l'ouverture, sinon échap et tab restent à la page
  // derrière. Les flèches la parcourent comme celle des sections.
  achievementsKey(this: Shell, event: KeyboardEvent) {
    if (event.key === "Escape") {
      event.preventDefault();
      this.closeAchievements();

      return;
    }

    const rows = rowNodes(),
      at =
        document.activeElement instanceof HTMLElement ? rows.indexOf(document.activeElement) : -1;

    if (event.key === "Tab") {
      event.preventDefault();
      rows[(at + (event.shiftKey ? -1 : 1) + rows.length) % rows.length]?.focus();

      return;
    }

    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") {
      return;
    }

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
    this.alertTimer = setTimeout(() => this.alertOut(), ALERT_MS);
  },

  // La sortie n'est jouée que si rien n'attend derrière. Jouer une disparition pour la
  // recouvrir aussitôt ne se voit pas, et retarde chaque entrée de la file.
  alertOut(this: Shell) {
    if (this.alertQueue.length > 0 || !this.anim || this.reduced) {
      this.alertNext();

      return;
    }

    this.alertLeaving = true;
    this.alertTimer = setTimeout(() => this.alertNext(), ALERT_OUT_TOTAL_MS);
  },

  closeAchievements(this: Shell) {
    this.achievementsOpen = false;
    this.$nextTick(() =>
      (this.achievementsReturn ?? document.querySelector<HTMLElement>("[data-ctl='ach']"))?.focus(),
    );
  },

  markActivity(this: Shell, name: string) {
    this.achievements = addMark(`${ACTIVITY_MARK}${name}`);

    if (ACTIVITIES.every((entry) => this.achievements.includes(`${ACTIVITY_MARK}${entry}`))) {
      this.unlock("activities");
    }
  },

  // La première section ouverte, puis les six. Le compteur vit dans le même tableau que
  // les clés : une marque préfixée s'en distingue, et se compte sans second stockage.
  markSection(this: Shell, id: string) {
    this.achievements = addMark(`${SECTION_MARK}${id}`);
    this.unlock("first-section");

    if (this.sections.every((entry) => this.achievements.includes(`${SECTION_MARK}${entry.id}`))) {
      this.unlock("all-sections");
    }
  },

  markTheme(this: Shell, id: string) {
    this.achievements = addMark(`${THEME_MARK}${id}`);

    if (THEMES.every((entry) => this.achievements.includes(`${THEME_MARK}${entry.id}`))) {
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
    this.$nextTick(() => rowNodes()[0]?.focus());
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
  unlockFrom(this: Shell, effects: Effect[]) {
    const measured = effects.find(
        (effect) => effect.type === "track" && effect.event === "commande",
      ),
      command = measured?.type === "track" ? String(measured.props["cmd"]) : "";

    if (command === "") {
      return;
    }

    this.unlock("first-command");

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
});
