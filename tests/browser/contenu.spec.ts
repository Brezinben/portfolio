import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

const booted = (page: Page) =>
  expect(page.locator("[data-boot]")).toHaveCount(0, { timeout: 15_000 });

// Le depot est prive : le contenu est servi a cote de la page, et nulle part ailleurs.
test("should load the content from a relative URL next to the page", async ({ page }) => {
  const asked: string[] = [];

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

test("should fill the page with the served content", async ({ page }) => {
  await page.goto("/");
  await booted(page);

  await expect(page.locator('[data-pane="main"]')).toContainText("bd whoami --verbose");
  await expect(page.getByRole("img", { name: "Benjamin" })).toBeVisible();
});

// Sans contenu, la page ne se rabat sur rien : elle panique et propose la version texte.
test("should panic when the content fails", async ({ page }) => {
  await page.route("**/content.json", (route) => route.fulfill({ status: 500 }));
  await page.goto("/");

  await expect(page.locator("[data-boot]")).toContainText("panic: content.json not found", {
    timeout: 15_000,
  });
  await expect(
    page.locator("[data-boot]").getByRole("link", { name: "version texte" }),
  ).toBeVisible();
});

test("should panic when the JSON is unreadable", async ({ page }) => {
  await page.route("**/content.json", (route) =>
    route.fulfill({ body: "{ pas du json", contentType: "application/json" }),
  );
  await page.goto("/");

  await expect(page.locator("[data-boot]")).toContainText("panic: content.json not found", {
    timeout: 15_000,
  });
});
