import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

// Le site tient en memoire une fois charge : couper le reseau apres le demarrage ne casse
// que les commandes qui partent ailleurs. Le test coupe donc apres, jamais avant.
const boot = async (page: Page) => {
    await page.goto("/");
    await expect(page.locator("[data-boot]")).toHaveCount(0, { timeout: 10_000 });

    return page.getByLabel("Commande");
  },
  couper = (page: Page) => page.context().setOffline(true),
  mascot = (page: Page) => page.locator("[data-mascot]");

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

test("la mascotte dort tant que le réseau est coupé", async ({ page }) => {
  await boot(page);
  await expect(mascot(page)).toHaveClass(/slime--idle/u);

  await couper(page);
  await expect(mascot(page)).toHaveClass(/slime--sleep/u);
  // Une passe unique passerait le test, puis rendrait la main au repos. Seule la boucle
  // tient jusqu'au retour du réseau.
  await expect(mascot(page)).toHaveCSS("animation-iteration-count", "infinite");

  await page.mouse.move(200, 200);
  await page.keyboard.press("a");
  await expect(mascot(page), "aucun geste ne la réveille").toHaveClass(/slime--sleep/u);

  await page.context().setOffline(false);
  await expect(mascot(page)).toHaveClass(/slime--idle/u);
});

test("commander la mascotte sans réseau dit qu'elle dort", async ({ page }) => {
  const cli = await boot(page);

  await couper(page);
  await cli.fill("/slime kill");
  await cli.press("Enter");

  await expect(page.locator("[data-journal]")).toContainText("dort tant que le réseau est coupé");
  await expect(mascot(page), "le journal ne ment pas : elle dort toujours").toHaveClass(
    /slime--sleep/u,
  );
});

// Le sommeil est total : la souris ne la réveille pas non plus. Sans ces deux refus, un
// clic la ferait exploser sans feuille à jouer, et un glisser promènerait un dormeur.
test("endormie, la mascotte ne répond ni au clic ni au glisser", async ({ page }) => {
  await boot(page);
  await couper(page);
  await expect(mascot(page)).toHaveClass(/slime--sleep/u);

  const avant = (await mascot(page).boundingBox())!;

  await Array.from({ length: 5 }).reduce<Promise<unknown>>(
    (chain) => chain.then(() => mascot(page).click({ force: true })),
    Promise.resolve(),
  );

  await expect(mascot(page), "cinq clics ne la font plus exploser").toHaveClass(/slime--sleep/u);

  await page.mouse.move(avant.x + 32, avant.y + 32);
  await page.mouse.down();
  await page.mouse.move(avant.x + 200, avant.y + 32, { steps: 12 });
  await page.mouse.up();

  await expect(mascot(page)).toHaveClass(/slime--sleep/u);
  expect((await mascot(page).boundingBox())!.x, "elle n'a pas bougé").toBe(avant.x);
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
