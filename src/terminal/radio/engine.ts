// L'audio : graphe Web Audio, sequenceur, analyseur. Ce module ne touche pas au DOM.
//
// Les valeurs viennent de « design/export-radio/MUSIQUE.md » §4 a §6. Elles ont ete reglees
// a l'oreille, une par une : ce sont des valeurs figees, pas des reglages.

import { type Params, QUARTER_SEC, type Voice, degreeToMidi, midiToHertz } from "./derive.ts";

// La basse, la nappe et le grelot ne sont pas tirables : ce sont les voix
// d'accompagnement. La basse est un triangle, car la dent de scie gresillait dans le grave.
const BASS: Voice = { attack: 0.008, decay: 0.9, gain: 0.5, name: "basse", wave: "triangle" };
const PAD: Voice = { attack: 0.35, decay: 2.4, gain: 0.34, name: "nappe", wave: "sine" };
const BELL: Voice = { attack: 0.003, decay: 2.2, gain: 0.44, name: "grelot", wave: "sine" };
// 5200 Hz et non 3200 : sous 4 kHz la cloche et les aigus de la melodie perdaient leur
// eclat, et une radio enjouee a besoin de cet eclat.
const LOWPASS_HZ = 5200;
const LOWPASS_Q = 0.4;
// Les percussions sautent le passe-bas et l'echo : une cymbale filtree a 5 kHz n'existe
// plus, et un echo sur chaque croche noierait la boucle.
const DRY_GAIN = 0.9;
// Une croche et demie : hors tempo l'echo brouille la boucle, en tempo il l'epaissit.
const ECHO_BEATS = 1.5;
const ECHO_CAP = 0.9;
const ECHO_FEEDBACK = 0.2;
// Trois voix, une basse et une percussion qui tombent sur le meme temps saturaient la
// sortie. Le compresseur passe avant le gain maitre.
const COMP_THRESHOLD = -16;
const COMP_KNEE = 14;
const COMP_RATIO = 3.2;
const COMP_ATTACK = 0.006;
const COMP_RELEASE = 0.24;
// Demarrage en fondu, pas en claquement.
const MASTER_GAIN = 0.5;
const MASTER_RAMP = 0.2;
const FADE_OUT = 0.08;
// 1024 points : a 48 kHz un bac fait ~47 Hz. Une FFT plus courte ecrase tout le morceau
// dans les deux premieres barres.
const FFT_SIZE = 1024;
const SMOOTHING = 0.76;
const NOISE_SEC = 0.4;
// Le minuteur ne fait que reveiller le planificateur, qui place les notes en avance sur
// l'horloge de l'AudioContext. « setInterval » derive, cette horloge non.
const PUMP_MS = 50;
const LOOKAHEAD_SEC = 0.3;
const START_SEC = 0.1;
// Une rampe lineaire vers zero s'entend comme un clic : l'enveloppe retombe en
// exponentielle, donc jamais jusqu'a zero exactement.
const SILENCE = 0.0001;
const NOTE_TAIL = 0.05;
// Un sinus qui chute de 140 a 48 Hz. Pas de bruit dedans, sinon la grosse caisse claque
// sur les petits haut-parleurs.
const KICK_FROM = 140;
const KICK_TO = 48;
const KICK_DROP = 0.14;
const KICK_PEAK = 0.42;
const KICK_TAIL = 0.18;
const KICK_STOP = 0.2;
// Du bruit blanc coupe sous 7 kHz. L'ecart entre temps et contretemps donne le balancement.
const HAT_HZ = 7000;
const HAT_DECAY = 0.06;
const HAT_STOP = 0.08;
const HAT_OFFBEAT = 0.05;
const HAT_ONBEAT = 0.022;
const MELODY_LEVEL = 0.4;
const MELODY_DUR = 0.22;
const BASS_LEVEL = 0.46;
const BASS_DUR = 0.46;
const PAD_LEVEL = 0.15;
const PAD_DUR = 0.8;
const PAD_SPREAD = 0.012;
const BELL_LEVEL = 0.18;
const BELL_DUR = 0.1;
// Le grelot sonne sur les trois dernieres croches d'une mesure sur quatre. Toutes les deux
// mesures, il devenait un tic.
const BELL_EVERY = 4;
const BELL_TAIL = 3;
const BELL_LIFT = 24;
// Une mesure sur huit monte d'une octave : la boucle respire sans se dedoubler.
const LIFT_EVERY = 8;
const SEMITONES = 12;
// L'oreille entend en octaves : un decoupage lineaire des bacs donnerait vingt barres de
// basses et rien au-dessus.
const BIN_BASE = 90;
const BIN_FLOOR = 2;
// Le plafond de « getByteFrequencyData », qui rend des octets.
const BYTE = 0xff;
const LEVEL_CURVE = 0.78;
const LEVEL_SCALE = 104;
const LEVEL_FLOOR = 2;
const LEVEL_CEIL = 100;
// Depuis l'arrivee de la basse et de la grosse caisse, les premiers bacs plafonnaient et
// les trois quarts de la bande restaient plats. Ce basculement vers les aigus les releve.
const TILT_FLOOR = 0.58;
const TILT_SPAN = 0.95;

interface Graph {
  analyser: AnalyserNode;
  // « getByteFrequencyData » refuse un tampon partageable : le parametre generique dit que
  // celui-ci ne l'est pas, et evite une assertion de type.
  bins: Uint8Array<ArrayBuffer>;
  bus: BiquadFilterNode;
  ctx: AudioContext;
  delay: DelayNode;
  dry: GainNode;
  master: GainNode;
  noise: AudioBuffer;
}

export interface Radio {
  close(): void;
  levels(count: number): number[] | undefined;
  muted(): boolean;
  pause(): void;
  play(next: Params | undefined): boolean;
  playing(): boolean;
  resume(): boolean;
  started(): boolean;
  toggleMute(): boolean;
}

// Une note a jouer : quand, quelle hauteur, combien de temps, avec quelle voix et a quel
// niveau. Les cinq vont ensemble, et les separer en cinq parametres se lit mal a l'appel.
interface Hit {
  at: number;
  level: number;
  midi: number;
  span: number;
  voice: Voice;
}

// Un pas de croche : l'instant ou il tombe, et son rang depuis le debut de la lecture. Le
// rang donne la place dans la mesure et le numero de mesure.
interface Cue {
  at: number;
  position: number;
}

// Un accord est un empilement de degres, pas d'intervalles : d, d+2, d+4. Cela fonctionne
// pour n'importe quelle longueur de gamme, pentatonique comprise.
const chordTone = (chord: number, index: number) => {
  return chord + 2 * (index % 3);
};

// Le graphe se monte au premier geste, jamais au montage du volet : Chrome refuse de
// demarrer un contexte sans interaction, et un contexte suspendu ne rend aucun son.
// L'analyseur est en bout de chaine, donc il mesure ce qu'on entend vraiment.
const build = (): Graph => {
  const ctx = new AudioContext(),
    bus = ctx.createBiquadFilter(),
    dry = ctx.createGain(),
    delay = ctx.createDelay(1),
    echo = ctx.createGain(),
    comp = ctx.createDynamicsCompressor(),
    master = ctx.createGain(),
    analyser = ctx.createAnalyser(),
    noise = ctx.createBuffer(1, Math.floor(ctx.sampleRate * NOISE_SEC), ctx.sampleRate),
    channel = noise.getChannelData(0);

  bus.type = "lowpass";
  bus.frequency.value = LOWPASS_HZ;
  bus.Q.value = LOWPASS_Q;
  dry.gain.value = DRY_GAIN;
  echo.gain.value = ECHO_FEEDBACK;
  comp.threshold.value = COMP_THRESHOLD;
  comp.knee.value = COMP_KNEE;
  comp.ratio.value = COMP_RATIO;
  comp.attack.value = COMP_ATTACK;
  comp.release.value = COMP_RELEASE;
  master.gain.value = 0;
  analyser.fftSize = FFT_SIZE;
  analyser.smoothingTimeConstant = SMOOTHING;

  bus.connect(comp);
  dry.connect(comp);
  bus.connect(delay);
  delay.connect(echo);
  echo.connect(delay);
  echo.connect(comp);
  comp.connect(master);
  master.connect(analyser);
  analyser.connect(ctx.destination);

  // Une reserve de bruit blanc, tiree une fois : c'est la matiere des cymbales.
  for (let index = 0; index < channel.length; index += 1) {
    channel[index] = Math.random() * 2 - 1;
  }

  return {
    analyser,
    bins: new Uint8Array(analyser.frequencyBinCount),
    bus,
    ctx,
    delay,
    dry,
    master,
    noise,
  };
};

// Le sequenceur et le graphe, derriere une poignee. Le volet ne voit que cette poignee :
// il ne connait ni les noeuds, ni le minuteur, ni l'horloge.
export const radioEngine = (): Radio => {
  let graph: Graph | undefined = undefined,
    params: Params | undefined = undefined,
    running = false,
    // Le moteur porte seul l'etat du son coupe, car il porte le gain maitre. « play » et
    // « resume » le reecrivent : lu ailleurs, il se desynchroniserait a la premiere pause.
    silenced = false,
    timer: ReturnType<typeof setInterval> | undefined = undefined,
    cursor = 0,
    nextAt = 0;

  // Une note : un oscillateur et son enveloppe, crees pour elle seule et jetes apres. C'est
  // la forme que l'API impose — un oscillateur arrete ne se rejoue pas.
  const note = (live: Graph, hit: Hit) => {
      const osc = live.ctx.createOscillator(),
        env = live.ctx.createGain(),
        fall = hit.at + hit.voice.attack + hit.span * hit.voice.decay;

      osc.type = hit.voice.wave;
      osc.frequency.setValueAtTime(midiToHertz(hit.midi), hit.at);
      env.gain.setValueAtTime(0, hit.at);
      env.gain.linearRampToValueAtTime(hit.level * hit.voice.gain, hit.at + hit.voice.attack);
      env.gain.exponentialRampToValueAtTime(SILENCE, fall);
      osc.connect(env);
      env.connect(live.bus);
      osc.start(hit.at);
      osc.stop(fall + NOTE_TAIL);
    },
    kick = (live: Graph, at: number) => {
      const osc = live.ctx.createOscillator(),
        env = live.ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(KICK_FROM, at);
      osc.frequency.exponentialRampToValueAtTime(KICK_TO, at + KICK_DROP);
      env.gain.setValueAtTime(SILENCE, at);
      env.gain.exponentialRampToValueAtTime(KICK_PEAK, at + COMP_ATTACK);
      env.gain.exponentialRampToValueAtTime(SILENCE, at + KICK_TAIL);
      osc.connect(env);
      env.connect(live.dry);
      osc.start(at);
      osc.stop(at + KICK_STOP);
    },
    hat = (live: Graph, at: number, level: number) => {
      const source = live.ctx.createBufferSource(),
        highpass = live.ctx.createBiquadFilter(),
        env = live.ctx.createGain();

      source.buffer = live.noise;
      highpass.type = "highpass";
      highpass.frequency.value = HAT_HZ;
      env.gain.setValueAtTime(level, at);
      env.gain.exponentialRampToValueAtTime(SILENCE, at + HAT_DECAY);
      source.connect(highpass);
      highpass.connect(env);
      env.connect(live.dry);
      source.start(at);
      source.stop(at + HAT_STOP);
    },
    // Un pas de croche, quatre couches. La seed a ecrit le motif une fois pour toutes, et
    // la grille tourne sur quatre mesures : chaque croche de melodie vise un degre de
    // l'accord en cours, donc elle tombe juste sans jamais etre tiree au hasard.
    step = (live: Graph, tune: Params, cue: Cue) => {
      const index = cue.position % tune.meter.steps,
        bar = Math.floor(cue.position / tune.meter.steps),
        chord = tune.prog[bar % tune.prog.length] ?? 0,
        { length } = tune.scale.steps,
        lift = bar % LIFT_EVERY === LIFT_EVERY - 1 ? SEMITONES : 0,
        // La croche faible arrive en retard : rien ne fait sonner « joue » comme ce decalage.
        at = index % 2 === 1 ? cue.at + tune.swingSec : cue.at,
        pitch = (degree: number) => {
          return degreeToMidi(tune.scale, tune.root, degree);
        },
        melody = tune.melody[index];

      if (melody) {
        const degree = chordTone(chord, melody.degree) + (melody.octave ? length : 0);

        note(live, {
          at,
          level: MELODY_LEVEL,
          midi: pitch(degree) + SEMITONES + lift,
          span: MELODY_DUR,
          voice: tune.timbre,
        });
      }

      // La basse tombe sur les temps, fondamentale de l'accord, sauf sur le troisieme temps
      // ou elle monte a la quinte.
      if (index % 2 === 0) {
        const degree = index / 2 === 2 ? chord + 4 : chord;

        note(live, {
          at,
          level: BASS_LEVEL,
          midi: pitch(degree) - SEMITONES,
          span: BASS_DUR,
          voice: BASS,
        });
      }

      // La nappe est un fond, pas une voix : deux ou trois notes posees a 12 ms d'ecart.
      if (index === 0) {
        for (let voice = 0; voice < tune.voices; voice += 1) {
          note(live, {
            at: at + PAD_SPREAD * voice,
            level: PAD_LEVEL,
            midi: pitch(chordTone(chord, voice)),
            span: PAD_DUR,
            voice: PAD,
          });
        }
      }

      if (bar % BELL_EVERY === BELL_EVERY - 1 && index >= tune.meter.steps - BELL_TAIL) {
        const degree = chordTone(chord, index - (tune.meter.steps - BELL_TAIL));

        note(live, {
          at,
          level: BELL_LEVEL,
          midi: pitch(degree) + BELL_LIFT,
          span: BELL_DUR,
          voice: BELL,
        });
      }

      if (index === 0 || index === Math.floor(tune.meter.steps / 2)) {
        kick(live, at);
      }

      hat(live, at, index % 2 === 1 ? HAT_OFFBEAT : HAT_ONBEAT);
    },
    // Le planificateur ne fait pas confiance au minuteur : il place les notes en avance sur
    // l'horloge du contexte, la seule qui ne derive pas.
    pump = () => {
      if (!graph || !params || !running) {
        return;
      }

      const span = QUARTER_SEC / params.tempo;

      while (nextAt < graph.ctx.currentTime + LOOKAHEAD_SEC) {
        step(graph, params, { at: nextAt, position: cursor });
        nextAt += span;
        cursor += 1;
      }
    },
    // Le niveau que le gain maitre doit viser : zero tant que le son est coupe. « play » et
    // « resume » passent par ici, sinon ils rendraient le son sans que rien le demande.
    level = () => {
      return silenced ? 0 : MASTER_GAIN;
    },
    pause = () => {
      running = false;
      clearInterval(timer);
      timer = undefined;

      if (graph) {
        graph.master.gain.setTargetAtTime(0, graph.ctx.currentTime, FADE_OUT);
      }
    };

  return {
    close() {
      pause();

      if (graph) {
        void graph.ctx.close();
      }

      graph = undefined;
    },

    // « niveaux » rend des hauteurs en pourcentage, lues sur l'analyseur en bout de chaine.
    // Le spectre ne peut donc pas mentir sur le son.
    levels(count) {
      if (!graph) {
        return undefined;
      }

      const { analyser, bins } = graph;

      analyser.getByteFrequencyData(bins);

      return Array.from({ length: count }, (_unused, index) => {
        const low = Math.round(BIN_FLOOR * BIN_BASE ** (index / count)),
          high = Math.max(low + 1, Math.round(BIN_FLOOR * BIN_BASE ** ((index + 1) / count)));

        let peak = 0;

        for (let bin = low; bin < high && bin < bins.length; bin += 1) {
          peak = Math.max(peak, bins[bin] ?? 0);
        }

        const tilt = TILT_FLOOR + TILT_SPAN * (index / count);

        return Math.min(
          LEVEL_CEIL,
          Math.max(LEVEL_FLOOR, (peak / BYTE) ** LEVEL_CURVE * LEVEL_SCALE * tilt),
        );
      });
    },

    muted: () => {
      return silenced;
    },

    pause,

    play(next) {
      graph ??= build();
      params = next ?? params;

      if (!params) {
        return false;
      }

      void graph.ctx.resume();
      graph.delay.delayTime.value = Math.min(ECHO_CAP, (QUARTER_SEC / params.tempo) * ECHO_BEATS);
      cursor = 0;
      nextAt = graph.ctx.currentTime + START_SEC;
      running = true;
      graph.master.gain.cancelScheduledValues(graph.ctx.currentTime);
      graph.master.gain.setTargetAtTime(level(), graph.ctx.currentTime, MASTER_RAMP);
      clearInterval(timer);
      timer = setInterval(pump, PUMP_MS);

      return true;
    },

    playing: () => {
      return running;
    },

    // Reprendre n'est pas rejouer : le curseur reste ou la pause l'a laisse, donc la boucle
    // continue au lieu de repartir a la premiere mesure. L'horloge du contexte, elle, a
    // continue d'avancer pendant la pause : il faut donc replacer le prochain pas.
    resume() {
      if (!graph || !params) {
        return false;
      }

      void graph.ctx.resume();
      nextAt = Math.max(nextAt, graph.ctx.currentTime + START_SEC);
      running = true;
      graph.master.gain.cancelScheduledValues(graph.ctx.currentTime);
      graph.master.gain.setTargetAtTime(level(), graph.ctx.currentTime, MASTER_RAMP);
      clearInterval(timer);
      timer = setInterval(pump, PUMP_MS);

      return true;
    },

    started: () => {
      return graph !== undefined;
    },

    // Couper le son n'arrete pas le sequenceur : le morceau continue de tourner, et le
    // chronometre avec. C'est ce qui distingue le son coupe de la pause, qui elle arrete
    // tout. Rend l'etat obtenu, pour que le volet n'ait pas a le tenir en double.
    toggleMute() {
      silenced = !silenced;

      if (graph) {
        graph.master.gain.setTargetAtTime(
          silenced ? 0 : MASTER_GAIN,
          graph.ctx.currentTime,
          silenced ? FADE_OUT : MASTER_RAMP,
        );
      }

      return silenced;
    },
  };
};
