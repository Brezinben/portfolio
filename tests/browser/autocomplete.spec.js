import { expect, test } from "@playwright/test";

const boot = async (page) => {
  await page.goto("/");
  await expect(page.locator("[data-boot]")).toHaveCount(0, { timeout: 10_000 });

  return page.getByLabel("Commande");
};

const list = (page) => page.locator("[data-suggestions]");

test("taper un préfixe déplie la liste", async ({ page }) => {
  const cli = await boot(page);

  await cli.fill("/wt");
  await cli.dispatchEvent("input");

  await expect(list(page)).toBeVisible();
  await expect(list(page)).toContainText("wtf");
});

test("la liste ne dépasse jamais dix propositions et ne défile pas", async ({ page }) => {
  const cli = await boot(page);

  await cli.fill("s");
  await cli.dispatchEvent("input");
  await expect(list(page)).toBeVisible();

  const shown = await page.locator("[data-suggestion]").count();

  expect(shown).toBeGreaterThan(0);
  expect(shown).toBeLessThanOrEqual(10);

  const overflow = await list(page).evaluate((node) => getComputedStyle(node).overflowY);

  expect(overflow, "la liste ne défile pas : elle est bornée à dix").not.toBe("scroll");
});

test("le second mot propose le bon vocabulaire", async ({ page }) => {
  const cli = await boot(page);

  await cli.fill("/slime ");
  await cli.dispatchEvent("input");

  await expect(list(page)).toContainText("happy");
  await expect(list(page)).not.toContainText("wtf");
});

test("tabulation complète jusqu'au préfixe commun", async ({ page }) => {
  const cli = await boot(page);

  await cli.fill("/cow");
  await cli.dispatchEvent("input");
  await cli.press("Tab");

  await expect(cli).toHaveValue("/cow");
  await expect(list(page)).toBeVisible();
});

test("tabulation sur une seule proposition la complète", async ({ page }) => {
  const cli = await boot(page);

  await cli.fill("/wt");
  await cli.dispatchEvent("input");
  await cli.press("Tab");

  await expect(cli).toHaveValue("/wtf ");
  await expect(list(page)).toBeHidden();
});

test("les flèches changent de proposition sans toucher à l'historique", async ({ page }) => {
  const cli = await boot(page);

  await cli.fill("/co");
  await cli.dispatchEvent("input");
  await cli.press("ArrowDown");

  await expect(page.locator("[data-suggestion][aria-selected='true']")).toHaveCount(1);
  await expect(cli, "la saisie ne doit pas être remplacée par l'historique").toHaveValue("/co");
});

test("échap referme la liste avant de vider la saisie", async ({ page }) => {
  const cli = await boot(page);

  await cli.fill("/wt");
  await cli.dispatchEvent("input");
  await cli.press("Escape");

  await expect(list(page)).toBeHidden();
  await expect(cli).toHaveValue("/wt");

  await cli.press("Escape");
  await expect(cli).toHaveValue("");
});

// La fermeture doit rester déterministe : la liste ne doit jamais rester montée
// par-dessus la session, ce qui était le piège du canvas.
test("perdre le focus vide la liste", async ({ page }) => {
  const cli = await boot(page);

  await cli.fill("/wt");
  await cli.dispatchEvent("input");
  await expect(list(page)).toBeVisible();

  await cli.blur();

  await expect(list(page)).toBeHidden();
  await expect(page.locator("[data-suggestion]")).toHaveCount(0);
});

test("cliquer une proposition la saisit", async ({ page }) => {
  const cli = await boot(page);

  await cli.fill("/co");
  await cli.dispatchEvent("input");
  await page.locator("[data-suggestion]", { hasText: "coffee" }).click();

  await expect(cli).toHaveValue("/coffee ");
});
