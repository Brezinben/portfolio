import assert from "node:assert/strict";
import { interpret } from "../../src/interpret.js";
import { test } from "node:test";

const CONTEXT = {
  current: { cmd: "bd whoami --verbose", id: "whoami" },
  details: [{ id: "m-kereis", label: "Kereis" }],
  jokeIndex: 0,
  jokes: ["une blague", "une autre"],
  paneWidth: 60,
  sections: [
    { id: "whoami", label: "whoami" },
    { id: "stack", label: "stack" },
  ],
};

const texts = (result) => result.lines.map((line) => line.t);
const kinds = (result) => result.effects.map((effect) => effect.type);

test("une entrée vide ne produit rien", () => {
  for (const empty of ["", "   ", "\t"]) {
    assert.deepEqual(interpret(empty, CONTEXT), { effects: [], lines: [] });
  }
});

test("la ligne saisie est renvoyée en écho", () => {
  const result = interpret("ls", CONTEXT);

  assert.equal(result.lines[0].t, "ls");
  assert.equal(result.lines[0].m, "›");
});

test("les espaces multiples sont normalisés", () => {
  const spaced = interpret("cd    stack", CONTEXT);
  const single = interpret("cd stack", CONTEXT);

  assert.deepEqual(texts(spaced), texts(single));
  assert.deepEqual(kinds(spaced), kinds(single));
});

// L'écho reprend la ligne telle qu'elle a été tapée, préfixe compris : seule la sortie
// doit être identique.
test("les préfixes slash et deux-points sont acceptés", () => {
  for (const prefix of ["/", ":", "//"]) {
    const prefixed = interpret(`${prefix}wtf`, CONTEXT);

    assert.equal(prefixed.lines[0].t, `${prefix}wtf`);
    assert.deepEqual(texts(prefixed).slice(1), texts(interpret("/wtf", CONTEXT)).slice(1));
  }
});

test("chaque commande est marquée", () => {
  const [effect] = interpret("/wtf", CONTEXT).effects;

  assert.equal(effect.type, "track");
  assert.equal(effect.event, "commande");
  assert.deepEqual(effect.props, { cmd: "wtf" });
});

test("ls liste les sections puis les fiches", () => {
  const result = interpret("ls", CONTEXT);

  assert.equal(result.lines[1].t, "whoami   stack");
  assert.equal(result.lines[2].t, "m-kereis");
});

test("help liste les commandes et rappelle le clavier", () => {
  const result = interpret("help", CONTEXT);
  const body = texts(result).join("\n");

  assert.match(body, /ls · cd <section>/);
  assert.match(body, /Clavier/);
  assert.ok(result.effects.some((effect) => effect.type === "say"));
});

test("aide et point d'interrogation sont des alias de help", () => {
  for (const alias of ["aide", "?"]) {
    assert.deepEqual(
      texts(interpret(alias, CONTEXT)).slice(1),
      texts(interpret("help", CONTEXT)).slice(1),
    );
  }
});

test("un nom de section seul y navigue", () => {
  const result = interpret("stack", CONTEXT);

  assert.ok(result.effects.some((effect) => effect.type === "navigate" && effect.id === "stack"));
  assert.match(result.lines[1].t, /section « stack » chargée/);
});

test("cd navigue aussi, et open et bd en sont des alias", () => {
  for (const verb of ["cd", "open", "bd"]) {
    const result = interpret(`${verb} stack`, CONTEXT);

    assert.ok(
      result.effects.some((effect) => effect.type === "navigate" && effect.id === "stack"),
      `${verb} doit naviguer`,
    );
  }
});

// Retaper la commande de la section en cours la rejoue, plutôt que de l'empiler.
test("retaper la commande de la section la rejoue", () => {
  const result = interpret("bd whoami --verbose", CONTEXT);

  assert.deepEqual(kinds(result), ["track", "replay"]);
  assert.deepEqual(result.lines, []);
});

test("clear vide le journal sans rien afficher", () => {
  const result = interpret("clear", CONTEXT);

  assert.ok(result.effects.some((effect) => effect.type === "clear"));
  assert.deepEqual(result.lines, []);
});

test("wtf explique où l'on se trouve", () => {
  const result = interpret("/wtf", CONTEXT);

  assert.match(texts(result).join("\n"), /portfolio déguisé en terminal/);
});

test("sudo refuse, et le signale", () => {
  const result = interpret("/sudo", CONTEXT);

  assert.match(result.lines[1].t, /sudoers/);
  assert.equal(result.lines[1].m, "✗");
});

test("coffee répond 418", () => {
  assert.equal(interpret("/coffee", CONTEXT).lines[1].m, "418");
});

test("vim, nano et emacs tombent dans le même piège", () => {
  for (const editor of ["/vim", "/nano", "/emacs"]) {
    assert.match(interpret(editor, CONTEXT).lines[1].t, /:q!/);
  }
});

test("pet caresse la mascotte", () => {
  const result = interpret("/pet", CONTEXT);

  assert.equal(result.lines[1].m, "♥");
  assert.ok(result.effects.some((effect) => effect.type === "say"));
});

test("sleep endort la mascotte", () => {
  const result = interpret("sleep", CONTEXT);

  assert.ok(result.effects.some((effect) => effect.type === "say" && effect.mood === "sleep"));
});

test("benjamin se présente et donne son adresse", () => {
  const result = interpret("/benjamin", CONTEXT);

  assert.match(texts(result).join("\n"), /benjamin\.david1@hotmail\.fr/);
  assert.ok(
    result.effects.some((effect) => effect.type === "track" && effect.event === "easter_egg"),
  );
});

test("brezinben est un alias de benjamin", () => {
  assert.deepEqual(
    texts(interpret("/brezinben", CONTEXT)).slice(1),
    texts(interpret("/benjamin", CONTEXT)).slice(1),
  );
});

// La blague est tiree au hasard, mais jamais deux fois la meme d'affilee.
test("joke tire une blague différente de la précédente", () => {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const result = interpret("/joke", { ...CONTEXT, jokeIndex: 0 });
    const patch = result.effects.find((effect) => effect.type === "state");

    assert.notEqual(patch.patch.jokeIndex, 0, "la blague courante ne se répète pas");
    assert.equal(result.lines[1].t, CONTEXT.jokes[patch.patch.jokeIndex]);
  }
});

// Un easter egg sans slash n'est pas une commande de terminal.
test("un easter egg tapé sans slash n'est pas reconnu", () => {
  const result = interpret("joke", CONTEXT);

  assert.match(result.lines[1].t, /commande introuvable : joke/u);
  assert.match(result.lines[1].t, /essayez \/joke/u);
});

test("les vraies commandes marchent sans slash", () => {
  for (const command of ["help", "ls", "clear"]) {
    assert.ok(
      !interpret(command, CONTEXT).lines.some((entry) => /introuvable/u.test(entry.t)),
      `${command} doit rester une commande`,
    );
  }
});

test("une commande inconnue le dit et se marque comme telle", () => {
  const result = interpret("xyzzy", CONTEXT);

  assert.match(result.lines[1].t, /commande introuvable : xyzzy/);
  assert.ok(
    result.effects.some(
      (effect) => effect.type === "track" && effect.event === "commande_inconnue",
    ),
  );
});

test("la casse de la commande est ignorée", () => {
  assert.deepEqual(
    texts(interpret("/WTF", CONTEXT)).slice(1),
    texts(interpret("/wtf", CONTEXT)).slice(1),
  );
});

// L'interpréteur ne doit toucher à rien : ni DOM, ni réseau, ni minuteur.
test("l'interprétation reste synchrone et sans effet de bord", () => {
  const before = JSON.stringify(CONTEXT);

  for (const command of ["ls", "help", "joke", "cd stack", "xyzzy", "shutdown", "matrix"]) {
    const result = interpret(command, CONTEXT);

    assert.ok(Array.isArray(result.lines));
    assert.ok(Array.isArray(result.effects));
  }

  assert.equal(JSON.stringify(CONTEXT), before, "le contexte ne doit pas être muté");
});
