// Le consentement en deux temps : rien ne part avant un oui.

import { type Line, echoed, line, muted } from "./lines.ts";
import { type Outcome, say, track } from "./effects.ts";

const YES = /^(?<yes>o|oui|y|yes|ok)$/iu;
const NO = /^(?<no>n|non|no|annuler|cancel)$/iu;

export const answerPending = (input: string, pending: string): Outcome => {
  if (YES.test(input)) {
    return { effects: [{ payload: pending, type: "send" }], lines: [echoed(input)] };
  }

  if (NO.test(input)) {
    return {
      effects: [
        track("proposition_refusee", {}),
        say("comme vous voulez", "idle"),
        { patch: { pending: undefined }, type: "state" },
      ],
      lines: [echoed(input), muted("annulé, rien n'a été envoyé.")],
    };
  }

  return { effects: [], lines: [muted("répondez « oui » ou « non » — Échap annule.")] };
};

// Consentement en deux temps : la commande dit ce qui part, ou, et ce qui ne part pas.
// Rien n'est envoye avant un oui.
export const ideaPrompt = (text: string, feedback: Record<string, string>): Line[] => {
  return [
    line({ marker: "›", markerTone: "acc", text: `« ${text} »`, tone: "fg" }),
    line({
      marker: "·",
      text: `Destination : ${feedback.tool}, ${feedback.host}.`,
      tone: "fg2",
    }),
    line({ marker: "·", text: `Ce qui part : ${feedback.sent}`, tone: "fg2" }),
    line({ marker: "·", text: `Ce qui ne part pas : ${feedback.notSent}`, tone: "fg2" }),
    line({ marker: "?", markerTone: "acc", text: "Envoyer ? tapez oui ou non.", tone: "fg" }),
  ];
};
