import { expect, test } from "@playwright/test";

const BOOT_MS = 2000;

test("le terminal démarre et affiche whoami", async ({ page }) => {
  await page.goto("/");

  await expect(page.locator('[data-pane="main"]')).toContainText("bd whoami --verbose", {
    timeout: 10_000,
  });
  await expect(page.locator('[data-pane="nav"]')).toContainText("sections");
  await expect(page.locator('[data-pane="out"]')).toContainText("Développeur IA / Full Stack");
  await expect(page.getByRole("img", { name: "Benjamin" })).toBeVisible();
  await expect(page.getByRole("img", { name: "David" })).toBeVisible();
});

test("les trois volets sont présents", async ({ page }) => {
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
test("le boot dure au moins deux secondes", async ({ page }) => {
  const started = Date.now();

  await page.goto("/");
  await expect(page.locator("[data-boot]")).toBeVisible();
  await expect(page.locator("[data-boot]")).toHaveCount(0, { timeout: 10_000 });

  expect(Date.now() - started).toBeGreaterThanOrEqual(BOOT_MS);
});

// La page promet aucune requête tierce. Une police distante la trahirait en premier.
test("la page ne fait aucune requête externe", async ({ page }) => {
  const external = [];

  page.on("request", (request) => {
    if (!request.url().startsWith("http://127.0.0.1")) external.push(request.url());
  });

  await page.goto("/");
  await expect(page.getByRole("img", { name: "Benjamin" })).toBeVisible({ timeout: 10_000 });

  expect(external).toEqual([]);
});
