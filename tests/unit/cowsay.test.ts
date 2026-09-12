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

it("une phrase courte tient dans une bulle à chevrons", () => {
  const lines = cowsay("Moo", { columns: 40 });

  assert.equal(lines[1], "< Moo >");
  assert.match(lines[0] ?? "", /^ _+$/u);
  assert.match(lines[2] ?? "", /^ -+$/u);
});

// La bulle change de forme selon le nombre de lignes : c'est le comportement de
// l'original, et il ne doit pas se perdre au portage.
it("une phrase longue passe aux barres obliques", () => {
  const lines = body(
    cowsay("un texte assez long pour forcer plusieurs lignes ici", { columns: 30 }),
  );

  assert.ok(lines.length > 3, "plusieurs lignes de bulle");
  assert.ok(lines[1]?.startsWith("/"), "la première ligne ouvre avec une barre");
  assert.ok(lines.at(-2)?.startsWith("\\"), "la dernière ferme avec l'autre");
  assert.ok(lines[2]?.startsWith("|"), "les lignes du milieu sont droites");
});

it("le retour à la ligne suit la largeur demandée", () => {
  const large = body(
      cowsay("un texte assez long pour forcer plusieurs lignes ici", { columns: 80 }),
    ),
    narrow = body(cowsay("un texte assez long pour forcer plusieurs lignes ici", { columns: 24 }));

  assert.ok(narrow.length > large.length, "moins de colonnes, plus de lignes");
});

// La commande ne prend plus de drapeau : elle tire un visage au hasard a chaque appel. Les
// huit restent donc atteignables par l'API, et c'est le repartiteur qui choisit.
it("les huit modes de tête changent les yeux", () => {
  const eyes = new Set(
    COW_HEAD_MODES.map((mode) =>
      cowsay("x", { mode }).find((row) => row.includes(String.raw`)\_______`)),
    ),
  );

  assert.equal(COW_HEAD_MODES.length, 8);
  assert.equal(eyes.size, 8, "chaque mode a ses yeux");
});

it("les modes mort et défoncé sortent la langue", () => {
  for (const mode of ["-d", "-s"]) {
    const tongue = cowsay("x", { mode }).find((row) => row.includes("||----w |"));

    assert.match(tongue ?? "", /U/u, `le mode ${mode} sort la langue`);
  }
});

it("sans texte, la vache dit quelque chose quand même", () => {
  assert.ok(cowsay("", {}).some((row) => row.includes("Moo.")));
});

it("un mot plus long que la largeur ne boucle pas", () => {
  const lines = cowsay("anticonstitutionnellement", { columns: 10 });

  assert.ok(lines.length > 5);
  assert.ok(lines.some((row) => row.includes("anticonstitutionnellement")));
});

// Les drapeaux ont disparu de la commande : « cowsay -d » ecrit « -d », il ne l'interprete
// plus. Le visage se tire au hasard, donc le test verifie l'appartenance, pas l'identite.
it("la commande tire un visage parmi les huit", () => {
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

  assert.ok(yeux.size > 1, "soixante appels doivent sortir plusieurs visages");
  for (const oeil of yeux) {
    assert.ok(connus.has(oeil), `visage inconnu : ${oeil}`);
  }
});
