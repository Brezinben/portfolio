// La mascotte vue de l'interpreteur : son vocabulaire, et la commande qui la pilote.
//
// « OFFERED » et « ACTIVITIES » ont un lecteur distant, la completion : elle propose ce
// que la commande accepte. Les restreindre ici casserait l'autocompletion sans bruit.

import { type Effect, type Expression, say } from "./effects.ts";
import { type Line, done, failed, info, muted, offer } from "./lines.ts";
import type { Context } from "./context.ts";
import { lookup } from "./lookup.ts";

export interface Told {
  effects: Effect[];
  lines: Line[];
}

export const EXPRESSIONS: Record<Expression, string> = {
  alert: "surpris",
  happy: "content",
  idle: "neutre",
  laugh: "hilare",
  sad: "triste",
  scared: "apeuré",
  sleep: "endormi",
};
// Deux listes, et elles disent deux choses différentes. « EXPRESSIONS » nomme toutes les
// expressions, « idle » compris, car « say » s'en sert pour ramener la mascotte au repos.
// « OFFERED » est ce que la commande propose, et « idle » n'y est pas : elle y est déjà.
export const OFFERED: Expression[] = ["alert", "happy", "laugh", "sad", "scared", "sleep"];
// Une activité demande un accessoire, là où une expression se lit sur le visage. Le glossaire
// les sépare, et la commande aussi : « slime activity <nom> ».
export const ACTIVITIES = ["bike", "coffee", "goal", "juggle", "lift", "train"];

const isExpression = (value: string): value is Expression => {
  return OFFERED.some((expression) => {
    return expression === value;
  });
};
const emoted = (expression: Expression): Told => {
  return {
    effects: [{ expression, type: "emote" }, say(EXPRESSIONS[expression], expression)],
    lines: [done(`le slime est ${EXPRESSIONS[expression]}.`)],
  };
};
const absent: Told = {
  effects: [{ type: "usage" }],
  lines: [failed("le slime n'est pas là : attendez qu'il revienne.")],
};
const changing: Told = {
  effects: [{ type: "usage" }],
  lines: [failed("le slime change de forme : laissez-le finir.")],
};
const dozing: Told = {
  effects: [{ type: "usage" }],
  lines: [
    failed("le slime dort tant que le réseau est coupé."),
    muted("il se réveille de lui-même au retour du réseau."),
  ],
};

// La mascotte absente, occupee ou endormie refuse toute commande, chacune avec sa phrase.
const REFUSED = { asleep: dozing, away: absent, busy: changing };

// Quatre etats possibles, un seul a la fois : la coquille dit lequel plutot que de passer
// trois booleens dont la plupart des combinaisons n'existent pas.
export const slime = (argument: string, name: string, mascot: Context["mascot"]): Told => {
  // Annoncer « le slime explose » pendant qu'il est deja parti fait mentir le journal :
  // la coquille avale le geste, la ligne reste. Endormie, elle avale tout de meme.
  const refused = lookup(REFUSED, mascot);

  if (refused) {
    return refused;
  }

  if (argument === "evolve") {
    return {
      effects: [{ type: "evolve" }],
      lines: [done("le slime change de forme.")],
    };
  }

  if (argument === "drop") {
    return { effects: [{ type: "drop" }], lines: [done("le slime tombe et s'écrase.")] };
  }

  if (argument === "kill") {
    return { effects: [{ type: "blowUp" }], lines: [done("le slime explose.")] };
  }

  if (argument === "activity") {
    if (!ACTIVITIES.includes(name)) {
      return {
        effects: [{ type: "usage" }],
        lines: [offer("/slime activity <nom>", ACTIVITIES)],
      };
    }

    return {
      effects: [{ name, type: "activity" }],
      lines: [done(`le slime s'y met : ${name}.`)],
    };
  }

  if (argument === "expression") {
    return isExpression(name)
      ? emoted(name)
      : { effects: [{ type: "usage" }], lines: [offer("/slime expression <nom>", OFFERED)] };
  }

  // « /slime happy » reste un raccourci : il marche, mais l'aide annonce le chemin long,
  // symetrique de « /slime activity <nom> ».
  if (!isExpression(argument)) {
    return {
      effects: [{ type: "usage" }],
      lines: [
        offer("/slime expression <nom>", OFFERED),
        offer("/slime activity <nom>", ACTIVITIES),
        info("/slime evolve — lui fait changer de forme"),
        info("/slime drop — le fait tomber du plafond"),
        info("/slime kill — le fait exploser, il revient de lui-même"),
      ],
    };
  }

  return emoted(argument);
};
