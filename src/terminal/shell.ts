// Le socle du composant Alpine, decoupe en tranches.
//
// Une tranche est un objet de methodes qui parlent a « this ». Elles ne s'importent jamais
// les unes les autres : leur seul couplage est « this », comme du temps ou elles vivaient
// dans un litteral unique.
//
// Deux regles tiennent ce decoupage.
//
// 1. Aucune tranche ne porte d'accesseur. Ce n'est pas une necessite technique : la fusion
//    passe par les descripteurs, qui preserveraient un « get » intact. C'est un choix,
//    pour que app.ts reste le seul fichier ou vivent les valeurs lues par le balisage.
//    L'ADR 0002 exige qu'elles soient des proprietes de Alpine.data et non des constantes
//    de module, que le minifieur renomme : les garder en un seul fichier rend cette
//    contrainte auditable d'un coup d'oeil. La liste « slices » de app.ts les etale, ce
//    qui figerait un accesseur : la regle s'y verifie donc aussi a l'execution.
// 2. Ce fichier n'importe que des types, en forme longue « import type ». Le specificateur
//    en ligne conserve l'instruction d'import, ce qui rendrait le cycle de types un cycle
//    d'execution : une page blanche dans l'artefact fondu, invisible ailleurs. Une regle de
//    lint la tient : l'override « src/terminal/shell.ts » de .oxlintrc.json. Il ne vise
//    que ce fichier — une tranche qui importe « slice » cree une arete d'execution vers
//    lui, et c'est normal : le cycle ne peut naitre que du retour, donc d'ici.

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
//
// Elle ne porte pas encore l'etat : « trackWidth » ne lit que « $refs ». La tranche
// suivante en aura besoin — « wander » lit « at », « dragging », « anim » — et State devra
// donc remonter de app.ts vers ce fichier avant la deuxieme extraction.
export interface Terminal extends MascotApi {}

// Ce que « this » voit dans une methode : le composant entier, plus les magies.
export type Shell = Magics & Terminal;

// L'identite, comme withMagics dont elle prend la place : ThisType ne change rien au code
// produit, elle donne seulement son type a « this ».
export const slice = <T extends object>(members: T & ThisType<Shell>): T => members;
