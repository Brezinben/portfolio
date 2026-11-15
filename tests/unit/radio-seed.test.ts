import {
  SEED_VERSION,
  degreeToMidi,
  derive,
  midiToHertz,
  radioLines,
  rng,
} from "../../src/terminal/radio/derive.ts";
import assert from "node:assert/strict";
import { it } from "node:test";

// La seed témoin. Son morceau est publié dès que quelqu'un la note : les valeurs
// ci-dessous sont donc un contrat, pas un échantillon.
const WITNESS = 8_093_451_772_146;

// L'ordre des tirages EST le format de la seed. Ce test tombe le jour où un tirage se
// déplace, et c'est alors une décision à prendre, pas un accident à découvrir en écoutant.
it("should derive the frozen parameters of the witness seed", () => {
  const params = derive(WITNESS);

  assert.equal(SEED_VERSION, 1, "the seed format has not changed version");
  assert.equal(params.tempo, 106);
  assert.equal(params.scale.name, "majeur");
  assert.equal(params.timbre.name, "triangle");
  assert.equal(params.meter.label, "3/4");
  assert.equal(params.meter.steps, 6);
  assert.equal(params.voices, 2);
  assert.equal(params.root, 52);
  assert.deepEqual([...params.prog], [0, 4, 5, 3]);
  assert.equal(params.swing, true);
  assert.equal(params.tonic, "mi");
  assert.equal(params.chords, "I V vi IV");
  assert.deepEqual(
    params.melody.map((note) => {
      return note ? [note.degree, note.octave] : undefined;
    }),
    [[0, 0], undefined, [1, 0], [0, 0], undefined, [2, 0]],
  );
});

// La silhouette sort de la seed elle aussi : changer de seed change l'image figée, pas
// seulement le son. Vingt-quatre hauteurs, toutes dans la bande de lecture du spectre.
it("should derive the frozen silhouette of the witness seed", () => {
  const { silhouette } = derive(WITNESS);

  assert.equal(silhouette.length, 24);
  assert.equal(silhouette[0]?.toFixed(12), "0.951953581860");

  for (const height of silhouette) {
    assert.ok(height >= 0.18 && height <= 0.96, `${height} stays inside the band`);
  }
});

// C'est la propriété centrale de la commande : même seed, même morceau, à la note près.
it("should derive the very same parameters twice", () => {
  assert.deepEqual(derive(WITNESS), derive(WITNESS));
  assert.deepEqual(derive(1), derive(1));
});

// Deux seeds voisines ne doivent pas rendre deux morceaux voisins, sinon le champ de
// saisie n'aurait aucun intérêt : on taperait n'importe quoi et on entendrait la même chose.
it("should derive a different tune from a neighbouring seed", () => {
  const near = [WITNESS + 1, WITNESS + 2, WITNESS + 3].map((seed) => {
    return derive(seed).silhouette[0];
  });

  assert.equal(new Set(near).size, 3, "three seeds, three silhouettes");
});

// Le générateur doit rendre une fraction, jamais 1 : une valeur de 1 ferait sortir tout
// tirage « liste[floor(r * longueur)] » de ses bornes.
it("should roll inside zero and one", () => {
  const roll = rng(12_345);

  for (let draw = 0; draw < 2000; draw += 1) {
    const value = roll();

    assert.ok(value >= 0 && value < 1, `${value} stays a fraction`);
  }
});

// Un tirage de hauteur passe toujours par un degré : c'est ce qui interdit au séquenceur de
// tomber en dehors de la gamme, quel que soit l'accord en cours.
it("should keep every pitch inside the scale", () => {
  const { root, scale } = derive(WITNESS);

  for (let step = -7; step <= 21; step += 1) {
    const offset = (degreeToMidi(scale, root, step) - root + 120) % 12;

    assert.ok(scale.steps.includes(offset), `degree ${step} lands on a scale note`);
  }
});

// Le chiffrage décide de la casse par la tierce réelle. En pentatonique, la tierce de
// chaque degré mesure quatre demi-tons ou plus : la grille s'y annonce donc en capitales.
it("should figure the chords from the real third", () => {
  const major = derive(WITNESS);

  assert.equal(major.chords, "I V vi IV", "the sixth degree is minor in a major scale");
  assert.equal(major.chords, major.chords.trim());
});

it("should tune the middle A to 440 hertz", () => {
  assert.equal(midiToHertz(69), 440);
  assert.equal(midiToHertz(81), 880);
});

// Une ligne affichée est une valeur que le séquenceur lit vraiment. Le volet décrit un
// morceau : il doit décrire celui qu'on entend.
it("should describe the tune with five lines", () => {
  const params = derive(WITNESS),
    lines = radioLines(params);

  assert.equal(lines.length, 5);
  assert.deepEqual(
    lines.map((line) => {
      return line.label;
    }),
    ["tempo", "tonique", "accords", "timbre · mélodie", "mesure"],
  );
  assert.ok(lines[0]?.value.includes(String(params.tempo)));
  assert.ok(lines[1]?.value.includes(params.scale.name));
  assert.equal(lines[2]?.value, params.chords);
  assert.equal(lines[3]?.value, params.timbre.name);
  assert.ok(lines[4]?.value.includes(params.meter.label));
});
