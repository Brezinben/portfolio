// La seed devient des parametres musicaux. Pur : ni DOM, ni audio, ni minuteur.
//
// L'ordre des tirages EST le format de la seed. Inserer un tirage au milieu change tous
// les morceaux deja partages : on ajoute a la fin, jamais au milieu. Si l'ordre doit
// changer, « SEED_VERSION » change avec lui, et le test de la seed temoin tombe.

// Le jour ou l'ordre des tirages bouge, ce nombre bouge aussi. Une seed notee sous une
// version ne rend le meme morceau que sous cette version.
export const SEED_VERSION = 1;

// Une voix : sa forme d'onde et son enveloppe. L'attaque et la chute font autant pour le
// caractere que la forme. « gain » est le niveau de la voix, avant le maitre.
export interface Voice {
  attack: number;
  decay: number;
  gain: number;
  name: string;
  wave: OscillatorType;
}

// Une croche de melodie vise un degre de l'accord en cours : 0 la fondamentale, 1 la
// tierce, 2 la quinte. Elle tombe donc juste quel que soit l'accord.
export interface Note {
  degree: number;
  octave: number;
}

export interface Meter {
  label: string;
  steps: number;
}

export interface Scale {
  name: string;
  steps: readonly number[];
}

export interface Params {
  chords: string;
  melody: readonly (Note | undefined)[];
  meter: Meter;
  prog: readonly number[];
  root: number;
  scale: Scale;
  seed: number;
  silhouette: readonly number[];
  swing: boolean;
  swingSec: number;
  tempo: number;
  timbre: Voice;
  tonic: string;
  voices: number;
}

// Cinq gammes, toutes lumineuses sauf une. Le mineur naturel et le phrygien sont sortis du
// tirage : ils tiraient chaque seed vers le melancolique, ce qui est l'inverse de la
// commande. Le dorien reste comme seule teinte douce-amere.
const SCALES: readonly [Scale, ...Scale[]] = [
  { name: "majeur", steps: [0, 2, 4, 5, 7, 9, 11] },
  { name: "pentatonique majeure", steps: [0, 2, 4, 7, 9] },
  { name: "lydien", steps: [0, 2, 4, 6, 7, 9, 11] },
  { name: "mixolydien", steps: [0, 2, 4, 5, 7, 9, 10] },
  { name: "dorien", steps: [0, 2, 3, 5, 7, 9, 10] },
];

// Les six timbres tirables pour la melodie. La basse et la nappe n'y sont pas : ce sont
// les voix d'accompagnement, elles ne doivent pas se retrouver a jouer le theme.
const TIMBRES: readonly [Voice, ...Voice[]] = [
  { attack: 0.012, decay: 1.2, gain: 0.5, name: "sinus doux", wave: "sine" },
  { attack: 0.01, decay: 1, gain: 0.44, name: "triangle", wave: "triangle" },
  { attack: 0.008, decay: 0.7, gain: 0.14, name: "carré doux", wave: "square" },
  { attack: 0.003, decay: 2.2, gain: 0.44, name: "cloche", wave: "sine" },
  { attack: 0.06, decay: 1.4, gain: 0.46, name: "flûte", wave: "sine" },
  { attack: 0.12, decay: 1.8, gain: 0.4, name: "souffle", wave: "triangle" },
];

// Quatre mesures d'accords, en degres de la gamme. C'est la que se joue le caractere
// enjoue, bien plus que dans la gamme : ces marches resolvent.
const PROGS: readonly [readonly number[], ...(readonly number[])[]] = [
  [0, 4, 5, 3],
  [0, 5, 3, 4],
  [0, 3, 4, 0],
  [5, 3, 0, 4],
  [0, 2, 3, 4],
];

// La mesure n'est pas un ornement affiche : elle donne le nombre de croches par mesure,
// donc la longueur du motif de melodie et le retour de la nappe.
const METERS: readonly [Meter, ...Meter[]] = [
  { label: "4/4", steps: 8 },
  { label: "3/4", steps: 6 },
  { label: "6/8", steps: 6 },
  { label: "5/4", steps: 10 },
];

const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII"];
const NOTES = ["do", "do♯", "ré", "ré♯", "mi", "fa", "fa♯", "sol", "sol♯", "la", "la♯", "si"];
// Vingt-quatre hauteurs de repos : la silhouette du spectre sort de la seed elle aussi.
// Changer de seed change donc l'image figee, pas seulement le son.
const SILHOUETTE_BARS = 24;
const SILHOUETTE_FLOOR = 0.18;
const SILHOUETTE_SPAN = 0.78;
const TEMPO_FLOOR = 96;
const TEMPO_SPAN = 40;
// Tonique en MIDI, du la 2 au ré 3.
const ROOT_FLOOR = 45;
const ROOT_SPAN = 8;
// Sans ces silences la melodie n'a pas de souffle. Un temps fort se tait rarement, une
// croche faible presque une fois sur deux.
const REST_STRONG = 0.08;
const REST_WEAK = 0.44;
const OCTAVE_ODDS = 0.2;
// Deux fois sur trois, la seconde moitie de la mesure rejoue la premiere. C'est ce qui
// fait un motif plutot qu'une suite de notes, et une boucle qu'on reconnait au second tour.
const REPEAT_ODDS = 0.65;
// Rien ne fait sonner « joue » comme ce retard sur les croches faibles.
const SWING_RATIO = 0.16;
const MAJOR_THIRD = 4;
const SEMITONES = 12;

// Une croche dure « QUARTER_SEC / tempo » secondes : soixante secondes pour deux croches
// par temps, donc trente.
export const QUARTER_SEC = 30;

// Un generateur deterministe en quatre lignes, suffisant ici — on tire des notes, pas des
// cles. « Math.random » n'accepte pas de seed, donc un morceau ne se retrouverait jamais.
export const rng = (seed: number) => {
  let state = seed >>> 0;

  return () => {
    state = (state + 0x6d_2b_79_f5) >>> 0;

    let mixed = state;

    mixed = Math.imul(mixed ^ (mixed >>> 15), mixed | 1);
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);

    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4_294_967_296;
  };
};

// Un tirage dans une liste fermee. L'index tombe toujours dans les bornes, mais le type
// d'entree non vide est ce qui le prouve au compilateur.
const pick = <T>(list: readonly [T, ...T[]], roll: number) =>
  list[Math.floor(roll * list.length)] ?? list[0];

// Une hauteur se calcule toujours par degre, jamais en demi-tons absolus. C'est ce qui fait
// qu'une seed sonne juste plutot qu'aleatoire : le sequenceur ne peut pas tomber en
// dehors de la gamme.
export const degreeToMidi = (scale: Scale, root: number, step: number) => {
  const len = scale.steps.length,
    index = ((step % len) + len) % len;

  return root + (scale.steps[index] ?? 0) + SEMITONES * Math.floor(step / len);
};

export const midiToHertz = (midi: number) => 440 * 2 ** ((midi - 69) / SEMITONES);

// Treize chiffres : assez grand pour qu'une seed ne se recroise jamais par hasard, assez
// court pour se dicter a voix haute.
export const newSeed = () => Math.floor(Math.random() * 9e12) + 1e12;

// Le chiffrage est calcule, pas ecrit : la tierce reelle de l'accord decide de la casse. Le
// volet annonce donc les accords qu'il joue, y compris quand la gamme change leur qualite.
export const romanNumerals = (scale: Scale, prog: readonly number[]) =>
  prog
    .map((step) => {
      const third = degreeToMidi(scale, 0, step + 2) - degreeToMidi(scale, 0, step),
        len = scale.steps.length,
        numeral = ROMAN[((step % len) + len) % len] ?? "I";

      return third >= MAJOR_THIRD ? numeral : numeral.toLowerCase();
    })
    .join(" ");

// Onze tirages, dans cet ordre exactement. Chaque ligne du tableau de « MUSIQUE.md » §1
// correspond a une ligne ici, et leur ordre est le format de la seed.
export const derive = (seed: number): Params => {
  const roll = rng(seed % 2_147_483_647),
    silhouette = Array.from(
      { length: SILHOUETTE_BARS },
      () => SILHOUETTE_FLOOR + roll() * SILHOUETTE_SPAN,
    ),
    tempo = TEMPO_FLOOR + Math.floor(roll() * TEMPO_SPAN),
    scale = pick(SCALES, roll()),
    timbre = pick(TIMBRES, roll()),
    meter = pick(METERS, roll()),
    voices = 2 + Math.floor(roll() * 2),
    root = ROOT_FLOOR + Math.floor(roll() * ROOT_SPAN),
    prog = pick(PROGS, roll()),
    swing = roll() < 0.5,
    melody: (Note | undefined)[] = Array.from({ length: meter.steps }, (_unused, index) => {
      const strong = index % 2 === 0;

      if (roll() < (strong ? REST_STRONG : REST_WEAK)) {
        return undefined;
      }

      const degree = Math.floor(roll() * 3),
        octave = roll() < OCTAVE_ODDS ? 1 : 0;

      return { degree, octave };
    });

  // Les quatre mesures donnent toutes un nombre pair de croches, donc la moitie tombe
  // juste. La derniere croche remonte a la quinte pour relancer la boucle.
  if (roll() < REPEAT_ODDS) {
    const half = meter.steps / 2;

    for (let index = half; index < meter.steps; index += 1) {
      melody[index] = melody[index - half];
    }

    melody[meter.steps - 1] = { degree: 2, octave: 0 };
  }

  // Une mesure entierement silencieuse ne se reconnait pas : elle ne sonne pas du tout. Le
  // test passe par « some », car « every » retrecirait « melody » a un tableau de vides.
  if (!melody.some((note) => note !== undefined)) {
    melody[0] = { degree: 0, octave: 0 };
  }

  return {
    chords: romanNumerals(scale, prog),
    melody,
    meter,
    prog,
    root,
    scale,
    seed,
    silhouette,
    swing,
    swingSec: swing ? (QUARTER_SEC / tempo) * SWING_RATIO : 0,
    tempo,
    timbre,
    tonic: NOTES[root % SEMITONES] ?? "do",
    voices,
  };
};

// Une ligne affichee est une valeur que le sequenceur lit vraiment. Le premier jet annoncait
// une mesure que le sequenceur ignorait : c'est un bug d'honnetete, pas un detail cosmetique.
export const radioLines = (params: Params) => [
  { label: "tempo", value: `${params.tempo} bpm` },
  { label: "tonique", value: `${params.tonic} ${params.scale.name}` },
  { label: "accords", value: params.chords },
  { label: "timbre · mélodie", value: params.timbre.name },
  {
    label: "mesure",
    value: `${params.meter.label} · ${params.voices} voix · ${params.swing ? "swing" : "droit"}`,
  },
];
