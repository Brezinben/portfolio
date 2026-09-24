import type { Locator } from "@playwright/test";

// Une boîte absente fait tomber le test à l'endroit où on la demande, avec son sélecteur.
export const boxOf = async (locator: Locator) => {
  const box = await locator.boundingBox();

  if (!box) {
    throw new Error(`no box for ${locator.toString()}`);
  }

  return box;
};
