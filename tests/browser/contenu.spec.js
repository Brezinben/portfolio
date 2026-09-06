import { expect, test } from "@playwright/test";

const booted = (page) => expect(page.locator("[data-boot]")).toHaveCount(0, { timeout: 15_000 });

// Le depot est prive : le contenu est servi a cote de la page, et nulle part ailleurs.
test("le contenu est chargé par une URL relative, à côté de la page", async ({ page }) => {
  const asked = [];

  page.on("request", (request) => {
    if (request.url().endsWith("/content.json")) {
      asked.push(request.url());
    }
  });

  await page.goto("/");
  await booted(page);

  expect(asked).toHaveLength(1);
  expect(asked[0]).toBe(`${new URL(page.url()).origin}/content.json`);
});

test("le contenu servi remplit la page", async ({ page }) => {
  await page.goto("/");
  await booted(page);

  await expect(page.locator('[data-pane="main"]')).toContainText("bd whoami --verbose");
  await expect(page.getByRole("img", { name: "Benjamin" })).toBeVisible();
});

// Sans contenu, la page ne se rabat sur rien : elle panique et propose la version texte.
test("un contenu en échec mène à la panique", async ({ page }) => {
  await page.route("**/content.json", (route) => route.fulfill({ status: 500 }));
  await page.goto("/");

  await expect(page.locator("[data-boot]")).toContainText("panic: content.json not found", {
    timeout: 15_000,
  });
  await expect(
    page.locator("[data-boot]").getByRole("link", { name: "version texte" }),
  ).toBeVisible();
});

test("un JSON illisible mène à la panique", async ({ page }) => {
  await page.route("**/content.json", (route) =>
    route.fulfill({ body: "{ pas du json", contentType: "application/json" }),
  );
  await page.goto("/");

  await expect(page.locator("[data-boot]")).toContainText("panic: content.json not found", {
    timeout: 15_000,
  });
});
