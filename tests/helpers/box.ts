import type { Locator } from "@playwright/test";

// Une boîte absente fait tomber le test à l'endroit où on la demande, avec son sélecteur.
export const boxOf = async (locator: Locator) => {
  const box = await locator.boundingBox();

  if (!box) {
    throw new Error(`no box for ${locator.toString()}`);
  }

  return box;
};

// La cible tactile d'un élément peut dépasser sa boîte (pseudo-élément). Seul le test de
// frappe la voit : on touche au-dessus et au-dessous du centre, et on lit qui répond.
export const answersAround = (locator: Locator, reach: number) => {
  return locator.evaluate((node, distance) => {
    node.scrollIntoView({ block: "center" });

    const box = node.getBoundingClientRect(),
      x = box.x + box.width / 2,
      middle = box.y + box.height / 2;

    return [-distance, distance].map((shift) => {
      return document.elementFromPoint(x, middle + shift)?.closest("[data-handle]") === node;
    });
  }, reach);
};
