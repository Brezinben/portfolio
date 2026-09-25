import { readFile, readdir } from "node:fs/promises";
import assert from "node:assert/strict";
import { it } from "node:test";

// Un plafond par forme, sur la source : il borne ce que la fusion aura à digérer et
// signale une feuille qui grossit. Le slime est le seul qui parte au premier chargement.
// Ce que le réseau transporte se mesure dans tests/browser/budget.spec.ts.
const SPRITES_KO = { cube: 112, pingouin: 132, slime: 80 };

for (const [forme, plafond] of Object.entries(SPRITES_KO)) {
  it(`should keep the ${forme} sheets under their ceiling`, async () => {
    const dossier = new URL(`../../src/assets/sprites/${forme}/`, import.meta.url),
      feuilles = await readdir(dossier),
      poids = await Promise.all(
        feuilles.map(async (nom) => {
          const octets = await readFile(new URL(nom, dossier));

          return octets.byteLength;
        }),
      ),
      total = poids.reduce((somme, octets) => {
        return somme + octets;
      }, 0);

    assert.ok(
      Math.round(total / 102.4) / 10 <= plafond,
      `${feuilles.length} ${forme} sheets weigh more than ${plafond} Ko`,
    );
  });
}
