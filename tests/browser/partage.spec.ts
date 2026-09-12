import type { Locator, Page } from "@playwright/test";
import { expect, test } from "@playwright/test";

const boot = async (page: Page) => {
    await page.goto("/");
    await expect(page.locator("[data-boot]")).toHaveCount(0, { timeout: 10_000 });

    return page.getByLabel("Commande");
  },
  run = async (cli: Locator, command: string) => {
    await cli.fill(command);
    await cli.press("Enter");
  };

test("should list the targets declared in the content when share runs alone", async ({ page }) => {
  const cli = await boot(page);

  await run(cli, "share");

  await expect(page.locator("[data-journal]")).toContainText("linkedin");
  await expect(page.locator("[data-journal]")).toContainText("github");
});

test("should copy the address on share link", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);

  const cli = await boot(page);

  await run(cli, "share link");

  await expect(page.locator("[data-journal]")).toContainText("partage vers");

  // L'adresse partagee est celle d'ou la page vient, pas celle que content.json annonce :
  // le lien copie depuis une preproduction doit ramener a cette preproduction.
  const here = await page.evaluate(() => globalThis.location.origin + globalThis.location.pathname);

  expect(await page.evaluate(() => navigator.clipboard.readText())).toContain(here);
});

test("should say so without opening anything on an unknown target", async ({ page }) => {
  const cli = await boot(page);

  await run(cli, "share nexistepas");

  await expect(page.locator("[data-journal]")).toContainText("cible inconnue");
});

// Consentement en deux temps : rien ne part avant un oui.
test("should announce what leaves and wait for the confirmation on propose", async ({ page }) => {
  const cli = await boot(page);

  await run(cli, "/propose ajouter une section veille");

  const journal = page.locator("[data-journal]");

  await expect(journal).toContainText("ajouter une section veille");
  await expect(journal).toContainText("umami.brezinben.dpdns.org");
  await expect(journal).toContainText("Votre texte, et rien d'autre");
  await expect(journal).toContainText("Aucune adresse IP");
  await expect(journal).toContainText("oui ou non");
});

// La reponse attendue est deja ecrite : valider tient en une touche.
test("should prefill the command line with « oui » on propose", async ({ page }) => {
  const cli = await boot(page);

  await run(cli, "/propose une idée");

  await expect(cli).toHaveValue("oui");
});

// -y vaut consentement : le drapeau a ete tape avec l'idee.
test("should wait for no confirmation on propose -y", async ({ page }) => {
  const cli = await boot(page);

  await run(cli, "/propose -y une idée pressée");

  const journal = page.locator("[data-journal]");

  await expect(journal).toContainText("une idée pressée");
  await expect(journal).not.toContainText("oui ou non");
  await expect(cli, "the command line stays free").toHaveValue("");
});

test("should send nothing when the answer is « non »", async ({ page }) => {
  const cli = await boot(page);

  await run(cli, "/propose une idée");
  await run(cli, "non");

  await expect(page.locator("[data-journal]")).toContainText("rien n'a été envoyé");
});

test("should set no cookie", async ({ page, context }) => {
  const cli = await boot(page);

  await run(cli, "help");
  await run(cli, "/joke");

  expect(await context.cookies()).toEqual([]);
});

// Umami bloque ou absent ne doit rien casser : le helper est silencieux.
test("should not break the page when the audience measurement is blocked", async ({ page }) => {
  await page.route("**/umami.brezinben.dpdns.org/**", (route) => route.abort());

  const cli = await boot(page);

  await run(cli, "/sudo");

  await expect(page.locator("[data-journal]")).toContainText("sudoers");
  await expect(page.locator('[data-pane="main"]')).toBeVisible();
});
