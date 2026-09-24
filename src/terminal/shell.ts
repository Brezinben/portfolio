// Le socle du composant Alpine, decoupe en tranches : des objets de methodes qui ne se
// parlent que par « this », comme au temps ou elles vivaient dans un litteral unique. Deux
// regles tiennent ce decoupage.
// 1. Aucune tranche ne porte d'accesseur, pour que app.ts reste le seul fichier ou vivent
//    les valeurs lues par le balisage. L'ADR 0002 l'exige, et l'assemblage dans app.ts
//    le verifie aussi a l'execution.
// 2. Ce fichier n'importe que des types, en forme longue « import type » : le
//    specificateur en ligne creerait un cycle d'execution invisible ailleurs, que tient la regle dediee de .oxlintrc.jsonc.

import type { AchievementsApi, AchievementsState } from "./achievements/slice.ts";
import type { GlitchApi, GlitchState } from "./glitch/slice.ts";
import type { GlobalEntry, TrackValue } from "../interpret.ts";
import type { GlobalSearchApi, GlobalSearchState } from "./global-search/slice.ts";
import type { KeyboardApi, KeyboardState } from "./keyboard/slice.ts";
import type { MascotApi, MascotState } from "./mascot/slice.ts";
import type { OptionsApi, OptionsState } from "./options/slice.ts";
import type { RadioApi, RadioState } from "./radio/slice.ts";
import type { Section } from "./format.ts";

// Alpine pose ses magies sur le composant apres l'avoir construit : elles ne sont pas dans
// le litteral, mais « this » les voit a l'execution.
export interface Magics {
  $nextTick: (callback: () => void) => void;
  $refs: Record<string, HTMLElement | undefined>;
}

// D'ou vient une action mesuree : un clic ou une touche dans l'interface, ou une commande
// tapee dans le terminal. Type partage pour que les deux ne divergent jamais entre les
// evenements qui la distinguent.
export type TrackSource = "commande" | "interface";

// Les deux minuteurs de la plateforme. Chaque tranche en garde, et aucune ne les redéclare.
export type Delay = ReturnType<typeof setTimeout>;
export type Beat = ReturnType<typeof setInterval>;

// Ce que toute tranche peut lire de l'etat, en plus du sien. « reduced » suit la preference
// du systeme en cours de visite : une tranche le lit, elle ne le copie jamais.
export interface Shared {
  anim: boolean;
  booting: boolean;
  details: Section[];
  goSection(id: string, options?: { push?: boolean; via?: TrackSource }): void;
  // Les deux accesseurs de la recherche globale. Ils vivent dans app.ts : aucune tranche n'en
  // porte, et une tranche qui les recalculerait classerait l'index une seconde fois.
  globalGhost: string;
  globalHits: GlobalEntry[];
  input: string;
  missions: { id: string; state?: string }[];
  // Vrai tant qu'une des trois modales est ouverte : le reste de la page devient inerte.
  modalOpen: boolean;
  logH: number;
  online: boolean;
  openTimeline(index: number): void;
  modelState: string;
  out: boolean;
  radioStop(): void;
  reduced: boolean;
  section: string;
  sections: Section[];
  shortcuts: boolean;
  skipBoot(): boolean;
  // « typed » distingue une commande tapee d'une commande lancee a la souris : le succes de
  // la premiere commande dit « tapee, pas cliquee ».
  submit(options?: { typed?: boolean }): void;
  tech: string;
  wantResult: boolean;
  techNotes: Record<string, { note?: string; where?: string }>;
  track(event: string, props?: Record<string, TrackValue>): void;
}

// Ce que le composant est une fois les tranches reunies. Le contrat s'ecrit a la main :
// deduire « this » du type des tranches tourne en rond, et TypeScript rend « any ».
export interface Terminal
  extends
    AchievementsApi,
    AchievementsState,
    GlitchApi,
    GlitchState,
    GlobalSearchApi,
    GlobalSearchState,
    KeyboardApi,
    KeyboardState,
    MascotApi,
    MascotState,
    OptionsApi,
    OptionsState,
    RadioApi,
    RadioState,
    Shared {}

// Ce que « this » voit dans une methode : le composant entier, plus les magies.
export type Shell = Magics & Terminal;

// L'identite, comme withMagics dont elle prend la place : ThisType ne change rien au code
// produit, elle donne seulement son type a « this ».
export const slice = <T extends object>(members: T & ThisType<Shell>): T => {
  return members;
};
