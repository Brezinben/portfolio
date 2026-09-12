// Interpréteur de commandes du terminal.
//
// Pur et synchrone : il ne touche pas au DOM, ne fait aucune requête, ne pose aucun
// minuteur. Il rend les lignes à afficher et des descripteurs d'effets que la coquille
// applique. C'est ce qui permet de couvrir les commandes sans navigateur.

// La facade : les tests et la coquille passent par cette porte, jamais par un module de
// « interpret/ ». Elle n'expose que ce qui a un consommateur.
export { type ContentLine, contentLine } from "./interpret/content.ts";
export {
  type Effect,
  type Expression,
  type Outcome,
  type TrackValue,
} from "./interpret/effects.ts";
export type { Context } from "./interpret/context.ts";
export { COW_HEAD_MODES, cowsay } from "./interpret/cowsay.ts";
export { candidates, commonPrefix, hintFor } from "./interpret/completion.ts";
export { proposalPrompt } from "./interpret/consent.ts";
export { MAX_SUGGESTIONS, type Line } from "./interpret/lines.ts";
export { TONES, type Tone, safeTone } from "./interpret/tone.ts";
export { type Share, fillTokens, isSafeUrl, shareTarget } from "./interpret/share.ts";
export { interpret } from "./interpret/dispatch.ts";
