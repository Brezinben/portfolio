import { expect, test } from "@playwright/test";

const open = async (page, hash) => {
  await page.goto(`/${hash}`);
  await expect(page.locator("[data-boot]")).toHaveCount(0, { timeout: 10_000 });
};

const out = (page) => page.locator('[data-pane="out"]');

// La frise et l'arbre sont le contenu de la section : ils s'affichent au centre. Le volet
// de sortie garde ses paires et la fiche techno.
test("la frise du parcours s'affiche dans le volet central", async ({ page }) => {
  await open(page, "#parcours");

  await expect(page.locator('[data-pane="main"] [data-timeline]')).toBeVisible();
  await expect(page.locator('[data-pane="out"] [data-timeline]')).toHaveCount(0);
  await expect(out(page)).toContainText("git log");
  await expect(page.locator('[data-pane="main"]')).toContainText("Kereis");
  await expect(page.getByRole("option")).not.toHaveCount(0);
});

test("les années de la frise sont en chiffres tabulaires", async ({ page }) => {
  await open(page, "#parcours");

  const years = page.locator("[data-years]").first();

  await expect(years).toContainText("2026");
  expect(await years.evaluate((node) => getComputedStyle(node).fontVariantNumeric)).toContain(
    "tabular-nums",
  );
});

test("valider une entrée de la frise ouvre la fiche de mission", async ({ page }) => {
  await open(page, "#parcours");
  await page.getByRole("option", { name: /Kereis/ }).click();

  await expect(page).toHaveURL(/#m-kereis$/);
});

// Le canvas dispose la stack comme la sortie d'un ls : un rail par domaine, et les
// technologies qui coulent en colonnes. La hierarchie vient du rail, pas de glyphes.
test("l'arbre de la stack s'affiche au centre, en colonnes", async ({ page }) => {
  await open(page, "#stack");

  await expect(page.locator('[data-pane="main"] [data-tree]')).toBeVisible();
  await expect(page.locator('[data-pane="out"] [data-tree]')).toHaveCount(0);
  await expect(page.locator('[data-pane="main"]')).toContainText("frontend");
  await expect(page.locator('[data-pane="main"]')).toContainText("domaines");

  const columns = await page
    .locator("[data-tech]")
    .first()
    .evaluate((node) => getComputedStyle(node.parentElement).gridTemplateColumns.split(" ").length);

  expect(columns, "les technologies coulent sur plusieurs colonnes").toBeGreaterThan(1);
});

// Avant l'armement, aucun texte d'invite : le volet reste muet tant que le visiteur
// n'a pas validé une première techno.
test("la stack ne dit rien avant d'être armée", async ({ page }) => {
  await open(page, "#stack");

  await expect(page.locator("[data-technote]")).toHaveCount(0);

  await page.locator("[data-tech]", { hasText: "Vue.js" }).first().focus();

  await expect(page.locator("[data-technote]"), "le focus seul ne doit rien afficher").toHaveCount(
    0,
  );
});

test("une fois armée, la stack suit le focus sans nouvelle validation", async ({ page }) => {
  await open(page, "#stack");
  await page.locator("[data-tech]", { hasText: "Vue.js" }).first().click();

  await expect(page.locator("[data-technote]")).toContainText("Vue.js");

  await page.locator("[data-tech]", { hasText: "Docker" }).first().focus();

  await expect(page.locator("[data-technote]")).toContainText("Docker");
});

test("la sortie contact est colorée par type", async ({ page }) => {
  await open(page, "#contact");

  const colours = await page
    .locator('[data-pane="main"] [data-result] span[style*="color"]')
    .evaluateAll((nodes) => nodes.map((node) => getComputedStyle(node).color));

  expect(
    new Set(colours).size,
    "clés, valeurs et ponctuation ne partagent pas une couleur",
  ).toBeGreaterThan(2);
  await expect(page.locator('[data-pane="main"]')).toContainText('"email"');
});

test("la section contact précharge sa commande dans la saisie", async ({ page }) => {
  await open(page, "#contact");

  await expect(page.getByLabel("Commande")).toHaveValue("/send-mail benjamin.david1@hotmail.fr");
});
