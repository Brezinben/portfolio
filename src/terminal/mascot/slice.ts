// La mascotte : ce qu'elle joue, ou elle se place, comment on la manipule.

import {
  AWAY_MS,
  BOOM_AT,
  CHAIN,
  DRAG_STEP,
  HOLD_MS,
  MASCOT_REST,
  MASCOT_STATES,
  REFORM_MIN_MS,
  REFORM_SPREAD_MS,
  SLEEP_MS,
  SPRITE,
  TRANSITIONS,
  TWITCH_MS,
  TWITCH_ODDS,
  TYPE_REST_MS,
} from "./constants.ts";
import { type Beat, type Delay, type Shell, type TrackSource, slice } from "../shell.ts";
import type { Context, Expression } from "../../interpret.ts";
import { dragState } from "./drag.ts";
import { lookup } from "../lookup.ts";

// Une position, ou un pas : deux nombres qui vont toujours ensemble.
export interface Point {
  x: number;
  y: number;
}

// Ce que la mascotte garde dans l'etat du composant. L'etat vit dans app.ts, comme tout le
// reste ; app.ts reprend cette interface pour ne pas declarer les memes champs deux fois.
export interface MascotState {
  at: number;
  becoming: string;
  bubble: string;
  bubbleTimer: Delay | undefined;
  clicks: number;
  direction: number;
  dragged: boolean;
  dragging: boolean;
  // « form », « becoming » et « loaded » ne sont jamais persistes : chaque visite repart
  // du slime.
  form: string;
  gone: boolean;
  grabAt: number;
  grabFrom: Point;
  loaded: Set<string>;
  mascotState: string;
  morphHeld: boolean;
  motion: string;
  motionTimer: Delay | undefined;
  reformer: Delay | undefined;
  returner: Delay | undefined;
  settler: Delay | undefined;
  sleeper: Delay | undefined;
  twitcher: Beat | undefined;
  typer: Beat | undefined;
  typer_rest: Delay | undefined;
  walker: Beat | undefined;
}

export interface MascotApi {
  blowUp(via?: TrackSource): void;
  doze(): void;
  drag(event: PointerEvent): void;
  drop(): void;
  emote(expression?: Expression): void;
  evolve(): Promise<void>;
  grab(event: PointerEvent): void;
  leave(): void;
  loadForm(form: string): Promise<void>;
  mascotPlay(state: string): void;
  mascotStanding(): Context["mascot"];
  move(motion: string, hold: number): void;
  nearby(event: PointerEvent): void;
  place(x: number): void;
  poke(): void;
  release(): void;
  rouse(): void;
  say(text: string, expression?: Expression): void;
  settle(): void;
  startMascot(): void;
  stopLoading(): void;
  twitch(): void;
  typing(): void;
  wander(): void;
  trackWidth(): number;
}

export const mascotSlice = () => {
  return slice<MascotApi>({
    blowUp(this: Shell, via: TrackSource = "interface") {
      // Deja absente, une seconde explosion repousserait son retour sans rien montrer.
      // Le clic passait par poke(), qui garde deja ; la commande arrive ici en direct.
      if (this.gone) {
        return;
      }

      this.track("slime_boom", { via });
      this.clicks = 0;
      this.gone = true;
      this.mascotPlay("boom");
      clearTimeout(this.reformer);
      this.reformer = setTimeout(
        () => {
          this.gone = false;
          this.mascotPlay("reform");
        },
        REFORM_MIN_MS + Math.random() * REFORM_SPREAD_MS,
      );
    },

    // Une explosion ou un voyage en cours laisserait la mascotte absente, et leur minuteur
    // la rappellerait en pleine nuit : les deux tombent avec le reseau. Vider l'etat
    // courant ouvre aussi la garde des transitions, qui refuse tout jusqu'a son terme.
    doze(this: Shell) {
      clearTimeout(this.sleeper);
      clearTimeout(this.settler);
      clearTimeout(this.reformer);
      clearTimeout(this.returner);
      this.dragging = false;
      this.gone = false;
      this.mascotState = "";
      this.mascotPlay("sleep");
    },

    drag(this: Shell, event: PointerEvent) {
      const { track } = this.$refs;

      if (!this.dragging || !track) {
        return;
      }

      const box = track.getBoundingClientRect(),
        // Plaquee, la mascotte suit encore le curseur en abscisse : elle est retenue, pas
        // figee.
        was = this.at;

      this.place(event.clientX - box.left - this.grabAt);

      // Le sens se lit sur ce que la mascotte a parcouru, pas sur ce que le curseur a
      // parcouru : plaquee, elle ne bouge plus, et sa feuille doit le dire.
      const step = this.at - was;

      // Un glisser franc n'est pas un clic. Le verrou tient jusqu'a la prise suivante :
      // revenir au point de depart n'annule pas le deplacement.
      if (
        Math.hypot(event.clientX - this.grabFrom.x, event.clientY - this.grabFrom.y) > DRAG_STEP
      ) {
        this.dragged = true;
      }

      const next = dragState(event, box, step);

      // Reaffecter la meme feuille remettrait l'animation a sa premiere case : la mascotte
      // paraitrait figee pendant tout le deplacement.
      if (next !== this.mascotState) {
        this.mascotPlay(next);
      }
    },

    // La chute repose la mascotte ailleurs sur sa piste : elle arrive, elle ne saute pas.
    drop(this: Shell) {
      this.place(Math.random() * this.trackWidth());
      this.mascotPlay("drop");
    },

    // Chaque expression porte le nom de sa feuille, et l'ADR 0004 exige qu'une expression sans
    // feuille ramene au repos en coupant ce qui etait en cours. « idle » suit ce chemin :
    // le repos est deja son etat.
    emote(this: Shell, expression?: Expression) {
      this.mascotPlay(expression && MASCOT_STATES.has(expression) ? expression : MASCOT_REST);
    },

    // Un cran dans la chaine. La feuille arrive avant la transition : sans cela, les
    // premieres cases se joueraient sur une image absente.
    async evolve(this: Shell) {
      const step = lookup(CHAIN, this.form);

      if (!step || this.gone || TRANSITIONS.has(this.mascotState)) {
        return;
      }

      await this.loadForm(step.sheet);

      this.becoming = step.next;
      this.form = step.sheet;
      this.mascotState = "";
      this.mascotPlay(step.state);

      if (step.state === "devolve") {
        this.track("slime_boucle", {});
      } else {
        this.track("slime_forme", { forme: step.sheet });
      }
    },

    // La mascotte est retenue dans sa piste. On peut l'y trainer d'un bout a l'autre, mais
    // pas l'en sortir : tirer au-dela d'un bord la plaque contre ce bord.
    grab(this: Shell, event: PointerEvent) {
      // Endormie, elle ne se laisse pas prendre : sans ce refus, drag() la deplacerait
      // encore par place(), et la feuille de sommeil glisserait sur la piste.
      if (this.gone || !this.online) {
        return;
      }

      const node = this.$refs.mascot,
        box = node?.getBoundingClientRect();

      this.grabAt = event.clientX - (box?.left ?? 0);
      this.grabFrom = { x: event.clientX, y: event.clientY };
      this.dragged = false;
      this.dragging = true;
      // La capture porte tout le plaquage : l'etat se lit sur un curseur sorti de la
      // piste, et sans elle le navigateur cesserait de livrer pointermove des la sortie.
      node?.setPointerCapture(event.pointerId);
      this.mascotPlay("grab");
    },

    // La feuille du train fait la paire avec celle de la chute : l'une emmene la
    // mascotte, l'autre la ramene. Un decor vide sans retour serait un piege.
    leave(this: Shell) {
      if (this.gone) {
        return;
      }

      clearTimeout(this.settler);
      this.gone = true;
      clearTimeout(this.returner);
      this.returner = setTimeout(() => {
        this.gone = false;
        this.drop();
      }, AWAY_MS);
    },

    // La feuille d'une forme ne part qu'a la demande : le cube et le pingouin pesent plus que
    // le slime. La construction pose l'adresse sur la piste, et la reecrit comme tout chemin
    // d'actif.
    async loadForm(this: Shell, form: string) {
      if (this.loaded.has(form)) {
        return;
      }

      const source = this.$refs.mascot?.dataset[`sheet${form[0]?.toUpperCase()}${form.slice(1)}`];

      if (!source) {
        throw new Error(`la piste ne declare aucune feuille pour ${form}`);
      }

      this.mascotPlay("load");

      const sheet = new Image();

      sheet.src = source;
      await sheet.decode();
      this.loaded.add(form);
    },

    // Reappliquer une classe ne redemarre pas son animation : il faut la retirer, forcer
    // une relecture de la geometrie, puis la remettre.
    mascotPlay(this: Shell, state: string) {
      const node = this.$refs.mascot;

      if (!node || !MASCOT_STATES.has(state)) {
        return;
      }

      // Explose, le slime ne repond plus : rien ne le rejoue avant qu'il reprenne forme.
      // Une transition de forme tient ses 2,4 s : la frappe, une section, un clic ou un
      // changement de theme la couperaient au milieu. Meme forme de garde que « gone ».
      if (TRANSITIONS.has(this.mascotState) && this.mascotState !== state) {
        return;
      }

      if (this.gone && state !== "boom") {
        return;
      }

      // Le reseau coupe, la mascotte dort et rien ne la reveille : toute autre feuille
      // la sortirait de sa boucle. Meme forme de garde que « gone » au-dessus.
      if (!this.online && state !== "sleep") {
        return;
      }

      node.className = "slime";
      void node.offsetWidth;
      node.className = `slime slime--${state}`;
      this.mascotState = state;

      clearTimeout(this.settler);

      const passe = lookup(HOLD_MS, state);

      if (passe !== undefined) {
        this.settler = setTimeout(() => {
          if (this.mascotState === state) {
            this.settle();
          }
        }, passe + 100);
      }
    },

    // Ce que la coquille sait de la mascotte, et que l'interpreteur ne peut pas deviner.
    mascotStanding(this: Shell): Context["mascot"] {
      // Le sommeil passe devant l'absence : hors reseau, doze() a deja rappele la mascotte
      // et coupe le minuteur qui l'aurait ramenee.
      if (!this.online) {
        return "asleep";
      }

      if (this.gone) {
        return "away";
      }

      return TRANSITIONS.has(this.mascotState) ? "busy" : "here";
    },

    move(this: Shell, motion: string, hold: number) {
      this.motion = motion;
      clearTimeout(this.motionTimer);
      this.motionTimer = setTimeout(() => {
        this.motion = "";
      }, hold);
    },

    // Reaction seulement a proximite : un seuil large donnait un declenchement fantome,
    // curseur encore loin du slime.
    nearby(this: Shell, event: PointerEvent) {
      if (this.dragging || !this.$refs.mascot || this.mascotState !== MASCOT_REST) {
        return;
      }

      const box = this.$refs.mascot.getBoundingClientRect(),
        distance = Math.hypot(
          event.clientX - (box.left + box.width / 2),
          event.clientY - (box.top + box.height / 2),
        );

      if (distance < 60) {
        this.mascotPlay("wink");
      }
    },

    // La position est ecrite directement dans le style : la faire passer par l'etat
    // reactif ferait rerendre la page a chaque image.
    place(this: Shell, x: number) {
      this.at = Math.max(0, Math.min(this.trackWidth(), x));

      const node = this.$refs.mascot;

      if (node) {
        node.style.left = `${this.at}px`;
      }
    },

    poke(this: Shell) {
      // Un clic suit toujours le relachement du pointeur. Trainer la mascotte n'est pas
      // cliquer dessus : sans cette garde, chaque glisser rapprochait l'explosion.
      if (this.dragged) {
        this.dragged = false;

        return;
      }

      // Endormie, elle ne compte pas les clics : sinon l'explosion partirait sans feuille
      // a jouer, et la mascotte disparaitrait jusqu'au retour du reseau.
      if (this.gone || !this.online) {
        return;
      }

      this.clicks += 1;
      this.unlock("expression");

      if (this.clicks >= BOOM_AT) {
        this.blowUp();

        return;
      }

      this.mascotPlay("wink");
    },

    release(this: Shell) {
      if (!this.dragging) {
        return;
      }

      this.dragging = false;
      this.mascotPlay("jump");
    },

    // La veille a la priorite la plus basse : le moindre geste la repousse. Le reseau
    // coupe passe devant : le sommeil tient alors jusqu'a son retour, et aucun geste ne
    // rearme le minuteur.
    rouse(this: Shell) {
      clearTimeout(this.sleeper);

      if (!this.online) {
        return;
      }

      if (this.mascotState === "sleep") {
        this.settle();
      }

      this.sleeper = setTimeout(() => {
        this.mascotPlay("sleep");
      }, SLEEP_MS);
    },

    // La ligne porte son expression : « mise en veille » doit endormir, pas faire cligner.
    // Sans expression, un clin d'oeil, et seulement si la mascotte ne fait rien d'autre.
    say(this: Shell, text: string, expression?: Expression) {
      // Une bulle au-dessus d'une piste vide n'a personne pour la porter.
      if (this.gone) {
        return;
      }

      this.bubble = text;

      if (expression) {
        this.emote(expression);
      } else if (this.mascotState === MASCOT_REST) {
        this.mascotPlay("wink");
      }

      clearTimeout(this.bubbleTimer);
      this.bubbleTimer = setTimeout(() => {
        this.bubble = "";
      }, 2600);
    },

    settle(this: Shell) {
      // Un plaquage tient sa derniere case tant qu'on reste colle. Sans cette sortie, son
      // animationend rendrait le repos au milieu de la prise.
      if (this.dragging) {
        return;
      }

      // Rejouer la mue plutot que la boucler en CSS lui garde le filet de ONE_SHOT_MS :
      // une boucle sans fin n'emet jamais animationend et resterait collee.
      if (this.morphHeld && this.mascotState === "morph") {
        this.mascotPlay("morph");

        return;
      }

      // Le train emmene la mascotte : sa derniere case est un quai vide. Elle n'a donc
      // pas de repos a reprendre, elle est partie.
      if (this.mascotState === "train") {
        this.leave();

        return;
      }

      // La derniere case d'une transition montre deja la forme d'arrivee : il ne reste
      // qu'a la poser, puis a rendre le repos.
      if (TRANSITIONS.has(this.mascotState)) {
        this.form = this.becoming;
        this.becoming = "";
        this.mascotState = "";
        this.mascotPlay(MASCOT_REST);

        return;
      }

      // Hors reseau, le repos de la mascotte est le sommeil. Sans ce choix, la page chargee
      // puis coupee avant le premier rendu la laisserait sans feuille du tout.
      this.mascotPlay(this.online ? MASCOT_REST : "sleep");
    },

    startMascot(this: Shell) {
      this.walker = setInterval(() => {
        this.wander();
      }, 2400);
      this.twitcher = setInterval(() => {
        this.twitch();
      }, TWITCH_MS);
      for (const event of ["pointermove", "keydown", "wheel"]) {
        globalThis.addEventListener(
          event,
          () => {
            this.rouse();
          },
          { passive: true },
        );
      }

      this.rouse();
    },

    // Une passe unique rend la main au repos ; les boucles, elles, ne finissent jamais. « load »
    // boucle sans fin : couper son minuteur sans rendre la main y laisserait la mascotte pour
    // toujours. Passer par settle() rendait aussi la main sur les autres etats, coupant le voyage en train avant son terme.
    stopLoading(this: Shell) {
      if (this.mascotState === "load") {
        this.settle();
      }
    },

    trackWidth(this: Shell) {
      const { track } = this.$refs;

      return track ? Math.max(0, track.clientWidth - SPRITE) : 0;
    },

    // Un clin d'oeil ou un saut de temps en temps, jamais pendant autre chose.
    twitch(this: Shell) {
      if (this.mascotState !== MASCOT_REST || Math.random() >= TWITCH_ODDS) {
        return;
      }

      this.mascotPlay(Math.random() < 0.5 ? "wink" : "jump");
    },

    // La frappe se voit tant qu'on tape, puis la mascotte revient au repos.
    typing(this: Shell) {
      if (this.mascotState !== "type") {
        this.mascotPlay("type");
      }

      clearTimeout(this.typer_rest);
      // Rendre la main seulement si la frappe tient encore l'ecran : une commande a pu
      // demander autre chose entre-temps, « sleep » par exemple.
      this.typer_rest = setTimeout(() => {
        if (this.mascotState === "type") {
          this.settle();
        }
      }, TYPE_REST_MS);
    },

    // Une mascotte endormie ne se promene pas : la balade passe par place(), que la garde
    // de mascotPlay() n'atteint pas.
    wander(this: Shell) {
      if (this.dragging || this.gone || !this.anim || this.reduced || !this.online) {
        return;
      }

      const next = this.at + this.direction * 6;

      if (next <= 0 || next >= this.trackWidth()) {
        this.direction = -this.direction;
        this.move("bump", 500);
      }

      this.place(next);
    },
  });
};
