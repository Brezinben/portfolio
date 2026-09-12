import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

const boot = async (page: Page) => {
    await page.goto("/");
    await expect(page.locator("[data-boot]")).toHaveCount(0, { timeout: 10_000 });

    return page.getByLabel("Commande");
  },
  list = (page: Page) => page.locator("[data-suggestions]");

test("should unfold the list when a prefix is typed", async ({ page }) => {
  const cli = await boot(page);

  await cli.fill("/su");
  await cli.dispatchEvent("input");

  await expect(list(page)).toBeVisible();
  await expect(list(page)).toContainText("sudo");
});

test("should keep the list at ten suggestions at most and never scroll", async ({ page }) => {
  const cli = await boot(page);

  await cli.fill("s");
  await cli.dispatchEvent("input");
  await expect(list(page)).toBeVisible();

  const shown = await page.locator("[data-suggestion]").count();

  expect(shown).toBeGreaterThan(0);
  expect(shown).toBeLessThanOrEqual(10);

  const overflow = await list(page).evaluate((node) => getComputedStyle(node).overflowY);

  expect(overflow, "the list does not scroll: it is limited to ten").not.toBe("scroll");
});

test("should propose the right vocabulary for the second word", async ({ page }) => {
  const cli = await boot(page);

  await cli.fill("/slime ");
  await cli.dispatchEvent("input");

  await expect(list(page)).toContainText("expression");
  await expect(list(page)).not.toContainText("sudo");
});

test("should complete up to the common prefix on tab", async ({ page }) => {
  const cli = await boot(page);

  await cli.fill("/c");
  await cli.dispatchEvent("input");
  await cli.press("Tab");

  await expect(cli).toHaveValue("/co");
  await expect(list(page)).toBeVisible();
  await expect(list(page)).toContainText("coffee");
  await expect(list(page)).toContainText("cowsay");
});

// La liste rend la premiere ligne « aria-selected ». Refuser de la prendre rendait la
// tabulation muette des que le prefixe commun n'apportait rien : « / » met « /slime » en
// tete, et Tab ne faisait rien.
test("should take the leading line on tab when the common prefix adds nothing", async ({
  page,
}) => {
  const cli = await boot(page);

  await cli.fill("/");
  await cli.dispatchEvent("input");

  await expect(list(page)).toContainText("slime");

  await cli.press("Tab");

  await expect(cli).toHaveValue("/slime ");
});

test("should complete the only suggestion on tab", async ({ page }) => {
  const cli = await boot(page);

  await cli.fill("/su");
  await cli.dispatchEvent("input");
  await cli.press("Tab");

  await expect(cli).toHaveValue("/sudo ");
  await expect(list(page)).toBeHidden();
});

test("should move between suggestions with the arrows without touching the history", async ({
  page,
}) => {
  const cli = await boot(page);

  await cli.fill("/co");
  await cli.dispatchEvent("input");
  await cli.press("ArrowDown");

  await expect(page.locator("[data-suggestion][aria-selected='true']")).toHaveCount(1);
  await expect(cli, "the input must not be replaced by the history").toHaveValue("/co");
});

test("should close the list on escape before it clears the input", async ({ page }) => {
  const cli = await boot(page);

  await cli.fill("/su");
  await cli.dispatchEvent("input");
  await cli.press("Escape");

  await expect(list(page)).toBeHidden();
  await expect(cli).toHaveValue("/su");

  await cli.press("Escape");
  await expect(cli).toHaveValue("");
});

// La fermeture doit rester déterministe : la liste ne doit jamais rester montée
// par-dessus la session, ce qui était le piège du canvas.
test("should empty the list when the input loses the focus", async ({ page }) => {
  const cli = await boot(page);

  await cli.fill("/su");
  await cli.dispatchEvent("input");
  await expect(list(page)).toBeVisible();

  await cli.blur();

  await expect(list(page)).toBeHidden();
  await expect(page.locator("[data-suggestion]")).toHaveCount(0);
});

test("should enter a suggestion when it is clicked", async ({ page }) => {
  const cli = await boot(page);

  await cli.fill("/co");
  await cli.dispatchEvent("input");
  await page.locator("[data-suggestion]", { hasText: "coffee" }).click();

  await expect(cli).toHaveValue("/coffee ");
});

// Au doigt, la proposition vaut la commande : la valider la lance, sans passer par une
// touche entrée que le clavier tactile place ailleurs.
test.describe("with touch input", () => {
  test.use({ hasTouch: true });

  test("should run the command when a suggestion is tapped", async ({ page }) => {
    const cli = await boot(page);

    await cli.fill("/su");
    await cli.dispatchEvent("input");
    await page.locator("[data-suggestion]", { hasText: "sudo" }).tap();

    await expect(page.locator("[data-journal]")).toContainText("n'est pas dans le fichier sudoers");
    await expect(cli).toHaveValue("");
  });

  test("should open the argument list when a first word that needs an argument is tapped", async ({
    page,
  }) => {
    const cli = await boot(page);

    await cli.fill("/sli");
    await cli.dispatchEvent("input");
    await page.locator("[data-suggestion]", { hasText: "slime" }).tap();

    await expect(cli).toHaveValue("/slime ");
    await expect(list(page)).toContainText("expression");
    await expect(page.locator("[data-journal]")).not.toContainText("le slime est");
  });

  // Le second niveau doit se toucher comme le premier : la liste rouvre, la commande ne
  // part pas incomplete. C'est la ou pickSugg ne regardait que le premier mot.
  test("should open the next level without running when a sub-command is tapped", async ({
    page,
  }) => {
    const cli = await boot(page);

    await cli.fill("/sli");
    await cli.dispatchEvent("input");
    await page.locator("[data-suggestion]", { hasText: "slime" }).tap();
    await page.locator("[data-suggestion]", { hasText: "expression" }).tap();

    await expect(cli).toHaveValue("/slime expression ");
    await expect(list(page)).toContainText("happy");
    await expect(page.locator("[data-journal]")).not.toContainText("/slime expression <nom>");
  });

  test("should run the complete command when an argument is tapped", async ({ page }) => {
    const cli = await boot(page);

    await cli.fill("/slime expression hap");
    await cli.dispatchEvent("input");
    await page.locator("[data-suggestion]", { hasText: "happy" }).tap();

    await expect(page.locator("[data-journal]")).toContainText("le slime est");
    await expect(cli).toHaveValue("");
  });
});

// Compléter une commande qui attend un argument doit montrer l'argument. Le chemin
// tactile le faisait déjà ; le clavier laissait la liste fermée, et rien n'annonçait
// qu'un second mot était possible.
test("should reopen the list on the values when a command that takes an argument is completed", async ({
  page,
}) => {
  const cli = await boot(page);

  await cli.fill("/sli");
  await cli.dispatchEvent("input");
  await cli.press("Tab");

  await expect(cli).toHaveValue("/slime ");
  await expect(list(page)).toBeVisible();
  await expect(list(page)).toContainText("activity");
});

test("should leave the list closed when a command without argument is completed", async ({
  page,
}) => {
  const cli = await boot(page);

  await cli.fill("/su");
  await cli.dispatchEvent("input");
  await cli.press("Tab");

  await expect(cli).toHaveValue("/sudo ");
  await expect(list(page)).toBeHidden();
});

// Un nom ne dit pas ce qu'il fait : « bd » ou « goal » ne se devinent pas. La ligne suit
// la sélection, niveau par niveau.
test("should describe the selected suggestion on a line below the list", async ({ page }) => {
  const cli = await boot(page),
    hint = page.locator("[data-sugg-hint]");

  await cli.fill("b");
  await cli.dispatchEvent("input");

  await expect(hint).toHaveText("ouvre une section");

  await cli.fill("/slime activity g");
  await cli.dispatchEvent("input");

  await expect(hint).toHaveText("il marque un but");
});

test("should keep that line silent for a suggestion that comes from the content", async ({
  page,
}) => {
  const cli = await boot(page);

  await cli.fill("cd who");
  await cli.dispatchEvent("input");

  await expect(page.locator("[data-suggestions]")).toContainText("whoami");
  await expect(page.locator("[data-sugg-hint]")).toHaveCount(0);
});

// La liste rouverte sur un argument neuf n'a aucun fragment tape : aucun prefixe commun ne
// peut la faire avancer. Sans ce comportement, il fallait une fleche bas avant chaque
// tabulation, a chaque niveau.
test("should select the leading line on tab for a new argument", async ({ page }) => {
  const cli = await boot(page);

  await cli.fill("/sli");
  await cli.dispatchEvent("input");
  await cli.press("Tab");

  await expect(cli).toHaveValue("/slime ");

  await cli.press("Tab");

  await expect(cli).toHaveValue("/slime expression ");
  await expect(list(page)).toContainText("happy");
});
