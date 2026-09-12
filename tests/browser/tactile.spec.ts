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
test.describe("on touch", () => {
  test.use(TELEPHONE);

  test("should scroll the stacked column instead of squeezing the panes", async ({ page }) => {
    await boot(page);

    const panes = await page
      .locator("[data-panes]")
      .evaluate((node) => ({ client: node.clientHeight, scroll: node.scrollHeight }));

    expect(panes.scroll, "the panes overflow, and the column scrolls them").toBeGreaterThan(
      panes.client + 1,
    );
  });

  test("should put the main pane first in the stacked column", async ({ page }) => {
    await boot(page);

    const tops = await page.evaluate(() =>
      ["main", "nav", "out"].map(
        (name) => document.querySelector(`[data-pane="${name}"]`)?.getBoundingClientRect().top ?? 0,
      ),
    );

    expect(tops[0]).toBeLessThan(tops[1] ?? 0);
    expect(tops[1]).toBeLessThan(tops[2] ?? 0);
  });

  test("should give the main pane the largest share", async ({ page }) => {
    await boot(page);

    const inner = await page.evaluate(() => window.innerHeight);

    expect(await height(page, '[data-pane="main"]')).toBeGreaterThanOrEqual(inner * 0.62);
  });

  test("should keep the share of the left pane and of the output pane", async ({ page }) => {
    await boot(page);

    const inner = await page.evaluate(() => window.innerHeight);

    expect(await height(page, '[data-pane="nav"]')).toBeGreaterThanOrEqual(inner * 0.38);
    expect(await height(page, '[data-pane="out"]')).toBeGreaterThanOrEqual(inner * 0.38);
  });

  // Le volet central peut être haut et le résultat rester écrasé : la piste, la saisie et
  // la barre d'état prennent leur part avant lui.
  test("should keep a useful room for the result", async ({ page }) => {
    await boot(page, "/#stack");

    expect(await height(page, "[data-result]")).toBeGreaterThanOrEqual(120);
  });

  // Le journal tenait dans 120 px : une réponse de 490 px n'en montrait que trois lignes.
  // « aide » réclame maintenant le résultat, et c'est là que la réponse doit tenir entière.
  test("should show the whole answer of a command in the result", async ({ page }) => {
    await boot(page);
    const cli = page.getByLabel("Commande");

    await cli.fill("aide");
    await cli.press("Enter");

    const result = page.locator("[data-result]");

    await expect(result).toContainText("à vos risques");

    const shown = await result.evaluate((node) => ({
      client: node.clientHeight,
      scroll: node.scrollHeight,
    }));

    expect(shown.scroll, "nothing stays hidden below the fold of the result").toBeLessThanOrEqual(
      shown.client + 1,
    );
  });

  // Les listes sont sous le volet central : sans ce deplacement, toucher une section
  // laissait le visiteur devant la liste, et rendait le resultat au-dessus de l'ecran.
  for (const [quoi, nom] of [
    ["section", /impact/],
    ["mission", /kereis/],
  ] as const) {
    test(`should bring the result on screen when a ${quoi} is touched`, async ({ page }) => {
      await boot(page);
      await page.getByRole("button", { name: nom }).first().click();

      await expect(page.locator("[data-result]")).toBeInViewport();
    });
  }

  // Le journal garde l'echo, et il reste des commandes qui n'ecrivent que la.
  test("should show the whole answer of an unknown command in the log", async ({ page }) => {
    await boot(page);
    const cli = page.getByLabel("Commande");

    await cli.fill("xyzzy");
    await cli.press("Enter");

    const journal = page.locator("[data-journal]");

    await expect(journal).toContainText("commande introuvable");

    const shown = await journal.evaluate((node) => ({
      client: node.clientHeight,
      scroll: node.scrollHeight,
    }));

    expect(shown.scroll, "nothing stays hidden below the fold of the log").toBeLessThanOrEqual(
      shown.client + 1,
    );
  });

  test("should never grow the page past the window height", async ({ page }) => {
    await boot(page);

    const overflow = await page.evaluate(() => document.body.scrollHeight - window.innerHeight);

    expect(overflow, "the overflow goes into the column, never into the page").toBeLessThanOrEqual(
      1,
    );
  });
});

test.describe("on desktop", () => {
  test.use({ viewport: { height: 900, width: 1440 } });

  test("should keep the pane bases of the design", async ({ page }) => {
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

  test("should keep the log under its ceiling", async ({ page }) => {
    await boot(page);
    const cli = page.getByLabel("Commande");

    await cli.fill("aide");
    await cli.press("Enter");

    expect(await height(page, "[data-journal]")).toBeLessThanOrEqual(120);
  });

  test("should keep the panes side by side", async ({ page }) => {
    await boot(page);

    const direction = await page
      .locator("[data-panes]")
      .evaluate((node) => getComputedStyle(node).flexDirection);

    expect(direction).toBe("row");
  });
});
