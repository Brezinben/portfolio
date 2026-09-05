import { expect, test } from "@playwright/test";

const BUDGET_KO = 150;

// Le budget est un test, pas un commentaire. Il se mesure sur ce qui traverse réellement
// le réseau, compression comprise, et non sur la taille des fichiers sur le disque.
test("le premier chargement tient dans le budget de poids", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("img", { name: "Benjamin" })).toBeVisible({ timeout: 10_000 });
  await expect(page.locator("[data-boot]")).toHaveCount(0, { timeout: 10_000 });

  const measured = await page.evaluate(() => {
    const [navigation] = performance.getEntriesByType("navigation");
    const resources = performance.getEntriesByType("resource");

    return {
      détail: resources.map((entry) => ({
        ko: Math.round(entry.transferSize / 102.4) / 10,
        url: entry.name.replace(location.origin, ""),
      })),
      total:
        navigation.transferSize + resources.reduce((sum, entry) => sum + entry.transferSize, 0),
    };
  });

  const totalKo = Math.round(measured.total / 102.4) / 10;

  expect(totalKo, `détail : ${JSON.stringify(measured.détail)}`).toBeLessThanOrEqual(BUDGET_KO);
});
