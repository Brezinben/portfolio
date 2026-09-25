// Le repartiteur : le point unique ou une ligne tapee devient des lignes et des effets.
//
// « COMMANDS » dit en un coup d'oeil ce que le terminal accepte. Chaque commande a son
// gestionnaire, et « interpret » ne garde que ce qui passe avant elles : la reponse en
// attente, le slash obligatoire, le rejeu, les sections.

import { ALIASES, KEYBOARD, NAVIGATORS, SLASH_ONLY, helpLines } from "./vocabulary.ts";
import { COW_MODES, cowsay } from "./cowsay.ts";
import { EGGS, type Egg } from "./eggs.ts";
import { type Effect, type Outcome, say, track } from "./effects.ts";
import { type Line, done, echoed, failed, info, line, muted, offer } from "./lines.ts";
import { answerPending, proposalPrompt } from "./consent.ts";
import type { Context } from "./context.ts";
import { answer } from "./search.ts";
import { lookup } from "./lookup.ts";
import { shareTarget } from "./share.ts";
import { slime } from "./mascot.ts";

// Ce qu'un gestionnaire recoit : la ligne decoupee, le contexte, et « out », qui pose
// l'echo et la mesure de la commande devant ses lignes et ses effets.
interface Call {
  argument: string;
  command: string;
  context: Context;
  out: (lines: Line[], effects?: Effect[]) => Outcome;
  parts: string[];
  rest: string;
  sections: Context["sections"];
}

const next = (context: Context) => {
  return context.jokes.length < 2
    ? 0
    : (context.jokeIndex + 1 + Math.floor(Math.random() * (context.jokes.length - 1))) %
        context.jokes.length;
};

const power = ({ command, out }: Call) => {
  const said = command === "reboot" ? "Redémarrage du système…" : "Extinction du système…";

  return out(
    [line({ marker: "·", text: said, tone: "warn" })],
    [{ mode: command === "reboot" ? "reboot" : "shutdown", type: "power" }],
  );
};

const COMMANDS = {
  ask: ({ context, out, rest, sections }) => {
    const found = answer(rest, sections, { model: context.model });

    return out(found.lines, found.effects);
  },
  clear: ({ command }) => {
    return {
      effects: [track("commande", { cmd: command }), { type: "clear" }],
      lines: [],
    };
  },
  cowsay: ({ command, context, out, rest }) => {
    // Les huit visages de l'original restent, mais sans drapeau a retenir : un portfolio
    // n'est pas une page de manuel. Le tirage rend la commande vivante a chaque appel.
    const mode = COW_MODES[Math.floor(Math.random() * COW_MODES.length)] ?? "",
      said = rest.trim();

    return out(
      cowsay(said, { columns: context.columns, mode }).map((row) => {
        return line({ text: row, tone: "fg" });
      }),
      [track("easter_egg", { nom: command })],
    );
  },
  // Il n'y a pas de PDF a servir, et la version texte porte deja tout le parcours. La
  // commande l'ouvre, et l'annonce : une navigation muette se lit comme une commande cassee.
  cv: ({ out }) => {
    return out([info("le parcours complet s'ouvre dans la version texte.")], [{ type: "cv" }]);
  },
  // Ces commandes appartiennent a d'autres tickets. Elles passent quand meme par le
  // repartiteur, pour qu'il reste le point unique.
  email: ({ out }) => {
    return out([], [{ type: "email" }]);
  },
  // Sept lignes ne tiennent pas dans le journal d'un ecran large. La reponse va donc dans
  // le resultat. Le resultat n'est pas une region live : le journal dit ou lire la reponse.
  help: ({ context, out }) => {
    return {
      ...out([muted("aide affichée dans le résultat")], [say("essayez « /joke »", "happy")]),
      result: [
        ...helpLines(context.model).map((text) => {
          return { m: "·", t: text };
        }),
        { m: "›", mc: "acc", t: KEYBOARD, tone: "fg2" },
      ],
    };
  },
  joke: ({ context, out }) => {
    const at = next(context);

    return out(
      [line({ marker: "☺", markerTone: "acc", text: context.jokes[at] ?? "" })],
      [
        track("easter_egg", { nom: "joke" }),
        { expression: "laugh", type: "emote" },
        say("héhé", "laugh"),
        { patch: { jokeIndex: at }, type: "state" },
      ],
    );
  },
  ls: ({ context, out }) => {
    return out([
      line({
        marker: "·",
        text: context.sections
          .map((entry) => {
            return entry.id;
          })
          .join("   "),
        tone: "acc",
      }),
      muted(
        context.details
          .map((entry) => {
            return entry.id;
          })
          .join("   "),
      ),
    ]);
  },
  matrix: ({ out }) => {
    return out(
      [line({ marker: "·", text: "Réveillez-vous, Néo.", tone: "ok" })],
      [track("easter_egg", { nom: "matrix" }), { mode: "matrix", type: "glitch" }],
    );
  },
  options: ({ out }) => {
    return out([], [{ type: "options" }]);
  },
  propose: ({ context, out, rest }) => {
    const forced = /^-y(?:\s|$)/u.test(rest),
      idea = (forced ? rest.slice(2) : rest).trim();

    if (idea === "") {
      return out([info("/propose [-y] <idée> — suggérer un ajout à ce portfolio.")]);
    }

    // `-y` vaut consentement : le visiteur a écrit le drapeau en même temps que l'idée.
    if (forced) {
      return out(
        [line({ marker: "›", markerTone: "acc", text: `« ${idea} »`, tone: "fg" })],
        [{ payload: idea, type: "send" }],
      );
    }

    // La réponse attendue est déjà dans la saisie : la validation tient en une touche.
    return out(proposalPrompt(idea, context.feedback ?? {}), [
      { answer: "oui", payload: idea, type: "pending" },
    ]);
  },
  // La commande ne fabrique aucun son : elle demande le volet, et le volet attend un geste.
  // L'interpreteur reste pur, l'AudioContext vit dans la coquille.
  radio: ({ out }) => {
    return out(
      [
        info("radio — une musique fabriquée par une seed, dans le volet de sortie."),
        muted("espace met en pause · m coupe le son · r tire une seed · q quitte."),
      ],
      [track("easter_egg", { nom: "radio" }), { type: "radio" }],
    );
  },
  reboot: power,
  "send-mail": ({ out }) => {
    return out([], [{ type: "sendMail" }]);
  },
  share: ({ argument, context, out }) => {
    const targets = (context.share?.targets ?? []).map((entry) => {
      return entry.id;
    });

    if (argument === "") {
      return out([offer("share <cible>", targets)], [{ type: "shareMenu" }]);
    }

    const chosen = shareTarget(argument, context.share ?? {});

    if (!chosen) {
      return out([failed(`cible inconnue : ${argument}`), offer("share <cible>", targets)]);
    }

    return out(
      [done(`partage vers ${chosen.label}.`)],
      [
        track("partage", { cible: chosen.id }),
        { kind: chosen.kind, type: "share", url: chosen.url },
      ],
    );
  },
  shutdown: power,
  sleep: ({ out }) => {
    return out([muted("Mise en veille du slime.")], [say("zzz…", "sleep")]);
  },
  slime: ({ argument, context, out, parts }) => {
    const result = slime(argument, (parts[2] ?? "").toLowerCase(), context.mascot);

    return out(result.lines, [track("easter_egg", { nom: "slime" }), ...result.effects]);
  },
  theme: ({ argument, context, out }) => {
    if (argument === "") {
      return out([offer("theme <nom>", context.themes)]);
    }

    if (!context.themes.includes(argument)) {
      return out([failed(`thème inconnu : ${argument}`), offer("theme <nom>", context.themes)]);
    }

    return out([done(`thème « ${argument} ».`)], [{ name: argument, type: "theme" }]);
  },
} satisfies Record<string, (call: Call) => Outcome>;

export const interpret = (raw: string, context: Context): Outcome => {
  const input = raw.trim().replace(/\s+/g, " ");

  if (!input) {
    return { effects: [], lines: [] };
  }

  if (context.pending) {
    return answerPending(input, context.pending);
  }

  const prefixed = /^[/:]/.test(input),
    parts = input.replace(/^[/:]+/, "").split(" "),
    typed = (parts[0] ?? "").toLowerCase(),
    command = lookup(ALIASES, typed) ?? typed,
    argument = (parts[1] ?? "").toLowerCase(),
    rest = parts.slice(1).join(" ");

  // Un easter egg tapé sans slash n'est pas une commande : on ne le reconnaît pas.
  if (SLASH_ONLY.has(command) && !prefixed) {
    return {
      effects: [track("commande_inconnue", { cmd: command }), say("connais pas", "sad")],
      lines: [
        echoed(input),
        failed(`commande introuvable : ${command} — essayez /${command} ou tapez help.`),
      ],
    };
  }

  const echo = echoed(input),
    marked = track("commande", { cmd: command }),
    out = (lines: Line[], effects: Effect[] = []): Outcome => {
      return {
        effects: [marked, ...effects],
        lines: [echo, ...lines],
      };
    };

  // Retaper la commande de la section en cours la rejoue : les commandes ne s'empilent pas.
  if (input === context.current.cmd) {
    return { effects: [marked, { type: "replay" }], lines: [] };
  }

  const sections = [...context.sections, ...context.details],
    target = sections.find((entry) => {
      return entry.id === command || (NAVIGATORS.has(command) && entry.id === argument);
    });

  // « help » et « ls » passent devant les sections : ce sont les deux premiers gestes.
  const early = command === "help" || command === "ls" ? lookup(COMMANDS, command) : undefined;

  if (early) {
    return early({ argument, command, context, out, parts, rest, sections });
  }

  if (target) {
    return out(
      [done(`section « ${target.label} » chargée.`)],
      [{ id: target.id, type: "navigate" }, say(`→ ${target.label}`, "happy")],
    );
  }

  if (NAVIGATORS.has(command)) {
    const ids = sections.map((entry) => {
        return entry.id;
      }),
      usage = offer(`${command} <section>`, ids);

    return out(argument === "" ? [usage] : [failed(`section inconnue : ${argument}`), usage]);
  }

  const handler = lookup(COMMANDS, command);

  if (handler) {
    return handler({ argument, command, context, out, parts, rest, sections });
  }

  const egg = lookup<Egg>(EGGS, command);

  if (egg) {
    return out(egg.lines, [track("easter_egg", { nom: egg.egg }), ...(egg.effects ?? [])]);
  }

  return out(
    [failed(`commande introuvable : ${command} — tapez help.`)],
    [track("commande_inconnue", { cmd: command }), say("connais pas", "sad")],
  );
};
