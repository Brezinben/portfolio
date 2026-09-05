import { COW_HEAD_MODES, cowsay } from "../../production/interpret.js";
import assert from "node:assert/strict";
import { test } from "node:test";

const body = (lines) =>
  lines.slice(
    0,
    lines.findIndex((row) => row.includes("^__^")),
  );

test("une phrase courte tient dans une bulle à chevrons", () => {
  const lines = cowsay("Moo", { columns: 40 });

  assert.equal(lines[1], "< Moo >");
  assert.match(lines[0], /^ _+$/u);
  assert.match(lines[2], /^ -+$/u);
});

// La bulle change de forme selon le nombre de lignes : c'est le comportement de
// l'original, et il ne doit pas se perdre au portage.
test("une phrase longue passe aux barres obliques", () => {
  const lines = body(
    cowsay("un texte assez long pour forcer plusieurs lignes ici", { columns: 30 }),
  );

  assert.ok(lines.length > 3, "plusieurs lignes de bulle");
  assert.ok(lines[1].startsWith("/"), "la première ligne ouvre avec une barre");
  assert.ok(lines.at(-2).startsWith("\\"), "la dernière ferme avec l'autre");
  assert.ok(lines[2].startsWith("|"), "les lignes du milieu sont droites");
});

test("le retour à la ligne suit la largeur demandée", () => {
  const large = body(
    cowsay("un texte assez long pour forcer plusieurs lignes ici", { columns: 80 }),
  );
  const narrow = body(
    cowsay("un texte assez long pour forcer plusieurs lignes ici", { columns: 24 }),
  );

  assert.ok(narrow.length > large.length, "moins de colonnes, plus de lignes");
});

test("les huit modes de tête changent les yeux", () => {
  const eyes = new Set(
    COW_HEAD_MODES.map((mode) =>
      cowsay("x", { mode }).find((row) => row.includes(String.raw`)\_______`)),
    ),
  );

  assert.equal(COW_HEAD_MODES.length, 8);
  assert.equal(eyes.size, 8, "chaque mode a ses yeux");
});

test("les modes mort et défoncé sortent la langue", () => {
  for (const mode of ["-d", "-s"]) {
    const tongue = cowsay("x", { mode }).find((row) => row.includes("||----w |"));

    assert.match(tongue, /U/u, `le mode ${mode} sort la langue`);
  }
});

test("cowthink rend une bulle de pensée", () => {
  const lines = cowsay("je réfléchis", { think: true });

  assert.ok(lines[1].startsWith("("), "la bulle de pensée est arrondie");
  assert.ok(
    lines.some((row) => row.includes("o   ^__^")),
    "le lien est fait de bulles",
  );
});

test("sans texte, la vache dit quelque chose quand même", () => {
  assert.ok(cowsay("", {}).some((row) => row.includes("Moo.")));
});

test("un mot plus long que la largeur ne boucle pas", () => {
  const lines = cowsay("anticonstitutionnellement", { columns: 10 });

  assert.ok(lines.length > 5);
  assert.ok(lines.some((row) => row.includes("anticonstitutionnellement")));
});
