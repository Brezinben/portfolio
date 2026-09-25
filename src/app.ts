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
  ghostFor,
  hintFor,
  interpret,
  rankHits,
  safeTone,
  seenCount,
  wonCount,
} from "./interpret.ts";
import { type AchievementsState, achievementsSlice } from "./terminal/achievements/slice.ts";
import { type AskState, askSlice } from "./terminal/ask/slice.ts";
import {
  BOOT_CELLS,
  BOOT_MS,
  CHAR_PX,
  COMPACT_MS,
  COMPACT_TICK_MS,
  CONTENT_URL,
  CTX_BUDGET,
  CTX_CELLS,
  EMPTY,
  EXEC_MS,
  FADE_MS,
  GLOBAL_LIMIT,
  THEMES,
  TOGGLES,
  TYPE_CPS,
} from "./terminal/settings.ts";
import type { Beat, Delay, Magics, TrackSource } from "./terminal/shell.ts";
import { GAUGE_AT, type GlitchState, SHIFT_COUNT, glitchSlice } from "./terminal/glitch/slice.ts";
import { type GlobalSearchState, globalSearchSlice } from "./terminal/global-search/slice.ts";
import { type KeyboardState, keyboardSlice } from "./terminal/keyboard/slice.ts";
import { type LogState, logSlice } from "./terminal/log/slice.ts";
import { type MascotState, mascotSlice } from "./terminal/mascot/slice.ts";
import { type OptionsState, optionsSlice } from "./terminal/options/slice.ts";
import type { RadioApi, RadioState } from "./terminal/radio/slice.ts";
import { type Section, barParts, printed, section } from "./terminal/format.ts";
import { type SuggestionsState, suggestionsSlice } from "./terminal/suggestions/slice.ts";

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

// Alpine vient du script vendu a cote de la page : il n'apporte pas ses types.

declare const Alpine: {
  data: (name: string, factory: () => State) => void;
};

// GoatCounter est charge par une balise script tierce. Son contrat se declare ici, une
// fois : « absent » est un cas normal, un bloqueur suffit a le produire.
interface GoatCounter {
  count?: (vars: { event?: boolean; path: string; title?: string }) => void;
}

declare global {
  // oxlint-disable-next-line no-var, vars-on-top
  var goatcounter: GoatCounter | undefined;
}

// Un gestionnaire par genre d'effet : la cle et l'effet recu vont ensemble.
type EffectRun = { [K in Effect["type"]]: (effect: Extract<Effect, { type: K }>) => void };

// Ce que la page tient en memoire. Les minuteurs en font partie : les declarer les rend
// visibles. « RadioState » vient de la tranche qui l'emploie, pour ne pas deriver.
interface State
  extends
    AchievementsState,
    AskState,
    GlitchState,
    GlobalSearchState,
    KeyboardState,
    LogState,
    MascotState,
    OptionsState,
    RadioState,
    SuggestionsState {
  latency: Delay | undefined;
  booter: Delay | undefined;
  ticker: Beat | undefined;
  anim: boolean;
  reduced: boolean;
  // Le resultat d'une commande qui l'a reclame. La navigation le reprend.
  commandResult: Section | undefined;
  bootTick: number;
  dataErr: boolean;
  details: Section[];
  errDetail: string;
  input: string;
  journal: Line[];
  jokeIndex: number;
  jokes: string[];
  journalOverflows: boolean;
  logH: number;
  missions: Mission[];
  more: { journal: boolean };
  modelState: string;
  online: boolean;
  out: boolean;
  power: "boot" | "fade" | "off" | "on";
  profileEmail: string;
  // La tranche de la radio arrive par import dynamique : ce drapeau dit si elle a rejoint
  // le composant, et « radioOn » ne peut valoir vrai qu'apres.
  radioLoaded: boolean;
  // La commande a ete tapee et la radio n'a pas encore ete quittee. Le chunk arrive apres
  // un aller-retour reseau : partir entre-temps ne doit pas la faire s'ouvrir quand meme.
  radioWanted: boolean;
  running: boolean;
  section: string;
  wantResult: boolean;
  sections: Section[];
  seen: string[];
  share: Share;
  shareTargets: string[];
  stack: Brick[];
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
    ...askSlice(),
    ...glitchSlice(),
    ...globalSearchSlice(),
    ...keyboardSlice(),
    ...logSlice(),
    ...mascotSlice(),
    ...optionsSlice(),
    ...suggestionsSlice(),
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
  // Les proprietes sont triees. Les methodes suivent un ordre de lecture : chargement,
  // navigation, commandes. Un tri alphabetique disperserait chaque sujet.
  // oxlint-disable-next-line sort-keys
  Alpine.data("terminal", () => {
    // oxlint-disable-next-line sort-keys
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
      reduced: globalThis.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false,
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
        // le glitch ignoreraient le changement jusqu'au rechargement.
        globalThis
          .matchMedia?.("(prefers-reduced-motion: reduce)")
          .addEventListener("change", (event) => {
            this.reduced = event.matches;
          });
        this.restore();
        this.ticker = setInterval(() => {
          this.bootTick += 1;
        }, COMPACT_TICK_MS);
        this.startMascot();
        // « onLine » dit « hors ligne » sans se tromper, et « en ligne » avec optimisme :
        // c'est le sens utile ici, puisque la page ne sert qu'a refuser une commande vouee a
        // l'echec.
        this.setOnline(globalThis.navigator?.onLine ?? true);
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

        if (this.current.suggest !== "") {
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
        // coupure, seule une seconde question arrêterait la première. La première répondrait
        // après « clear », ou par-dessus le refus d'une question sans trouvaille.
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

      setOnline(online: boolean) {
        this.online = online;

        if (online) {
          this.rouse();
        } else {
          this.doze();
        }
      },

      // L'en-tête et son lien d'évitement vivent hors du composant, pour survivre à un script
      // absent. Une modale ouverte doit pourtant les rendre inertes, comme le reste.
      shelterHeader(open: boolean) {
        document.querySelector("body > header")?.toggleAttribute("inert", open);
      },

      // La piste bouge avec la mise en page, la mascotte non : sans cette reprise, une
      // fenetre redimensionnee la laisserait hors champ. Le journal recale sa hauteur.
      onResize() {
        this.setLogHeight(this.logHeight);
        this.place(this.at);
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

        // Un gestionnaire par genre d'effet. Un genre ajoute a « Effect » sans sa cle casse la
        // compilation ici.
        const run = {
          activity: (effect) => {
            this.mascotPlay(effect.name);
          },
          ask: (effect) => {
            void this.answerWithModel(effect.query, effect.candidates, effect.lexical);
          },
          blowUp: () => {
            this.blowUp("commande");
          },
          clear: () => {
            this.journal = [];
          },
          cv: () => {
            // Un nouvel onglet : le terminal reste ouvert derriere, avec son journal.
            globalThis.open("texte.html", "_blank", "noopener");
          },
          drop: () => {
            this.drop();
          },
          email: () => {
            void this.copy(this.profileEmail);
          },
          emote: (effect) => {
            this.emote(effect.expression);
          },
          evolve: () => {
            void this.evolve();
          },
          glitch: (effect) => {
            // « sudo » laisse lire son refus avant de tomber en panne ; « matrix » part
            // avec sa ligne.
            if (effect.mode === "sudo") {
              this.glitchLater(effect.mode);
            } else {
              this.glitchStart(effect.mode);
            }
          },
          navigate: (effect) => {
            this.goSection(effect.id, { via: "commande" });
          },
          options: () => {
            this.openOpts("commande");
          },
          pending: (effect) => {
            this.pending = effect.payload;
            this.input = effect.answer ?? "";
          },
          power: (effect) => {
            this.powerDown(effect.mode);
          },
          radio: () => {
            void this.radioBoot();
          },
          replay: () => {
            this.journal = [];
            this.commandResult = undefined;
            this.seen = this.seen.filter((entry) => {
              return entry !== this.section;
            });
            this.play(this.section, "commande");
          },
          say: (effect) => {
            this.say(effect.text, effect.expression);
          },
          send: (effect) => {
            if (this.online) {
              void this.send(effect.payload);
            } else {
              this.refuseOffline(
                "envoyer une idée",
                "« mail » copie mon adresse, elle partira au retour du réseau.",
              );
            }
          },
          sendMail: () => {
            globalThis.open(`mailto:${encodeURIComponent(this.profileEmail)}`);
          },
          share: (effect) => {
            this.shareTo(effect);
          },
          shareMenu: () => {
            void this.nativeShare();
          },
          state: (effect) => {
            Object.assign(this, effect.patch);
          },
          theme: (effect) => {
            this.setTheme(effect.name, "commande");
          },
          track: (effect) => {
            this.track(effect.event, effect.props);
          },
          // Une commande qui liste son usage n'a rien a faire ici : « listed » la lit plus haut.
          usage: () => {
            // « listed » lit cet effet avant la boucle.
          },
        } satisfies EffectRun;

        for (const effect of effects) {
          // SAFETY: « effect.type » designe la cle de « run », dont le gestionnaire attend ce
          // genre d'effet. TypeScript ne relie pas les deux cotes de l'acces indexe.
          (run[effect.type] as (value: Effect) => void)(effect);
        }

        if (found && !moved && !listed) {
          this.mascotPlay("goal");
        }
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
