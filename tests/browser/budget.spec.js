import { expect, test } from "@playwright/test";

const BUDGET_KO = 150;

// Le budget est un test, pas un commentaire. Il se mesure sur ce qui traverse réellement
// le réseau, compression comprise, et non sur la taille des fichiers sur le disque.
//
// Le contenu est hors budget par décision. Il change sans redéploiement, donc son poids ne
// dit rien de celui du code servi. L'exclure explicitement est nécessaire : la page charge
// le contenu depuis GitHub, qui n'envoie pas d'en-tête timing-allow-origin, donc le
// navigateur rapporte un transferSize nul. Sans cette ligne, le total baisserait tout seul
// et personne ne saurait dire si le code a maigri ou si la mesure a cessé de compter.
test("le premier chargement tient dans le budget de poids", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("img", { name: "Benjamin" })).toBeVisible({ timeout: 10_000 });
  await expect(page.locator("[data-boot]")).toHaveCount(0, { timeout: 10_000 });

  const measured = await page.evaluate(() => {
    const [navigation] = performance.getEntriesByType("navigation");
    const resources = performance
      .getEntriesByType("resource")
      .filter((entry) => !entry.name.endsWith("content.json"));

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
