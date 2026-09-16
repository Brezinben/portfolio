// Le socle du composant Alpine, decoupe en tranches : des objets de methodes qui ne se
// parlent que par « this », comme au temps ou elles vivaient dans un litteral unique. Deux
// regles tiennent ce decoupage.
// 1. Aucune tranche ne porte d'accesseur, pour que app.ts reste le seul fichier ou vivent
//    les valeurs lues par le balisage. L'ADR 0002 l'exige, et l'assemblage dans app.ts
//    le verifie aussi a l'execution.
// 2. Ce fichier n'importe que des types, en forme longue « import type » : le
//    specificateur en ligne creerait un cycle d'execution invisible ailleurs, que tient la regle dediee de .oxlintrc.jsonc.

import type { RadioApi, RadioState } from "./radio/slice.ts";
import type { MascotApi } from "./mascot/slice.ts";
import type { TrackValue } from "../interpret.ts";

// Alpine pose ses magies sur le composant apres l'avoir construit : elles ne sont pas dans
// le litteral, mais « this » les voit a l'execution.
export interface Magics {
  $nextTick: (callback: () => void) => void;
  $refs: Record<string, HTMLElement | undefined>;
}

// Ce que toute tranche peut lire de l'etat, en plus du sien. « reduced » est un accesseur
// vivant : le copier le figerait a « false » chez qui demande moins de mouvement, sans
// casser un seul test.
export interface Shared {
  anim: boolean;
  out: boolean;
  reduced: boolean;
  track(event: string, props?: Record<string, TrackValue>): void;
}

// Ce que le composant est une fois les tranches reunies. Le contrat s'ecrit a la main :
// deduire « this » du type des tranches tourne en rond, et TypeScript rend « any ».
export interface Terminal extends MascotApi, RadioApi, RadioState, Shared {}

// Ce que « this » voit dans une methode : le composant entier, plus les magies.
export type Shell = Magics & Terminal;

// L'identite, comme withMagics dont elle prend la place : ThisType ne change rien au code
// produit, elle donne seulement son type a « this ».
export const slice = <T extends object>(members: T & ThisType<Shell>): T => members;
