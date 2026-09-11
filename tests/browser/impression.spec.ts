import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

const boot = async (page: Page, theme = "dark") => {
  await page.addInitScript(
    (saved: string) => globalThis.localStorage.setItem("bd-term-opts", saved),
    JSON.stringify({ theme }),
  );
  await page.goto("/");
  await expect(page.locator("[data-boot]")).toHaveCount(0, { timeout: 10_000 });
};

// Une feuille d'impression n'existe que depuis que le style a quitte le balisage : un style
// en ligne bat une requete de media, et chaque declaration en portait un.
test("à l'impression la page se déplie au lieu de tenir dans la fenêtre", async ({ page }) => {
  await boot(page);

  const ecran = await page.locator(".tm").evaluate((node) => getComputedStyle(node).overflow);

  expect(ecran, "à l'écran le terminal ne déborde jamais").toBe("hidden");

  await page.emulateMedia({ media: "print" });

  const papier = await page.locator(".tm").evaluate((node) => ({
    hauteur: getComputedStyle(node).height,
    overflow: getComputedStyle(node).overflow,
  }));

  expect(papier.overflow, "sur papier la colonne se déplie").toBe("visible");
  expect(papier.hauteur, "la hauteur ne vaut plus celle de la fenêtre").not.toBe("100dvh");
});

test("à l'impression le fond devient blanc, dans tous les thèmes", async ({ page }) => {
  for (const theme of ["dark", "noctis", "bordo"]) {
    // Chaque theme demande son propre chargement : le fond se lit au demarrage.
    // eslint-disable-next-line no-await-in-loop
    await boot(page, theme);
    // eslint-disable-next-line no-await-in-loop
    await page.emulateMedia({ media: "print" });

    // eslint-disable-next-line no-await-in-loop
    const fond = await page
      .locator(".tm")
      .evaluate((node) => getComputedStyle(node).backgroundColor);

    expect(fond, `le thème ${theme} s'imprime sur blanc`).toBe("rgb(255, 255, 255)");
  }
});

test("à l'impression ce qui ne se lit pas sur papier disparaît", async ({ page }) => {
  await boot(page);
  await page.emulateMedia({ media: "print" });

  for (const prise of ["[data-cli]", "[data-status]", "[data-track]", '[data-ctl="opts"]']) {
    // eslint-disable-next-line no-await-in-loop
    const affichage = await page
      .locator(prise)
      .first()
      .evaluate((node) => getComputedStyle(node).display);

    expect(affichage, `${prise} ne s'imprime pas`).toBe("none");
  }
});

// Le volet de sortie est une region de texte, pas un controle : son contour prend l'ambre
// textuel. En theme clair l'ambre decoratif donne 2,1:1, la ou un indicateur de focus en
// demande trois.
test("le contour de la sortie prend l'ambre textuel en thème clair", async ({ page }) => {
  await boot(page, "light");

  const region = page.locator('[data-pane="out"] [tabindex="0"]');

  await region.focus();

  const contour = await region.evaluate((node) => getComputedStyle(node).outlineColor);

  expect(contour, "l'ambre textuel du thème clair").toBe("rgb(143, 95, 0)");
});

test("un contrôle garde l'ambre décoratif", async ({ page }) => {
  await boot(page, "light");

  const bouton = page.locator('[data-ctl="nav"]').first();

  await bouton.focus();

  const contour = await bouton.evaluate((node) => getComputedStyle(node).outlineColor);

  expect(contour, "l'ambre décoratif du thème clair").toBe("rgb(230, 160, 0)");
});
