import type { Page } from "@playwright/test";

// Le scan axe mesure la couleur telle qu'elle est peinte. Lancé pendant le fondu d'entrée, il
// lit des valeurs à mi-opacité et rapporte des écarts qui n'existent pas. On attend donc
// les animations qui finissent ; le curseur et la mascotte, eux, ne finissent jamais.
export const settled = (page: Page) => {
  return page.evaluate(() => {
    return Promise.all(
      document
        .getAnimations()
        .filter((animation) => {
          return animation.effect?.getComputedTiming().iterations !== Infinity;
        })
        .map((animation) => {
          // Une frappe annule l'animation d'entrée des lignes, et « finished » rejette
          // alors avec AbortError. Une animation annulée ne peint plus : elle est posée.
          return animation.finished.catch(() => {
            return animation;
          });
        }),
    );
  });
};
