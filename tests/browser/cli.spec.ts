import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

const boot = async (page: Page) => {
  await page.goto("/");
  await expect(page.locator("[data-boot]")).toHaveCount(0, { timeout: 10_000 });

  return page.getByLabel("Commande");
};

// Il n'y a pas de PDF à servir. La version texte porte le parcours complet, et elle
// s'ouvre à côté : le terminal reste derrière, avec son journal.
test("should open the text version in a new tab with cv", async ({ page, context }) => {
  const cli = await boot(page),
    ouvert = context.waitForEvent("page");

  await cli.fill("cv");
  await cli.press("Enter");

  const onglet = await ouvert;

  expect(new URL(onglet.url()).pathname).toBe("/texte.html");
  await expect(page.locator("[data-journal]")).toContainText("version texte");
});

test("should show the result of a typed command in the journal", async ({ page }) => {
  const cli = await boot(page);

  await cli.fill("/sudo");
  await cli.press("Enter");

  await expect(page.locator("[data-journal]")).toContainText("sudoers");
  await expect(page.locator("[data-journal]")).toContainText("/sudo");
  await expect(cli, "the input clears after the run").toHaveValue("");
});

test("should say that a command is unknown without breaking the page", async ({ page }) => {
  const cli = await boot(page);

  await cli.fill("xyzzy");
  await cli.press("Enter");

  await expect(page.locator("[data-journal]")).toContainText("commande introuvable : xyzzy");
  await expect(page.locator('[data-pane="main"]')).toContainText("bd whoami --verbose");
});

test("should change the section with cd and make the output pane follow", async ({ page }) => {
  const cli = await boot(page);

  await cli.fill("cd contact");
  await cli.press("Enter");

  await expect(page.locator('[data-pane="main"]')).toContainText("jq");
  await expect(page.locator("[data-journal]")).toContainText("section « contact » chargée");
});

test("should empty the journal with clear", async ({ page }) => {
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
test("should recall the last typed command with the up arrow", async ({ page }) => {
  const cli = await boot(page);

  await cli.press("ArrowUp");
  await expect(cli, "without history, the section command").toHaveValue("bd whoami --verbose");

  await cli.fill("/sudo");
  await cli.press("Enter");

  await cli.press("ArrowUp");
  await expect(cli, "the typed command comes first").toHaveValue("/sudo");

  await cli.press("ArrowUp");
  await expect(cli).toHaveValue("bd whoami --verbose");

  await cli.press("ArrowDown");
  await expect(cli).toHaveValue("/sudo");
});

test("should clear the input on escape", async ({ page }) => {
  const cli = await boot(page);

  await cli.fill("quelque chose");
  await cli.press("Escape");

  await expect(cli).toHaveValue("");
});

// Les commandes ne s'empilent pas : retaper celle de la section la rejoue.
test("should not stack the section command when it is typed again", async ({ page }) => {
  const cli = await boot(page);

  await cli.fill("/sudo");
  await cli.press("Enter");
  await cli.fill("bd whoami --verbose");
  await cli.press("Enter");

  await expect(page.locator("[data-journal]")).not.toContainText("sudoers");
});

// L'effet « replay » vidait seulement le journal : la commande ne se rejouait pas, alors
// que c'est ce que son nom et son commentaire annonçaient.
test("should replay the section command when it is typed again", async ({ page }) => {
  const cli = await boot(page);

  await cli.fill("bd whoami --verbose");
  await cli.press("Enter");

  // La commande se retape, donc « exécution… » revient. Sans le rejeu, le volet restait
  // figé sur son résultat.
  await expect(page.locator("[data-running]")).toBeVisible();
});
