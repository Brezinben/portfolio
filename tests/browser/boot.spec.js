import { expect, test } from "@playwright/test";
import { setTimeout } from "node:timers/promises";

const PANIC = "panic: content.json not found";

// Les quatre cas de démarrage, servis par interception plutôt qu'en abîmant production/.
test("un contenu valide mène jusqu'au terminal", async ({ page }) => {
  await page.goto("/");

  await expect(page.locator("[data-boot]")).toHaveCount(0, { timeout: 10_000 });
  await expect(page.locator('[data-pane="main"]')).toContainText("bd whoami --verbose");
});

test("un contenu absent affiche la panique, pas un terminal vide", async ({ page }) => {
  await page.route("**/content.json", (route) => route.fulfill({ status: 404 }));
  await page.goto("/");

  await expect(page.locator("[data-boot]")).toContainText(PANIC, { timeout: 10_000 });
  await expect(page.locator("[data-boot]")).toContainText("HTTP 404");
  await expect(page.locator("[data-boot]")).toContainText(
    "Le contenu de ce portfolio vit dans un JSON.",
  );
});

test("un contenu malformé est détecté et nommé", async ({ page }) => {
  await page.route("**/content.json", (route) =>
    route.fulfill({ body: '{"profile":{}}', contentType: "application/json" }),
  );
  await page.goto("/");

  await expect(page.locator("[data-boot]")).toContainText(PANIC, { timeout: 10_000 });
  await expect(page.locator("[data-boot]")).toContainText("sections manquantes ou vides");
});

// Le boot attend le contenu : il ne doit jamais céder la place à une coquille vide.
test("un contenu lent garde l'écran de boot affiché", async ({ page }) => {
  await page.route("**/content.json", async (route) => {
    await setTimeout(3000);
    await route.continue();
  });
  await page.goto("/");

  await expect(page.locator("[data-boot]")).toBeVisible();
  await page.waitForTimeout(2500);
  await expect(
    page.locator("[data-boot]"),
    "le boot doit tenir tant que le JSON n'est pas là",
  ).toBeVisible();
  await expect(page.locator("[data-boot]")).toHaveCount(0, { timeout: 15_000 });
});

// La panique n'arrive que si les deux sources echouent : c'est la chaine distant puis
// local. Le retry rend ensuite la source locale disponible.
test("l'écran de panique offre retry et la version texte", async ({ page }) => {
  let broken = true;

  await page.route("**/raw.githubusercontent.com/**", (route) => route.abort());
  await page.route("**/content.json", (route) =>
    broken ? route.fulfill({ status: 500 }) : route.continue(),
  );
  await page.goto("/");

  await expect(page.locator("[data-boot]")).toContainText(PANIC, { timeout: 15_000 });
  await expect(page.getByRole("link", { name: "version texte" })).toHaveAttribute(
    "href",
    "texte.html",
  );

  broken = false;
  await page.getByRole("button", { name: "retry" }).click();

  await expect(page.locator("[data-boot]")).toHaveCount(0, { timeout: 15_000 });
  await expect(page.locator('[data-pane="main"]')).toContainText("bd whoami --verbose");
});
