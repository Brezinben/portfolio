import { expect, test } from "@playwright/test";

// La poignee ne s'affiche que si le journal deborde : une tige a deplacer dans le vide
// ne servirait a rien.
const fill = async (cli) => {
  for (const _ of Array.from({ length: 6 })) {
    // Les commandes doivent s'enchainer : les paralleliser ne remplirait pas le journal.
    // eslint-disable-next-line no-await-in-loop
    await cli.fill("help");
    // eslint-disable-next-line no-await-in-loop
    await cli.press("Enter");
  }
};

const boot = async (page) => {
  await page.goto("/");
  await expect(page.locator("[data-boot]")).toHaveCount(0, { timeout: 10_000 });

  return page.getByLabel("Commande");
};

// L'experience terminale tient a une hauteur fixe : la page ne doit jamais grandir.
test("la page ne dépasse jamais la hauteur de la fenêtre", async ({ page }) => {
  const cli = await boot(page);

  await Array.from({ length: 12 }).reduce(
    (chain) => chain.then(() => cli.fill("help")).then(() => cli.press("Enter")),
    Promise.resolve(),
  );

  const overflow = await page.evaluate(() => document.body.scrollHeight - window.innerHeight);

  expect(overflow, "aucun débordement vertical").toBeLessThanOrEqual(1);
});

test("le contenu reste collé en haut de son volet", async ({ page }) => {
  await boot(page);

  const align = await page
    .locator("[data-result]")
    .evaluate((node) => getComputedStyle(node).alignContent);

  expect(align).toBe("start");
});

test("sous 900 px les trois volets s'empilent", async ({ page }) => {
  await page.setViewportSize({ height: 800, width: 700 });
  await boot(page);

  const direction = await page
    .locator("[data-panes]")
    .evaluate((node) => getComputedStyle(node).flexDirection);

  expect(direction).toBe("column");
});

test("au-delà de 2400 px la mise en page se centre", async ({ page }) => {
  await page.setViewportSize({ height: 900, width: 3200 });
  await boot(page);

  const width = await page.locator("[data-panes]").evaluate((node) => node.clientWidth);

  expect(width).toBeLessThanOrEqual(2400);
});

test("les barres de défilement sont masquées", async ({ page }) => {
  await boot(page);

  const width = await page
    .locator("[data-journal]")
    .evaluate((node) => node.offsetWidth - node.clientWidth);

  expect(width, "aucune gouttière de barre de défilement").toBe(0);
});

// La barre masquee est remplacee par un indicateur : sinon rien ne dit qu'il reste
// du contenu plus bas.
test("un indicateur signale qu'il reste du contenu", async ({ page }) => {
  const cli = await boot(page);

  await Array.from({ length: 6 }).reduce(
    (chain) => chain.then(() => cli.fill("help")).then(() => cli.press("Enter")),
    Promise.resolve(),
  );
  await page.locator("[data-journal]").evaluate((node) => node.scrollTo(0, 0));

  await expect(page.locator("[data-more]")).toBeVisible();
});

test("le journal se redimensionne au clavier et sa hauteur est conservée", async ({ page }) => {
  const cli = await boot(page);

  await fill(cli);

  const height = () => page.locator("[data-journal]").evaluate((node) => node.clientHeight);
  const before = await height();

  await page.getByRole("separator", { name: "Redimensionner le journal" }).focus();
  await page.getByRole("separator", { name: "Redimensionner le journal" }).press("ArrowUp");
  await page.getByRole("separator", { name: "Redimensionner le journal" }).press("ArrowUp");

  const after = await height();

  expect(after).toBeGreaterThan(before);

  await page.reload();
  await expect(page.locator("[data-boot]")).toHaveCount(0, { timeout: 10_000 });

  expect(await height(), "la hauteur survit au rechargement").toBe(after);
});

test("le journal ne descend jamais sous 44 px", async ({ page }) => {
  const cli = await boot(page);

  await fill(cli);

  const handle = page.getByRole("separator", { name: "Redimensionner le journal" });

  await handle.focus();
  await Array.from({ length: 20 }).reduce(
    (chain) => chain.then(() => handle.press("ArrowDown")),
    Promise.resolve(),
  );

  // On lit la hauteur appliquée et non la hauteur rendue : le rendu arrondit au
  // sous-pixel, ce qui n'a rien à voir avec la borne du réglage.
  const applied = await page.locator("[data-journal]").evaluate((node) => node.style.height);

  expect(Number.parseInt(applied, 10)).toBe(44);
});
