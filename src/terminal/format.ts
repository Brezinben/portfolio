// La mise en forme : ce que la coquille calcule et que l'interpreteur ne peut pas
// rendre. Bandeau dessine en box-shadow, barres de progression, lignes de contenu.

import { type ContentLine, type Tone, contentLine, safeTone } from "../interpret.ts";
import { lookup } from "./lookup.ts";

// Le bandeau que la coquille calcule : l'interpreteur ne rend qu'un mot a dessiner, le
// balisage a besoin d'une geometrie et d'une ombre.
export interface Banner {
  height: string;
  label: string;
  shadow: string;
  size: string;
  width: string;
}

// Ce que la coquille rend au balisage. Trois formes, comme en sortie de l'interpreteur,
// mais le bandeau y est un objet.
// « ShapedLine » et « shaped » viennent de « Ligne mise en forme », terme arrete par
// CONTEXT.md. Le glossaire du projet prime sur une regle qui bannit « shape » partout.
/* eslint-disable anti-slop/no-shape-in-symbol-names */
export type ShapedLine =
  | { banner: Banner; text: string; tone: Tone }
  | { pad: string; tokens: { c: Tone; t: string; w: string }[] }
  | {
      letterSpacing: string;
      marker: string;
      markerTone: Tone;
      pad: string;
      size: string;
      text: string;
      tone: Tone;
      weight: string;
    };
/* eslint-enable anti-slop/no-shape-in-symbol-names */

// Tout ce dont on sait mesurer la longueur imprimee : une ligne de journal, une ligne de
// contenu, ou une ligne deja mise en forme.
export interface Printable {
  t?: string;
  text?: string;
  tokens?: { t: string }[];
}

// Le volet de sortie d'une section : un titre et des paires cle/valeur colorees.
export interface RawOut {
  lines?: (number | string)[][];
  title?: string;
}

// Une section ou une fiche de mission, telle que content.json l'ecrit.
export interface RawSection {
  ask?: string;
  cmd?: string;
  detail?: string | null;
  dot?: string;
  id: string;
  label: string;
  lines?: ContentLine[];
  out?: RawOut;
  parent?: string;
  state?: string;
  sub?: string;
  suggest?: string;
  view?: string;
}

// Une section une fois mise en forme par la coquille : c'est ce que le balisage lit.
export type Section = ReturnType<typeof section>;

// Les huit frames braille du rotateur. Une fois la tete passee, la case se pose pleine :
// une case a qui il manque un point donne une barre trouee, pas une barre remplie.
export const SPINNER = ["⣾", "⣽", "⣻", "⢿", "⡿", "⣟", "⣯", "⣷"];
export const FILLED = "⣿";
export const HOLLOW = "░";
// Une seule barre pour toute la page : les cases posees, la tete qui tourne tant qu'il
// reste a faire, les cases vides. Rendue en deux morceaux, chacun avec sa couleur.
// Sans `tick`, la barre ne progresse pas : elle n'a alors pas de tete.
export const barParts = (done: number, total: number, tick?: number) => {
  const posees = Math.max(0, Math.min(total, Math.floor(done))),
    tete = tick === undefined || posees >= total ? "" : SPINNER[tick % SPINNER.length];

  return {
    filled: FILLED.repeat(posees) + tete,
    hollow: HOLLOW.repeat(total - posees - (tete?.length ?? 0)),
  };
};
export const TONE = {
  acc: "var(--acc)",
  fg: "var(--fg)",
  fg2: "var(--fg2)",
  ok: "var(--ok)",
  warn: "var(--warn)",
};
export const GLYPHS = {
  " ": ["  ", "  ", "  ", "  ", "  ", "  ", "  ", "  "],
  A: [" ██ ", "█  █", "█  █", "████", "█  █", "█  █", "█  █", "    "],
  B: ["███ ", "█  █", "█  █", "███ ", "█  █", "█  █", "███ ", "    "],
  D: ["███ ", "█  █", "█  █", "█  █", "█  █", "█  █", "███ ", "    "],
  E: ["████", "█   ", "█   ", "███ ", "█   ", "█   ", "████", "    "],
  I: ["████", "  █ ", "  █ ", "  █ ", "  █ ", "  █ ", "████", "    "],
  J: ["████", "   █", "   █", "   █", "   █", "█  █", " ██ ", "    "],
  M: ["█  █", "████", "████", "█  █", "█  █", "█  █", "█  █", "    "],
  N: ["█  █", "██ █", "██ █", "█ ██", "█ ██", "█  █", "█  █", "    "],
  V: ["█  █", "█  █", "█  █", "█  █", "█  █", " ██ ", "  █ ", "    "],
};
export const dots = (word: string) => {
  const rows = ["", "", "", "", "", "", "", ""];

  for (const character of word.toUpperCase()) {
    const glyph = lookup(GLYPHS, character) ?? lookup(GLYPHS, " ") ?? [];

    for (let row = 0; row < 8; row += 1) {
      rows[row] += glyph[row] + (character === " " ? "" : " ");
    }
  }

  return rows.slice(0, 7);
};
// Le bandeau est dessiné en box-shadow, comme la mascotte : aucune image, aucun
// caractère. Valeurs figées du canvas : pixel de 5 px, point de 4 px.
export const BANNER_PX = 5;
export const pixels = (rows: string[], colour: string) => {
  const shadows: string[] = [];

  rows.forEach((row, y) => {
    [...row].forEach((character, x) => {
      if (character === "\u2588") {
        shadows.push(`${x * BANNER_PX}px ${y * BANNER_PX}px 0 ${colour}`);
      }
    });
  });

  return shadows.join(",");
};

/* eslint-disable anti-slop/no-shape-in-symbol-names -- terme du glossaire, voir ShapedLine */
export const banner = (shaped: { banner: string; text: string }): Banner => {
  const rows = dots(shaped.banner);

  return {
    height: `${rows.length * BANNER_PX}px`,
    label: shaped.text,
    shadow: pixels(rows, TONE.acc),
    size: `${BANNER_PX - 1}px`,
    width: `${Math.max(...rows.map((row) => row.length)) * BANNER_PX}px`,
  };
};
// Ce qu'une sortie a réellement imprimé, jetons compris.
export const printed = (lines: Printable[]) =>
  lines.reduce((total: number, entry: Printable) => {
    const text = entry.tokens
      ? entry.tokens.map((token) => token.t).join("")
      : (entry.t ?? entry.text ?? "");

    return total + text.length;
  }, 0);
// Le bandeau change de nature ici : l'interpreteur rend le mot a dessiner, la coquille
// rend la geometrie et l'ombre que le balisage ne sait pas calculer.
export const line = (raw: ContentLine): ShapedLine => {
  const shaped = contentLine(raw);

  if (shaped.banner !== undefined && shaped.text !== undefined && shaped.tone !== undefined) {
    return {
      banner: banner({ banner: shaped.banner, text: shaped.text }),
      text: shaped.text,
      tone: shaped.tone,
    };
  }

  return shaped;
};
/* eslint-enable anti-slop/no-shape-in-symbol-names */

export const outPane = (out: RawOut | undefined) => ({
  lines: (out?.lines ?? []).map((row: (number | string)[]) => ({
    k: row[0],
    kc: safeTone(String(row[2] ?? ""), "fg2"),
    v: row[1],
    vc: safeTone(String(row[3] ?? "")),
  })),
  title: out?.title ?? "",
});
export const section = (raw: RawSection) => ({
  ask: raw.ask ?? "",
  cmd: raw.cmd ?? "",
  dot: safeTone(raw.dot, "ok"),
  id: raw.id,
  label: raw.label,
  lines: (raw.lines ?? []).map(line),
  out: outPane(raw.out),
  sub: raw.sub ?? "",
  suggest: raw.suggest ?? "",
  view: raw.view ?? "pairs",
});
