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
    ["nav", "main", "out"].map((pane) =>
      expect(page.locator(`[data-pane="${pane}"]`)).toHaveCount(1),
    ),
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
  ["a key", async (page: Page) => page.keyboard.press("Enter")],
  ["a click", async (page: Page) => page.locator("[data-boot]").click()],
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
    allowed = ["http://127.0.0.1", "https://umami.brezinben.dpdns.org"];

  page.on("request", (request) => {
    if (!allowed.some((prefix) => request.url().startsWith(prefix))) {
      external.push(request.url());
    }
  });

  await page.goto("/");
  await expect(page.getByRole("img", { name: "Benjamin" })).toBeVisible({ timeout: 10_000 });

  expect(external).toEqual([]);
});
