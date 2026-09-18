// La corruption du glitch. Elle tire dans « Math.random », donc les tests portent sur ce
// qui doit tenir a chaque tirage, jamais sur un tirage precis.

import { MOJIBAKE, corrupt, heatAt } from "../../src/terminal/glitch/corrupt.ts";
import assert from "node:assert/strict";
import { it } from "node:test";

const spaces = (value: string) => [...value].map((glyph) => (glyph === " " ? "·" : "x")).join("");

// La mise en page tient parce que les espaces ne partent jamais. Sans cette garantie,
// chaque passe redessinait la largeur des trois volets.
it("should never touch the spaces", () => {
  const text = "une ligne de commande avec des espaces";

  for (let pass = 0; pass < 50; pass++) {
    assert.equal(spaces(corrupt(text, 1)), spaces(text));
  }
});

// A froid, seul le mojibake passe : c'est lui qui porte le sens de la panne, et il reste
// lisible. Le reste du texte doit sortir intact.
it("should only mojibake the characters it knows when the heat is zero", () => {
  const corrupted = corrupt("abc def 123", 0);

  assert.equal(corrupted, "abc def 123");
});

it("should map every accented character it names", () => {
  for (const [source, mojibake] of Object.entries(MOJIBAKE)) {
    assert.notEqual(source, mojibake, `${source} maps to itself`);
    assert.ok(corrupt(source.repeat(60), 0).includes(mojibake), `${source} never mojibakes`);
  }
});

// L'intensite decroit par vagues : tres cassee au debut, presque lisible a la fin. Le
// plancher garde un fremissement plutot qu'un texte fige.
it("should keep the heat inside its floor and its ceiling", () => {
  for (let step = 0; step <= 100; step++) {
    const heat = heatAt(step / 100);

    assert.ok(heat >= 0.02, `heat fell to ${heat} at ${step}%`);
    assert.ok(heat <= 0.4, `heat rose to ${heat} at ${step}%`);
  }
});

// Une decroissance droite se lisait comme un fondu. La vague doit donc remonter au moins
// une fois avant la fin.
it("should make the heat wave instead of fading", () => {
  const samples = Array.from({ length: 100 }, (_, step) => heatAt(step / 100)),
    rises = samples.filter((heat, index) => index > 0 && heat > (samples[index - 1] ?? 0));

  assert.ok(rises.length > 1, "the heat only ever falls");
});
