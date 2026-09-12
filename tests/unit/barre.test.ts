import { FILLED, HOLLOW, SPINNER, barParts } from "../../src/terminal/format.ts";
import assert from "node:assert/strict";
import { it } from "node:test";

// La barre fait toujours la largeur demandee : la tete mange une case vide, elle ne
// s'ajoute pas. Sans cette regle, la jauge s'elargit d'un caractere pendant qu'elle tourne.
it("should keep the bar width, head included", () => {
  for (const done of [0, 1, 5, 9, 10]) {
    const { filled, hollow } = barParts(done, 10, 3);

    assert.equal([...filled].length + [...hollow].length, 10, `at ${done} cells`);
  }
});

// Sans « tick », la barre ne progresse pas : elle n'a alors pas de tete.
it("should draw no head without a tick", () => {
  const { filled } = barParts(4, 10);

  assert.equal(filled, FILLED.repeat(4));
  assert.equal(barParts(4, 10).hollow, HOLLOW.repeat(6));
});

// Une barre pleine n'a plus rien a attendre : la tete disparait, sinon elle tournerait sur
// un travail termine.
it("should drop the head when the bar is full", () => {
  assert.deepEqual(barParts(10, 10, 3), { filled: FILLED.repeat(10), hollow: "" });
  assert.deepEqual(barParts(99, 10, 3), { filled: FILLED.repeat(10), hollow: "" });
});

// Le tick tourne en boucle sur les huit glyphes : il vient d'un compteur qui ne se remet
// jamais a zero.
it("should loop the head through the tick glyphs", () => {
  assert.equal(barParts(0, 10, 0).filled, SPINNER[0]);
  assert.equal(barParts(0, 10, 9).filled, SPINNER[1]);
});

// Un compte negatif ne doit pas produire une barre plus large que sa largeur.
it("should not exceed the bar width on a negative count", () => {
  const { filled, hollow } = barParts(-5, 10);

  assert.equal(filled, "");
  assert.equal([...hollow].length, 10);
});
