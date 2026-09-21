import {
  ACHIEVEMENTS,
  type Achievement,
  type ContentLine,
  type Context,
  type Effect,
  type Expression,
  type Line,
  MAX_SUGGESTIONS,
  type Tone,
  type TrackValue,
  candidates,
  commonPrefix,
  hintFor,
  interpret,
  keepKnown,
  safeTone,
  seenCount,
  wonCount,
} from "./interpret.ts";
import {
  ASK_MS,
  BOOT_CELLS,
  BOOT_MS,
  CHAR_PX,
  COMPACT_MS,
  COMPACT_TICK_MS,
  CONTENT_URL,
  CTX_BUDGET,
  CTX_CELLS,
  CTX_FLOOR,
  EMPTY,
  EXEC_MS,
  FADE_MS,
  OPTS_KEY,
  PANES,
  PANE_GAP_PX,
  RESULT_MIN_PX,
  THEMES,
  TOGGLES,
  TYPE_CPS,
  type ToggleKey,
  VERTICAL,
} from "./terminal/settings.ts";
import {
  AWAY_MS,
  BOOM_AT,
  CHAIN,
  DRAG_STEP,
  HOLD_MS,
  MASCOT_REST,
  MASCOT_STATES,
  MORPH_HOLD_MS,
  REFORM_MIN_MS,
  REFORM_SPREAD_MS,
  SLEEP_MS,
  TRANSITIONS,
  TWITCH_MS,
  TWITCH_ODDS,
  TYPE_REST_MS,
} from "./terminal/mascot/constants.ts";
import { type AchievementsState, achievementsSlice } from "./terminal/achievements/slice.ts";
import { GAUGE_AT, type GlitchState, SHIFT_COUNT, glitchSlice } from "./terminal/glitch/slice.ts";
import type { Magics, TrackSource } from "./terminal/shell.ts";
import type { RadioApi, RadioState } from "./terminal/radio/slice.ts";
import { type Section, barParts, printed, section } from "./terminal/format.ts";
import { readMarks, writeMarks } from "./terminal/achievements/store.ts";

import { dragState } from "./terminal/mascot/drag.ts";
import { lookup } from "./terminal/lookup.ts";
import { mascotSlice } from "./terminal/mascot/slice.ts";
import { windowTop } from "./terminal/suggest.ts";

// Une mission du volet gauche : sa pastille et son etat.
interface Mission {
  dot: Tone;
  id: string;
  label: string;
  state: string;
}

// Une entree de la frise.
interface Step {
  detail?: string | null;
  id: string;
  note: string;
  org: string;
  role: string;
  years: string;
}

// Un domaine de la stack et ses briques.
interface Brick {
  id: string;
  kids: string[];
  label: string;
  note?: string;
}

// La fiche attachee a une techno : ou, quoi, pourquoi.
interface TechNote {
  note: string;
  what?: string;
  where: string;
  why?: string;
}

// Le partage, tel que content.json le decrit.
interface Share {
  targets?: { id: string; kind: string; label: string; url: string }[];
  text?: string;
  title?: string;
  url?: string;
}

// Valeurs figées après itération dans le canvas. Ne pas les transformer en réglages :
// voir design/DECISIONS.md, section 23.

// Alpine vient du script vendu a cote de la page : il n'apporte pas ses types.

const rect = (node: Element) => {
  return node.getBoundingClientRect();
};

declare const Alpine: {
  data: (name: string, factory: () => State) => void;
};

// GoatCounter est charge par une balise script tierce. Son contrat se declare ici, une
// fois : « absent » est un cas normal, un bloqueur suffit a le produire.
interface GoatCounter {
  count?: (vars: { event?: boolean; path: string; title?: string }) => void;
}

// L'API Prompt du navigateur, proposee par le W3C, n'existe que dans Chrome et derriere un contexte securise : « absent » est donc le cas majoritaire, pas une erreur.
// Les types de « @types/dom-chromium-ai » declarent « LanguageModel » toujours present, d'ou le « in globalThis » plutot qu'une comparaison a undefined.
// « topK », « temperature » et « samplingMode » restent hors du contrat : chrome-only ou en essai d'origine.
declare global {
  // eslint-disable-next-line no-var, vars-on-top
  var goatcounter: GoatCounter | undefined;
}

// « responseConstraint » fait rendre du JSON : un identifiant en sort entre guillemets. Le
// comparer tel quel ne trouvait jamais le passage, et la reponse du corpus sortait a chaque
// fois. Un modele qui ignore la contrainte rend du texte brut, qui reste utilisable.
// Un identifiant du corpus n'a ni guillemet ni echappement : retirer la paire suffit, et
// evite de decoder du JSON pour en tirer une chaine. L'identifiant est de toute facon
// cherche dans le corpus, ou un inconnu ne designe rien.
const readChoice = (raw: string) => {
  const trimmed = raw.trim();

  return trimmed.startsWith('"') && trimmed.endsWith('"') ? trimmed.slice(1, -1) : trimmed;
};

// L'attente depassee et le refus ne se reparent pas de la meme facon : l'une demande de
// patienter, l'autre de regarder l'etat du modele.
const askFailure = (cause: unknown) => {
  return cause instanceof DOMException && cause.name === "TimeoutError"
    ? `le modèle local n'a pas répondu en ${ASK_MS / 1000} s.`
    : "le modèle local a refusé de répondre.";
};

// Ce que le stockage rend. Rien n'y est garanti : c'est une entree exterieure, et le canvas
// injectait dans l'etat tout ce qu'il y trouvait.
interface SavedOpts {
  anim?: unknown;
  logH?: unknown;
  out?: unknown;
  theme?: unknown;
}

// Une position, ou un pas : deux nombres qui vont toujours ensemble.
interface Point {
  x: number;
  y: number;
}

type Delay = ReturnType<typeof setTimeout>;

type Beat = ReturnType<typeof setInterval>;

// Ce que la page tient en memoire. Les minuteurs en font partie : les declarer les rend
// visibles. « RadioState » vient de la tranche qui l'emploie, pour ne pas deriver.
interface State extends AchievementsState, GlitchState, RadioState {
  asker: AbortController | undefined;
  bubbleTimer: Delay | undefined;
  compactor: Delay | undefined;
  latency: Delay | undefined;
  morphTimer: Delay | undefined;
  motionTimer: Delay | undefined;
  reformer: Delay | undefined;
  returner: Delay | undefined;
  settler: Delay | undefined;
  booter: Delay | undefined;
  sleeper: Delay | undefined;
  spinner: Beat | undefined;
  ticker: Beat | undefined;
  twitcher: Beat | undefined;
  typer: Beat | undefined;
  typer_rest: Delay | undefined;
  walker: Beat | undefined;
  anim: boolean;
  at: number;
  bubble: string;
  clicks: number;
  commands: string[];
  // Le resultat d'une commande qui l'a reclame. La navigation le reprend.
  commandResult: Section | undefined;
  compacting: boolean;
  bootTick: number;
  compactTick: number;
  dataErr: boolean;
  details: Section[];
  direction: number;
  dragged: boolean;
  dragging: boolean;
  errDetail: string;
  feedback: Record<string, string>;
  focusAt: Record<string, number>;
  grabAt: number;
  grabFrom: Point;
  input: string;
  jokeIndex: number;
  jokes: string[];
  journal: Line[];
  journalOverflows: boolean;
  logH: number;
  missions: Mission[];
  gone: boolean;
  mascotState: string;
  morphHeld: boolean;
  more: { journal: boolean };
  motion: string;
  used: number;
  optsOpen: boolean;
  // La forme affichee, la forme visee pendant une transition, et les feuilles deja tirees.
  // Aucune des trois n'est persistee : chaque visite repart du slime.
  form: string;
  becoming: string;
  loaded: Set<string>;
  modelState: string;
  // Qui a ouvert la modale : le bouton de l'en-tete, ou la saisie via la commande.
  optsReturn: HTMLElement | undefined;
  online: boolean;
  out: boolean;
  pane: string;
  pending: string | undefined;
  power: string;
  profileEmail: string;
  // La tranche de la radio arrive par import dynamique : ce drapeau dit si elle a rejoint
  // le composant, et « radioOn » ne peut valoir vrai qu'apres.
  radioLoaded: boolean;
  // La commande a ete tapee et la radio n'a pas encore ete quittee. Le chunk arrive apres
  // un aller-retour reseau : partir entre-temps ne doit pas la faire s'ouvrir quand meme.
  radioWanted: boolean;
  recallAt: number;
  resizing: { height: number; y: number } | undefined;
  running: boolean;
  // Le modele cherche, et rien n'est encore affiche : sa reponse remplacera l'attente.
  thinking: boolean;
  section: string;
  wantResult: boolean;
  sections: Section[];
  seen: string[];
  share: Share;
  shareTargets: string[];
  stack: Brick[];
  sugg: string[];
  suggAt: number;
  // La liste vient d'etre calculee par une frappe, et non deplacee par une fleche. Seule
  // une liste fraiche s'anime : voir surgir chaque entree revelee par la fenetre qui glisse
  // transformerait un deplacement en clignotement.
  suggFresh: boolean;
  suggFrag: string;
  suggHead: string;
  suggOpen: boolean;
  suggSlash: boolean;
  suggTop: number;
  tech: string;
  techNotes: Record<string, TechNote>;
  theme: string;
  timeline: Step[];
  timelineAt: number;
  typed: string;
}

// Les tranches deja extraites, en un seul endroit. Le type que « this » voit et l'objet
// reellement fusionne en derivent tous les deux : en declarer une sans la fusionner ne
// pouvait etre attrape ni par tsc, ni par le lint, ni par un test unitaire, et cassait la
// page a la premiere utilisation. Cette liste grossit d'une ligne a chaque extraction.
//
// L'etalement est sur ici : une tranche ne porte jamais d'accesseur.
const slices = () => {
  return { ...achievementsSlice(), ...glitchSlice(), ...mascotSlice() };
};

// « RadioApi » n'est pas dans « slices » : sa tranche arrive par import dynamique, une fois
// la commande tapee. Elle rejoint le composant a ce moment, mais « this » la voit des ici.
type Slices = RadioApi & ReturnType<typeof slices>;

// ThisType ajoute les magies au type de « this » sans rien changer au code produit :
// cette fonction est l'identite. L'etat vient de State, le reste du litteral vient de T :
// sans ce partage, un champ initialise a vide prendrait le type du vide.
const withMagics = <T>(
  component: State & T & ThisType<Magics & State & Omit<T, keyof State> & Slices>,
): State & Omit<T, keyof State> => {
  return component;
};

document.addEventListener("alpine:init", () => {
  // Les proprietes sont triees, les methodes suivent un ordre de lecture : chargement,
  // navigation, clavier, options, mascotte, commandes, jamais alphabetique pour ne pas disperser chaque sujet.
  // eslint-disable-next-line sort-keys
  Alpine.data("terminal", () => {
    // eslint-disable-next-line sort-keys
    const component = withMagics({
      ACHIEVEMENTS,
      THEMES,
      TOGGLES,
      achievements: [],
      achievementsOpen: false,
      achievementsReturn: undefined,
      alert: "",
      glitchArmed: 0,
      glitchBeat: undefined,
      glitchCache: [],
      glitchEnd: undefined,
      glitchMode: "",
      glitchRain: [],
      glitchTap: undefined,
      glitchWait: undefined,
      alertCells: [],
      alertLeaving: false,
      alertQueue: [],
      alertTimer: undefined,
      asker: undefined,
      bubbleTimer: undefined,
      compactor: undefined,
      latency: undefined,
      morphTimer: undefined,
      motionTimer: undefined,
      reformer: undefined,
      returner: undefined,
      settler: undefined,
      booter: undefined,
      sleeper: undefined,
      spinner: undefined,
      ticker: undefined,
      twitcher: undefined,
      typer: undefined,
      typer_rest: undefined,
      walker: undefined,
      anim: true,
      at: 0,
      bubble: "",
      clicks: 0,
      commands: [],
      commandResult: undefined,
      compacting: false,
      bootTick: 0,
      compactTick: 0,
      dataErr: false,
      details: [],
      direction: 1,
      dragged: false,
      dragging: false,
      errDetail: "",
      feedback: {},
      focusAt: { main: 0, nav: 0, out: 0 },
      grabAt: 0,
      grabFrom: { x: 0, y: 0 },
      input: "",
      jokeIndex: 0,
      jokes: [],
      journal: [],
      journalOverflows: false,
      logH: 0,
      missions: [],
      gone: false,
      mascotState: "idle",
      morphHeld: false,
      more: { journal: false },
      motion: "",
      used: 0,
      optsOpen: false,
      optsReturn: undefined,
      form: "slime",
      becoming: "",
      loaded: new Set(["slime"]),
      modelState: "unknown",
      online: true,
      out: true,
      pane: "nav",
      pending: undefined,
      power: "boot",
      profileEmail: "",
      radioAudio: "muet",
      radioBars: [],
      radioClock: "0:00",
      radioEngine: undefined,
      radioFrame: undefined,
      radioLoaded: false,
      radioOn: false,
      radioWanted: false,
      radioParams: undefined,
      radioPeaks: [],
      radioRows: [],
      radioSeconds: 0,
      radioSeeds: 0,
      radioSeedText: "",
      radioSizer: undefined,
      radioSlept: false,
      radioTicker: undefined,
      radioTyping: false,
      recallAt: -1,
      resizing: undefined,
      running: false,
      thinking: false,
      section: "whoami",
      wantResult: false,
      sections: [],
      seen: [],
      share: {},
      shareTargets: [],
      stack: [],
      sugg: [],
      suggAt: 0,
      suggFrag: "",
      suggFresh: false,
      suggHead: "",
      suggOpen: false,
      suggSlash: false,
      suggTop: 0,
      tech: "",
      techNotes: {},
      theme: "dark",
      timeline: [],
      timelineAt: 0,
      typed: "",
      get booting() {
        return this.power !== "on";
      },

      get current() {
        return this.commandResult ?? this.open;
      },

      // La sortie appartient a la section ouverte, pas a la derniere commande. Une reponse
      // qui prend le resultat ne doit pas vider le volet de droite.
      get open() {
        return (
          this.all.find((entry: Section) => {
            return entry.id === this.section;
          }) ?? EMPTY
        );
      },

      init() {
        this.restore();
        this.ticker = setInterval(() => {
          this.bootTick += 1;
        }, COMPACT_TICK_MS);
        this.startMascot();
        globalThis.addEventListener("popstate", () => {
          return this.fromHash();
        });
        this.watchNetwork();
        this.learnModel();
        globalThis.addEventListener("resize", () => {
          return this.setLogHeight(this.logHeight);
        });
        this.load();
      },

      items(pane: string) {
        return [
          ...document.querySelectorAll<HTMLElement>(
            `[data-pane="${pane}"] button:not(:disabled), [data-pane="${pane}"] input`,
          ),
        ];
      },

      // Le focus est mémorisé par volet : y revenir repose le curseur où on l'avait
      // laissé, plutôt qu'en tête de liste.
      focusPane(pane: string) {
        const entries = this.items(pane);

        if (entries.length === 0) {
          return;
        }

        this.pane = pane;
        this.focusAt[pane] = Math.min(this.focusAt[pane] ?? 0, entries.length - 1);
        entries[this.focusAt[pane] ?? 0]?.focus();
      },

      movePane(step: number) {
        const next = PANES.indexOf(this.pane) + step;

        if (next >= 0 && next < PANES.length) {
          this.focusPane(PANES[next] ?? "nav");
        }
      },

      moveInPane(step: number) {
        const entries = this.items(this.pane);

        if (entries.length === 0) {
          return;
        }

        this.focusAt[this.pane] = Math.max(
          0,
          Math.min(entries.length - 1, (this.focusAt[this.pane] ?? 0) + step),
        );
        entries[this.focusAt[this.pane] ?? 0]?.focus();
      },

      moveSection(step: number) {
        const ids = this.sections.map((entry) => {
            return entry.id;
          }),
          next = ids.indexOf(this.section) + step;

        if (next >= 0 && next < ids.length) {
          this.goSection(ids[next] ?? "whoami");
        }
      },

      // Une grille se parcourt aux quatre fleches. La stack en compte une par domaine : un pas
      // fixe, deduit de la premiere ligne, changeait de colonne des qu'une ligne etait incomplete
      // ou qu'on passait au domaine suivant. Les lignes se lisent donc sur la position reelle des cellules.
      gridMove(selector: string, key: string) {
        const cells = [...document.querySelectorAll<HTMLElement>(selector)],
          at =
            document.activeElement instanceof HTMLElement
              ? cells.indexOf(document.activeElement)
              : -1;

        if (at === -1 || !VERTICAL.has(key)) {
          return this.rowMove(cells, at, key);
        }

        // SAFETY: « at » vient de cells.indexOf et le cas -1 est sorti juste au-dessus,
        // donc l'index designe une cellule de la liste.
        const from = rect(cells[at] as HTMLElement),
          beyond = cells.filter((cell) => {
            return key === "ArrowDown"
              ? rect(cell).top > from.top + 1
              : rect(cell).top < from.top - 1;
          });

        if (beyond.length === 0) {
          return true;
        }

        // La colonne prime sur la ligne. Une derniere ligne plus courte n'a pas de cellule dans la
        // colonne du curseur : viser la ligne d'a cote le faisait glisser tout a gauche, et les
        // frappes suivantes partaient d'ailleurs. Le curseur saute donc cette ligne pour retrouver sa colonne.
        const inColumn = beyond.filter((cell) => {
          return Math.abs(rect(cell).left - from.left) < 1;
        });

        if (inColumn.length > 0) {
          inColumn
            .reduce((best, cell) => {
              return Math.abs(rect(cell).top - from.top) < Math.abs(rect(best).top - from.top)
                ? cell
                : best;
            })
            .focus();

          return true;
        }

        // Plus rien dans cette colonne : le curseur prend la cellule la plus proche de la
        // premiere ligne atteignable, plutot que de rester sur place.
        const tops = beyond.map((cell) => {
            return rect(cell).top;
          }),
          edge = key === "ArrowDown" ? Math.min(...tops) : Math.max(...tops),
          row = beyond.filter((cell) => {
            return Math.abs(rect(cell).top - edge) < 1;
          });

        row
          .reduce((best, cell) => {
            return Math.abs(rect(cell).left - from.left) < Math.abs(rect(best).left - from.left)
              ? cell
              : best;
          })
          .focus();

        return true;
      },

      // Gauche et droite suivent l'ordre du document : c'est l'ordre de lecture.
      rowMove(cells: HTMLElement[], at: number, key: string) {
        if (at === -1 || (key !== "ArrowLeft" && key !== "ArrowRight")) {
          return false;
        }

        cells[
          Math.max(0, Math.min(cells.length - 1, at + (key === "ArrowRight" ? 1 : -1)))
        ]?.focus();

        return true;
      },

      // Dans une liste a une colonne, la fleche droite valide et descend vers le volet
      // suivant : c'est ce qu'un terminal fait.
      listMove(selector: string, key: string, activate: (at: number) => void) {
        const items = [...document.querySelectorAll<HTMLElement>(selector)],
          at =
            document.activeElement instanceof HTMLElement
              ? items.indexOf(document.activeElement)
              : -1;

        if (at === -1) {
          return false;
        }

        if (key === "ArrowRight") {
          activate(at);

          return true;
        }

        if (key === "ArrowUp" || key === "ArrowDown") {
          items[
            Math.max(0, Math.min(items.length - 1, at + (key === "ArrowDown" ? 1 : -1)))
          ]?.focus();

          return true;
        }

        return false;
      },

      onKey(event: KeyboardEvent) {
        if (event.altKey || event.ctrlKey || event.metaKey) {
          return;
        }

        // Entrée maintenue : le système répète la touche, et le navigateur fabrique un clic
        // par répétition. Valider au clavier envoyait alors dix mesures pour un seul geste.
        // Les flèches gardent leur répétition, qui sert à parcourir une liste.
        if (event.repeat && event.key === "Enter") {
          event.preventDefault();

          return;
        }

        // La touche qui abrege le boot s'arrete la : sans cette sortie, elle partirait
        // aussi dans la saisie, et le visiteur taperait une commande sans le vouloir.
        if (this.skipBoot()) {
          event.preventDefault();

          return;
        }

        // Une modale a son propre clavier. Sans cette garde, les deux gestionnaires
        // traitent la même flèche et le focus s'échappe de la modale.
        if (this.optsOpen || this.achievementsOpen) {
          return;
        }

        // Toute saisie garde ses touches : « j », « k » et « / » s'y tapent, et les flèches
        // y déplacent le curseur. Seule la ligne de commande vide rend la main aux volets.
        // Sans cette garde, le champ de seed devenait impossible à corriger.
        if (event.target instanceof HTMLInputElement) {
          const leaving =
            event.target === this.$refs["cli"] &&
            this.input === "" &&
            (event.key === "ArrowLeft" || event.key === "ArrowRight");

          if (!leaving) {
            return;
          }
        }

        // Cinq appuis sur Shift corrompent l'affichage. La garde ci-dessus laisse deja
        // passer la majuscule tapee dans la ligne de commande : elle ne compte pas.
        if (event.key === "Shift") {
          // Le systeme repete une touche maintenue : sans cette sortie, garder Shift
          // enfonce armait l'egg tout seul en une fraction de seconde.
          if (!event.repeat) {
            this.glitchShift();
          }

          return;
        }

        if (event.key === "/") {
          event.preventDefault();
          this.$refs["cli"]?.focus();

          return;
        }

        if (event.key === "j" || event.key === "k") {
          event.preventDefault();
          this.moveSection(event.key === "j" ? 1 : -1);

          return;
        }

        // Chaque zone a sa logique. La stack est une grille, les sections et la frise
        // sont des listes ou la fleche droite valide, le reste change de volet.
        const handled =
          this.gridMove("[data-tech]", event.key) ||
          this.listMove('[data-ctl="nav"]', event.key, (at) => {
            const items = [...document.querySelectorAll<HTMLElement>('[data-ctl="nav"]')];

            // De gauche a droite : valider une section amene a sa premiere prise (stack, frise), ou a
            // la ligne de commande si elle n'en a pas. L'intention se pose avant le clic : une section
            // deja vue s'affiche sans frappe, et la prise se ferait avant que l'intention soit connue.
            this.wantResult = true;
            items[at]?.click();
          }) ||
          this.listMove('[data-ctl="tl"]', event.key, (at) => {
            return this.openTimeline(at);
          });

        if (handled) {
          event.preventDefault();

          return;
        }

        const fallback = {
          ArrowDown: () => {
            return this.moveInPane(1);
          },
          ArrowLeft: () => {
            return this.movePane(-1);
          },
          ArrowRight: () => {
            return this.movePane(1);
          },
          ArrowUp: () => {
            return this.moveInPane(-1);
          },
        }[event.key];

        if (!fallback) {
          return;
        }

        event.preventDefault();
        fallback();
      },

      // La stack s'arme à la première validation, puis suit le focus. Avant l'armement,
      // aucun texte d'invite ne s'affiche.
      get stackSummary() {
        const bricks = this.stack.reduce((total: number, root: Brick) => {
          return total + root.kids.length;
        }, 0);

        return `${this.stack.length} domaines · ${bricks} briques`;
      },

      get techNote() {
        return this.techNotes[this.tech];
      },

      // La fiche suit le focus des la premiere techno atteinte. Rien ne s'affiche
      // tant qu'aucune n'a le focus, donc aucun texte d'invite au depart.
      followTech(name: string) {
        this.track("techno", { nom: name, via: "interface" });
        this.tech = name;
      },

      // Chaque entree de la frise annonce la commande qui ouvre sa fiche. La commande vient
      // du contenu : la reconstruire ici la ferait mentir au premier renommage.
      missionCue(entry: Step) {
        const detail = this.details.find((item) => {
          return item.id === entry.detail;
        });

        return detail ? `↵ ${detail.cmd}` : "— pas de fiche";
      },

      openTimeline(index: number) {
        this.timelineAt = index;

        const target = this.timeline[index]?.detail;

        if (target) {
          this.track("mission", { nom: target, via: "interface" });
          this.goSection(target);
        }
      },

      // La jauge monte de ce que la sortie a imprime. Pleine, elle "compacte" avec un
      // resume ironique, puis repart a zero.
      get ctxCells() {
        return Math.min(CTX_CELLS, Math.round((this.used / CTX_BUDGET) * CTX_CELLS));
      },

      get ctxPct() {
        return `${Math.min(100, Math.round((this.used / CTX_BUDGET) * 100))}%`;
      },

      // Sans animation, la barre s'affiche pleine : le temps d'attente reste le meme, il
      // ne se raconte simplement plus.
      get compactBar() {
        if (!this.anim || this.reduced) {
          return barParts(CTX_CELLS, CTX_CELLS);
        }

        return barParts(
          (this.compactTick * COMPACT_TICK_MS * CTX_CELLS) / COMPACT_MS,
          CTX_CELLS,
          this.compactTick,
        );
      },

      // La jauge des appuis sur Shift, faite comme celle du contexte. Elle n'apparait
      // qu'au deuxieme appui : au premier elle trahirait l'egg.
      get shiftArming() {
        return this.glitchArmed >= GAUGE_AT;
      },

      get shiftBar() {
        return barParts(this.glitchArmed, SHIFT_COUNT);
      },

      get shiftTail() {
        return `] ${this.glitchArmed}/${SHIFT_COUNT}`;
      },

      // Meme forme que la compaction, memes durees qu'avant : la barre se remplit sur le
      // temps minimum du demarrage, puis attend le contenu, pleine.
      get bootBar() {
        return barParts(
          (this.bootTick * COMPACT_TICK_MS * BOOT_CELLS) / BOOT_MS,
          BOOT_CELLS,
          this.bootTick,
        );
      },

      // La frise et l'arbre n'impriment aucune ligne : leur poids vient de ce qu'ils
      // affichent, sans quoi les deux sections les plus denses coûteraient le minimum.
      weigh(entry: Section) {
        if (entry.view === "timeline") {
          return printed(
            this.timeline.map((item) => {
              return {
                text: `${item.years}${item.org}${item.role}${item.note}`,
              };
            }),
          );
        }

        if (entry.view === "tree") {
          return printed(
            this.stack.map((root) => {
              return {
                text: `${root.label}${root.note ?? ""}${root.kids.join("")}`,
              };
            }),
          );
        }

        return printed(entry.lines);
      },

      // Le journal se redimensionne au glisser, entre 44 px et la place disponible, et sa
      // hauteur est conservée sur l'appareil. « logH » vaut 0 tant que rien n'a ete regle : la
      // hauteur effective doit donc toujours passer par ce getter, sinon un reglage part de zero.
      get logHeight() {
        return this.logH || 120;
      },

      setLogHeight(next: number) {
        this.logH = Math.max(44, Math.min(Math.round(next), this.logRoom()));
        this.persist();
      },

      // La borne haute se mesure sur les freres du journal. Un nombre magique la sous-estimait
      // de pres de cent pixels : le resultat tombait a zero et le volet central debordait.
      logRoom() {
        const { journal } = this.$refs,
          pane = journal?.parentElement;

        if (!pane) {
          return 400;
        }

        const style = globalThis.getComputedStyle(pane),
          inner =
            pane.clientHeight -
            Number.parseFloat(style.paddingTop) -
            Number.parseFloat(style.paddingBottom),
          // Seules les lignes de la colonne comptent : ni les gabarits, ni les reglages
          // masques, ni le calque de balayage qui se superpose au volet.
          rows = [...pane.children].filter((node) => {
            const own = globalThis.getComputedStyle(node);

            return (
              own.display !== "none" && own.position !== "absolute" && own.position !== "fixed"
            );
          }),
          taken = rows
            .filter((node) => {
              return node !== journal && !node.hasAttribute("data-result");
            })
            .reduce((total, node) => {
              return total + node.getBoundingClientRect().height;
            }, 0);

        return Math.max(
          44,
          Math.floor(inner - taken - Math.max(0, rows.length - 1) * PANE_GAP_PX - RESULT_MIN_PX),
        );
      },

      logDown(event: PointerEvent) {
        this.resizing = { height: this.logHeight, y: event.clientY };

        if (event.target instanceof Element) {
          event.target.setPointerCapture(event.pointerId);
        }
      },

      logMove(event: PointerEvent) {
        if (!this.resizing) {
          return;
        }

        this.setLogHeight(this.resizing.height + (this.resizing.y - event.clientY));
      },

      logUp() {
        const before = this.resizing?.height;

        this.resizing = undefined;

        if (before !== undefined && before !== this.logHeight) {
          this.track(
            this.logHeight > before ? "redimensionnement_agrandi" : "redimensionnement_reduit",
            {
              px: this.logHeight,
            },
          );
        }
      },

      // L'indicateur remplace la barre de défilement, masquée pour l'esthétique
      // terminale. Sans lui, rien ne dit qu'il reste du contenu.
      checkMore(name: string) {
        const node = this.$refs[name];

        if (!node) {
          return;
        }

        this.more = {
          ...this.more,
          [name]: node.scrollHeight - node.scrollTop - node.clientHeight > 4,
        };

        if (name === "journal") {
          this.journalOverflows = node.scrollHeight > node.clientHeight + 4;
        }
      },

      bump(cost?: number) {
        if (this.compacting) {
          return;
        }

        this.used += Math.max(CTX_FLOOR, cost ?? 0);

        if (this.used < CTX_BUDGET) {
          return;
        }

        this.compacting = true;
        this.compactTick = 0;
        this.track("contexte_plein", {});

        if (this.anim && !this.reduced) {
          this.spinner = setInterval(() => {
            this.compactTick += 1;
          }, COMPACT_TICK_MS);
        }

        this.journal = [
          ...this.journal,
          {
            c: "warn",
            m: "·",
            mc: "warn",
            t: "fenêtre de contexte pleine (100 %) — compaction automatique…",
          },
        ];
        this.compactor = setTimeout(() => {
          clearInterval(this.spinner);
          this.compacting = false;
          this.used = 0;
          this.track("contexte_libere", {});
          this.journal = [
            ...this.journal,
            {
              c: "fg2",
              m: "·",
              mc: "fg2",
              t: "retenu : Benjamin, développeur IA, Nantes, aime le vélo.",
            },
          ];
        }, COMPACT_MS);
      },

      // Un redemarrage annule la compaction : sinon son resume s'ecrit dans un journal
      // qu'on vient de vider, et sa barre s'affiche par-dessus l'ecran de demarrage.
      stopCompacting() {
        clearInterval(this.spinner);
        clearTimeout(this.compactor);
        this.compacting = false;
        this.compactTick = 0;
      },

      // La radio n'est chargee qu'apres la commande : « radioOn » ne peut valoir vrai que si
      // sa tranche est en place, donc ce test protege aussi l'appel.
      radioStop() {
        this.radioWanted = false;

        if (this.radioOn) {
          this.radioClose();
        }
      },

      // Le code de la radio ne part pas au premier chargement : peu de visiteurs taperont la
      // commande. Sa tranche arrive ici, une fois, et rejoint le composant. Le visiteur peut
      // partir pendant ce telechargement : la radio ne s'ouvre alors plus.
      async radioBoot() {
        this.radioWanted = true;

        if (!this.radioLoaded) {
          const { radioSlice } = await import("./terminal/radio/slice.ts");

          Object.assign(this, radioSlice());
          this.radioLoaded = true;
        }

        if (this.radioWanted) {
          this.radioOpen();
        }
      },

      // Extinction facon CRT, puis la sequence de boot complete.
      powerDown(mode: string) {
        this.stopCompacting();
        this.radioStop();
        this.power = "off";
        setTimeout(
          () => {
            this.journal = [];
            this.seen = [];
            this.used = 0;
            // Une explosion ou un voyage en cours survivait au redemarrage : la mascotte
            // restait absente, et un minuteur de l'ancienne session la ramenait plus tard.
            clearTimeout(this.reformer);
            clearTimeout(this.returner);
            this.gone = false;
            this.power = "boot";
            this.load();
          },
          mode === "shutdown" ? 2200 : 900,
        );
      },

      get outKeyWidth() {
        const keys = this.open.out.lines.map((row: { k: unknown }) => {
          return String(row.k).length;
        });

        return `${Math.max(3, ...keys)}ch`;
      },

      get outStatus() {
        return this.running ? "waiting" : "live";
      },

      // Ce que le volet de sortie annonce. La radio qui joue reprend « live », le mot que
      // la sortie emploie deja : un seul mot pour un seul etat.
      get outLabel() {
        if (!this.radioOn) {
          return this.outStatus;
        }

        return this.radioAudio === "on" ? "live" : this.radioAudio;
      },

      // Le glyphe des deux commandes de lecture. Trois etats, trois signes : le son coupe
      // ne se devinerait pas sous un « ▶ » alors que la musique tourne.
      get radioGlyph() {
        if (this.radioAudio === "muet") {
          return "⊘";
        }

        return this.radioAudio === "on" ? "‖" : "▶";
      },

      // Ce que la commande fera au prochain appui, pour un lecteur d'ecran.
      get radioAction() {
        if (this.radioAudio === "muet") {
          return "Rendre le son — touche m";
        }

        return this.radioAudio === "on" ? "Pause — touche espace" : "Lecture — touche espace";
      },

      // Le point suit ce que la sortie fait vraiment. Une radio en pause n'est pas en
      // ordre, elle attend : elle prend donc le meme ton qu'une commande en vol.
      get outTone() {
        if (this.radioOn) {
          return this.radioAudio === "on" ? "ok" : "warn";
        }

        return this.running ? "warn" : "ok";
      },

      // Reappliquer une classe ne redemarre pas son animation : il faut la retirer, forcer
      // une relecture de la geometrie, puis la remettre.
      mascotPlay(state: string) {
        const node = this.$refs["mascot"];

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

        if (passe) {
          this.settler = setTimeout(() => {
            if (this.mascotState === state) {
              this.settle();
            }
          }, passe + 100);
        }
      },

      // Une passe unique rend la main au repos ; les boucles, elles, ne finissent jamais. « load »
      // boucle sans fin : couper son minuteur sans rendre la main y laisserait la mascotte pour
      // toujours. Passer par settle() rendait aussi la main sur les autres etats, coupant le voyage en train avant son terme.
      stopLoading() {
        if (this.mascotState === "load") {
          this.settle();
        }
      },

      settle() {
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

      // La feuille du train fait la paire avec celle de la chute : l'une emmene la
      // mascotte, l'autre la ramene. Un decor vide sans retour serait un piege.
      leave() {
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

      // La ligne porte son expression : « mise en veille » doit endormir, pas faire cligner.
      // Sans expression, un clin d'oeil, et seulement si la mascotte ne fait rien d'autre.
      say(text: string, expression?: Expression) {
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

      // La chute repose la mascotte ailleurs sur sa piste : elle arrive, elle ne saute pas.
      drop() {
        this.place(Math.random() * this.trackWidth());
        this.mascotPlay("drop");
      },

      // Chaque expression porte le nom de sa feuille, et l'ADR 0004 exige qu'une expression sans
      // feuille ramene au repos en coupant ce qui etait en cours. « idle » suit ce chemin :
      // le repos est deja son etat.
      emote(expression?: Expression) {
        this.mascotPlay(expression && MASCOT_STATES.has(expression) ? expression : MASCOT_REST);
      },

      poke() {
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

      // Le compte repart de zero : le slime peut exploser autant de fois qu'on veut. La feuille
      // d'une forme ne part qu'a la demande, car le cube et le pingouin pesent plus que le slime.
      // L'adresse empruntee est posee par la construction sur la piste, qui la reecrit comme tout chemin d'actif.
      async loadForm(form: string) {
        if (this.loaded.has(form)) {
          return;
        }

        const source =
          this.$refs["mascot"]?.dataset[`sheet${form[0]?.toUpperCase()}${form.slice(1)}`];

        if (!source) {
          throw new Error(`la piste ne declare aucune feuille pour ${form}`);
        }

        this.mascotPlay("load");

        const sheet = new Image();

        sheet.src = source;
        await sheet.decode();
        this.loaded.add(form);
      },

      // Ce que la coquille sait de la mascotte, et que l'interpreteur ne peut pas deviner.
      mascotStanding(): Context["mascot"] {
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

      // Un cran dans la chaine. La feuille arrive avant la transition : sans cela, les
      // premieres cases se joueraient sur une image absente.
      async evolve() {
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

      blowUp(via: TrackSource = "interface") {
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

      // La position est ecrite directement dans le style : la faire passer par l'etat
      // reactif ferait rerendre la page a chaque image.
      place(x: number) {
        this.at = Math.max(0, Math.min(this.trackWidth(), x));

        const node = this.$refs["mascot"];

        if (node) {
          node.style.left = `${this.at}px`;
        }
      },

      move(motion: string, hold: number) {
        this.motion = motion;
        clearTimeout(this.motionTimer);
        this.motionTimer = setTimeout(() => {
          this.motion = "";
        }, hold);
      },

      // Reaction seulement a proximite : un seuil large donnait un declenchement fantome,
      // curseur encore loin du slime.
      nearby(event: PointerEvent) {
        if (this.dragging || !this.$refs["mascot"] || this.mascotState !== MASCOT_REST) {
          return;
        }

        const box = this.$refs["mascot"].getBoundingClientRect(),
          distance = Math.hypot(
            event.clientX - (box.left + box.width / 2),
            event.clientY - (box.top + box.height / 2),
          );

        if (distance < 60) {
          this.mascotPlay("wink");
        }
      },

      // Une mascotte endormie ne se promene pas : la balade passe par place(), que la garde
      // de mascotPlay() n'atteint pas.
      wander() {
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

      // La mascotte est retenue dans sa piste. On peut l'y trainer d'un bout a l'autre, mais
      // pas l'en sortir : tirer au-dela d'un bord la plaque contre ce bord.
      grab(event: PointerEvent) {
        // Endormie, elle ne se laisse pas prendre : sans ce refus, drag() la deplacerait
        // encore par place(), et la feuille de sommeil glisserait sur la piste.
        if (this.gone || !this.online) {
          return;
        }

        const node = this.$refs["mascot"],
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

      drag(event: PointerEvent) {
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

      release() {
        if (!this.dragging) {
          return;
        }

        this.dragging = false;
        this.mascotPlay("jump");
      },

      finishBoot(skipped = false) {
        this.track(skipped ? "boot_saute" : "boot", {});
        clearTimeout(this.booter);
        clearInterval(this.ticker);
        this.power = "fade";
        setTimeout(
          () => {
            this.power = "on";
            // Le demarrage decouvre la mascotte : elle arrive plutot qu'elle n'apparait.
            this.mascotPlay("drop");
          },
          this.reduced ? 0 : FADE_MS,
        );
      },

      // Le boot n'est pas un spectacle obligatoire. Il ne s'abrege que quand le contenu est
      // deja la : l'ecran de panique doit rester, et son bouton doit garder ses touches.
      skipBoot() {
        if (this.power !== "boot" || this.dataErr || this.sections.length === 0) {
          return false;
        }

        this.finishBoot(true);

        return true;
      },

      get reduced() {
        return globalThis.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
      },

      // Le meme seuil que la requete de media qui empile les volets. Les deux doivent
      // changer ensemble : la coquille ne peut pas lire la valeur de la feuille de style.
      get stacked() {
        return globalThis.matchMedia?.("(max-width: 900px)").matches ?? false;
      },

      startMascot() {
        this.walker = setInterval(() => {
          return this.wander();
        }, 2400);
        this.twitcher = setInterval(() => {
          return this.twitch();
        }, TWITCH_MS);
        // La piste bouge avec la mise en page, la mascotte non : sans cette reprise, une
        // fenetre redimensionnee la laisserait hors champ.
        globalThis.addEventListener("resize", () => {
          return this.place(this.at);
        });

        for (const event of ["pointermove", "keydown", "wheel"]) {
          globalThis.addEventListener(
            event,
            () => {
              return this.rouse();
            },
            { passive: true },
          );
        }

        this.rouse();
      },

      // La veille a la priorite la plus basse : le moindre geste la repousse. Le reseau
      // coupe passe devant : le sommeil tient alors jusqu'a son retour, et aucun geste ne
      // rearme le minuteur.
      rouse() {
        clearTimeout(this.sleeper);

        if (!this.online) {
          return;
        }

        if (this.mascotState === "sleep") {
          this.settle();
        }

        this.sleeper = setTimeout(() => {
          return this.mascotPlay("sleep");
        }, SLEEP_MS);
      },

      // Une explosion ou un voyage en cours laisserait la mascotte absente, et leur minuteur
      // la rappellerait en pleine nuit : les deux tombent avec le reseau. Vider l'etat
      // courant ouvre aussi la garde des transitions, qui refuse tout jusqu'a son terme.
      doze() {
        clearTimeout(this.sleeper);
        clearTimeout(this.settler);
        clearTimeout(this.reformer);
        clearTimeout(this.returner);
        this.dragging = false;
        this.gone = false;
        this.mascotState = "";
        this.mascotPlay("sleep");
      },

      // La frappe se voit tant qu'on tape, puis la mascotte revient au repos.
      typing() {
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

      // Un clin d'oeil ou un saut de temps en temps, jamais pendant autre chose.
      twitch() {
        if (this.mascotState !== MASCOT_REST || Math.random() >= TWITCH_ODDS) {
          return;
        }

        this.mascotPlay(Math.random() < 0.5 ? "wink" : "jump");
      },

      // Le systeme a deja tranche : sous mouvement reduit, la bascule des animations ne
      // peut plus rien changer. La laisser active ferait croire le contraire.
      lockedToggle(key: ToggleKey) {
        return key === "anim" && this.reduced;
      },

      value(key: ToggleKey) {
        return this[key] && !this.lockedToggle(key);
      },

      flip(key: ToggleKey) {
        if (this.lockedToggle(key)) {
          return;
        }

        this[key] = !this[key];
        this.track("option", { cle: key, valeur: this[key] });
        this.persist();

        // La boucle de rendu de la radio s'arrete quand l'animation se coupe. Rien ne la
        // rallumerait sans cet appel : le depot ne porte aucun observateur de reglage.
        if (key === "anim" && this.radioOn) {
          this.radioDraw();
        }

        // Le volet de sortie est la seule surface de la radio, et « /radio » le rallume pour
        // cette raison. L'eteindre la laisserait jouer sans rien pour l'arreter.
        if (key === "out" && !this.out) {
          this.radioStop();
        }
      },

      setTheme(id: string, options: { event?: MouseEvent; via?: TrackSource } = {}) {
        const { event, via = "interface" } = options;

        this.track("theme", { nom: id, via });
        this.markTheme(id);

        // Le choix se fait depuis la modale, donc la mue tient jusqu'a sa fermeture. Le
        // marquer ici et non dans apply() : startViewTransition differe le rappel, et une
        // fermeture rapide passerait devant lui.
        clearTimeout(this.morphTimer);
        this.morphHeld = this.optsOpen;

        const apply = () => {
          this.theme = id;
          this.persist();
          this.mascotPlay("morph");
        };

        // Le réglage « animations off » coupe aussi la transition de thème.
        if (!this.anim || !document.startViewTransition) {
          apply();

          return;
        }

        const origin = event?.clientX
          ? { x: event.clientX, y: event.clientY }
          : this.buttonCentre(event);

        document.documentElement.style.setProperty("--vt-x", `${origin.x}px`);
        document.documentElement.style.setProperty("--vt-y", `${origin.y}px`);
        document.startViewTransition(() => {
          return apply();
        });
      },

      // La propagation part de ce que le visiteur a touche : le bouton clique, sinon
      // l'element qui a le focus — la saisie, quand le theme vient de la commande. Un
      // point a zero ferait balayer le cercle depuis le coin haut-gauche.
      buttonCentre(event?: Event) {
        const target = event?.target instanceof Element ? event.target : document.activeElement,
          box = target instanceof Element ? target.getBoundingClientRect() : undefined;

        return box
          ? { x: box.left + box.width / 2, y: box.top + box.height / 2 }
          : { x: window.innerWidth / 2, y: window.innerHeight / 2 };
      },

      themeButtons() {
        return [...document.querySelectorAll<HTMLElement>("[data-opts] [data-theme-choice]")];
      },

      toggleButtons() {
        return [
          ...document.querySelectorAll<HTMLElement>("[data-opts] [data-toggle]:not(:disabled)"),
        ];
      },

      // Le reglage courant se lit sur l'element focalise. Le deduire d'un compteur le
      // desynchronisait des qu'on arrivait par tabulation ou a la souris : le focus
      // etait sur « animations » et la fleche droite modifiait « dense lines ».
      focused() {
        const active = document.activeElement,
          theme = active instanceof HTMLElement ? this.themeButtons().indexOf(active) : -1;

        if (theme !== -1) {
          return { group: "theme", index: theme };
        }

        const toggle = active instanceof HTMLElement ? this.toggleButtons().indexOf(active) : -1;

        return toggle !== -1 ? { group: "toggle", index: toggle } : undefined;
      },

      focusSetting() {
        const active = document.querySelector<HTMLElement>(
          "[data-opts] [data-theme-choice][aria-pressed='true']",
        );

        (active ?? this.themeButtons()[0])?.focus();
      },

      // Les themes sont sur plusieurs lignes : les quatre fleches doivent y naviguer.
      // Les boutons d'une meme ligne partagent leur position verticale.
      themeColumns() {
        const buttons = this.themeButtons(),
          top = buttons[0]?.offsetTop;

        return Math.max(
          1,
          buttons.filter((button) => {
            return button.offsetTop === top;
          }).length,
        );
      },

      moveTheme(index: number) {
        const buttons = this.themeButtons(),
          target = buttons[Math.max(0, Math.min(buttons.length - 1, index))];

        if (!target) {
          return;
        }

        this.setTheme(target.dataset["themeChoice"] ?? "dark");
        this.$nextTick(() => {
          return target.focus();
        });
      },

      optsKey(event: KeyboardEvent) {
        if (event.key === "Escape") {
          event.preventDefault();
          this.closeOpts();

          return;
        }

        if (event.key === "Tab") {
          const focusable = [
              ...document.querySelectorAll<HTMLElement>("[data-opts] [data-ctl='opt']"),
            ],
            at =
              document.activeElement instanceof HTMLElement
                ? focusable.indexOf(document.activeElement)
                : -1,
            next = (at + (event.shiftKey ? -1 : 1) + focusable.length) % focusable.length;

          event.preventDefault();
          focusable[next]?.focus();

          return;
        }

        const here = this.focused();

        if (!here || !["ArrowDown", "ArrowLeft", "ArrowRight", "ArrowUp"].includes(event.key)) {
          return;
        }

        event.preventDefault();

        if (here.group === "theme") {
          const columns = this.themeColumns(),
            step = { ArrowDown: columns, ArrowLeft: -1, ArrowRight: 1, ArrowUp: -columns }[
              event.key
            ],
            next = here.index + (step ?? 0);

          // Sortir de la grille par le bas mene au premier reglage suivant.
          if (next >= this.themeButtons().length) {
            this.toggleButtons()[0]?.focus();
          } else {
            this.moveTheme(next);
          }

          return;
        }

        if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
          this.flip(TOGGLES[here.index]?.key ?? "anim");

          return;
        }

        const next = here.index + (event.key === "ArrowDown" ? 1 : -1);

        if (next < 0) {
          this.focusSetting();
        } else {
          this.toggleButtons()[next]?.focus();
        }
      },

      get themeLabel() {
        return (
          THEMES.find((entry) => {
            return entry.id === this.theme;
          })?.label ?? ""
        );
      },

      get won() {
        return wonCount(this.achievements);
      },

      // Acquis et vu sont deux comptes, et la relance du badge vit entre les deux.
      get unseen() {
        return Math.max(0, this.won - seenCount(this.achievements));
      },

      get badgeLabel() {
        const left = this.unseen === 0 ? "" : `, ${this.unseen} non regardés`;

        return `succès : ${this.won} sur ${ACHIEVEMENTS.length}${left}`;
      },

      // Un succès verrouillé garde son rang et son cadenas. La longueur de son sous-titre
      // vient de sa clé, jamais d'un tirage : recalculé au rendu, il clignoterait.
      get achievementRows() {
        return ACHIEVEMENTS.map((entry: Achievement, index: number) => {
          const done = this.achievements.includes(entry.key);

          return {
            done,
            icon: done ? entry.icon : "locked",
            key: entry.key,
            rank: String(index + 1).padStart(2, "0"),
            title: done ? entry.title : "???",
            trigger: done
              ? entry.trigger
              : Array.from({ length: 1 + (entry.key.length % 3) }, () => {
                  return "???";
                }).join(" "),
          };
        });
      },

      get alerted() {
        return ACHIEVEMENTS.find((entry) => {
          return entry.key === this.alert;
        });
      },

      restore() {
        let saved: SavedOpts = {};

        try {
          // SAFETY: la forme du stockage n'est pas garantie. L'affirmation ne promet rien :
          // SavedOpts ne declare que des « unknown », et chaque cle est verifiee plus bas.
          saved = JSON.parse(globalThis.localStorage.getItem(OPTS_KEY) ?? "{}") as SavedOpts;
        } catch {
          // Un stockage illisible ou refusé ne doit pas empêcher la page de démarrer.
        }

        // Quatre clés, et quatre seulement, chacune verifiee avant d'entrer dans l'etat.
        if (saved.anim === true || saved.anim === false) {
          this.anim = saved.anim;
        }

        if (saved.out === true || saved.out === false) {
          this.out = saved.out;
        }

        if (Number.isFinite(saved.logH)) {
          this.logH = Number(saved.logH);
        }

        // Un thème inconnu vaut un thème absent : la préférence du système tranche.
        this.theme = THEMES.some((entry) => {
          return entry.id === saved.theme;
        })
          ? String(saved.theme)
          : this.preferredTheme();

        // Le catalogue bouge, le stockage non : une clé retirée disparaît sans laisser
        // d'orphelin. Les pages annexes écrivent ici, depuis un autre onglet.
        const stored = readMarks();

        this.achievements = keepKnown(stored);

        // Le nettoyage se réécrit, et ne reste pas en mémoire. « addMark » relit le stockage
        // brut avant d'écrire : sans cette passe, l'orphelin revenait au premier déblocage.
        if (this.achievements.length !== stored.length) {
          writeMarks(this.achievements);
        }
      },

      // Première visite : la page suit la préférence du système. Sans préférence, elle
      // reste sombre, comme un terminal.
      preferredTheme() {
        return globalThis.matchMedia?.("(prefers-color-scheme: light)").matches ? "light" : "dark";
      },

      persist() {
        try {
          globalThis.localStorage.setItem(
            OPTS_KEY,
            JSON.stringify({ anim: this.anim, logH: this.logH, out: this.out, theme: this.theme }),
          );
        } catch {
          // Navigation privée ou stockage plein : le réglage vaut pour cette visite.
        }
      },

      openOpts(via: TrackSource = "interface") {
        this.track("options_ouvertes", { via });
        this.optsReturn =
          document.activeElement instanceof HTMLElement ? document.activeElement : undefined;
        this.optsOpen = true;
        this.$nextTick(() => {
          return this.focusSetting();
        });
      },

      closeOpts() {
        this.optsOpen = false;
        this.$nextTick(() => {
          return (
            this.optsReturn ?? document.querySelector<HTMLElement>("[data-ctl='opts']")
          )?.focus();
        });

        if (!this.morphHeld) {
          return;
        }

        // Fermer au milieu d'une passe n'en montrerait qu'un eclat. Le sursis passe, la
        // passe en cours s'acheve, et settle() rend le repos.
        clearTimeout(this.morphTimer);
        this.morphTimer = setTimeout(() => {
          this.morphHeld = false;
        }, MORPH_HOLD_MS);
      },
      fromHash() {
        const id = globalThis.location.hash.slice(1);

        this.goSection(
          this.all.some((entry) => {
            return entry.id === id;
          })
            ? id
            : "whoami",
          { push: false },
        );
      },

      goSection(id: string, options: { push?: boolean; via?: TrackSource } = {}) {
        const { push = true, via = "interface" } = options;

        if (
          !this.all.some((entry) => {
            return entry.id === id;
          })
        ) {
          return;
        }

        if (push) {
          this.track("section", { id, via });
        }

        // La navigation reprend le resultat : une reponse de commande n'y survit pas.
        this.commandResult = undefined;
        // Le volet de sortie appartient a la section ouverte. La radio le quitte donc, et
        // son contexte audio se ferme plutot que de continuer a tourner sans volet.
        this.radioStop();
        this.section = id;

        if (push && globalThis.location.hash !== `#${id}`) {
          globalThis.history.pushState({}, "", `#${id}`);
        }

        this.play(id, via);

        // « push » distingue la navigation voulue de celle du chargement. Sans lui, arriver
        // sur la page débloquait « je pars à la découverte », et un succès qui s'obtient
        // sans rien faire dévalue les vingt-six autres.
        if (push) {
          this.markSection(id);
        }
        // Une section plus longue que la precedente ne doit pas heriter d'un journal trop
        // haut : le resultat serait coupe des l'ouverture.
        this.$nextTick(() => {
          this.setLogHeight(this.logHeight);
          this.revealResult();
        });
      },

      // La section se tape avant de s'afficher : au tick qui suit le clic, le resultat est
      // encore vide et le focus retomberait sur la ligne de commande. Il attend la frappe.
      takeResult() {
        if (!this.wantResult) {
          return;
        }

        this.wantResult = false;
        this.$nextTick(() => {
          this.focusAt["main"] = 0;
          this.focusPane("main");
        });
      },

      // Sur la colonne empilee, les listes sont sous le volet central. Choisir une section
      // rendait donc le resultat au-dessus de l'ecran, et le visiteur restait sur la liste.
      revealResult() {
        if (!this.stacked) {
          return;
        }

        document.querySelector<HTMLElement>('[data-pane="main"]')?.scrollIntoView({
          behavior: this.anim && !this.reduced ? "smooth" : "auto",
          block: "start",
        });
      },

      get all() {
        return [...this.sections, ...this.details];
      },

      // Première visite : la commande se tape, puis s'exécute. Retour sur une section
      // déjà vue : immédiat, sans quoi l'effet devient une attente.
      play(id: string, via: TrackSource = "interface") {
        const target = this.current.cmd;

        clearInterval(this.typer);
        clearTimeout(this.latency);

        if (this.seen.includes(id)) {
          this.typed = target;
          this.running = false;
          this.stopLoading();
          this.takeResult();

          return;
        }

        // L'ecran de demarrage couvre la mascotte : tirer sa feuille d'attente a ce
        // moment-la chargerait deux feuilles au premier rendu au lieu d'une.
        if (!this.booting) {
          this.mascotPlay("load");
        }

        // Seule une commande tapée consomme la fenêtre. Sans cette garde, un visiteur qui
        // n'a rien tapé atteignait cent pour cent en cliquant les onglets.
        if (via === "commande") {
          this.bump(this.weigh(this.current));
        }

        this.seen = [...this.seen, id];

        if (this.current.suggest) {
          this.input = this.current.suggest;
        }

        this.typed = "";
        this.running = true;

        let typedCount = 0;

        this.typer = setInterval(() => {
          typedCount += 1;
          this.typed = target.slice(0, typedCount);

          if (typedCount < target.length) {
            return;
          }

          clearInterval(this.typer);
          this.latency = setTimeout(() => {
            this.running = false;
            this.settle();
            this.takeResult();
          }, EXEC_MS);
        }, 1000 / TYPE_CPS);
      },

      // La reponse prend la place de la section dans le resultat. La frappe en cours
      // s'arrete : sans cela, le minuteur de « play » reecrirait la commande affichee.
      showResult(raw: string, lines: ContentLine[]) {
        clearInterval(this.typer);
        clearTimeout(this.latency);
        this.typed = raw;
        this.running = false;
        this.commandResult = section({ id: raw, label: raw, lines });
        this.$nextTick(() => {
          return this.setLogHeight(this.logHeight);
        });
      },

      submit() {
        const raw = this.input;

        if (!raw.trim()) {
          return;
        }

        // Une question en vol n'a plus rien a dire des que la commande suivante part. Sans cette
        // coupure, seule une seconde question l'arretait : « clear » vidait le journal, et une
        // question sans trouvaille laissait la precedente repondre par-dessus son refus.
        this.asker?.abort();
        this.asker = undefined;
        this.thinking = false;

        const { effects, lines, result } = interpret(raw, {
          columns: Math.floor((this.$refs["cli"]?.clientWidth ?? 400) / CHAR_PX),
          current: this.current,
          details: this.details,
          feedback: this.feedback,
          jokeIndex: this.jokeIndex,
          jokes: this.jokes,
          mascot: this.mascotStanding(),
          model: this.modelState === "available",
          pending: this.pending,
          sections: this.sections,
          share: this.share,
          shareTargets: this.shareTargets,
          themes: THEMES.map((entry) => {
            return entry.id;
          }),
        });

        this.input = "";
        this.closeSugg();
        this.commands = [
          raw,
          ...this.commands.filter((entry) => {
            return entry !== raw;
          }),
        ];
        this.recallAt = -1;
        this.journal = [...this.journal, ...lines];
        this.$nextTick(() => {
          if (this.$refs["journal"]) {
            this.$refs["journal"].scrollTop = this.$refs["journal"].scrollHeight;
          }
          this.checkMore("journal");
        });
        // Le resultat compte comme le journal : deplacer une reponse ne la rend pas
        // gratuite, et la jauge mesure ce que la commande a produit.
        this.bump(printed(lines) + printed(result ?? []));

        if (result) {
          this.showResult(raw, result);
        }

        this.apply(effects);
        this.unlockFrom(effects);
      },

      // Marquage silencieux : GoatCounter absent ou bloqué ne casse rien.
      // GoatCounter ne transporte aucune donnée libre : les valeurs des propriétés
      // entrent dans le nom de l'événement, sinon « commande » n'aurait qu'un compteur.
      track(event: string, props?: Record<string, TrackValue>) {
        const values = Object.values(props ?? {});
        const path = values.length > 0 ? `${event}:${values.join(",")}` : event;

        try {
          globalThis.goatcounter?.count?.({ event: true, path });
        } catch {
          // Un bloqueur a mange le script : ce n'est pas une panne du portfolio.
        }
      },

      async nativeShare() {
        if (!globalThis.navigator?.share) {
          return;
        }

        try {
          await globalThis.navigator.share({
            text: this.share.text ?? "",
            title: this.share.title ?? "",
            url: this.share.url ?? "",
          });
        } catch {
          // Le visiteur a ferme le menu de partage : ce n'est pas une panne.
        }
      },

      // L'URL est ouverte telle qu'elle a ete construite. La decoder annulerait
      // l'encodage des jetons et pourrait lever une exception sur une sequence
      // pourcent invalide.
      shareTo(effect: { kind: string; url: string }) {
        if (effect.kind === "copy") {
          this.copy(this.share.url ?? "");

          return;
        }

        // Ouvrir un onglet vers LinkedIn sans reseau laisse une page d'erreur du navigateur,
        // et le visiteur croit que le portfolio a casse.
        if (!this.online) {
          this.refuseOffline(
            `ouvrir ${effect.kind}`,
            "« share link » copie l'adresse de cette page, sans réseau.",
          );

          return;
        }

        globalThis.open(effect.url, "_blank", "noopener");
      },

      async copy(text: string) {
        try {
          await globalThis.navigator?.clipboard?.writeText?.(text);
        } catch {
          this.journal = [
            ...this.journal,
            { c: "warn", m: "✗", mc: "warn", t: `copie refusée — ${text}` },
          ];

          return;
        }

        this.say("copié");
      },

      // Trois chemins dans l'ordre : marquage GoatCounter, puis appel direct, puis
      // mailto. Le texte est le nom de l'événement : GoatCounter ne transporte aucune
      // donnée libre.
      async send(text: string) {
        this.pending = undefined;

        const feedback = this.feedback ?? {};

        if (globalThis.goatcounter?.count) {
          this.track(text);
          this.journal = [
            ...this.journal,
            { c: "ok", m: "✓", mc: "ok", t: "proposition envoyée. merci." },
          ];

          return;
        }

        try {
          const response = await fetch(
            `${feedback.host}/count?p=${encodeURIComponent(text)}&e=true`,
          );

          if (!response.ok) {
            throw new Error(String(response.status));
          }

          this.journal = [
            ...this.journal,
            { c: "ok", m: "✓", mc: "ok", t: "proposition envoyée. merci." },
          ];
        } catch {
          globalThis.open(
            `mailto:${feedback.fallbackEmail}?subject=Proposition&body=${encodeURIComponent(text)}`,
          );
          this.journal = [
            ...this.journal,
            {
              c: "fg2",
              m: "·",
              mc: "fg2",
              t: "envoi direct impossible — votre client de courrier prend le relais.",
            },
          ];
        }
      },

      // Le modele local choisit un identifiant dans une liste fermee, jamais du texte libre :
      // cela evite d'inventer sur le parcours de Benjamin, et rattrape les recherches par
      // mots qui ratent un passage reformule. « lexical » n'arrive que si l'interpreteur a garde sa reponse pour laisser le modele choisir ; elle sort telle quelle des qu'il echoue, refuse ou tarde.
      async answerWithModel(query: string, candidateIds: string[], lexical?: Line[]) {
        if (lexical === undefined || !("LanguageModel" in globalThis)) {
          return;
        }

        const asker = new AbortController();

        this.asker = asker;
        this.thinking = true;

        // Une session fermee de travers ne doit pas faire repasser la question par le repli :
        // la reponse est deja affichee, elle sortirait deux fois.
        let answered = false;

        try {
          const session = await LanguageModel.create({
            // La question et les passages sont en francais. Le declarer laisse le navigateur
            // refuser tout de suite plutot que de repondre depuis un modele d'une autre langue.
            expectedInputs: [{ languages: ["fr"], type: "text" }],
            signal: AbortSignal.any([asker.signal, AbortSignal.timeout(ASK_MS)]),
          });

          try {
            const choice = await session.prompt(this.askPrompt(query, candidateIds), {
              responseConstraint: { enum: candidateIds, type: "string" },
              signal: AbortSignal.any([asker.signal, AbortSignal.timeout(ASK_MS)]),
            });

            this.showAskChoice(readChoice(choice), lexical, asker);
            answered = true;
          } finally {
            session.destroy();
          }
        } catch (error) {
          // Le modele muet, refuse ou trop lent ne doit pas laisser la question sans reponse :
          // celle du corpus la remplace, sauf si une autre question a deja pris sa place. Son
          // echec se dit aussi : « rien ne repond » et « le modele a lache » se lisaient pareil, et menaient a chercher le defaut du mauvais cote.
          if (!answered && this.asker === asker) {
            this.journal = [
              ...this.journal,
              { c: "warn", m: "✗", mc: "warn", t: askFailure(error) } satisfies Line,
              ...lexical,
            ];
          }
        } finally {
          // La question coupee n'eteint pas l'attente de celle qui l'a remplacee.
          if (this.asker === asker) {
            this.thinking = false;
          }
        }
      },

      // « m-transway » ne dit rien de ce que la mission couvre. Sans le texte en face, le
      // modele choisit sur la forme de l'identifiant, et perd l'avantage qu'il avait sur le
      // recouvrement de mots. La contrainte de reponse, elle, reste sur les identifiants.
      askPrompt(query: string, candidateIds: string[]) {
        const corpus = [...this.sections, ...this.details],
          topics = candidateIds.map((id) => {
            const found = corpus.find((entry) => {
              return entry.id === id;
            });

            return `${id} : ${found?.label ?? id} — ${found?.ask ?? ""}`;
          });

        return [
          `Question : « ${query} ».`,
          "Voici les sujets de ce portfolio, chacun précédé de son identifiant.",
          ...topics,
          "Réponds uniquement par l'identifiant du sujet qui répond le mieux.",
        ].join("\n");
      },

      // Le choix du modele designe un passage du corpus, et c'est ce passage qui s'affiche.
      // Un identifiant inconnu ne designe rien : la reponse du corpus reprend la main.
      showAskChoice(id: string, lexical: Line[], asker: AbortController) {
        if (this.asker !== asker) {
          return;
        }

        const found = [...this.sections, ...this.details].find((entry) => {
          return entry.id === id;
        });

        this.journal =
          !found || (found.ask ?? "") === ""
            ? [...this.journal, ...lexical]
            : [
                ...this.journal,
                { c: "fg", m: "✓", mc: "ok", t: found.label } satisfies Line,
                { c: "fg", m: " ", mc: "fg2", t: found.ask ?? "" } satisfies Line,
              ];
      },

      // « availability » est asynchrone, l'interpreteur ne l'est pas : sans cette lecture au
      // demarrage, la premiere question partirait en croyant qu'aucun modele n'est la.
      async learnModel() {
        if (!("LanguageModel" in globalThis)) {
          return;
        }

        try {
          this.modelState = await LanguageModel.availability();
        } catch {
          // Un refus au demarrage laisse « unknown » : « ask » repond alors sans modele,
          // ce qui est le comportement sans API.
        }
      },

      // « hors ligne » sans se tromper, et « en ligne » avec optimisme : c'est le sens
      // utile ici, puisque la page ne sert qu'a refuser une commande vouee a l'echec.
      watchNetwork() {
        this.online = globalThis.navigator?.onLine ?? true;
        globalThis.addEventListener("online", () => {
          this.online = true;
          this.rouse();
        });
        globalThis.addEventListener("offline", () => {
          this.online = false;
          this.doze();
        });

        if (!this.online) {
          this.doze();
        }
      },

      // Le site entier tient en memoire une fois charge : seules les commandes qui partent
      // ailleurs cassent. Le refus les nomme, et il nomme ce qui marche encore.
      refuseOffline(what: string, instead: string) {
        this.journal = [
          ...this.journal,
          { c: "warn", m: "✗", mc: "warn", t: `${what} demande le réseau, et il est coupé.` },
          { c: "fg2", m: "·", mc: "fg2", t: instead },
        ];
      },

      // La coquille applique ce que l'interpréteur décrit. Les effets des tickets à
      // venir sont ignorés ici plutôt que simulés.
      apply(effects: Effect[]) {
        // Trouver un easter egg vaut une celebration, mais plusieurs disent deja une
        // expression : le but ne se joue que si rien d'autre ne bouge la mascotte, sinon il
        // s'ecraserait aussitot. Il se joue apres la boucle, pour ne pas dependre de l'ordre des effets.
        const found = effects.some((effect) => {
            return effect.type === "track" && effect.event === "easter_egg";
          }),
          moved = effects.some((entry) => {
            return ["activity", "blowUp", "drop", "emote", "say"].includes(entry.type);
          }),
          // Une commande qui a liste son usage n'a rien fait : lire l'aide ne se celebre pas.
          listed = effects.some((entry) => {
            return entry.type === "usage";
          });

        for (const effect of effects) {
          if (effect.type === "track") {
            this.track(effect.event, effect.props);
          } else if (effect.type === "pending") {
            this.pending = effect.payload;
            this.input = effect.answer ?? "";
          } else if (effect.type === "ask") {
            this.answerWithModel(effect.query, effect.candidates, effect.lexical);
          } else if (effect.type === "send") {
            if (this.online) {
              this.send(effect.payload);
            } else {
              this.refuseOffline(
                "envoyer une proposition",
                "« mail » copie mon adresse, elle partira au retour du réseau.",
              );
            }
          } else if (effect.type === "share") {
            this.shareTo(effect);
          } else if (effect.type === "shareMenu") {
            this.nativeShare();
          } else if (effect.type === "email") {
            this.copy(this.profileEmail);
          } else if (effect.type === "sendMail") {
            globalThis.open(`mailto:${encodeURIComponent(this.profileEmail)}`);
          } else if (effect.type === "cv") {
            // Un nouvel onglet : le terminal reste ouvert derriere, avec son journal.
            globalThis.open("texte.html", "_blank", "noopener");
          } else if (effect.type === "say") {
            this.say(effect.text, effect.expression);
          } else if (effect.type === "emote") {
            this.emote(effect.expression);
          } else if (effect.type === "drop") {
            this.drop();
          } else if (effect.type === "blowUp") {
            this.blowUp("commande");
          } else if (effect.type === "activity") {
            this.mascotPlay(effect.name);
          } else if (effect.type === "navigate") {
            this.goSection(effect.id, { via: "commande" });
          } else if (effect.type === "clear") {
            this.journal = [];
          } else if (effect.type === "replay") {
            this.journal = [];
            this.commandResult = undefined;
            this.seen = this.seen.filter((entry) => {
              return entry !== this.section;
            });
            this.play(this.section, "commande");
          } else if (effect.type === "state") {
            Object.assign(this, effect.patch);
          } else if (effect.type === "power") {
            this.powerDown(effect.mode);
          } else if (effect.type === "theme") {
            this.setTheme(effect.name, { via: "commande" });
          } else if (effect.type === "evolve") {
            void this.evolve();
          } else if (effect.type === "options") {
            this.openOpts("commande");
          } else if (effect.type === "radio") {
            void this.radioBoot();
          } else if (effect.type === "glitch") {
            // « sudo » laisse lire son refus avant de tomber en panne ; « matrix » part
            // avec sa ligne.
            if (effect.mode === "sudo") {
              this.glitchLater(effect.mode);
            } else {
              this.glitchStart(effect.mode);
            }
          }
        }

        if (found && !moved && !listed) {
          this.mascotPlay("goal");
        }
      },

      suggest() {
        const result = candidates(this.input, {
          details: this.details,
          model: this.modelState === "available",
          sections: this.sections,
          shareTargets: this.shareTargets,
          themes: THEMES.map((entry) => {
            return entry.id;
          }),
        });

        this.sugg = result.hits;
        this.suggFrag = result.frag;
        this.suggHead = result.head;
        this.suggSlash = result.slash;
        this.suggAt = 0;
        this.suggTop = 0;
        this.suggFresh = true;
        this.suggOpen = result.hits.length > 0 && this.input !== "";
      },

      // Le nom d'une proposition n'apprend rien a lui seul. La ligne suit la selection,
      // et se tait quand la proposition vient du contenu : son identifiant se lit deja.
      get suggHint() {
        return hintFor(this.suggHead, this.sugg[this.suggAt] ?? "");
      },

      // Dix propositions a l'ecran, sur une liste qui peut etre plus longue. La fenetre
      // glisse sous la selection au lieu de couper la liste : une proposition tapable
      // reste atteignable a la fleche.
      get suggWindow() {
        return this.sugg.slice(this.suggTop, this.suggTop + MAX_SUGGESTIONS);
      },

      // La fermeture reste déterministe : la liste se vide, sans compteur de génération
      // qui pourrait annuler le vidage au lieu de le protéger.
      closeSugg() {
        this.suggOpen = false;
        this.sugg = [];
        this.suggAt = 0;
        this.suggTop = 0;
      },

      rebuild(word: string) {
        const prefix = this.suggSlash ? "/" : "";

        return this.suggHead ? `${prefix}${this.suggHead} ${word}` : `${prefix}${word}`;
      },

      // La liste se rouvre sur le mot suivant : une commande completee qui attend un
      // argument montre ce qu'elle attend, sans qu'on ait a taper une lettre pour le voir.
      applySugg(index: number) {
        this.input = `${this.rebuild(this.sugg[index] ?? "")} `;
        this.closeSugg();
        this.suggest();
        this.$refs["cli"]?.focus();
      },

      // Le doigt valide en un geste : la proposition part sans passer par la touche
      // entree. Un premier mot qui attend un argument ouvre sa liste, sinon la commande
      // partirait incomplete.
      pickSugg(index: number, pointer: PointerEvent) {
        this.applySugg(index);

        if (pointer.pointerType !== "touch") {
          return;
        }

        // Une liste rouverte veut dire que la commande attend encore un mot, a n'importe
        // quel niveau. Ne regarder que le premier mot laissait partir « slime expression ».
        if (this.suggOpen) {
          return;
        }

        this.submit();
      },

      complete() {
        if (this.sugg.length === 0) {
          return;
        }

        this.unlock("tab");

        // Une proposition choisie a la fleche doit s'appliquer telle quelle : c'est
        // pour cela qu'on l'a choisie.
        if (this.sugg.length === 1 || this.suggAt > 0) {
          this.applySugg(this.suggAt);

          return;
        }

        const shared = commonPrefix(this.sugg);

        // Tant que le prefixe commun avance, il avance : c'est ce que Tab sait faire de
        // moins arbitraire.
        if (shared.length > this.suggFrag.length) {
          this.input = this.rebuild(shared);
          this.suggOpen = true;

          return;
        }

        // Plus rien a gagner. La liste montre deja une ligne en avant, et refuser de la
        // prendre laissait Tab sans effet : « / » met « /slime » en tete, la tabulation
        // n'en faisait rien. Ce que la liste designe, Tab l'applique.
        this.applySugg(this.suggAt);
      },

      up() {
        if (this.suggOpen) {
          this.suggAt = (this.suggAt - 1 + this.sugg.length) % this.sugg.length;
          this.suggTop = windowTop(this.suggTop, this.suggAt, MAX_SUGGESTIONS);
          this.suggFresh = false;
        } else {
          this.recall(-1);
        }
      },

      down() {
        if (this.suggOpen) {
          this.suggAt = (this.suggAt + 1) % this.sugg.length;
          this.suggTop = windowTop(this.suggTop, this.suggAt, MAX_SUGGESTIONS);
          this.suggFresh = false;
        } else {
          this.recall(1);
        }
      },

      // La fleche droite valide la proposition choisie, comme la tabulation. Curseur
      // deja en fin de ligne, elle n'a rien d'autre a faire.
      right(event: KeyboardEvent) {
        if (!this.suggOpen) {
          return;
        }

        event.preventDefault();
        this.complete();
      },

      onEscape() {
        if (this.suggOpen) {
          this.closeSugg();
        } else {
          this.input = "";
        }
      },

      // La première flèche haut rappelle la commande de la section, puis l'historique.
      // La commande de section n'arrive en tete que tant que rien n'a ete tape : c'est
      // « la premiere fois dans une section » du journal de conception, pas toujours.
      recall(step: number) {
        const pool =
            this.commands.length > 0 ? [...this.commands, this.current.cmd] : [this.current.cmd],
          next = Math.min(pool.length - 1, Math.max(-1, this.recallAt - step));

        this.recallAt = next;
        this.input = next < 0 ? "" : pool[next];

        // Une fleche qui ne ramene rien n'a rien rappele : la ligne vide ne compte pas.
        if (next >= 0) {
          this.unlock("history");
        }
      },

      // Distant d'abord, local ensuite. Le repli n'est pas un luxe : la page dependrait
      // sinon de la disponibilite de GitHub pour afficher quoi que ce soit.
      async fetchContent() {
        const response = await fetch(CONTENT_URL);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        return response.json();
      },

      async load() {
        this.dataErr = false;
        const started = performance.now();

        try {
          const content = await this.fetchContent();

          if (!Array.isArray(content.sections) || content.sections.length === 0) {
            throw new Error("sections manquantes ou vides");
          }

          this.sections = content.sections.map(section);
          this.details = (content.details ?? []).map(section);
          this.jokes = content.jokes ?? [];
          this.share = content.share ?? {};
          this.share.url = globalThis.location.origin + globalThis.location.pathname;
          this.feedback = content.feedback ?? {};
          this.profileEmail = content.profile?.email ?? "";
          this.shareTargets = (content.share?.targets ?? []).map((entry: { id: string }) => {
            return entry.id;
          });
          this.timeline = content.timeline ?? [];
          this.stack = content.stack ?? [];
          this.techNotes = content.techNotes ?? {};
          this.missions = (content.missions ?? []).map((raw: Record<string, string>) => {
            return {
              dot: safeTone(raw.dot, "ok"),
              id: raw.id,
              label: raw.label,
              state: raw.state ?? "",
            };
          });
        } catch (error) {
          // Le boot reste affiché : la page ne se rabat jamais sur un contenu figé.
          this.errDetail = `caused by: ${error instanceof Error ? error.message : String(error)}`;
          this.dataErr = true;

          return;
        }

        this.fromHash();

        const waited = performance.now() - started;

        // Le plancher tombe quand le visiteur demande moins de mouvement : il ne reste que
        // le temps de charger le contenu.
        this.booter = setTimeout(
          () => {
            return this.finishBoot();
          },
          Math.max(0, (this.reduced ? 0 : BOOT_MS) - waited),
        );
      },
    });

    // Les tranches entrent par leurs descripteurs, jamais par un etalement, qui appellerait
    // les accesseurs et figerait leur valeur ; « reduced » a false laisserait tourner les
    // animations chez qui demande moins de mouvement. Une methode oubliee dans le litteral perd contre la tranche : c'est le code neuf qui gagne.
    return Object.defineProperties(component, Object.getOwnPropertyDescriptors(slices()));
  });
});
