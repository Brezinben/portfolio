// Le socle du composant Alpine, découpé en tranches : des objets de méthodes qui ne se
// parlent que par « this », comme au temps où elles vivaient dans un littéral unique. Deux
// règles tiennent ce decoupage.
// 1. Aucune tranche ne porte d'accesseur, pour que app.ts reste le seul fichier où vivent
//    les valeurs lues par le balisage. L'ADR 0002 l'exige.
// 2. Ce fichier n'importe que des types, en forme longue « import type » : le
//    spécificateur en ligne créerait un cycle d'exécution invisible ailleurs, que tient la règle dédiée de .oxlintrc.jsonc.

import type { AchievementsApi, AchievementsState } from "./achievements/slice.ts";
import type { AskApi, AskState } from "./ask/slice.ts";
import type { GlitchApi, GlitchState } from "./glitch/slice.ts";
import type { GlobalEntry, Line, TrackValue } from "../interpret.ts";
import type { GlobalSearchApi, GlobalSearchState } from "./global-search/slice.ts";
import type { KeyboardApi, KeyboardState } from "./keyboard/slice.ts";
import type { LogApi, LogState } from "./log/slice.ts";
import type { MascotApi, MascotState } from "./mascot/slice.ts";
import type { OptionsApi, OptionsState } from "./options/slice.ts";
import type { RadioApi, RadioState } from "./radio/slice.ts";
import type { SuggestionsApi, SuggestionsState } from "./suggestions/slice.ts";
import type { Section } from "./format.ts";

// Alpine pose ses magies sur le composant après l'avoir construit : elles ne sont pas dans
// le littéral, mais « this » les voit à l'execution.
export interface Magics {
  $nextTick: (callback: () => void) => void;
  $refs: Record<string, HTMLElement | undefined>;
}

// D'où vient une action mesurée : un clic ou une touche dans l'interface, ou une commande
// tapée dans le terminal. Type partage pour que les deux ne divergent jamais entre les
// événements qui la distinguent.
export type TrackSource = "commande" | "interface";

// Les deux minuteurs de la plateforme. Chaque tranche en garde, et aucune ne les redéclare.
export type Delay = ReturnType<typeof setTimeout>;
export type Beat = ReturnType<typeof setInterval>;

// Ce que toute tranche peut lire de l'état, en plus du sien. « reduced » suit la préférence
// du système en cours de visite. Une copie figerait la valeur lue au chargement.
export interface Shared {
  anim: boolean;
  booting: boolean;
  current: Section;
  details: Section[];
  goSection(id: string, options?: { push?: boolean; via?: TrackSource }): void;
  navClick(event: MouseEvent, id: string): void;
  // Les deux accesseurs de la recherche globale. Ils vivent dans app.ts : aucune tranche n'en
  // porte, et une tranche qui les recalculerait classerait l'index une seconde fois.
  globalGhost: string;
  globalHits: GlobalEntry[];
  input: string;
  journal: Line[];
  missions: { id: string; state?: string }[];
  // Vrai tant qu'une des trois modales est ouverte : le reste de la page devient inerte.
  modalOpen: boolean;
  logH: number;
  logHeight: number;
  online: boolean;
  openTimeline(index: number): void;
  modelState: string;
  out: boolean;
  radioStop(): void;
  reduced: boolean;
  section: string;
  sections: Section[];
  shareTargets: string[];
  shortcuts: boolean;
  skipBoot(): boolean;
  // « typed » distingue une commande tapée d'une commande lancée à la souris : le succès de
  // la première commande dit « tapee, pas cliquee ».
  submit(options?: { typed?: boolean }): void;
  tech: string;
  wantResult: boolean;
  techNotes: Record<string, { note?: string; where?: string }>;
  track(event: string, props?: Record<string, TrackValue>): void;
}

// Ce que le composant est une fois les tranches reunies. Le contrat s'écrit à la main :
// déduire « this » du type des tranches tourne en rond, et TypeScript rend « any ».
export interface Terminal
  extends
    AchievementsApi,
    AchievementsState,
    AskApi,
    AskState,
    GlitchApi,
    GlitchState,
    GlobalSearchApi,
    GlobalSearchState,
    KeyboardApi,
    KeyboardState,
    LogApi,
    LogState,
    MascotApi,
    MascotState,
    OptionsApi,
    OptionsState,
    RadioApi,
    RadioState,
    Shared,
    SuggestionsApi,
    SuggestionsState {}

// Ce que « this » voit dans une méthode : le composant entier, plus les magies.
export type Shell = Magics & Terminal;

// L'identité, comme withMagics dont elle prend la place : ThisType ne change rien au code
// produit, elle donne seulement son type à « this ».
export const slice = <T extends object>(members: T & ThisType<Shell>): T => {
  return members;
};
