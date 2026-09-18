// Le stockage des succès. Un seul tableau de chaînes, sous une seule clé.
//
// Il mêle les clés acquises et des marques préfixées. La lecture est unique au démarrage,
// et un succès retiré du catalogue disparaît sans laisser d'orphelin : « keepKnown » de la
// façade s'en charge, côté coquille.
//
// Ce module n'importe rien d'autre que ses valeurs figées. La page introuvable l'emploie,
// et elle porte le budget le plus serré du dépôt.

import { ACHIEVEMENTS_KEY } from "../settings.ts";

export const readMarks = () => {
  try {
    // SAFETY: le stockage est une entrée extérieure. Rien n'est affirmé de sa forme : un
    // tableau d'autre chose devient un tableau de chaînes, que le filtre du catalogue vide.
    const saved: unknown = JSON.parse(globalThis.localStorage.getItem(ACHIEVEMENTS_KEY) ?? "[]");

    return Array.isArray(saved) ? saved.map(String) : [];
  } catch {
    // Stockage illisible ou refusé : la visite compte ses succès en mémoire.
    return [];
  }
};

export const writeMarks = (marks: string[]) => {
  try {
    globalThis.localStorage.setItem(ACHIEVEMENTS_KEY, JSON.stringify(marks));
  } catch {
    // Navigation privée ou stockage plein : le succès vaut pour cette visite.
  }
};

// Relire avant d'écrire. La page introuvable et la version texte écrivent depuis un autre
// onglet : partir de l'état en mémoire effacerait ce qu'elles viennent de poser.
export const addMark = (mark: string) => {
  const saved = readMarks();

  if (saved.includes(mark)) {
    return saved;
  }

  const next = [...saved, mark];

  writeMarks(next);

  return next;
};

// Une marque à valeur unique : le compte des succès déjà regardés. L'ancienne sort, la
// nouvelle entre.
export const setMark = (prefix: string, value: string) => {
  const next = [
    ...readMarks().filter((mark) => {
      return !mark.startsWith(prefix);
    }),
    `${prefix}${value}`,
  ];

  writeMarks(next);

  return next;
};
