// Le journal : sa hauteur, la poignée qui la règle, et la jauge de contexte qu'il remplit.

import { type Beat, type Delay, type Shell, slice } from "../shell.ts";
import {
  COMPACT_MS,
  COMPACT_TICK_MS,
  CTX_BUDGET,
  CTX_FLOOR,
  PANE_GAP_PX,
  RESULT_MIN_PX,
} from "../settings.ts";

// Ce que le journal garde dans l'etat du composant.
export interface LogState {
  compactTick: number;
  compacting: boolean;
  compactor: Delay | undefined;
  resizing: { height: number; y: number } | undefined;
  spinner: Beat | undefined;
  used: number;
}

export interface LogApi {
  bump(cost?: number): void;
  logDown(event: PointerEvent): void;
  logMove(event: PointerEvent): void;
  logRoom(): number;
  logUp(): void;
  setLogHeight(next: number): void;
  stopCompacting(): void;
}

export const logSlice = () => {
  return slice<LogApi>({
    bump(this: Shell, cost?: number) {
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

    logDown(this: Shell, event: PointerEvent) {
      this.resizing = { height: this.logHeight, y: event.clientY };

      if (event.target instanceof Element) {
        event.target.setPointerCapture(event.pointerId);
      }
    },

    logMove(this: Shell, event: PointerEvent) {
      if (!this.resizing) {
        return;
      }

      this.setLogHeight(this.resizing.height + (this.resizing.y - event.clientY));
    },

    // La borne haute se mesure sur les frères du journal. Un nombre magique sous-estimerait
    // la borne de près de cent pixels. Le résultat tomberait à zéro, et le volet central
    // déborderait.
    logRoom(this: Shell) {
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

          return own.display !== "none" && own.position !== "absolute" && own.position !== "fixed";
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

    logUp(this: Shell) {
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

    setLogHeight(this: Shell, next: number) {
      this.logH = Math.max(44, Math.min(Math.round(next), this.logRoom()));
      this.persist();
    },

    // Un redemarrage annule la compaction : sinon son resume s'ecrit dans un journal
    // qu'on vient de vider, et sa barre s'affiche par-dessus l'ecran de demarrage.
    stopCompacting(this: Shell) {
      clearInterval(this.spinner);
      clearTimeout(this.compactor);
      this.compacting = false;
      this.compactTick = 0;
    },
  });
};
