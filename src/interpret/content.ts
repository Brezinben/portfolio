// Mise en forme des lignes de contenu venues de content.json. Pure, donc testable sans
// navigateur, au même titre que les commandes.
//
// Ce module n'a aucun lecteur dans l'interpreteur : seule la coquille l'appelle, par la
// facade.

import { type Tone, safeTone } from "./tone.ts";
import { lookup } from "./lookup.ts";

// Un morceau colore a l'interieur d'une ligne de contenu.
export interface Token {
  c: Tone;
  t: string;
  w: string;
}

// Ce qu'une commande dit, avant que le dispatcher n'y ajoute son echo et sa mesure.
// Une ligne telle que content.json l'ecrit. Sept formes d'entree, dont le rendu ne tire
// que trois : bandeau, jetons, ligne simple.
export interface ContentLine {
  banner?: string;
  jq?: [string, string, number | string, string, boolean];
  jqLine?: [string, string];
  jqOpen?: [string, string];
  ls?: string;
  m?: string;
  mc?: string;
  pad?: string;
  size?: string;
  t?: string;
  tone?: string;
  w?: string;
}

const JQ_TONE = { num: "warn", str: "ok" } satisfies Record<string, Tone>;

const token = (t: string, c: string | undefined, w = "400"): Token => ({ c: safeTone(c), t, w });

export const contentLine = (raw: ContentLine) => {
  if (raw.banner) {
    return { banner: raw.banner, text: raw.t ?? raw.banner, tone: "acc" as const };
  }

  if (raw.jq) {
    const [pad, key, value, kind, comma] = raw.jq;

    return {
      pad,
      tokens: [
        token(`"${key}"`, "acc", "700"),
        token(": ", "fg2"),
        token(kind === "num" ? String(value) : `"${value}"`, lookup(JQ_TONE, String(kind)) ?? "ok"),
        ...(comma ? [token(",", "fg2")] : []),
      ],
    };
  }

  if (raw.jqOpen) {
    return {
      pad: raw.jqOpen[0],
      tokens: [token(`"${raw.jqOpen[1]}"`, "acc", "700"), token(": {", "fg2")],
    };
  }

  if (raw.jqLine) {
    return { pad: raw.jqLine[0], tokens: [token(raw.jqLine[1], "fg2")] };
  }

  return {
    letterSpacing: raw.ls ?? "0",
    marker: raw.m ?? "",
    markerTone: safeTone(raw.mc, "fg2"),
    pad: raw.pad ?? "0",
    size: raw.size ?? "14px",
    text: raw.t ?? "",
    tone: safeTone(raw.tone),
    weight: raw.w ?? "400",
  };
};
