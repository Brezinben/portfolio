// Les outils d'agent : ce que la page déclare à un agent du navigateur par WebMCP.
//
// Ce module part dans un chunk à part, chargé seulement quand le navigateur expose
// « document.modelContext » (ADR 0010). Il n'importe donc que des types : une valeur prise
// au paquet principal lui ferait importer l'entrée, qui n'a pas d'URL. Ce qu'il lui faut
// arrive en paramètre. Une entrée d'agent est une entrée non fiable : « accepts » la lit
// contre le schéma avant tout appel.

import type { GlobalEntry } from "../../interpret.ts";
import type { Shell } from "../shell.ts";
import type { ToggleKey } from "../settings.ts";

// Ce contrat est recopié de la spécification du 2026-09-25, car aucun paquet installé ne
// le déclare.
interface ToolSchema {
  properties: Record<string, { description: string; enum?: string[]; type: string }>;
  required: string[];
  type: "object";
}

type ToolInput = Record<string, boolean | string | undefined>;

interface AgentTool {
  annotations?: { consequentialHint?: boolean; readOnlyHint?: boolean };
  description: string;
  execute: (input: ToolInput) => string;
  inputSchema: ToolSchema;
  name: string;
}

interface ModelContext {
  registerTool: (tool: AgentTool) => Promise<undefined>;
}

declare global {
  interface Document {
    modelContext?: ModelContext;
  }
}

// Ce que le chunk ne peut pas importer lui-même.
export interface AgentToolsNeeds {
  rankHits: (query: string, index: GlobalEntry[], limit: number) => GlobalEntry[];
  themes: string[];
}

const TOGGLE_KEYS: ToggleKey[] = ["anim", "out", "shortcuts"],
  SEARCH_LIMIT = 8,
  NO_INPUT: ToolSchema = { properties: {}, required: [], type: "object" };

// La documentation ne garantit pas que le navigateur valide l'entrée contre le schéma.
// Sans cette lecture, « set_display_option » basculerait n'importe quelle propriété du
// composant, et « set_theme » annoncerait un thème inconnu comme appliqué.
const accepts = (schema: ToolSchema, input: ToolInput) => {
  return Object.entries(schema.properties).every(([key, rule]) => {
    const value = input[key];

    if (value === undefined) {
      return !schema.required.includes(key);
    }

    if (rule.type === "boolean") {
      return value === true || value === false;
    }

    return value === String(value) && (rule.enum?.includes(value) ?? true);
  });
};

// Une action passe par la ligne de commande, comme une frappe du visiteur. Le répartiteur
// reste le point unique, et le journal montre au visiteur ce que l'agent a fait. Une saisie
// que le visiteur était en train de taper revient après la commande.
const run = (shell: Shell, command: string) => {
  const typing = shell.input;

  shell.input = command;
  shell.submit({ typed: false });

  if (shell.input === "") {
    shell.input = typing;
  }
};

const field = (name: string, description: string, values?: string[]): ToolSchema => {
  const rule: ToolSchema["properties"][string] = { description, type: "string" };

  if (values) {
    rule.enum = values;
  }

  return {
    properties: { [name]: rule },
    required: [name],
    type: "object",
  };
};

// Une section et une mission se lisent de la même façon : leur libellé, puis le résumé
// que content.json écrit pour les agents.
const summary = (shell: Shell, id: string) => {
  const found = [...shell.sections, ...shell.details].find((entry) => {
    return entry.id === id;
  });

  return found ? `${found.label} : ${found.ask}` : `section inconnue : ${id}`;
};

const tools = (shell: Shell, needs: AgentToolsNeeds): AgentTool[] => {
  const places = [...shell.sections, ...shell.details].map((entry) => {
    return entry.id;
  });

  return [
    {
      description:
        "Ouvre une section ou une mission du portfolio de Benjamin David, et rend son résumé.",
      execute: (input) => {
        run(shell, `cd ${String(input.section)}`);

        return summary(shell, String(input.section));
      },
      inputSchema: field("section", "La section ou la mission à ouvrir.", places),
      name: "open_section",
    },
    {
      annotations: { readOnlyHint: true },
      description:
        "Cherche dans le portfolio : sections, missions, technologies, thèmes, commandes.",
      execute: (input) => {
        const query = String(input.query),
          hits = needs.rankHits(query, shell.globalIndexed, SEARCH_LIMIT);

        return hits.length === 0
          ? `aucune trouvaille pour « ${query} »`
          : hits
              .map((hit) => {
                return `${hit.label} (${hit.kind}) : ${hit.cmd}`;
              })
              .join("\n");
      },
      inputSchema: field("query", "Les mots à chercher."),
      name: "search_portfolio",
    },
    {
      annotations: { readOnlyHint: true },
      description: "Rend la fiche d'une technologie : où Benjamin l'a pratiquée, et comment.",
      execute: (input) => {
        const tech = String(input.tech),
          note = shell.techNotes[tech];

        return `${tech} — ${note?.where ?? ""} : ${note?.note ?? ""}`;
      },
      inputSchema: field("tech", "La technologie.", Object.keys(shell.techNotes)),
      name: "read_tech_note",
    },
    {
      annotations: { readOnlyHint: true },
      description:
        "Rend le moyen de contacter Benjamin David : adresse, profils, délai de réponse.",
      execute: () => {
        return summary(shell, "contact");
      },
      inputSchema: NO_INPUT,
      name: "get_contact",
    },
    {
      description: "Change le thème de couleurs de la page.",
      execute: (input) => {
        run(shell, `theme ${String(input.theme)}`);

        return `thème « ${String(input.theme)} » appliqué.`;
      },
      inputSchema: field("theme", "Le thème.", needs.themes),
      name: "set_theme",
    },
    {
      // Le répartiteur n'a pas de commande de bascule : cet outil est le seul qui agit sans
      // passer par la ligne de commande. Le réglage changé se voit dans la page elle-même.
      description:
        "Active ou coupe un réglage d'affichage : les animations, le volet de sortie, ou les raccourcis d'une touche.",
      execute: (input) => {
        const option = TOGGLE_KEYS.find((key) => {
          return key === input.option;
        });

        if (option && shell.value(option) !== input.enabled) {
          shell.flip(option);
        }

        return option ? `${option} : ${shell.value(option) ? "on" : "off"}` : "réglage inconnu";
      },
      inputSchema: {
        properties: {
          enabled: { description: "Vrai pour activer, faux pour couper.", type: "boolean" },
          option: { description: "Le réglage.", enum: TOGGLE_KEYS, type: "string" },
        },
        required: ["option", "enabled"],
        type: "object",
      },
      name: "set_display_option",
    },
    {
      description: "Partage le portfolio : ouvre la cible choisie, ou copie le lien.",
      execute: (input) => {
        run(shell, `share ${String(input.target)}`);

        return `partage vers ${String(input.target)}.`;
      },
      inputSchema: field("target", "La cible du partage.", shell.shareTargets),
      name: "share_portfolio",
    },
    {
      // Rien ne part avant le « oui » du visiteur : l'outil pose la question, il ne répond
      // jamais à sa place. Une idée qui commence par un tiret lirait « -y », le drapeau du
      // consentement tapé : elle est refusée.
      annotations: { consequentialHint: true },
      description:
        "Propose une idée d'ajout à ce portfolio. Le visiteur doit confirmer avant l'envoi.",
      execute: (input) => {
        const idea = String(input.idea).trim();

        if (idea === "" || idea.startsWith("-")) {
          return "idée refusée : elle ne peut ni être vide, ni commencer par un tiret.";
        }

        run(shell, `/propose ${idea}`);

        return "en attente de la confirmation du visiteur dans la ligne de commande.";
      },
      inputSchema: field("idea", "L'idée à proposer."),
      name: "propose_idea",
    },
  ];
};

export const registerAgentTools = async (shell: Shell, needs: AgentToolsNeeds) => {
  const context = document.modelContext;

  if (!context) {
    return;
  }

  await Promise.all(
    tools(shell, needs).map((tool) => {
      return context.registerTool({
        ...tool,
        execute: (input) => {
          return accepts(tool.inputSchema, input) ? tool.execute(input) : "entrée refusée";
        },
      });
    }),
  );
};
