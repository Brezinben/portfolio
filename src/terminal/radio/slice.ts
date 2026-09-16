// Le volet : ce que la radio affiche, ce qu'elle ecoute au clavier, et son demontage.
//
// La tranche ne porte aucun accesseur : elle ecrit dans l'etat, et le balisage lit l'etat.
// Les hauteurs de barres font exception, et pour une raison — voir « radioDraw ».

import { type Params, derive, newSeed, radioLines } from "./derive.ts";
import { type Radio, radioEngine } from "./engine.ts";
import type { Shell } from "../shell.ts";

// Seize barres quand le volet est a son minimum, vingt au-dela. Sous 900 px le volet
// s'empile et la bande grandit d'elle-meme par son « clamp ».
const BARS_NARROW = 16;
const BARS_WIDE = 20;
const WIDE_PX = 260;
// Le repere de crete retombe plus lentement que la barre, comme sur un vu-metre.
const PEAK_FALL = 0.9;
const PEAK_OFFSET_PX = 3;
// L'analyseur ne rend que des zeros entre deux notes et pendant la montee du gain maitre.
// Ecrire ces zeros aplatirait le spectre en une ligne pendant tout le demarrage.
const SILENT_LEVEL = 3;
// La crete de repos se pose juste au-dessus de la barre, sans sortir de la bande.
const REST_PEAK_LIFT = 0.08;
const REST_PEAK_CEIL = 0.94;
const PERCENT = 100;
const SECOND_MS = 1000;
const SECONDS_PER_MINUTE = 60;
const MAX_DIGITS = 15;
const ZERO_CLOCK = "0:00";
// Les chiffres se groupent par trois au repos : une seed se dicte a voix haute, et
// « 8 093 451 772 146 » se recopie, « 8093451772146 » non.
const grouped = (seed: number) => String(seed).replaceAll(/\B(?=(?:\d{3})+(?!\d))/gu, " ");

const clock = (seconds: number) =>
  `${Math.floor(seconds / SECONDS_PER_MINUTE)}:${String(seconds % SECONDS_PER_MINUTE).padStart(2, "0")}`;

const barNodes = () => document.querySelectorAll<HTMLElement>("[data-radio-bar]");

// Ce que la radio garde dans l'etat du composant. L'etat vit dans app.ts, comme tout le
// reste ; cette interface est la vue que « this » en donne a la tranche, et app.ts la reprend
// telle quelle pour ne pas declarer les memes champs deux fois.
export interface RadioState {
  radioAudio: string;
  radioBars: number[];
  radioClock: string;
  radioEngine: Radio | undefined;
  radioFrame: number | undefined;
  radioOn: boolean;
  radioParams: Params | undefined;
  radioPeaks: number[];
  radioRows: { label: string; value: string }[];
  radioSeconds: number;
  radioSeedText: string;
  radioSeeds: number;
  radioTicker: ReturnType<typeof setInterval> | undefined;
  radioTyping: boolean;
}

export interface RadioApi {
  radioClose(): void;
  radioDraw(): void;
  radioKey(event: KeyboardEvent): void;
  radioLoad(text: string): void;
  radioMute(): void;
  radioOpen(): void;
  radioReseed(seed: number | undefined): void;
  radioShow(params: Params): void;
  radioSilhouette(): void;
  radioToggle(): void;
}

// Cette tranche n'appelle pas « slice » du socle : elle vit dans un chunk a part, et une
// valeur empruntee au paquet principal lui ferait importer l'entree, qui est en ligne dans
// la page et n'a donc pas d'URL. « ThisType » type « this » sans rien emprunter.
const members: RadioApi & ThisType<Shell> = {
  // Tout ce que la commande a pose tombe ici : minuteur, boucle de rendu, et surtout le
  // contexte audio. Un contexte laisse ouvert continue de tourner en fond et garde le
  // materiel audio reserve.
  radioClose(this: Shell) {
    if (!this.radioOn) {
      return;
    }

    clearInterval(this.radioTicker);
    this.radioTicker = undefined;

    if (this.radioFrame !== undefined) {
      cancelAnimationFrame(this.radioFrame);
      this.radioFrame = undefined;
    }

    this.radioEngine?.close();
    this.radioEngine = undefined;
    this.radioOn = false;
    this.radioAudio = "muet";
    this.radioParams = undefined;
    this.radioBars = [];
    this.radioPeaks = [];
    this.radioRows = [];
    this.radioSeconds = 0;
    this.radioClock = ZERO_CLOCK;
    this.radioSeedText = "";
    // Un champ retire ne perd pas le focus par un evenement : sans cette remise a zero, la
    // seed suivante ne s'afficherait jamais.
    this.radioTyping = false;
  },

  // Les hauteurs viennent de l'analyseur, pas d'un keyframe : quand le son tourne, le
  // spectre EST le son. Elles s'ecrivent directement dans le style, comme la position de
  // la mascotte : les faire passer par l'etat reactif ferait rerendre a chaque image.
  radioDraw(this: Shell) {
    if (this.radioFrame !== undefined) {
      return;
    }

    // La boucle s'arrete pour de bon : volet ferme, animation coupee ou lecture en pause
    // ne laissent plus tourner un rappel par image. « radioToggle » la relance a la
    // lecture, et « flip » au retour du reglage.
    const frame = () => {
      if (
        !this.radioOn ||
        !this.radioEngine ||
        !this.anim ||
        this.reduced ||
        this.radioAudio === "muet" ||
        !this.radioEngine.playing()
      ) {
        this.radioFrame = undefined;

        return;
      }

      this.radioFrame = requestAnimationFrame(frame);

      const levels = this.radioEngine.levels(this.radioBars.length);

      if (!levels || !levels.some((height) => height > SILENT_LEVEL)) {
        return;
      }

      const bars = barNodes();

      for (const [index, height] of levels.entries()) {
        const peak = Math.max(height, (this.radioPeaks[index] ?? 0) - PEAK_FALL);

        this.radioPeaks[index] = peak;
        bars[index]?.style.setProperty("--bar", `${height.toFixed(1)}%`);
        bars[index]?.style.setProperty("--peak", `calc(${peak.toFixed(1)}% + ${PEAK_OFFSET_PX}px)`);
      }
    };

    this.radioFrame = requestAnimationFrame(frame);
  },

  // Les raccourcis sont poses sur le volet, pas sur la fenetre : la coquille garde le
  // focus sur la ligne de commande, ou « espace » et « r » se tapent legitimement. Le
  // champ de seed est exclu pour la meme raison.
  radioKey(this: Shell, event: KeyboardEvent) {
    if (event.altKey || event.ctrlKey || event.metaKey) {
      return;
    }

    if (event.target instanceof HTMLInputElement) {
      return;
    }

    // Espace active le bouton qui a le focus. Le lui prendre couperait le clavier sur les
    // deux seuls controles du volet.
    if (event.key === " " && event.target instanceof HTMLButtonElement) {
      return;
    }

    const press = {
      " ": () => this.radioToggle(),
      m: () => this.radioMute(),
      q: () => this.radioClose(),
      r: () => this.radioReseed(undefined),
    }[event.key.toLowerCase()];

    if (!press) {
      return;
    }

    event.preventDefault();
    press();
  },

  // Une ecoute se partage par un nombre : ce nombre doit pouvoir se recoller. Le vide est
  // refuse plutot que charge comme seed zero. La seed courante ne relance rien, sinon
  // « entree » puis la perte de focus redemarreraient le morceau deux fois.
  radioLoad(this: Shell, text: string) {
    const digits = text.replaceAll(/\D/gu, "").slice(0, MAX_DIGITS),
      seed = Number(digits),
      current = this.radioParams?.seed ?? 0;

    this.radioTyping = false;

    if (digits === "" || seed <= 0 || seed === current) {
      this.radioSeedText = grouped(current);

      return;
    }

    this.radioReseed(Number(digits));
    this.track("radio_seed", { saisie: true });
  },

  // Couper le son n'arrete pas le morceau : il continue de tourner, le chronometre avec.
  // C'est ce qui distingue « m » de « espace », qui met en pause.
  radioMute(this: Shell) {
    const engine = this.radioEngine;

    if (!engine?.playing()) {
      return;
    }

    this.radioAudio = engine.toggleMute() ? "muet" : "on";

    // Le spectre mesure le son en bout de chaine : coupe, il n'a rien a montrer.
    if (this.radioAudio === "on") {
      this.radioDraw();
    }
  },

  // Taper la commande est le geste : le morceau part tout de suite. Rien ne sonne avant,
  // et le graphe audio ne se monte qu'ici. Le volet de sortie se rallume au passage, car la
  // commande n'a pas de sens sans lui.
  radioOpen(this: Shell) {
    if (this.radioOn) {
      this.radioReseed(undefined);

      return;
    }

    this.out = true;
    this.radioOn = true;
    this.radioAudio = "muet";
    this.radioSeeds = 0;
    this.radioEngine = radioEngine();
    this.radioTicker = setInterval(() => {
      if (this.radioEngine?.playing()) {
        this.radioSeconds += 1;
        this.radioClock = clock(this.radioSeconds);
      }
    }, SECOND_MS);

    // Le volet vient d'etre demande : sa largeur ne se mesure qu'une fois qu'il est pose.
    // Mesurer avant laissait seize barres sur un grand ecran, quand le reglage « out »
    // etait eteint et que le volet valait donc zero pixel.
    this.$nextTick(() => {
      const pane = document.querySelector('[data-pane="out"]'),
        wide = (pane?.clientWidth ?? 0) >= WIDE_PX;

      this.radioBars = Array.from({ length: wide ? BARS_WIDE : BARS_NARROW }, (_u, at) => at);
      this.radioPeaks = this.radioBars.map(() => 0);
      this.radioReseed(undefined);
      this.radioToggle();
    });
  },

  // Une autre seed, donc un autre morceau, immediatement. Le chronometre repart a zero :
  // il mesure le morceau en cours, pas la duree d'ecoute.
  radioReseed(this: Shell, seed: number | undefined) {
    this.radioSeconds = 0;
    this.radioClock = ZERO_CLOCK;
    this.radioPeaks = this.radioBars.map(() => 0);
    this.radioSeeds += 1;
    this.radioShow(derive(seed ?? newSeed()));

    if (this.radioEngine?.playing()) {
      this.radioEngine.play(this.radioParams);
    }
  },

  // Les cinq lignes et la silhouette de repos. Une ligne affichee est une valeur que le
  // sequenceur lit vraiment : le volet decrit le morceau qu'on entend.
  radioShow(this: Shell, params: Params) {
    this.radioParams = params;
    this.radioRows = radioLines(params);

    // La frappe en cours ne doit pas se faire ecraser sous les doigts.
    if (!this.radioTyping) {
      this.radioSeedText = grouped(params.seed);
    }

    this.radioSilhouette();
  },

  // L'image qu'on voit sans son, et celle qui reste quand l'animation est coupee. Le gel
  // est une image fixe lisible, jamais une disparition : les hauteurs sortent de la seed.
  radioSilhouette(this: Shell) {
    const params = this.radioParams;

    if (!params) {
      return;
    }

    this.$nextTick(() => {
      for (const [index, bar] of barNodes().entries()) {
        const height = params.silhouette[index % params.silhouette.length] ?? 0,
          peak = Math.min(height + REST_PEAK_LIFT, REST_PEAK_CEIL);

        bar.style.setProperty("--bar", `${Math.round(height * PERCENT)}%`);
        bar.style.setProperty(
          "--peak",
          `calc(${Math.round(peak * PERCENT)}% + ${PEAK_OFFSET_PX}px)`,
        );
      }
    });
  },

  // Le premier geste construit le graphe : Chrome refuse de demarrer un contexte audio
  // sans interaction, et un contexte construit au chargement reste suspendu et muet.
  radioToggle(this: Shell) {
    const engine = this.radioEngine;

    if (!engine) {
      return;
    }

    if (engine.playing()) {
      engine.pause();
      this.radioAudio = "pause";

      return;
    }

    // Une reprise continue le morceau la ou la pause l'a laisse. Seule la premiere lecture,
    // ou une nouvelle seed, le reprend depuis le debut.
    if (!engine.resume()) {
      engine.play(this.radioParams);
    }

    // Le son coupe survit a la pause : reprendre ne le rend pas sans qu'on le demande.
    this.radioAudio = engine.muted() ? "muet" : "on";
    this.radioDraw();
    this.track("radio_ecoute", { seeds: this.radioSeeds });
  },
};

export const radioSlice = (): RadioApi => members;
