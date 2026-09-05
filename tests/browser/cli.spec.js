import { expect, test } from "@playwright/test";

const boot = async (page) => {
  await page.goto("/");
  await expect(page.locator("[data-boot]")).toHaveCount(0, { timeout: 10_000 });

  return page.getByLabel("Commande");
};

test("taper une commande affiche son résultat dans le journal", async ({ page }) => {
  const cli = await boot(page);

  await cli.fill("wtf");
  await cli.press("Enter");

  await expect(page.locator("[data-journal]")).toContainText("portfolio déguisé en terminal");
  await expect(page.locator("[data-journal]")).toContainText("wtf");
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

  await cli.fill("wtf");
  await cli.press("Enter");
  await expect(page.locator("[data-journal]")).toContainText("portfolio déguisé");

  await cli.fill("clear");
  await cli.press("Enter");

  await expect(page.locator("[data-journal]")).not.toContainText("portfolio déguisé");
});

// La première flèche haut rappelle la commande de la section, puis l'historique tapé.
test("la flèche haut rappelle la commande de la section puis l'historique", async ({ page }) => {
  const cli = await boot(page);

  await cli.press("ArrowUp");
  await expect(cli).toHaveValue("bd whoami --verbose");

  await cli.fill("wtf");
  await cli.press("Enter");

  await cli.press("ArrowUp");
  await expect(cli).toHaveValue("bd whoami --verbose");

  await cli.press("ArrowUp");
  await expect(cli).toHaveValue("wtf");

  await cli.press("ArrowDown");
  await expect(cli).toHaveValue("bd whoami --verbose");
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

  await cli.fill("wtf");
  await cli.press("Enter");
  await cli.fill("bd whoami --verbose");
  await cli.press("Enter");

  await expect(page.locator("[data-journal]")).not.toContainText("portfolio déguisé");
});
