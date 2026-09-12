// Le socle du composant Alpine, decoupe en tranches.
//
// Une tranche est un objet de methodes qui parlent a « this ». Elles ne s'importent jamais
// les unes les autres : leur seul couplage est « this », comme du temps ou elles vivaient
// dans un litteral unique.
//
// Deux regles tiennent ce decoupage, et leur violation ne se voit pas au typecheck :
//
// 1. Aucune tranche ne porte d'accesseur. L'etalement « { ...slice() } » appelle chaque
//    « get » et copie sa valeur : l'accesseur disparait, remplace par un instantane.
//    « reduced » fige a false laisserait tourner les animations chez qui demande moins de
//    mouvement, sans casser un seul test. Les accesseurs restent dans app.ts.
// 2. Ce fichier n'importe que des types, en forme longue « import type ». Le specificateur
//    en ligne conserve l'instruction d'import, ce qui rendrait le cycle de types un cycle
//    d'execution : une page blanche dans l'artefact fondu, invisible ailleurs.

import type { MascotApi } from "./mascot/slice.ts";

// Alpine pose ses magies sur le composant apres l'avoir construit : elles ne sont pas dans
// le litteral, mais « this » les voit a l'execution.
export interface Magics {
  $nextTick: (callback: () => void) => void;
  $refs: Record<string, HTMLElement | undefined>;
}

// Ce que le composant est une fois les tranches reunies. Le contrat s'ecrit a la main :
// deduire « this » du type des tranches tourne en rond, et TypeScript rend « any ».
// L'interface grossit d'une ligne a chaque tranche extraite.
export interface Terminal extends MascotApi {}

// Ce que « this » voit dans une methode : le composant entier, plus les magies.
export type Shell = Magics & Terminal;

// L'identite, comme withMagics dont elle prend la place : ThisType ne change rien au code
// produit, elle donne seulement son type a « this ».
export const slice = <T extends object>(members: T & ThisType<Shell>): T => members;
