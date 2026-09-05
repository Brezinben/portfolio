import { expect, test } from "@playwright/test";

const REMOTE = "**/raw.githubusercontent.com/**";

const booted = (page) => expect(page.locator("[data-boot]")).toHaveCount(0, { timeout: 15_000 });

// Le contenu vit sur GitHub : le modifier ne demande plus d'acces au serveur.
test("le contenu est chargé depuis GitHub", async ({ page }) => {
  const asked = [];

  page.on("request", (request) => {
    if (request.url().includes("raw.githubusercontent.com")) {
      asked.push(request.url());
    }
  });

  await page.goto("/");
  await booted(page);

  expect(asked).toHaveLength(1);
  expect(asked[0]).toContain("/Brezinben/portfolio/main/production/content.json");
});

// Sans repli, la page dependrait de la disponibilite de GitHub pour afficher quoi que
// ce soit.
test("GitHub injoignable, la copie locale prend le relais", async ({ page }) => {
  await page.route(REMOTE, (route) => route.abort());
  await page.goto("/");
  await booted(page);

  await expect(page.locator('[data-pane="main"]')).toContainText("bd whoami --verbose");
  await expect(page.getByRole("img", { name: "Benjamin" })).toBeVisible();
});

test("GitHub en erreur, la copie locale prend le relais", async ({ page }) => {
  await page.route(REMOTE, (route) => route.fulfill({ status: 404 }));
  await page.goto("/");
  await booted(page);

  await expect(page.locator('[data-pane="main"]')).toContainText("bd whoami --verbose");
});

test("un JSON distant corrompu retombe sur la copie locale", async ({ page }) => {
  await page.route(REMOTE, (route) =>
    route.fulfill({ body: "{ pas du json", contentType: "application/json" }),
  );
  await page.goto("/");
  await booted(page);

  await expect(page.locator('[data-pane="main"]')).toContainText("bd whoami --verbose");
});

// L'ecran de panique ne s'affiche que si les deux sources echouent.
test("les deux sources en échec mènent à la panique", async ({ page }) => {
  await page.route(REMOTE, (route) => route.abort());
  await page.route("**/content.json", (route) => route.fulfill({ status: 500 }));
  await page.goto("/");

  await expect(page.locator("[data-boot]")).toContainText("panic: content.json not found", {
    timeout: 15_000,
  });
  await expect(page.getByRole("link", { name: "version texte" })).toBeVisible();
});
