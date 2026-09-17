// Les icônes des succès, du format du design vers un sprite SVG.
//
// Cet outil ne tourne pas dans la construction. Les données du design ne bougent qu'au
// prochain export, et un pas de construction permanent pour une conversion unique serait
// spéculatif. Lancer « bun tools/icones.ts », relire le diff, committer la sortie.

import { readFile, writeFile } from "node:fs/promises";
import { ACHIEVEMENTS } from "../src/interpret/achievements.ts";

// Un bloc : [x, y, largeur, hauteur], en unités d'une grille de seize. Un calque nomme sa
// teinte et porte ses blocs. Une icône est une pile de calques, peints dans l'ordre.
type Block = [number, number, number, number];
type Layer = [string, Block[]];

interface Design {
  icones: Record<string, Layer[]>;
}

const SOURCE = new URL(
    "../design/export-succes-notification/maquette/icones.json",
    import.meta.url,
  ),
  TARGET = new URL("../src/assets/succes.svg", import.meta.url),
  // La coupe du badge et le cadenas des verrouillés ne sont dans aucun succès, et ils
  // partent quand même. Les icônes des succès retirés du catalogue ne partent pas.
  EXTRA = ["trophy", "locked"],
  // Un rectangle par bloc coûte le double d'un chemin. Les cases d'une teinte tiennent
  // dans un seul « d », et la compression y gagne encore.
  pathOf = (blocks: Block[]) =>
    blocks.map(([x, y, width, height]) => `M${x} ${y}h${width}v${height}h-${width}z`).join(""),
  layerOf = ([tint, blocks]: Layer) => `<path fill="var(--t-${tint})" d="${pathOf(blocks)}"/>`;

// SAFETY: le fichier est un export du design, versionné à côté. Une forme inattendue fait
// tomber l'outil, qui se lance à la main : personne ne sert cette sortie sans la relire.
const design = JSON.parse(await readFile(SOURCE, "utf8")) as Design,
  wanted = [...EXTRA, ...ACHIEVEMENTS.map((entry) => entry.icon)],
  missing = wanted.filter((icon) => !Object.hasOwn(design.icones, icon));

if (missing.length > 0) {
  throw new Error(`le design ne dessine pas : ${missing.join(", ")}`);
}

// La grille du design fait seize unités, doublées pour un viewBox de trente-deux. Un SVG
// s'étire : la feuille décide seule de la taille, et la moitié des octets part avec le
// doublement.
const symbols = wanted.map((icon) => {
  const layers = design.icones[icon]?.map(layerOf).join("") ?? "";

  return `<symbol id="i-${icon}" viewBox="0 0 16 16">${layers}</symbol>`;
});

await writeFile(TARGET, `${symbols.join("\n")}\n`);
