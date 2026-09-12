// Le contrat interpreteur vers coquille : ce que l'interpreteur decrit, et que la coquille
// applique. Il ne touche jamais au DOM.

import type { ContentLine } from "./content.ts";
import type { Line } from "./lines.ts";

export type TrackValue = boolean | number | string;

export type Expression = "alert" | "happy" | "idle" | "laugh" | "sad" | "scared" | "sleep";

// Ce que la coquille doit faire. L'interpreteur ne touche jamais au DOM : il decrit, elle
// applique. Cette union est le contrat entre les deux seams.
export type Effect =
  | { type: "activity"; name: string }
  // « lexical » n'est rempli que si un modele doit choisir avant d'afficher. La coquille
  // le garde sous la main : il sort si le modele echoue ou depasse son delai.
  | { candidates: string[]; query: string; type: "ask"; lexical?: Line[] }
  | { type: "blowUp" }
  | { type: "clear" }
  | { type: "cv" }
  | { type: "drop" }
  | { type: "email" }
  | { type: "emote"; expression: Expression }
  | { type: "usage" }
  | { type: "evolve" }
  | { type: "options" }
  | { type: "pending"; answer?: string; payload: string }
  | { type: "power"; mode: string }
  | { type: "replay" }
  | { type: "say"; expression: Expression; text: string }
  | { type: "send"; payload: string }
  | { type: "sendMail" }
  | { type: "share"; kind: string; url: string }
  | { type: "shareMenu" }
  | { type: "state"; patch: { jokeIndex?: number; pending?: undefined } }
  | { type: "theme"; name: string }
  | { type: "track"; event: string; props: Record<string, TrackValue> }
  | { type: "navigate"; id: string };

export interface Outcome {
  effects: Effect[];
  lines: Line[];
  // Une commande peut reclamer le resultat au lieu du journal. Le journal garde l'echo, le
  // corps de la reponse va dans le volet central, ou la place existe.
  result?: ContentLine[];
}

export const track = (event: string, props: Record<string, TrackValue>): Effect => ({
  event,
  props,
  type: "track",
});

export const say = (text: string, expression: Expression): Effect => ({
  expression,
  text,
  type: "say",
});
