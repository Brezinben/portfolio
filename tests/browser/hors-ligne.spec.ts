import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

// Le site tient en memoire une fois charge : couper le reseau apres le demarrage ne casse
// que les commandes qui partent ailleurs. Le test coupe donc apres, jamais avant.
const boot = async (page: Page) => {
    await page.goto("/");
    await expect(page.locator("[data-boot]")).toHaveCount(0, { timeout: 10_000 });

    return page.getByLabel("Commande");
  },
  couper = (page: Page) => page.context().setOffline(true);

test("la barre d'état annonce la coupure, et l'oublie au retour", async ({ page }) => {
  await boot(page);

  const marqueur = page.locator("[data-offline]");

  await expect(marqueur).toHaveCount(0);

  await couper(page);
  await expect(marqueur).toBeVisible();
  await expect(marqueur).toHaveText("hors ligne");

  await page.context().setOffline(false);
  await expect(marqueur).toHaveCount(0);
});

test("partager vers LinkedIn sans réseau le dit, et propose ce qui marche", async ({ page }) => {
  const cli = await boot(page);

  await couper(page);
  await cli.fill("share linkedin");
  await cli.press("Enter");

  const journal = page.locator("[data-journal]");

  await expect(journal).toContainText("demande le réseau");
  await expect(journal, "le refus nomme ce qui marche encore").toContainText("share link");
});

// Copier ne sort pas de la page : la coupure ne doit rien y changer.
test("partager le lien marche toujours sans réseau", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);

  const cli = await boot(page);

  await couper(page);
  await cli.fill("share link");
  await cli.press("Enter");

  await expect(page.locator("[data-journal]")).toContainText("partage vers");

  const ici = await page.evaluate(() => globalThis.location.origin + globalThis.location.pathname);

  expect(await page.evaluate(() => navigator.clipboard.readText())).toContain(ici);
});

test("proposer sans réseau le dit plutôt que d'échouer en silence", async ({ page }) => {
  const cli = await boot(page);

  await couper(page);
  await cli.fill("/propose une idée");
  await cli.press("Enter");
  await cli.fill("oui");
  await cli.press("Enter");

  await expect(page.locator("[data-journal]")).toContainText("demande le réseau");
});
