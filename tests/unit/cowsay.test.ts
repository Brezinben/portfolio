import { COW_HEAD_MODES, cowsay, interpret } from "../../src/interpret.ts";
import type { Context } from "../../src/interpret.ts";
import assert from "node:assert/strict";
import { it } from "node:test";

const CONTEXT: Context = {
    columns: 40,
    current: { cmd: "bd whoami --verbose", id: "whoami" },
    details: [],
    feedback: {},
    jokeIndex: 0,
    jokes: [],
    mascot: "here",
    model: false,
    sections: [],
    share: {},
    shareTargets: [],
    themes: [],
  },
  YEUX = /\((?<yeux>..)\)\\_______/u,
  body = (lines: string[]) =>
    lines.slice(
      0,
      lines.findIndex((row: string) => row.includes("^__^")),
    );

it("should fit a short sentence in an angle bracket bubble", () => {
  const lines = cowsay("Moo", { columns: 40 });

  assert.equal(lines[1], "< Moo >");
  assert.match(lines[0] ?? "", /^ _+$/u);
  assert.match(lines[2] ?? "", /^ -+$/u);
});

// La bulle change de forme selon le nombre de lignes : c'est le comportement de
// l'original, et il ne doit pas se perdre au portage.
it("should switch a long sentence to slash borders", () => {
  const lines = body(
    cowsay("un texte assez long pour forcer plusieurs lignes ici", { columns: 30 }),
  );

  assert.ok(lines.length > 3, "several bubble lines");
  assert.ok(lines[1]?.startsWith("/"), "the first line opens with a slash");
  assert.ok(lines.at(-2)?.startsWith("\\"), "the last line closes with the other slash");
  assert.ok(lines[2]?.startsWith("|"), "the middle lines are straight");
});

it("should wrap the text at the requested width", () => {
  const large = body(
      cowsay("un texte assez long pour forcer plusieurs lignes ici", { columns: 80 }),
    ),
    narrow = body(cowsay("un texte assez long pour forcer plusieurs lignes ici", { columns: 24 }));

  assert.ok(narrow.length > large.length, "fewer columns, more lines");
});

// La commande ne prend plus de drapeau : elle tire un visage au hasard a chaque appel. Les
// huit restent donc atteignables par l'API, et c'est le repartiteur qui choisit.
it("should give each of the eight head modes its own eyes", () => {
  const eyes = new Set(
    COW_HEAD_MODES.map((mode) =>
      cowsay("x", { mode }).find((row) => row.includes(String.raw`)\_______`)),
    ),
  );

  assert.equal(COW_HEAD_MODES.length, 8);
  assert.equal(eyes.size, 8, "each mode has its own eyes");
});

it("should stick the tongue out in the dead and the stoned modes", () => {
  for (const mode of ["-d", "-s"]) {
    const tongue = cowsay("x", { mode }).find((row) => row.includes("||----w |"));

    assert.match(tongue ?? "", /U/u, `mode ${mode} sticks the tongue out`);
  }
});

it("should make the cow say something even without text", () => {
  assert.ok(cowsay("", {}).some((row) => row.includes("Moo.")));
});

it("should not loop on a word longer than the width", () => {
  const lines = cowsay("anticonstitutionnellement", { columns: 10 });

  assert.ok(lines.length > 5);
  assert.ok(lines.some((row) => row.includes("anticonstitutionnellement")));
});

// Les drapeaux ont disparu de la commande : « cowsay -d » ecrit « -d », il ne l'interprete
// plus. Le visage se tire au hasard, donc le test verifie l'appartenance, pas l'identite.
it("should draw a face at random among the eight", () => {
  const yeux = new Set(
      Array.from({ length: 60 }, () => {
        const rendu = interpret("/cowsay bonjour", CONTEXT)
          .lines.map((row) => row.t ?? "")
          .find((texte) => texte.includes(String.raw`)\_______`));

        return YEUX.exec(rendu ?? "")?.groups?.yeux ?? "";
      }),
    ),
    connus = new Set(
      COW_HEAD_MODES.map((mode) => {
        const tete = cowsay("x", { mode }).find((row) => row.includes(String.raw`)\_______`));

        return YEUX.exec(tete ?? "")?.groups?.yeux ?? "";
      }),
    );

  assert.ok(yeux.size > 1, "sixty calls must produce several faces");
  for (const oeil of yeux) {
    assert.ok(connus.has(oeil), `unknown face: ${oeil}`);
  }
});
