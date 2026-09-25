// Le volet : ce que la radio affiche, ce qu'elle ecoute au clavier, et son demontage.
//
// La tranche ne porte aucun accesseur : elle ecrit dans l'etat, et le balisage lit l'etat.
// Les hauteurs de barres font exception, et pour une raison — voir « radioDraw ».

import type { Beat, Shell } from "../shell.ts";
import { type Params, derive, newSeed, radioLines } from "./derive.ts";
import { type Radio, radioEngine } from "./engine.ts";

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
const grouped = (seed: number) => {
  return String(seed).replaceAll(/\B(?=(?:\d{3})+(?!\d))/gu, " ");
};

const clock = (seconds: number) => {
  return `${Math.floor(seconds / SECONDS_PER_MINUTE)}:${String(seconds % SECONDS_PER_MINUTE).padStart(2, "0")}`;
};

const barNodes = () => {
  return document.querySelectorAll<HTMLElement>("[data-radio-bar]");
};
const outPane = () => {
  return document.querySelector('[data-pane="out"]');
};
const MEDIA_ACTIONS = ["nexttrack", "pause", "play", "stop"] as const;
// Le nombre de barres suit la largeur du volet. Il se recalcule au redimensionnement : la
// bande doit rester lisible quand la fenetre change, pas seulement a l'ouverture.
const barCount = () => {
  return (outPane()?.clientWidth ?? 0) >= WIDE_PX ? BARS_WIDE : BARS_NARROW;
};

// Les touches media du clavier et l'ecran de verrouillage pilotent la radio. Le systeme
// n'affiche que ce qu'on lui donne : sans metadonnees, les commandes restent muettes.
const announce = (params: Params) => {
  navigator.mediaSession.metadata = new MediaMetadata({
    album: "Portfolio Benjamin David",
    artist: `${params.tempo} bpm · ${params.tonic} ${params.scale.name}`,
    title: `radio · seed ${grouped(params.seed)}`,
  });
};

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
  // La radio mise en pause parce que l'onglet est passe en arriere-plan, et qu'il faut donc
  // rendre au retour. Une pause demandee par le visiteur, elle, ne se defait pas seule.
  radioSlept: boolean;
  radioSizer: ResizeObserver | undefined;
  radioTicker: Beat | undefined;
  radioTyping: boolean;
}

export interface RadioApi {
  radioClose(): void;
  radioDraw(): void;
  radioFit(): void;
  radioKey(event: KeyboardEvent): void;
  radioLoad(text: string): void;
  radioMute(): void;
  radioOpen(): void;
  radioReseed(seed: number | undefined): void;
  radioShow(params: Params): void;
  radioSilhouette(): void;
  radioToggle(): void;
  radioVisibility(): void;
}

// Le systeme garderait la radio dans ses commandes media apres sa fermeture. « null » et
// non « undefined » : c'est ce que Media Session attend pour effacer.
const forgetMediaSession = () => {
  // oxlint-disable-next-line unicorn/no-null
  navigator.mediaSession.metadata = null;
  navigator.mediaSession.playbackState = "none";

  for (const action of MEDIA_ACTIONS) {
    // oxlint-disable-next-line unicorn/no-null
    navigator.mediaSession.setActionHandler(action, null);
  }
};

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

    // La radio retire ses boutons. Sans cette garde, le focus tombe sur le corps de la page.
    // Le focus passe a la sortie, qui reparait a la place de la radio.
    if (document.querySelector(".radio")?.contains(document.activeElement) === true) {
      this.$nextTick(() => {
        (
          document.querySelector<HTMLElement>('[data-pane="out"] [role="region"]') ?? this.$refs.cli
        )?.focus();
      });
    }

    clearInterval(this.radioTicker);
    this.radioTicker = undefined;
    this.radioSizer?.disconnect();
    this.radioSizer = undefined;

    if (this.radioFrame !== undefined) {
      cancelAnimationFrame(this.radioFrame);
      this.radioFrame = undefined;
    }

    forgetMediaSession();

    this.radioEngine?.close();
    // Un champ retire ne perd pas le focus par un evenement : sans la remise a zero de
    // « radioTyping », la seed suivante ne s'afficherait jamais.
    Object.assign(this, {
      radioAudio: "muet",
      radioBars: [],
      radioClock: ZERO_CLOCK,
      radioEngine: undefined,
      radioOn: false,
      radioParams: undefined,
      radioPeaks: [],
      radioRows: [],
      radioSeconds: 0,
      radioSeedText: "",
      radioSlept: false,
      radioTyping: false,
    } satisfies Partial<RadioState>);
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

      if (
        !levels ||
        !levels.some((height) => {
          return height > SILENT_LEVEL;
        })
      ) {
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

  // Le nombre de barres suit la largeur du volet, donc il se refait au redimensionnement.
  // Le « x-for » recree les barres, qui perdent leur style en ligne : il faut les repeindre.
  radioFit(this: Shell) {
    const count = barCount();

    if (count === this.radioBars.length) {
      return;
    }

    this.radioBars = Array.from({ length: count }, (_unused, at) => {
      return at;
    });
    this.radioPeaks = this.radioBars.map(() => {
      return 0;
    });
    this.radioSilhouette();
  },

  // Les raccourcis sont poses sur le volet, pas sur la fenetre : la coquille garde le
  // focus sur la ligne de commande, ou « espace » et « r » se tapent legitimement. Le
  // champ de seed est exclu pour la meme raison.
  radioKey(this: Shell, event: KeyboardEvent) {
    // Une modale a son propre clavier. La bascule des raccourcis coupe aussi ces touches.
    if (event.altKey || event.ctrlKey || event.metaKey || this.modalOpen || !this.shortcuts) {
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
      " ": () => {
        this.radioToggle();
      },
      m: () => {
        this.radioMute();
      },
      q: () => {
        this.radioClose();
      },
      r: () => {
        this.radioReseed(undefined);
      },
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
    navigator.mediaSession.setActionHandler("play", () => {
      this.radioToggle();
    });
    navigator.mediaSession.setActionHandler("pause", () => {
      this.radioToggle();
    });
    navigator.mediaSession.setActionHandler("stop", () => {
      this.radioClose();
    });
    navigator.mediaSession.setActionHandler("nexttrack", () => {
      this.radioReseed(undefined);
    });

    this.$nextTick(() => {
      const pane = outPane();

      this.radioBars = Array.from({ length: barCount() }, (_unused, at) => {
        return at;
      });
      this.radioPeaks = this.radioBars.map(() => {
        return 0;
      });
      this.radioReseed(undefined);
      this.radioToggle();

      // La bande doit rester lisible quand la fenetre change, pas seulement a l'ouverture.
      if (pane) {
        this.radioSizer = new ResizeObserver(() => {
          this.radioFit();
        });
        this.radioSizer.observe(pane);
      }
    });
  },

  // Une autre seed, donc un autre morceau, immediatement. Le chronometre repart a zero :
  // il mesure le morceau en cours, pas la duree d'ecoute.
  radioReseed(this: Shell, seed: number | undefined) {
    this.radioSeconds = 0;
    this.radioClock = ZERO_CLOCK;
    this.radioPeaks = this.radioBars.map(() => {
      return 0;
    });
    this.radioSeeds += 1;
    this.radioShow(derive(seed ?? newSeed()));

    if (this.radioParams) {
      announce(this.radioParams);
    }

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

    // Le son coupe se rend d'abord, et la musique s'arrete avec : le bouton ne fait jamais
    // deux choses a la fois. Un second clic relance.
    if (engine.muted()) {
      engine.toggleMute();
      engine.pause();
      this.radioAudio = "pause";
      navigator.mediaSession.playbackState = "paused";

      return;
    }

    if (engine.playing()) {
      engine.pause();
      this.radioAudio = "pause";
      navigator.mediaSession.playbackState = "paused";

      return;
    }

    // Une reprise continue le morceau la ou la pause l'a laisse. Seule la premiere lecture,
    // ou une nouvelle seed, le reprend depuis le debut.
    if (!engine.resume()) {
      engine.play(this.radioParams);
    }

    // Le son coupe survit a la pause : reprendre ne le rend pas sans qu'on le demande.
    this.radioAudio = engine.muted() ? "muet" : "on";
    navigator.mediaSession.playbackState = "playing";
    this.radioDraw();
    this.track("radio_ecoute", { seeds: this.radioSeeds });
  },

  // Un onglet en arriere-plan qui continue de jouer est une impolitesse. La pause rendue au
  // retour n'est que celle-ci : une pause demandee par le visiteur ne se defait pas seule.
  radioVisibility(this: Shell) {
    const engine = this.radioEngine;

    if (!engine) {
      return;
    }

    if (document.hidden) {
      this.radioSlept = engine.playing();

      if (this.radioSlept) {
        this.radioToggle();
      }

      return;
    }

    if (this.radioSlept) {
      this.radioSlept = false;
      this.radioToggle();
    }
  },
};

export const radioSlice = (): RadioApi => {
  return members;
};
