// Les tons sont interpolés dans un attribut style. Sans liste blanche, un ton venu du
// contenu peut fermer la déclaration et injecter du CSS, jusqu'à faire sortir une requête
// vers un serveur tiers.
export const TONES = ["acc", "fg", "fg2", "ok", "warn"] as const;

export type Tone = (typeof TONES)[number];

const isTone = (value: string): value is Tone => {
  return TONES.some((tone) => {
    return tone === value;
  });
};

export const safeTone = (tone: string | undefined, fallback: Tone = "fg"): Tone => {
  return tone !== undefined && isTone(tone) ? tone : fallback;
};
