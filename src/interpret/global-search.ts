// La recherche globale : l'index cherchable du site, et le classement d'une saisie.
//
// Elle ne cherche pas la meme chose que « ask » : « ask » lit la prose du corpus et rend un
// passage, la recherche globale lit le contenu structure et rend une commande.
//
// Rien n'est recopie ici. L'index derive du contenu, des themes, du catalogue des succes et
// du vocabulaire : une brique ajoutee a content.json y entre sans qu'on y touche.

import { ASK, ASK_MODEL, vocabulary } from "./vocabulary.ts";
import { ACHIEVEMENTS } from "./achievements.ts";
import { fold } from "./fold.ts";
import { hintFor } from "./completion.ts";

export type GlobalKind = "achievement" | "command" | "mission" | "section" | "stack" | "theme";

export interface GlobalEntry {
  // La commande soumise. Vide quand l'entree ouvre une zone au lieu de lancer une commande.
  cmd: string;
  desc: string;
  // Les mots qui se cherchent sans s'afficher.
  keys: string;
  kind: GlobalKind;
  label: string;
  // La commande attend un argument : la ligne se remplit, et le visiteur finit de taper.
  needsArgument: boolean;
  // La fiche techno a ouvrir une fois la section stack affichee. Vide ailleurs.
  tech: string;
}

// L'ordre des groupes est l'ordre d'affichage, et il departage aussi deux entrees de meme
// rang : le tri est stable.
export const GLOBAL_GROUPS: { kind: GlobalKind; label: string; tag: string }[] = [
  { kind: "section", label: "sections", tag: "section" },
  { kind: "mission", label: "missions", tag: "mission" },
  { kind: "stack", label: "stack", tag: "techno" },
  { kind: "theme", label: "thèmes", tag: "thème" },
  { kind: "achievement", label: "succès", tag: "succès" },
  { kind: "command", label: "commandes", tag: "cmd" },
];

// Les noms qui ne veulent rien dire seuls. Les soumettre rendrait une erreur ou l'aide :
// la ligne se remplit et rend la main au visiteur.
const NEEDS_ARGUMENT = new Set([
  "/cowsay",
  "/propose",
  "/slime",
  ASK,
  ASK_MODEL,
  "bd",
  "cd",
  "open",
  "share",
  "theme",
]);

// Ce que la coquille sait et que l'interpreteur ne peut pas deviner. Les formes sont celles
// de content.json, moins ce qui ne se cherche pas.
export interface GlobalSource {
  details: { ask?: string; cmd?: string; id: string; label: string; sub?: string }[];
  model: boolean;
  sections: { ask?: string; cmd?: string; id: string; label: string; sub?: string }[];
  techNotes: Record<string, { note?: string; where?: string }>;
  themes: { id: string; label: string }[];
}

const entry = (partial: Omit<GlobalEntry, "needsArgument" | "tech"> & Partial<GlobalEntry>) => {
  return { needsArgument: false, tech: "", ...partial } satisfies GlobalEntry;
};

export const globalIndex = (source: GlobalSource): GlobalEntry[] => {
  const { details, model, sections, techNotes, themes } = source;

  return [
    ...sections.map((section) => {
      return entry({
        cmd: section.cmd ?? `bd ${section.id}`,
        desc: section.sub ?? "",
        keys: `${section.id} ${section.ask ?? ""}`,
        kind: "section",
        label: section.label,
      });
    }),
    ...details.map((detail) => {
      return entry({
        cmd: detail.cmd ?? `bd ${detail.id}`,
        desc: detail.sub ?? "",
        keys: `${detail.id} ${detail.ask ?? ""}`,
        kind: "mission",
        label: detail.label,
      });
    }),
    // Une brique n'a pas de commande a elle. Elle ouvre la section stack, puis la coquille
    // pose sa fiche : c'est ce que le visiteur cherchait en tapant son nom.
    ...Object.entries(techNotes).map(([name, note]) => {
      return entry({
        cmd: "bd stack",
        desc: note.where ?? "",
        keys: note.note ?? "",
        kind: "stack",
        label: name,
        tech: name,
      });
    }),
    ...themes.map((theme) => {
      return entry({
        cmd: `theme ${theme.id}`,
        desc: theme.id,
        keys: "theme thème couleurs",
        kind: "theme",
        label: theme.label,
      });
    }),
    // Un succes ne se lance pas : il s'ouvre. La coquille lit le genre et montre la liste.
    ...ACHIEVEMENTS.map((achievement) => {
      return entry({
        cmd: "",
        desc: achievement.trigger,
        keys: `succès trophée ${achievement.key}`,
        kind: "achievement",
        label: achievement.title,
      });
    }),
    ...vocabulary(model).map((name) => {
      return entry({
        cmd: name,
        desc: hintFor("", name),
        keys: "",
        kind: "command",
        label: name,
        needsArgument: NEEDS_ARGUMENT.has(name),
      });
    }),
  ];
};

// La saisie telle que le classement la lit : sans le slash qui cible la ligne de commande,
// sans les espaces en trop.
export const globalQuery = (raw: string): string => {
  return raw.replace(/^[/:]/u, "").replaceAll(/\s+/gu, " ").trim();
};

// Le classement tient au genre du match, jamais a un score flou : l'ordre reste previsible
// a la frappe. Un libelle qui commence par la saisie passe devant tout, puis la commande,
// puis le libelle qui la contient, puis le reste, departage par la position.
const rank = (query: string, item: GlobalEntry): number => {
  const label = fold(item.label),
    inLabel = label.indexOf(query);

  if (inLabel === 0) {
    return 0;
  }

  if (fold(item.cmd).startsWith(query)) {
    return 1;
  }

  if (inLabel > 0) {
    return 2;
  }

  const elsewhere = fold(`${item.desc} ${item.keys} ${item.cmd}`).indexOf(query);

  return elsewhere === -1 ? -1 : 3 + elsewhere / 1000;
};

export const globalHits = (raw: string, index: GlobalEntry[], limit: number): GlobalEntry[] => {
  const query = fold(globalQuery(raw));

  if (query === "") {
    return [];
  }

  return index
    .map((item) => {
      return { item, rank: rank(query, item) };
    })
    .filter((hit) => {
      return hit.rank >= 0;
    })
    .toSorted((one, other) => {
      return one.rank - other.rank;
    })
    .slice(0, limit)
    .map((hit) => {
      return hit.item;
    });
};

// La fin du premier resultat, affichee derriere la saisie et acceptee par Tab. Elle
// n'apparait que si ce resultat commence par la saisie : completer vers un mot sans rapport
// se lirait comme une erreur de frappe.
export const ghostFor = (raw: string, hits: GlobalEntry[]): string => {
  const query = globalQuery(raw),
    [first] = hits;

  if (query === "" || !first || !fold(first.label).startsWith(fold(query))) {
    return "";
  }

  return first.label.slice(query.length);
};
