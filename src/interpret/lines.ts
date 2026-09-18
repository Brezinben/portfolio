// Les lignes du journal et les six fabriques qui les produisent.
//
// « MAX_SUGGESTIONS » vit ici et non avec la completion. Deux lecteurs le partagent :
// « offer », juste en dessous, et la coquille, qui en fait la taille de sa fenetre de
// propositions. Le descendre dans la completion forcerait l'arete inverse vers ce module.

import type { Tone } from "./tone.ts";

// Dix propositions affichées à la fois. Le même seuil décide si une aide en ligne peut
// lister ses valeurs ou doit renvoyer à la tabulation.
export const MAX_SUGGESTIONS = 10;

// Une ligne du journal : puce, couleur de puce, texte, ton. Les noms courts viennent du
// canvas et voyagent jusqu'au balisage.
export interface Line {
  c: Tone;
  m: string;
  mc: Tone;
  t: string;
}

export const line = ({
  marker = "",
  markerTone = "fg2",
  text = "",
  tone = "fg",
}: {
  marker?: string;
  markerTone?: Tone;
  text?: string;
  tone?: Tone;
}): Line => {
  return {
    c: tone,
    m: marker,
    mc: markerTone,
    t: text,
  };
};

export const info = (t: string) => {
  return line({ marker: "·", text: t });
};

export const muted = (t: string) => {
  return line({ marker: "·", text: t, tone: "fg2" });
};

export const done = (t: string) => {
  return line({ marker: "✓", markerTone: "ok", text: t });
};

export const failed = (t: string) => {
  return line({ marker: "✗", markerTone: "warn", text: t });
};

export const echoed = (t: string) => {
  return line({ marker: "›", markerTone: "acc", text: t, tone: "fg2" });
};

// Sous dix valeurs, la liste tient sur une ligne et se lit d'un coup. Au-dela, elle
// deborde du volet : la completion la montre mieux, et la ligne apprend la touche.
export const offer = (usage: string, values: string[]) => {
  return info(
    values.length < MAX_SUGGESTIONS
      ? `${usage} — ${values.join(" · ")}`
      : `${usage} — Tab propose les ${Math.min(values.length, MAX_SUGGESTIONS)} valeurs`,
  );
};
