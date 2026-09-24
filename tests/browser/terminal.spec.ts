import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

const BOOT_MS = 2000;

test("should boot the terminal and show whoami", async ({ page }) => {
  await page.goto("/");

  await expect(page.locator('[data-pane="main"]')).toContainText("bd whoami --verbose", {
    timeout: 10_000,
  });
  await expect(page.locator('[data-pane="nav"]')).toContainText("sections");
  await expect(page.locator('[data-pane="out"]')).toContainText("Développeur IA / Full Stack");
  await expect(page.getByRole("img", { name: "Benjamin" })).toBeVisible();
  await expect(page.getByRole("img", { name: "David" })).toBeVisible();
});

test("should render the three panes", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator('[data-pane="main"]')).toBeVisible();

  await Promise.all(
    ["nav", "main", "out"].map((pane) => {
      return expect(page.locator(`[data-pane="${pane}"]`)).toHaveCount(1);
    }),
  );
});

// L'écran de boot dure au minimum deux secondes : valeur figée après itération. Mesurer
// l'apparition du contenu ne prouverait rien, puisqu'il est rendu sous l'écran de boot.
test("should hold the boot for at least two seconds", async ({ page }) => {
  const started = Date.now();

  await page.goto("/");
  await expect(page.locator("[data-boot]")).toBeVisible();
  await expect(page.locator("[data-boot]")).toHaveCount(0, { timeout: 10_000 });

  expect(Date.now() - started).toBeGreaterThanOrEqual(BOOT_MS);
});

// Le plancher est un effet, et la section impact annonce des animations désactivables.
// Un visiteur qui a réglé son système ne doit pas attendre devant un log qu'il n'a pas
// demandé : il ne reste que le temps de charger le contenu.
test("should drop the boot floor under reduced motion", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });

  const started = Date.now();

  await page.goto("/");
  await expect(page.locator("[data-boot]")).toHaveCount(0, { timeout: 10_000 });

  expect(Date.now() - started).toBeLessThan(BOOT_MS);
});

for (const [geste, jouer] of [
  [
    "a key",
    (page: Page) => {
      return page.keyboard.press("Enter");
    },
  ],
  [
    "a click",
    (page: Page) => {
      return page.locator("[data-boot]").click();
    },
  ],
] as const) {
  test(`should cut the boot short on ${geste}`, async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("[data-boot]")).toBeVisible();

    const started = Date.now();

    await jouer(page);
    await expect(page.locator("[data-boot]")).toHaveCount(0, { timeout: 10_000 });

    expect(Date.now() - started).toBeLessThan(BOOT_MS);
  });
}

// La touche qui abrège s'arrête là. Sinon le visiteur tape une commande sans le vouloir.
test("should not send the key that cuts the boot short into the command line", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("[data-boot]")).toBeVisible();
  await page.keyboard.press("a");
  await expect(page.locator("[data-boot]")).toHaveCount(0, { timeout: 10_000 });

  await expect(page.getByLabel("Commande")).toHaveValue("");
});

// Le seul tiers admis est la mesure d'audience auto-hébergée, différée et facultative.
// Une police distante ou un CDN trahiraient la promesse en premier.
test("should make no external request apart from the audience measurement", async ({ page }) => {
  const external: string[] = [],
    allowed = ["http://127.0.0.1", "https://analytics.brezinben.dpdns.org"];

  page.on("request", (request) => {
    if (
      !allowed.some((prefix) => {
        return request.url().startsWith(prefix);
      })
    ) {
      external.push(request.url());
    }
  });

  await page.goto("/");
  await expect(page.getByRole("img", { name: "Benjamin" })).toBeVisible({ timeout: 10_000 });

  expect(external).toEqual([]);
});

// Le style calculé fait foi, et non les pixels : un navigateur ne peint pas le curseur
// dans un instantané. L'ambre textuel, car le décoratif tient 2,1:1 en thème clair.
for (const [theme, amber] of [
  ["dark", "rgb(245, 184, 59)"],
  ["light", "rgb(143, 95, 0)"],
]) {
  test(`should give the command line a block caret in accent on the ${theme} theme`, async ({
    page,
  }) => {
    await page.addInitScript((choisi) => {
      localStorage["bd-term-opts"] = JSON.stringify({ anim: true, out: true, theme: choisi });
    }, theme);
    await page.goto("/");
    await expect(page.locator("[data-boot]")).toHaveCount(0, { timeout: 10_000 });

    const drawn = await page.getByLabel("Commande").evaluate((node) => {
      const style = getComputedStyle(node);

      return [style.caretColor, style.getPropertyValue("caret-shape")];
    });

    expect(drawn).toEqual([amber, "block"]);
  });
}
