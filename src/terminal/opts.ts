// Les réglages sauvés par le visiteur. La version terminal les écrit, la page introuvable
// les relit : les deux doivent les lire de la même façon.

import { OPTS_KEY, THEMES } from "./settings.ts";

// Ce que le stockage rend. Rien n'y est garanti : c'est une entrée extérieure, qu'un autre
// onglet ou une ancienne version a pu écrire.
export interface SavedOpts {
  anim?: unknown;
  logH?: unknown;
  out?: unknown;
  shortcuts?: unknown;
  theme?: unknown;
}

export const readOpts = (): SavedOpts => {
  try {
    // SAFETY: la forme du stockage n'est pas garantie. L'affirmation ne promet rien :
    // SavedOpts ne déclare que des « unknown », et chaque clé est vérifiée par qui la lit.
    return JSON.parse(globalThis.localStorage.getItem(OPTS_KEY) ?? "{}") as SavedOpts;
  } catch {
    // Un stockage illisible ou refusé ne doit pas empêcher la page de se dessiner.
    return {};
  }
};

// Un thème inconnu vaut un thème absent : la préférence du système tranche. Sans
// préférence, la page reste sombre, comme un terminal.
export const knownTheme = (saved: SavedOpts): string => {
  const found = THEMES.find((entry) => {
    return entry.id === saved.theme;
  });

  if (found) {
    return found.id;
  }

  return globalThis.matchMedia?.("(prefers-color-scheme: light)").matches ? "light" : "dark";
};
