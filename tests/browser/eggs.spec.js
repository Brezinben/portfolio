import { expect, test } from "@playwright/test";

const boot = async (page) => {
  await page.goto("/");
  await expect(page.locator("[data-boot]")).toHaveCount(0, { timeout: 10_000 });

  return page.getByLabel("Commande");
};

const run = async (cli, command) => {
  await cli.fill(command);
  await cli.press("Enter");
};

test("cowsay dessine sa vache dans le journal", async ({ page }) => {
  const cli = await boot(page);

  await run(cli, "/cowsay bonjour");

  await expect(page.locator("[data-journal]")).toContainText("^__^");
  await expect(page.locator("[data-journal]")).toContainText("bonjour");
});

// Les espaces multiples de l'art ASCII doivent survivre au rendu : c'est le piege que
// le drapeau preformaté resout dans le canvas.
test("l'art ASCII garde ses espaces multiples", async ({ page }) => {
  const cli = await boot(page);

  await run(cli, "/cowsay test");

  const spacing = await page
    .locator("[data-journal] span", { hasText: "^__^" })
    .first()
    .evaluate((node) => getComputedStyle(node).whiteSpace);

  expect(spacing).toMatch(/pre/);
});

test("les ligatures restent désactivées", async ({ page }) => {
  await boot(page);

  const settings = await page.locator("body").evaluate((node) => ({
    features: getComputedStyle(node).fontFeatureSettings,
    ligatures: getComputedStyle(node).fontVariantLigatures,
  }));

  expect(`${settings.features} ${settings.ligatures}`).toMatch(/none|liga/);
});

test("un mode de tête change la vache", async ({ page }) => {
  const cli = await boot(page);

  await run(cli, "/cowsay -d mort");

  await expect(page.locator("[data-journal]")).toContainText("(xx)");
});

test("cowthink rend une bulle de pensée", async ({ page }) => {
  const cli = await boot(page);

  await run(cli, "/cowthink hmm");

  await expect(page.locator("[data-journal]")).toContainText("( hmm )");
});

test("la jauge de contexte monte à chaque commande", async ({ page }) => {
  const cli = await boot(page);

  const filled = () => page.locator("[data-gauge]").textContent();
  const before = await filled();

  await run(cli, "/wtf");
  await run(cli, "/wtf");
  await run(cli, "/wtf");
  await run(cli, "/wtf");

  expect(await filled()).not.toBe(before);
});

// Pleine, la jauge compacte avec un resume ironique, puis repart a zero.
test("la jauge pleine déclenche une compaction et se vide", async ({ page }) => {
  const cli = await boot(page);

  await Array.from({ length: 20 }).reduce(
    (chain) => chain.then(() => run(cli, "/wtf")),
    Promise.resolve(),
  );

  await expect(page.locator("[data-journal]")).toContainText("fenêtre de contexte pleine");
  await expect(page.locator("[data-journal]")).toContainText("aime le vélo");

  const gauge = await page.locator("[data-gauge]").textContent();
  const filled = gauge.split("█").length - 1;

  expect(filled, "la jauge repart de presque zéro").toBeLessThanOrEqual(1);
});

test("shutdown éteint puis rejoue le démarrage", async ({ page }) => {
  const cli = await boot(page);

  await run(cli, "shutdown");

  await expect(page.locator("[data-boot]")).toHaveCount(1, { timeout: 10_000 });
  await expect(page.locator("[data-boot]")).toHaveCount(0, { timeout: 15_000 });
  await expect(page.locator('[data-pane="main"]')).toContainText("bd whoami --verbose");
});
