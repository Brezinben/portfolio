// La recherche globale : l'index cherchable du site, et le classement d'une saisie.
//
// Elle ne cherche pas la meme chose que « ask » : « ask » lit la prose du corpus et rend un
// passage, la recherche globale lit le contenu structure et rend une commande.
//
// Rien n'est recopie ici. L'index derive du contenu, des themes, du catalogue des succes et
// du vocabulaire : une brique ajoutee a content.json y entre sans qu'on y touche.

import { ASK, ASK_MODEL, vocabulary } from "./vocabulary.ts";
import { ACHIEVEMENTS } from "./achievements.ts";
import type { Entry } from "./context.ts";
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

// Ce que la coquille apprend a la recherche globale. « Entry » est le contrat que
// « context » declare deja : le redeclarer ici ferait un troisieme contrat.
export interface GlobalSource {
  details: (Entry & { sub?: string })[];
  // L'etat d'une mission, tel que le volet gauche l'affiche. Les fiches ne le portent pas.
  missions: { id: string; state?: string }[];
  model: boolean;
  sections: (Entry & { sub?: string })[];
  techNotes: Record<string, { note?: string; where?: string }>;
  themes: { id: string; label: string }[];
}

const entry = (partial: Omit<GlobalEntry, "needsArgument" | "tech"> & Partial<GlobalEntry>) => {
  return { needsArgument: false, tech: "", ...partial } satisfies GlobalEntry;
};
// Le champ « cmd » du contenu est l'echo decoratif d'une section : « bd log --graph » n'ouvre
// rien, le repartiteur n'accepte que l'identifiant. Seul « bd <id> » se soumet.
const open = (id: string) => {
  return `bd ${id}`;
};

export const globalIndex = (source: GlobalSource): GlobalEntry[] => {
  const { details, missions, model, sections, techNotes, themes } = source,
    stateOf = (id: string) => {
      return (
        missions.find((mission) => {
          return mission.id === id;
        })?.state ?? ""
      );
    };

  return [
    ...sections.map((section) => {
      return entry({
        cmd: open(section.id),
        desc: section.sub ?? "",
        keys: `${section.id} ${section.ask ?? ""}`,
        kind: "section",
        label: section.label,
      });
    }),
    ...details.map((detail) => {
      return entry({
        cmd: open(detail.id),
        // « || » et non « ?? » : la coquille pose une chaine vide, jamais « undefined ».
        desc: detail.sub || stateOf(detail.id),
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

// La saisie telle que le classement la lit : sans le prefixe qui cible la ligne de
// commande, « / » ou « : », et sans les espaces en trop.
const globalQuery = (raw: string): string => {
  return raw.replace(/^[/:]/u, "").replaceAll(/\s+/gu, " ").trim();
};

// Le classement tient au genre de la trouvaille, jamais a un score flou : l'ordre reste
// previsible a la frappe.
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

// Les trouvailles sortent regroupees par genre, parce que la zone les affiche ainsi : sans
// ce regroupement, une fleche sauterait d'un groupe a l'autre puis reviendrait.
//
// C'est la meilleure trouvaille d'un genre qui place le genre, jamais un ordre declare. Un
// ordre fige aurait enterre une trouvaille exacte : « theme » nomme une commande, et les
// huit themes ne la portent que dans leurs mots-cles.
export const rankHits = (raw: string, index: GlobalEntry[], limit: number): GlobalEntry[] => {
  const query = fold(globalQuery(raw));

  if (query === "") {
    return [];
  }

  const kept = index
      .map((item) => {
        return { item, rank: rank(query, item) };
      })
      .filter((hit) => {
        return hit.rank >= 0;
      })
      .toSorted((one, other) => {
        return one.rank - other.rank;
      })
      .slice(0, limit),
    // La liste est deja triee par rang, donc la premiere apparition d'un genre porte son
    // meilleur rang. Le tri est stable : le rang departage encore deux trouvailles du meme
    // genre.
    firstOf = kept.map((hit) => {
      return hit.item.kind;
    });

  return kept
    .toSorted((one, other) => {
      return firstOf.indexOf(one.item.kind) - firstOf.indexOf(other.item.kind);
    })
    .map((hit) => {
      return hit.item;
    });
};

// La fin de la premiere trouvaille, affichee derriere la saisie et acceptee par Tab. Elle
// n'apparait que si cette trouvaille commence par la saisie : completer vers un libelle sans
// rapport se lirait comme une erreur de frappe.
//
// Une saisie bordee d'espaces n'en produit aucune : le calque peint la saisie telle quelle,
// donc la suite tomberait une colonne trop loin.
export const ghostFor = (raw: string, hits: GlobalEntry[]): string => {
  const query = globalQuery(raw),
    [first] = hits;

  if (query === "" || raw.trim() !== raw || !first) {
    return "";
  }

  return fold(first.label).startsWith(fold(query)) ? first.label.slice(query.length) : "";
};
