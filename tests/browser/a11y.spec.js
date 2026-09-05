import { expect, test } from "@playwright/test";
import { AxeBuilder } from "@axe-core/playwright";

const THEMES = ["dark", "light", "noctis", "azureus", "uva", "bordo", "lux", "hibernus"];

const boot = async (page) => {
  await page.goto("/");
  await expect(page.locator("[data-boot]")).toHaveCount(0, { timeout: 10_000 });
};

const withTheme = async (page, theme) => {
  await page.addInitScript((chosen) => {
    localStorage.setItem("bd-term-opts", JSON.stringify({ theme: chosen }));
  }, theme);
  await boot(page);
};

const scan = (page) =>
  new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();

for (const theme of THEMES) {
  test(`aucune violation d'accessibilité sur le thème ${theme}`, async ({ page }) => {
    await withTheme(page, theme);

    const { violations } = await scan(page);

    expect(violations.map((entry) => `${entry.id}: ${entry.nodes.length}`)).toEqual([]);
  });
}

test("le mouvement réduit coupe les animations", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await boot(page);

  const animated = await page.evaluate(
    () =>
      [...document.querySelectorAll("*")].filter(
        (node) => getComputedStyle(node).animationName !== "none",
      ).length,
  );

  expect(animated).toBe(0);
});

test("toutes les cibles interactives font au moins 44 px", async ({ page }) => {
  await boot(page);

  const small = await page.evaluate(() =>
    [
      ...document.querySelectorAll(
        'button:not([data-suggestion]):not([data-tech]):not([data-ctl="tl"])',
      ),
    ]
      .filter((node) => node.offsetParent !== null)
      .map((node) => ({
        h: node.getBoundingClientRect().height,
        t: node.textContent.trim().slice(0, 20),
      }))
      .filter((entry) => entry.h < 44),
  );

  expect(small).toEqual([]);
});

test("toute l'interface est atteignable au clavier", async ({ page }) => {
  await boot(page);

  const reachable = await page.evaluate(
    () =>
      [...document.querySelectorAll("button, input, a[href], [tabindex='0']")].filter(
        (node) => node.offsetParent !== null && node.tabIndex >= 0,
      ).length,
  );

  expect(reachable).toBeGreaterThan(10);
});

// L'ambre du theme clair est trop pale pour du texte : le decoratif garde sa teinte,
// le texte prend une variante plus sombre.
test("le thème clair distingue l'ambre décoratif de l'ambre textuel", async ({ page }) => {
  await withTheme(page, "light");

  const { decorative, text } = await page.evaluate(() => {
    const root = document.querySelector(".tm");
    const styles = getComputedStyle(root);

    return {
      decorative: styles.getPropertyValue("--acc").trim(),
      text: styles.getPropertyValue("--acc-text").trim(),
    };
  });

  expect(decorative, "la teinte décorative ne change pas").toBe("#e6a000");
  expect(text).not.toBe(decorative);
});
