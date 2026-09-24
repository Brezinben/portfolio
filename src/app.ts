import {
  ACHIEVEMENTS,
  type Achievement,
  type ContentLine,
  type Effect,
  GLOBAL_GROUPS,
  type GlobalEntry,
  type Line,
  MAX_SUGGESTIONS,
  type PowerMode,
  type Tone,
  type TrackValue,
  candidates,
  commonPrefix,
  ghostFor,
  hintFor,
  interpret,
  rankHits,
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
  GLOBAL_LIMIT,
  PANE_GAP_PX,
  RESULT_MIN_PX,
  THEMES,
  TOGGLES,
  TYPE_CPS,
} from "./terminal/settings.ts";
import { type AchievementsState, achievementsSlice } from "./terminal/achievements/slice.ts";
import type { Beat, Delay, Magics, TrackSource } from "./terminal/shell.ts";
import { GAUGE_AT, type GlitchState, SHIFT_COUNT, glitchSlice } from "./terminal/glitch/slice.ts";
import { type GlobalSearchState, globalSearchSlice } from "./terminal/global-search/slice.ts";
import { type KeyboardState, keyboardSlice } from "./terminal/keyboard/slice.ts";
import { type MascotState, mascotSlice } from "./terminal/mascot/slice.ts";
import { type OptionsState, optionsSlice } from "./terminal/options/slice.ts";
import type { RadioApi, RadioState } from "./terminal/radio/slice.ts";
import { type Section, barParts, printed, section } from "./terminal/format.ts";
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
  // oxlint-disable-next-line no-var, vars-on-top
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

// Ce que la page tient en memoire. Les minuteurs en font partie : les declarer les rend
// visibles. « RadioState » vient de la tranche qui l'emploie, pour ne pas deriver.
interface State
  extends
    AchievementsState,
    GlitchState,
    GlobalSearchState,
    KeyboardState,
    MascotState,
    OptionsState,
    RadioState {
  asker: AbortController | undefined;
  compactor: Delay | undefined;
  latency: Delay | undefined;
  booter: Delay | undefined;
  spinner: Beat | undefined;
  ticker: Beat | undefined;
  anim: boolean;
  reducedMotion: boolean;
  commands: string[];
  // Le resultat d'une commande qui l'a reclame. La navigation le reprend.
  commandResult: Section | undefined;
  compacting: boolean;
  bootTick: number;
  compactTick: number;
  dataErr: boolean;
  details: Section[];
  errDetail: string;
  feedback: Record<string, string>;
  input: string;
  jokeIndex: number;
  jokes: string[];
  journal: Line[];
  journalOverflows: boolean;
  logH: number;
  missions: Mission[];
  more: { journal: boolean };
  used: number;
  modelState: string;
  // Qui a ouvert la modale : le bouton de l'en-tete, ou la saisie via la commande.
  online: boolean;
  out: boolean;
  pending: string | undefined;
  power: "boot" | "fade" | "off" | "on";
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
  return {
    ...achievementsSlice(),
    ...glitchSlice(),
    ...globalSearchSlice(),
    ...keyboardSlice(),
    ...mascotSlice(),
    ...optionsSlice(),
  };
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
      globalAt: 0,
      globalIndexed: [],
      globalOpen: false,
      globalQuery: "",
      globalReturn: undefined,
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
      reducedMotion: globalThis.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false,
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
      shortcuts: true,
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
        // La préférence peut changer en cours de visite. Sans cette écoute, la mascotte et
        // le glitch l'ignoraient jusqu'au rechargement.
        globalThis
          .matchMedia?.("(prefers-reduced-motion: reduce)")
          .addEventListener("change", (event) => {
            this.reducedMotion = event.matches;
          });
        this.restore();
        this.ticker = setInterval(() => {
          this.bootTick += 1;
        }, COMPACT_TICK_MS);
        this.startMascot();
        this.watchNetwork();
        void this.learnModel();
        void this.load();
      },

      // Une grille à flèches n'a qu'un arrêt de tabulation : la brique suivie, sinon la
      // première.
      get techStop() {
        const names: string[] = this.stack.flatMap((root: Brick) => {
          return root.kids;
        });

        return names.includes(this.tech) ? this.tech : (names[0] ?? "");
      },

      get modalOpen(): boolean {
        return this.optsOpen || this.achievementsOpen || this.globalOpen;
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
      powerDown(mode: PowerMode) {
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
            void this.load();
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

      get reduced(): boolean {
        return this.reducedMotion;
      },

      // Le meme seuil que la requete de media qui empile les volets. Les deux doivent
      // changer ensemble : la coquille ne peut pas lire la valeur de la feuille de style.
      get stacked() {
        return globalThis.matchMedia?.("(max-width: 900px)").matches ?? false;
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
        const left =
          this.unseen === 0 ? "" : `, ${this.unseen} non regardé${this.unseen > 1 ? "s" : ""}`;

        return `succès : ${this.won} sur ${ACHIEVEMENTS.length}${left}`;
      },

      // Un succès verrouillé garde son rang et son cadenas. La longueur de son sous-titre
      // vient de sa clé, jamais d'un tirage : recalculé au rendu, il clignoterait.
      get achievementRows() {
        return ACHIEVEMENTS.map((entry: Achievement, index: number) => {
          const done: boolean = this.achievements.includes(entry.key);

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

      get globalHits() {
        return rankHits(this.globalQuery, this.globalIndexed, GLOBAL_LIMIT);
      },

      get globalGhost() {
        return ghostFor(this.globalQuery, this.globalHits);
      },

      get globalSaid() {
        const found = this.globalHits.length;

        if (this.globalQuery.trim() === "") {
          return "";
        }

        return found === 0 ? "aucune trouvaille" : `${found} trouvaille${found > 1 ? "s" : ""}`;
      },

      // Les groupes se decoupent dans l'ordre des trouvailles, jamais dans l'ordre declare :
      // sinon la fleche du bas et l'oeil ne parcourent pas la meme liste. « GLOBAL_GROUPS »
      // n'apporte plus ici que le libelle et l'etiquette.
      get globalGroups() {
        // L'annotation casse la circularite : sans elle, TypeScript deduit l'accesseur depuis
        // le litteral qui le contient, et rend « any ».
        const found: GlobalEntry[] = this.globalHits,
          groups: {
            kind: string;
            label: string;
            rows: { at: number; hit: GlobalEntry }[];
            tag: string;
          }[] = [];

        found.forEach((hit, at) => {
          const open = groups.at(-1);

          if (open?.kind === hit.kind) {
            open.rows.push({ at, hit });

            return;
          }

          const declared = GLOBAL_GROUPS.find((group) => {
            return group.kind === hit.kind;
          });

          groups.push({
            kind: hit.kind,
            label: declared?.label ?? hit.kind,
            rows: [{ at, hit }],
            tag: declared?.tag ?? hit.kind,
          });
        });

        return groups;
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
          this.focusAt.main = 0;
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

        if ((this.current.suggest ?? "") !== "") {
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
          this.setLogHeight(this.logHeight);
        });
      },

      submit(options: { typed?: boolean } = {}) {
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
          columns: Math.floor((this.$refs.cli?.clientWidth ?? 400) / CHAR_PX),
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
          if (this.$refs.journal) {
            this.$refs.journal.scrollTop = this.$refs.journal.scrollHeight;
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
        this.unlockFrom(effects, { typed: options.typed ?? true });
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
        if (!("share" in navigator)) {
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
          void this.copy(this.share.url ?? "");

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
        // La bulle n'est montee qu'avec son texte : elle n'annonce rien. Le journal, lui,
        // est une region live toujours presente.
        this.journal = [...this.journal, { c: "ok", m: "✓", mc: "ok", t: "copié" }];
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
          // Le vocabulaire porte « ask » ou « ask✨ », jamais les deux. L'index se refait, sinon
          // la recherche globale garderait le nom d'avant la detection.
          this.reindexGlobal();
        } catch {
          // Un refus au demarrage laisse « unknown » : « ask » repond alors sans modele,
          // ce qui est le comportement sans API.
        }
      },

      // « hors ligne » sans se tromper, et « en ligne » avec optimisme : c'est le sens
      // utile ici, puisque la page ne sert qu'a refuser une commande vouee a l'echec.
      watchNetwork() {
        this.setOnline(globalThis.navigator?.onLine ?? true);
      },

      setOnline(online: boolean) {
        this.online = online;

        if (online) {
          this.rouse();
        } else {
          this.doze();
        }
      },

      // La piste bouge avec la mise en page, la mascotte non : sans cette reprise, une
      // fenetre redimensionnee la laisserait hors champ. Le journal recale sa hauteur.
      onResize() {
        this.setLogHeight(this.logHeight);
        this.place(this.at);
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
          switch (effect.type) {
            case "track": {
              this.track(effect.event, effect.props);

              break;
            }
            case "pending": {
              this.pending = effect.payload;
              this.input = effect.answer ?? "";

              break;
            }
            case "ask": {
              void this.answerWithModel(effect.query, effect.candidates, effect.lexical);

              break;
            }
            case "send": {
              if (this.online) {
                void this.send(effect.payload);
              } else {
                this.refuseOffline(
                  "envoyer une proposition",
                  "« mail » copie mon adresse, elle partira au retour du réseau.",
                );
              }

              break;
            }
            case "share": {
              this.shareTo(effect);

              break;
            }
            case "shareMenu": {
              void this.nativeShare();

              break;
            }
            case "email": {
              void this.copy(this.profileEmail);

              break;
            }
            case "sendMail": {
              globalThis.open(`mailto:${encodeURIComponent(this.profileEmail)}`);

              break;
            }
            case "cv": {
              // Un nouvel onglet : le terminal reste ouvert derriere, avec son journal.
              globalThis.open("texte.html", "_blank", "noopener");

              break;
            }
            case "say": {
              this.say(effect.text, effect.expression);

              break;
            }
            case "emote": {
              this.emote(effect.expression);

              break;
            }
            case "drop": {
              this.drop();

              break;
            }
            case "blowUp": {
              this.blowUp("commande");

              break;
            }
            case "activity": {
              this.mascotPlay(effect.name);

              break;
            }
            case "navigate": {
              this.goSection(effect.id, { via: "commande" });

              break;
            }
            case "clear": {
              this.journal = [];

              break;
            }
            case "replay": {
              this.journal = [];
              this.commandResult = undefined;
              this.seen = this.seen.filter((entry) => {
                return entry !== this.section;
              });
              this.play(this.section, "commande");

              break;
            }
            case "state": {
              Object.assign(this, effect.patch);

              break;
            }
            case "power": {
              this.powerDown(effect.mode);

              break;
            }
            case "theme": {
              this.setTheme(effect.name, "commande");

              break;
            }
            case "evolve": {
              void this.evolve();

              break;
            }
            case "options": {
              this.openOpts("commande");

              break;
            }
            case "radio": {
              void this.radioBoot();

              break;
            }
            case "glitch": {
              // « sudo » laisse lire son refus avant de tomber en panne ; « matrix » part
              // avec sa ligne.
              if (effect.mode === "sudo") {
                this.glitchLater(effect.mode);
              } else {
                this.glitchStart(effect.mode);
              }

              break;
            }
            // Une commande qui liste son usage n'a rien a faire ici : « listed » la lit plus haut.
            case "usage": {
              break;
            }
            // Un effet ajoute sans son cas casse la compilation ici.
            default: {
              effect satisfies never;
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
        this.$refs.cli?.focus();
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

      // Sans proposition, Tab garde son role de navigation : l'avaler enfermait le
      // visiteur dans la ligne. Shift+Tab n'est jamais une completion.
      tab(event: KeyboardEvent) {
        if (event.shiftKey || this.sugg.length === 0) {
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
          this.reindexGlobal();
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
            this.finishBoot();
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
