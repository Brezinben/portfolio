// Le repartiteur : le point unique ou une ligne tapee devient des lignes et des effets.
//
// Il reste d'un seul tenant. « max-statements » est desactive dans le lint avec ce
// commentaire explicite : le decouper disperserait le seul endroit qui dit, en un coup
// d'oeil, ce que le terminal accepte.

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
    out = (lines: Line[], effects: Effect[] = []): Outcome => ({
      effects: [marked, ...effects],
      lines: [echo, ...lines],
    });

  // Retaper la commande de la section en cours la rejoue : les commandes ne s'empilent pas.
  if (input === context.current.cmd) {
    return { effects: [marked, { type: "replay" }], lines: [] };
  }

  const sections = [...context.sections, ...context.details],
    target = sections.find(
      (entry) => entry.id === command || (NAVIGATORS.has(command) && entry.id === argument),
    );

  // Sept lignes ne tiennent pas dans le journal d'un ecran large. La reponse va donc dans
  // le resultat, et le journal ne garde que l'echo.
  if (command === "help") {
    return {
      ...out([], [say("essaie « /joke »", "happy")]),
      result: [
        ...helpLines(context.model).map((text) => ({ m: "·", t: text })),
        { m: "›", mc: "acc", t: KEYBOARD, tone: "fg2" },
      ],
    };
  }

  if (command === "ls") {
    return out([
      line({
        marker: "·",
        text: context.sections.map((entry) => entry.id).join("   "),
        tone: "acc",
      }),
      muted(context.details.map((entry) => entry.id).join("   ")),
    ]);
  }

  if (target) {
    return out(
      [done(`section « ${target.label} » chargée.`)],
      [{ id: target.id, type: "navigate" }, say(`→ ${target.label}`, "happy")],
    );
  }

  if (NAVIGATORS.has(command)) {
    const ids = sections.map((entry) => entry.id),
      usage = offer(`${command} <section>`, ids);

    return out(argument === "" ? [usage] : [failed(`section inconnue : ${argument}`), usage]);
  }

  if (command === "clear") {
    return { effects: [marked, { type: "clear" }], lines: [] };
  }

  if (command === "slime") {
    const result = slime(argument, (parts[2] ?? "").toLowerCase(), context.mascot);

    return out(result.lines, [track("easter_egg", { nom: "slime" }), ...result.effects]);
  }

  if (command === "joke") {
    const next =
      context.jokes.length < 2
        ? 0
        : (context.jokeIndex + 1 + Math.floor(Math.random() * (context.jokes.length - 1))) %
          context.jokes.length;

    return out(
      [line({ marker: "☺", markerTone: "acc", text: context.jokes[next] ?? "" })],
      [
        track("easter_egg", { nom: "joke" }),
        { expression: "laugh", type: "emote" },
        say("héhé", "laugh"),
        { patch: { jokeIndex: next }, type: "state" },
      ],
    );
  }

  if (command === "sleep") {
    return out([muted("Mise en veille de la mascotte.")], [say("zzz…", "sleep")]);
  }

  if (command === "matrix") {
    return out(
      [line({ marker: "·", text: "Réveille-toi, Néo.", tone: "ok" })],
      [track("easter_egg", { nom: "matrix" }), { expression: "scared", type: "emote" }],
    );
  }

  if (command === "shutdown" || command === "reboot") {
    const said = command === "reboot" ? "Redémarrage du système…" : "Extinction du système…";

    return out(
      [line({ marker: "·", text: said, tone: "warn" })],
      [{ mode: command, type: "power" }],
    );
  }

  if (command === "cowsay") {
    // Les huit visages de l'original restent, mais sans drapeau a retenir : un portfolio
    // n'est pas une page de manuel. Le tirage rend la commande vivante a chaque appel.
    const mode = COW_MODES[Math.floor(Math.random() * COW_MODES.length)] ?? "",
      said = rest.trim();

    return out(
      cowsay(said, { columns: context.columns, mode }).map((row) =>
        line({ text: row, tone: "fg" }),
      ),
      [track("easter_egg", { nom: command })],
    );
  }

  // La commande ne fabrique aucun son : elle demande le volet, et le volet attend un geste.
  // L'interpreteur reste pur, l'AudioContext vit dans la coquille.
  if (command === "radio") {
    return out(
      [
        info("radio — une boucle fabriquée par une graine, dans le volet de sortie."),
        muted("espace lit ou met en pause · r tire une graine · q quitte."),
      ],
      [track("easter_egg", { nom: "radio" }), { type: "radio" }],
    );
  }

  if (command === "propose") {
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
  }

  // Il n'y a pas de PDF a servir, et la version texte porte deja tout le parcours. La
  // commande l'ouvre, et l'annonce : une navigation muette se lit comme une commande cassee.
  if (command === "cv") {
    return out([info("le parcours complet s'ouvre dans la version texte.")], [{ type: "cv" }]);
  }

  if (command === "theme") {
    if (argument === "") {
      return out([offer("theme <nom>", context.themes)]);
    }

    if (!context.themes.includes(argument)) {
      return out([failed(`thème inconnu : ${argument}`), offer("theme <nom>", context.themes)]);
    }

    return out([done(`thème « ${argument} ».`)], [{ name: argument, type: "theme" }]);
  }

  if (command === "share") {
    const targets = (context.share?.targets ?? []).map((entry) => entry.id);

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
  }

  const egg = lookup<Egg>(EGGS, command);

  if (egg) {
    return out(egg.lines, [track("easter_egg", { nom: egg.egg }), ...(egg.say ? [egg.say] : [])]);
  }

  if (command === "ask") {
    const trouve = answer(rest, sections, { model: context.model });

    return out(trouve.lines, trouve.effects);
  }

  // Ces commandes appartiennent à d'autres tickets. Elles passent quand même par le
  // dispatcher, pour qu'il reste le point unique.
  const deferred = {
      email: { type: "email" },
      options: { type: "options" },

      "send-mail": { type: "sendMail" },
    } satisfies Record<string, Effect>,
    waiting = lookup<Effect>(deferred, command);

  if (waiting) {
    return out([], [waiting]);
  }

  return out(
    [failed(`commande introuvable : ${command} — tapez help.`)],
    [track("commande_inconnue", { cmd: command }), say("connais pas", "sad")],
  );
};
