// Les outils d'agent : ce que la page déclare à un agent du navigateur par WebMCP.
//
// Ce module part dans un chunk à part, chargé seulement quand le navigateur expose
// « document.modelContext » (ADR 0010). Il n'importe donc que des types : une valeur prise
// au paquet principal lui ferait importer l'entrée, qui n'a pas d'URL. Ce qu'il lui faut
// arrive en paramètre.

import type { GlobalEntry } from "../../interpret.ts";
import type { Shell } from "../shell.ts";
import type { ToggleKey } from "../settings.ts";

// Le contrat de WebMCP vérifié le 2026-09-25 : aucun paquet installé ne le déclare.
interface ToolSchema {
  properties: Record<string, { description: string; enum?: string[]; type: string }>;
  required: string[];
  type: "object";
}

interface AgentTool<Input> {
  annotations?: { consequentialHint?: boolean; readOnlyHint?: boolean };
  description: string;
  execute: (input: Input) => string;
  inputSchema: ToolSchema;
  name: string;
}

interface ModelContext {
  registerTool: <Input>(
    tool: AgentTool<Input>,
    options?: { signal?: AbortSignal },
  ) => Promise<undefined>;
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

// Une action passe par la ligne de commande, comme une frappe du visiteur. Le répartiteur
// reste le point unique, et le journal montre au visiteur ce que l'agent a fait.
const run = (shell: Shell, command: string) => {
  shell.input = command;
  shell.submit({ typed: false });
};

const oneOf = (name: string, description: string, values: string[]): ToolSchema => {
  return {
    properties: { [name]: { description, enum: values, type: "string" } },
    required: [name],
    type: "object",
  };
};

const text = (name: string, description: string): ToolSchema => {
  return {
    properties: { [name]: { description, type: "string" } },
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

// « never » : chaque outil a son propre type d'entrée, et le navigateur les appelle tous de
// la même façon.
const tools = (shell: Shell, needs: AgentToolsNeeds): AgentTool<never>[] => {
  const places = [...shell.sections, ...shell.details].map((entry) => {
    return entry.id;
  });

  return [
    {
      description:
        "Ouvre une section ou une mission du portfolio de Benjamin David, et rend son résumé.",
      execute: ({ section }: { section: string }) => {
        run(shell, `cd ${section}`);

        return summary(shell, section);
      },
      inputSchema: oneOf("section", "La section ou la mission à ouvrir.", places),
      name: "open_section",
    },
    {
      annotations: { readOnlyHint: true },
      description:
        "Cherche dans le portfolio : sections, missions, technologies, thèmes, commandes.",
      execute: ({ query }: { query: string }) => {
        const hits = needs.rankHits(query, shell.globalIndexed, SEARCH_LIMIT);

        return hits.length === 0
          ? `aucune trouvaille pour « ${query} »`
          : hits
              .map((hit) => {
                return `${hit.label} (${hit.kind}) : ${hit.cmd}`;
              })
              .join("\n");
      },
      inputSchema: text("query", "Les mots à chercher."),
      name: "search_portfolio",
    },
    {
      annotations: { readOnlyHint: true },
      description: "Rend la fiche d'une technologie : où Benjamin l'a pratiquée, et comment.",
      execute: ({ tech }: { tech: string }) => {
        const note = shell.techNotes[tech];

        return note
          ? `${tech} — ${note.where ?? ""} : ${note.note ?? ""}`
          : `fiche inconnue : ${tech}`;
      },
      inputSchema: oneOf("tech", "La technologie.", Object.keys(shell.techNotes)),
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
      execute: ({ theme }: { theme: string }) => {
        run(shell, `theme ${theme}`);

        return `thème « ${theme} » appliqué.`;
      },
      inputSchema: oneOf("theme", "Le thème.", needs.themes),
      name: "set_theme",
    },
    {
      description:
        "Active ou coupe un réglage d'affichage : les animations, le volet de sortie, ou les raccourcis d'une touche.",
      execute: ({ enabled, option }: { enabled: boolean; option: ToggleKey }) => {
        if (shell.value(option) !== enabled) {
          shell.flip(option);
        }

        return `${option} : ${shell.value(option) ? "on" : "off"}`;
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
      execute: ({ target }: { target: string }) => {
        run(shell, `share ${target}`);

        return `partage vers ${target}.`;
      },
      inputSchema: oneOf("target", "La cible du partage.", shell.shareTargets),
      name: "share_portfolio",
    },
    {
      // Rien ne part avant le « oui » du visiteur : l'outil pose la question, il ne répond
      // jamais à sa place. D'où « /propose » sans « -y ».
      annotations: { consequentialHint: true },
      description:
        "Propose une idée d'ajout à ce portfolio. Le visiteur doit confirmer avant l'envoi.",
      execute: ({ idea }: { idea: string }) => {
        run(shell, `/propose ${idea}`);

        return "en attente de la confirmation du visiteur dans la ligne de commande.";
      },
      inputSchema: text("idea", "L'idée à proposer."),
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
      return context.registerTool(tool);
    }),
  );
};
