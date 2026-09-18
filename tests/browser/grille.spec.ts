import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

// La grille des technologies coule en « repeat(auto-fill, minmax(148px, 1fr)) » : le nombre
// de colonnes depend de la largeur de la fenetre. Un test qui ne pose pas sa fenetre ne
// prouve rien, il passe ou echoue selon la machine.
const LARGEUR = 1280,
  boot = async (page: Page) => {
    await page.setViewportSize({ height: 900, width: LARGEUR });
    await page.goto("/#stack");
    await expect(page.locator("[data-boot]")).toHaveCount(0, { timeout: 10_000 });
    await expect(page.locator("[data-tree]")).toBeVisible();
  },
  // Une cellule dont la colonne n'existe pas sur la ligne d'en dessous : c'est le cas qui
  // faisait partir le curseur en diagonale.
  celluleSansSuiteDansSaColonne = (page: Page) => {
    return page.evaluate(() => {
      const cellules = [...document.querySelectorAll<HTMLElement>("[data-tech]")].map(
          (node, rang) => {
            return {
              gauche: node.getBoundingClientRect().left,
              haut: node.getBoundingClientRect().top,
              rang,
            };
          },
        ),
        lignes = [
          ...new Set(
            cellules.map((cellule) => {
              return Math.round(cellule.haut);
            }),
          ),
        ].toSorted((une, autre) => {
          return une - autre;
        });

      for (const [index, haut] of lignes.entries()) {
        const suivante = lignes[index + 1];

        if (suivante !== undefined) {
          const colonnesEnDessous = new Set(
              cellules
                .filter((cellule) => {
                  return Math.round(cellule.haut) === suivante;
                })
                .map((cellule) => {
                  return Math.round(cellule.gauche);
                }),
            ),
            orpheline = cellules.find((cellule) => {
              return (
                Math.round(cellule.haut) === haut &&
                !colonnesEnDessous.has(Math.round(cellule.gauche))
              );
            });

          if (orpheline) {
            return orpheline.rang;
          }
        }
      }

      return -1;
    });
  };

test("should keep the column on the down arrow when the next row is shorter", async ({ page }) => {
  await boot(page);

  const rang = await celluleSansSuiteDansSaColonne(page);

  expect(rang, "the grid must carry a row shorter than the previous one").toBeGreaterThan(-1);

  const cellules = page.locator("[data-tech]"),
    depart = cellules.nth(rang);

  await depart.focus();

  const avant = await depart.evaluate((node) => {
    return node.getBoundingClientRect().left;
  });

  await page.keyboard.press("ArrowDown");

  const apres = await page.evaluate(() => {
    const actif = document.activeElement;

    return actif instanceof HTMLElement ? actif.getBoundingClientRect().left : -1;
  });

  expect(Math.round(apres), "the cursor goes down inside its column").toBe(Math.round(avant));
});

// Le cas ordinaire ne doit pas regresser : quand la colonne existe en dessous, rien ne change.
test("should keep the column on the down arrow when the next row is full", async ({ page }) => {
  await boot(page);

  const cellules = page.locator("[data-tech]");

  await cellules.first().focus();

  const avant = await cellules.first().evaluate((node) => {
    return node.getBoundingClientRect().left;
  });

  await page.keyboard.press("ArrowDown");

  const apres = await page.evaluate(() => {
    const actif = document.activeElement;

    return actif instanceof HTMLElement ? actif.getBoundingClientRect().left : -1;
  });

  expect(Math.round(apres)).toBe(Math.round(avant));
});
