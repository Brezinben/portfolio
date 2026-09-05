import { expect, test } from "@playwright/test";

const boot = async (page, hash = "") => {
  await page.goto(`/${hash}`);
  await expect(page.locator("[data-boot]")).toHaveCount(0, { timeout: 10_000 });
};

const main = (page) => page.locator('[data-pane="main"]');

test("chaque section a son ancre partageable", async ({ page }) => {
  await boot(page);
  await page.getByRole("button", { name: /^stack/ }).click();

  await expect(page).toHaveURL(/#stack$/);
  await expect(main(page)).toContainText("bd stack --tree");
});

test("une ancre ouvre directement sa section", async ({ page }) => {
  await boot(page, "#formation");

  await expect(main(page)).toContainText("bd learn --history");
});

test("une ancre inconnue retombe sur whoami", async ({ page }) => {
  await boot(page, "#nexistepas");

  await expect(main(page)).toContainText("bd whoami --verbose");
});

test("le bouton retour du navigateur revient à la section précédente", async ({ page }) => {
  await boot(page);
  await page.getByRole("button", { name: /^stack/ }).click();
  await expect(main(page)).toContainText("bd stack --tree");

  await page.goBack();

  await expect(main(page)).toContainText("bd whoami --verbose");
});

test("les fiches de mission sont navigables et ont leur ancre", async ({ page }) => {
  await boot(page);
  await page.getByRole("button", { name: /kereis/i }).click();

  await expect(page).toHaveURL(/#m-kereis$/);
});

// Première visite : la commande se tape. Retour : immédiat, l'effet ne devient pas une attente.
test("la première visite tape la commande, le retour est immédiat", async ({ page }) => {
  await boot(page);
  await page.getByRole("button", { name: /^stack/ }).click();

  const typing = Date.now();

  await expect(main(page)).toContainText("bd stack --tree --depth=2");

  const first = Date.now() - typing;

  await page.getByRole("button", { name: /^whoami/ }).click();
  await expect(main(page)).toContainText("bd whoami --verbose");

  const again = Date.now();

  await page.getByRole("button", { name: /^stack/ }).click();
  await expect(main(page)).toContainText("bd stack --tree --depth=2");

  expect(Date.now() - again, "une section déjà vue répond plus vite").toBeLessThan(first);
});

test("j et k changent de section", async ({ page }) => {
  await boot(page);
  await page.locator("body").press("j");

  await expect(main(page)).toContainText("bd log --graph");

  await page.locator("body").press("k");

  await expect(main(page)).toContainText("bd whoami --verbose");
});

test("les flèches gauche et droite changent de volet", async ({ page }) => {
  await boot(page);
  await page.locator("body").press("ArrowRight");

  await expect(page.locator('[data-pane="main"] :focus')).toHaveCount(1);
});

test("la barre oblique cible la saisie", async ({ page }) => {
  await boot(page);
  await page.locator("body").press("/");

  await expect(page.getByLabel("Commande")).toBeFocused();
});

// Revenir dans un volet repose le focus là où on l'avait laissé, et non en tête de liste.
test("le focus est mémorisé par volet", async ({ page }) => {
  await boot(page);
  await page.locator("body").press("ArrowDown");
  await page.locator("body").press("ArrowDown");

  const remembered = await page.evaluate(() => document.activeElement.textContent.trim());

  await page.locator("body").press("ArrowRight");
  await expect(page.getByLabel("Commande")).toBeFocused();

  await page.getByLabel("Commande").press("ArrowLeft");

  await expect
    .poll(() => page.evaluate(() => document.activeElement.textContent.trim()))
    .toBe(remembered);
});
