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

// Noctis n'a qu'un vert : l'accent et le succes portaient la meme teinte, et la cle
// d'une paire JSON ne se distinguait plus de sa valeur.
test("le thème noctis distingue la clé de la valeur", async ({ page }) => {
  await withTheme(page, "noctis");

  const { key, value } = await page.evaluate(() => {
    const styles = getComputedStyle(document.querySelector(".tm"));

    return {
      key: styles.getPropertyValue("--acc-text").trim(),
      value: styles.getPropertyValue("--ok").trim(),
    };
  });

  expect(value).not.toBe(key);
});

// Aucune API ne signale un lecteur d'écran, et le détecter reviendrait à détecter un
// handicap. La page propose donc, elle ne devine pas : le premier élément focalisable
// annonce la version texte, et la personne choisit.
test("le premier élément focalisable mène à la version texte", async ({ page }) => {
  await boot(page);
  await page.keyboard.press("Tab");

  const skip = page.locator("a.skip");

  await expect(skip).toBeFocused();
  await expect(skip).toHaveAttribute("href", "texte.html");

  // Hors écran au repos, dans la fenêtre une fois focalisé. Un « toBeVisible » ne le dirait
  // pas : un élément posé à left:-9999px reste visible au sens de Playwright.
  const dedans = await skip.evaluate((node) => node.getBoundingClientRect().left >= 0);

  expect(dedans, "le lien doit entrer dans la fenêtre quand il reçoit le focus").toBe(true);

  const dehors = await skip.evaluate((node) => {
    node.blur();

    return node.getBoundingClientRect().right < 0;
  });

  expect(dehors, "le lien doit rester hors écran sans focus").toBe(true);
});

// Le lien doit survivre à un échec du script : c'est le repli de la page, pas une de ses
// fonctions. Il vit donc hors du composant Alpine et ne porte aucune variable de thème.
test("la version texte reste atteignable sans script", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();

  await page.goto("/");
  await page.keyboard.press("Tab");

  await expect(page.locator("a.skip")).toBeFocused();

  await context.close();
});
