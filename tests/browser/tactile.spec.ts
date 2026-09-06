import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

const TELEPHONE = { hasTouch: true, isMobile: true, viewport: { height: 640, width: 360 } },
  boot = async (page: Page, hash = "/") => {
    await page.goto(hash);
    await expect(page.locator("[data-boot]")).toHaveCount(0, { timeout: 10_000 });
  },
  height = (page: Page, selector: string) =>
    page.locator(selector).evaluate((node) => node.clientHeight);

// Un style inline bat une feuille de style. La requête de média ne peut donc pas écraser
// les bases de la maquette : elle pose des jetons, et ces tests prouvent que les deux
// colonnes lisent bien la valeur qui leur revient.
test.describe("au doigt", () => {
  test.use(TELEPHONE);

  test("la colonne empilée défile au lieu de compresser les volets", async ({ page }) => {
    await boot(page);

    const panes = await page
      .locator("[data-panes]")
      .evaluate((node) => ({ client: node.clientHeight, scroll: node.scrollHeight }));

    expect(panes.scroll, "les volets débordent, et la colonne les fait défiler").toBeGreaterThan(
      panes.client + 1,
    );
  });

  test("le volet central arrive en tête de la colonne empilée", async ({ page }) => {
    await boot(page);

    const tops = await page.evaluate(() =>
      ["main", "nav", "out"].map(
        (name) => document.querySelector(`[data-pane="${name}"]`)?.getBoundingClientRect().top ?? 0,
      ),
    );

    expect(tops[0]).toBeLessThan(tops[1] ?? 0);
    expect(tops[1]).toBeLessThan(tops[2] ?? 0);
  });

  test("le volet central prend la plus grande part", async ({ page }) => {
    await boot(page);

    const inner = await page.evaluate(() => window.innerHeight);

    expect(await height(page, '[data-pane="main"]')).toBeGreaterThanOrEqual(inner * 0.62);
  });

  test("le volet gauche et le volet de sortie gardent leur part", async ({ page }) => {
    await boot(page);

    const inner = await page.evaluate(() => window.innerHeight);

    expect(await height(page, '[data-pane="nav"]')).toBeGreaterThanOrEqual(inner * 0.38);
    expect(await height(page, '[data-pane="out"]')).toBeGreaterThanOrEqual(inner * 0.38);
  });

  // Le volet central peut être haut et le résultat rester écrasé : la piste, la saisie et
  // la barre d'état prennent leur part avant lui.
  test("le résultat garde une place utile", async ({ page }) => {
    await boot(page, "/#stack");

    expect(await height(page, "[data-result]")).toBeGreaterThanOrEqual(120);
  });

  // Le journal tenait dans 120 px : une réponse de 490 px n'en montrait que trois lignes.
  test("le journal montre toute la réponse d'une commande", async ({ page }) => {
    await boot(page);
    const cli = page.getByLabel("Commande");

    await cli.fill("aide");
    await cli.press("Enter");

    const journal = page.locator("[data-journal]");

    await expect(journal).toContainText("à vos risques");

    const shown = await journal.evaluate((node) => ({
      client: node.clientHeight,
      scroll: node.scrollHeight,
    }));

    expect(shown.scroll, "rien ne reste caché sous le pli du journal").toBeLessThanOrEqual(
      shown.client + 1,
    );
    expect(shown.client).toBeGreaterThan(300);
  });

  test("la page ne dépasse jamais la hauteur de la fenêtre", async ({ page }) => {
    await boot(page);

    const overflow = await page.evaluate(() => document.body.scrollHeight - window.innerHeight);

    expect(overflow, "le débordement va dans la colonne, jamais dans la page").toBeLessThanOrEqual(
      1,
    );
  });
});

test.describe("au bureau", () => {
  test.use({ viewport: { height: 900, width: 1440 } });

  test("les volets gardent les bases de la maquette", async ({ page }) => {
    await boot(page);

    const bases = await Promise.all(
      ["nav", "main", "out"].map((name) =>
        page.locator(`[data-pane="${name}"]`).evaluate((node) => {
          const style = getComputedStyle(node);

          return [style.flexGrow, style.flexShrink, style.flexBasis, style.minHeight].join(" ");
        }),
      ),
    );

    expect(bases).toEqual(["0 1 244.8px 0px", "3 1 360px 0px", "1.3 1 230px 0px"]);
  });

  test("le journal garde son plafond", async ({ page }) => {
    await boot(page);
    const cli = page.getByLabel("Commande");

    await cli.fill("aide");
    await cli.press("Enter");

    expect(await height(page, "[data-journal]")).toBeLessThanOrEqual(120);
  });

  test("les volets restent côte à côte", async ({ page }) => {
    await boot(page);

    const direction = await page
      .locator("[data-panes]")
      .evaluate((node) => getComputedStyle(node).flexDirection);

    expect(direction).toBe("row");
  });
});
