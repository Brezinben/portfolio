import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

const boot = async (page: Page) => {
    await page.goto("/");
    await expect(page.locator("[data-boot]")).toHaveCount(0, { timeout: 10_000 });

    return page.getByLabel("Commande");
  },
  list = (page: Page) => page.locator("[data-suggestions]");

test("taper un préfixe déplie la liste", async ({ page }) => {
  const cli = await boot(page);

  await cli.fill("/su");
  await cli.dispatchEvent("input");

  await expect(list(page)).toBeVisible();
  await expect(list(page)).toContainText("sudo");
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

  await expect(list(page)).toContainText("expression");
  await expect(list(page)).not.toContainText("sudo");
});

test("tabulation complète jusqu'au préfixe commun", async ({ page }) => {
  const cli = await boot(page);

  await cli.fill("/b");
  await cli.dispatchEvent("input");
  await cli.press("Tab");

  await expect(cli).toHaveValue("/b");
  await expect(list(page)).toBeVisible();
  await expect(list(page)).toContainText("benjamin");
  await expect(list(page)).toContainText("brezinben");
});

test("tabulation sur une seule proposition la complète", async ({ page }) => {
  const cli = await boot(page);

  await cli.fill("/su");
  await cli.dispatchEvent("input");
  await cli.press("Tab");

  await expect(cli).toHaveValue("/sudo ");
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
test("perdre le focus vide la liste", async ({ page }) => {
  const cli = await boot(page);

  await cli.fill("/su");
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

// Au doigt, la proposition vaut la commande : la valider la lance, sans passer par une
// touche entrée que le clavier tactile place ailleurs.
test.describe("au doigt", () => {
  test.use({ hasTouch: true });

  test("toucher une proposition lance la commande", async ({ page }) => {
    const cli = await boot(page);

    await cli.fill("/su");
    await cli.dispatchEvent("input");
    await page.locator("[data-suggestion]", { hasText: "sudo" }).tap();

    await expect(page.locator("[data-journal]")).toContainText("n'est pas dans le fichier sudoers");
    await expect(cli).toHaveValue("");
  });

  test("toucher un premier mot qui attend un argument ouvre sa liste", async ({ page }) => {
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
  test("toucher une sous-commande ouvre son niveau sans lancer", async ({ page }) => {
    const cli = await boot(page);

    await cli.fill("/sli");
    await cli.dispatchEvent("input");
    await page.locator("[data-suggestion]", { hasText: "slime" }).tap();
    await page.locator("[data-suggestion]", { hasText: "expression" }).tap();

    await expect(cli).toHaveValue("/slime expression ");
    await expect(list(page)).toContainText("happy");
    await expect(page.locator("[data-journal]")).not.toContainText("/slime expression <nom>");
  });

  test("toucher un argument lance la commande complète", async ({ page }) => {
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
test("compléter une commande à argument rouvre la liste sur ses valeurs", async ({ page }) => {
  const cli = await boot(page);

  await cli.fill("/sli");
  await cli.dispatchEvent("input");
  await cli.press("Tab");

  await expect(cli).toHaveValue("/slime ");
  await expect(list(page)).toBeVisible();
  await expect(list(page)).toContainText("activity");
});

test("compléter une commande sans argument laisse la liste fermée", async ({ page }) => {
  const cli = await boot(page);

  await cli.fill("/su");
  await cli.dispatchEvent("input");
  await cli.press("Tab");

  await expect(cli).toHaveValue("/sudo ");
  await expect(list(page)).toBeHidden();
});

// Un nom ne dit pas ce qu'il fait : « bd » ou « goal » ne se devinent pas. La ligne suit
// la sélection, niveau par niveau.
test("une ligne sous la liste décrit la proposition choisie", async ({ page }) => {
  const cli = await boot(page),
    hint = page.locator("[data-sugg-hint]");

  await cli.fill("b");
  await cli.dispatchEvent("input");

  await expect(hint).toHaveText("ouvre une section");

  await cli.fill("/slime activity g");
  await cli.dispatchEvent("input");

  await expect(hint).toHaveText("il marque un but");
});

test("la ligne se tait devant une proposition venue du contenu", async ({ page }) => {
  const cli = await boot(page);

  await cli.fill("cd who");
  await cli.dispatchEvent("input");

  await expect(page.locator("[data-suggestions]")).toContainText("whoami");
  await expect(page.locator("[data-sugg-hint]")).toHaveCount(0);
});

// La liste rouverte sur un argument neuf n'a aucun fragment tape : aucun prefixe commun ne
// peut la faire avancer. Sans ce comportement, il fallait une fleche bas avant chaque
// tabulation, a chaque niveau.
test("la tabulation choisit la ligne en avant sur un argument neuf", async ({ page }) => {
  const cli = await boot(page);

  await cli.fill("/sli");
  await cli.dispatchEvent("input");
  await cli.press("Tab");

  await expect(cli).toHaveValue("/slime ");

  await cli.press("Tab");

  await expect(cli).toHaveValue("/slime expression ");
  await expect(list(page)).toContainText("happy");
});
