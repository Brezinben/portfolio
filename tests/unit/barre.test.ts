import { FILLED, HOLLOW, SPINNER, barParts } from "../../src/terminal/format.ts";
import assert from "node:assert/strict";
import { test } from "node:test";

// La barre fait toujours la largeur demandee : la tete mange une case vide, elle ne
// s'ajoute pas. Sans cette regle, la jauge s'elargit d'un caractere pendant qu'elle tourne.
test("la barre garde sa largeur, tete comprise", () => {
  for (const done of [0, 1, 5, 9, 10]) {
    const { filled, hollow } = barParts(done, 10, 3);

    assert.equal([...filled].length + [...hollow].length, 10, `a ${done} cases`);
  }
});

// Sans « tick », la barre ne progresse pas : elle n'a alors pas de tete.
test("sans tick, aucune tete", () => {
  const { filled } = barParts(4, 10);

  assert.equal(filled, FILLED.repeat(4));
  assert.equal(barParts(4, 10).hollow, HOLLOW.repeat(6));
});

// Une barre pleine n'a plus rien a attendre : la tete disparait, sinon elle tournerait sur
// un travail termine.
test("une barre pleine perd sa tete", () => {
  assert.deepEqual(barParts(10, 10, 3), { filled: FILLED.repeat(10), hollow: "" });
  assert.deepEqual(barParts(99, 10, 3), { filled: FILLED.repeat(10), hollow: "" });
});

// Le tick tourne en boucle sur les huit glyphes : il vient d'un compteur qui ne se remet
// jamais a zero.
test("la tete suit le tick, en boucle", () => {
  assert.equal(barParts(0, 10, 0).filled, SPINNER[0]);
  assert.equal(barParts(0, 10, 9).filled, SPINNER[1]);
});

// Un compte negatif ne doit pas produire une barre plus large que sa largeur.
test("un compte negatif ne deborde pas", () => {
  const { filled, hollow } = barParts(-5, 10);

  assert.equal(filled, "");
  assert.equal([...hollow].length, 10);
});
