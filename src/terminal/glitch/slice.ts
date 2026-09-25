// Le glitch : cinq secondes d'affichage corrompu, et les trois gestes qui les declenchent.
//
// La tranche ne porte aucun accesseur : elle ecrit dans l'etat, et le balisage lit l'etat.
// Le texte corrompu fait exception, et pour une raison — voir « glitchStart ».

import { type Beat, type Delay, type Shell, slice } from "../shell.ts";
import { RAIN, corrupt, heatAt, pick } from "./corrupt.ts";
import type { GlitchMode } from "../../interpret.ts";

// Cinq secondes : assez pour croire a la panne, trop court pour inquieter. La fenetre
// separe deux appuis, elle ne borne pas la serie : un rythme regulier arme, une hesitation
// remet a zero.
const GLITCH_MS = 5000;
// La feuille fige le theme permute sur sa derniere image (« both »). Sans cette variable,
// un glitch plus long laisserait les couleurs permutées après sa fin, sans aucune erreur.
const GLITCH_VAR = "--glitch-ms";

export const SHIFT_COUNT = 5;
// La jauge n'apparait qu'au deuxieme appui : au premier elle trahirait l'egg a quiconque
// effleure la touche.
export const GAUGE_AT = 2;

const TAP_WINDOW_MS = 1400;
// Le refus de « sudo » doit se lire avant que l'ecran parte : deux lignes, un silence,
// puis la panne.
const SUDO_MS = 900;
const TICK_MS = 70;
// Un nœud sur quatre reste intact à chaque passe. Tout corrompre d'un bloc donnerait un mur
// illisible. Les nœuds intacts font scintiller le texte au lieu de l'effacer.
const NODE_ODDS = 0.72;
const RAIN_COLUMNS = 30;
const RAIN_LENGTH = 18;
// La chute la plus rapide, et l'ecart au-dessus. Les deux se tirent par colonne.
const RAIN_FALL_MS = 1100;
const RAIN_SPREAD_MS = 900;
// Les regions vivantes sont ecartees : les corrompre ferait lire du charabia a un lecteur
// d'ecran quatorze fois par seconde. Les champs de saisie le sont aussi, sinon la commande
// en cours part avec le reste.
const SPARED =
  'input,textarea,[contenteditable],[aria-live],[role="status"],[role="alert"],[data-no-glitch]';
const stage = () => {
  return document.querySelector("[data-panes]");
};

// Chaque colonne tire sa duree et son retard. Deriver les deux du rang faisait tomber la
// pluie en cascade reguliere, qui se lit comme un balayage et non comme une pluie. Le
// retard est negatif : la colonne est deja en route, sinon les trente entrent ensemble.
const rainColumns = () => {
  return Array.from({ length: RAIN_COLUMNS }, (_, index) => {
    const fall = Math.round(RAIN_FALL_MS + Math.random() * RAIN_SPREAD_MS);

    return {
      glyphs: Array.from({ length: RAIN_LENGTH }, () => {
        return pick(RAIN);
      }).join(""),
      style: `--i:${index};--fall:${fall}ms;--delay:-${Math.round(Math.random() * fall)}ms`,
    };
  });
};

// Ce que le glitch garde dans l'etat du composant. L'etat vit dans app.ts, comme tout le
// reste ; app.ts reprend cette interface pour ne pas declarer les memes champs deux fois.
export interface GlitchState {
  // Les appuis comptes dans la fenetre glissante, de zero a cinq.
  glitchArmed: number;
  glitchBeat: Beat | undefined;
  // Le texte d'origine, noeud par noeud. Il est rendu tel quel a la fin, donc une panne
  // interrompue ne perd rien.
  glitchCache: { node: Text; text: string }[];
  glitchEnd: Delay | undefined;
  // « shift », « matrix » ou « sudo » pendant la panne, vide au repos : un seul champ dit
  // a la fois que le glitch court et ce qui l'a declenche.
  glitchMode: GlitchMode | "";
  glitchRain: { glyphs: string; style: string }[];
  glitchTap: Delay | undefined;
  glitchWait: Delay | undefined;
}

export interface GlitchApi {
  glitchLater(mode: GlitchMode): void;
  glitchShift(): void;
  glitchStart(mode: GlitchMode): void;
  glitchStop(): void;
}

export const glitchSlice = () => {
  return slice<GlitchApi>({
    // « sudo » refuse, puis tombe en panne. L'interpreteur ne pose aucun minuteur : il dit
    // que le glitch vient, la coquille tient le silence entre les deux.
    glitchLater(this: Shell, mode: GlitchMode) {
      clearTimeout(this.glitchWait);
      this.glitchWait = setTimeout(() => {
        this.glitchStart(mode);
      }, SUDO_MS);
    },

    // Cinq appuis sur Shift, le reflexe de qui cherche une console. app.ts rend deja la
    // main quand la frappe vient d'un champ : une majuscule tapee ne compte pas.
    glitchShift(this: Shell) {
      clearTimeout(this.glitchTap);

      const taps = this.glitchMode === "" ? this.glitchArmed + 1 : 0;

      if (taps >= SHIFT_COUNT) {
        this.glitchArmed = 0;
        this.unlock("glitch");
        this.glitchStart("shift");

        return;
      }

      this.glitchArmed = taps;
      this.glitchTap = setTimeout(() => {
        this.glitchArmed = 0;
      }, TAP_WINDOW_MS);
    },

    // Animations coupees ou mouvement reduit : rien ne se corrompt, comme la mascotte
    // disparait au lieu de se figer. Un lecteur d'ecran relirait sinon cinq secondes de
    // charabia sans avoir rien demande.
    glitchStart(this: Shell, mode: GlitchMode) {
      if (!this.anim || this.reduced) {
        return;
      }

      this.glitchStop();
      document.documentElement.style.setProperty(GLITCH_VAR, `${GLITCH_MS}ms`);
      this.glitchMode = mode;
      this.glitchRain = mode === "matrix" ? rainColumns() : [];
      this.blowUp(mode === "shift" ? "interface" : "commande");

      const walker = document.createTreeWalker(stage() ?? document.body, NodeFilter.SHOW_TEXT, {
          acceptNode: (node) => {
            return (node.nodeValue ?? "").trim().length > 1 && !node.parentElement?.closest(SPARED)
              ? NodeFilter.FILTER_ACCEPT
              : NodeFilter.FILTER_REJECT;
          },
        }),
        cache: GlitchState["glitchCache"] = [];

      for (let node = walker.nextNode(); node !== null; node = walker.nextNode()) {
        // SAFETY: « SHOW_TEXT » garantit que le parcours ne rend que des noeuds texte.
        // C'est la declaration de la lib DOM qui ne sait pas l'exprimer.
        cache.push({ node: node as Text, text: node.nodeValue ?? "" });
      }

      this.glitchCache = cache;

      const started = performance.now();

      // Le texte corrompu s'ecrit dans les noeuds, jamais dans l'etat : le deriver d'un
      // etat reactif ferait rerendre les trois volets quatorze fois par seconde.
      this.glitchBeat = setInterval(() => {
        const heat = heatAt(Math.min(1, (performance.now() - started) / GLITCH_MS));

        for (const entry of this.glitchCache) {
          entry.node.nodeValue = Math.random() < NODE_ODDS ? corrupt(entry.text, heat) : entry.text;
        }
      }, TICK_MS);

      this.glitchEnd = setTimeout(() => {
        this.glitchStop();
      }, GLITCH_MS);
    },

    glitchStop(this: Shell) {
      clearInterval(this.glitchBeat);
      clearTimeout(this.glitchEnd);
      // Le minuteur de « sudo » part aussi : sans lui, un /matrix tape dans la seconde qui
      // suit se faisait couper par une panne qu'on croyait annulee.
      clearTimeout(this.glitchWait);

      for (const entry of this.glitchCache) {
        entry.node.nodeValue = entry.text;
      }

      this.glitchCache = [];
      this.glitchMode = "";
      this.glitchRain = [];
    },
  });
};
