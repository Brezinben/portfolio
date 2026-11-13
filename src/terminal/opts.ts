// Les réglages sauvés par le visiteur. La version terminal les écrit, la page introuvable
// les relit : les deux doivent les lire de la même façon.

import { OPTS_KEY, PALETTES, SYSTEM_THEME } from "./settings.ts";

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

// Sans préférence, la page reste sombre, comme un terminal.
export const systemPalette = (): string => {
  return globalThis.matchMedia?.("(prefers-color-scheme: light)").matches ? "light" : "dark";
};

// Un thème inconnu vaut un thème absent : le choix retombe sur « système ».
export const savedTheme = (saved: SavedOpts): string => {
  return (
    PALETTES.find((entry) => {
      return entry.id === saved.theme;
    })?.id ?? SYSTEM_THEME
  );
};

// La palette que la page affiche, pour qui n'a pas besoin de distinguer « système ».
export const knownTheme = (saved: SavedOpts): string => {
  const theme = savedTheme(saved);

  return theme === SYSTEM_THEME ? systemPalette() : theme;
};

// Fusionne dans le stockage au lieu de le remplacer : chaque réglage n'écrit que ses clés.
// Une valeur « undefined » retire la clé. C'est ce qui garde le thème libre de suivre le
// système quand une autre option est enregistrée.
export const writeOpts = (patch: SavedOpts): void => {
  try {
    globalThis.localStorage.setItem(OPTS_KEY, JSON.stringify({ ...readOpts(), ...patch }));
  } catch {
    // Navigation privée ou stockage plein : le réglage vaut pour cette visite.
  }
};
