import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

const boot = async (page: Page) => {
  await page.goto("/");
  await expect(page.locator("[data-boot]")).toHaveCount(0, { timeout: 10_000 });

  return page.getByLabel("Commande");
};

test("taper une commande affiche son résultat dans le journal", async ({ page }) => {
  const cli = await boot(page);

  await cli.fill("/sudo");
  await cli.press("Enter");

  await expect(page.locator("[data-journal]")).toContainText("sudoers");
  await expect(page.locator("[data-journal]")).toContainText("/sudo");
  await expect(cli, "la saisie se vide après exécution").toHaveValue("");
});

test("une commande inconnue le dit sans casser la page", async ({ page }) => {
  const cli = await boot(page);

  await cli.fill("xyzzy");
  await cli.press("Enter");

  await expect(page.locator("[data-journal]")).toContainText("commande introuvable : xyzzy");
  await expect(page.locator('[data-pane="main"]')).toContainText("bd whoami --verbose");
});

test("cd change de section et le volet de sortie suit", async ({ page }) => {
  const cli = await boot(page);

  await cli.fill("cd contact");
  await cli.press("Enter");

  await expect(page.locator('[data-pane="main"]')).toContainText("jq");
  await expect(page.locator("[data-journal]")).toContainText("section « contact » chargée");
});

test("clear vide le journal", async ({ page }) => {
  const cli = await boot(page);

  await cli.fill("/sudo");
  await cli.press("Enter");
  await expect(page.locator("[data-journal]")).toContainText("fichier sudoers");

  await cli.fill("clear");
  await cli.press("Enter");

  await expect(page.locator("[data-journal]")).not.toContainText("sudoers");
});

// Tant que rien n'a été tapé, la flèche haut rappelle la commande de la section. Dès
// qu'une commande existe, c'est elle qui remonte en premier, comme dans un terminal.
test("la flèche haut rappelle la dernière commande tapée", async ({ page }) => {
  const cli = await boot(page);

  await cli.press("ArrowUp");
  await expect(cli, "sans historique, la commande de la section").toHaveValue(
    "bd whoami --verbose",
  );

  await cli.fill("/sudo");
  await cli.press("Enter");

  await cli.press("ArrowUp");
  await expect(cli, "la commande tapée passe devant").toHaveValue("/sudo");

  await cli.press("ArrowUp");
  await expect(cli).toHaveValue("bd whoami --verbose");

  await cli.press("ArrowDown");
  await expect(cli).toHaveValue("/sudo");
});

test("échap vide la saisie", async ({ page }) => {
  const cli = await boot(page);

  await cli.fill("quelque chose");
  await cli.press("Escape");

  await expect(cli).toHaveValue("");
});

// Les commandes ne s'empilent pas : retaper celle de la section la rejoue.
test("retaper la commande de la section ne l'empile pas", async ({ page }) => {
  const cli = await boot(page);

  await cli.fill("/sudo");
  await cli.press("Enter");
  await cli.fill("bd whoami --verbose");
  await cli.press("Enter");

  await expect(page.locator("[data-journal]")).not.toContainText("sudoers");
});

// L'effet « replay » vidait seulement le journal : la commande ne se rejouait pas, alors
// que c'est ce que son nom et son commentaire annonçaient.
test("retaper la commande de la section la rejoue", async ({ page }) => {
  const cli = await boot(page);

  await cli.fill("bd whoami --verbose");
  await cli.press("Enter");

  // La commande se retape, donc « exécution… » revient. Sans le rejeu, le volet restait
  // figé sur son résultat.
  await expect(page.locator("[data-running]")).toBeVisible();
});
