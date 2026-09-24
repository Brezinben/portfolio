import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

const booted = (page: Page) => {
  return expect(page.locator("[data-boot]")).toHaveCount(0, { timeout: 15_000 });
};

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

test("should panic when the JSON is unreadable", async ({ page }) => {
  await page.route("**/content.json", (route) => {
    return route.fulfill({ body: "{ pas du json", contentType: "application/json" });
  });
  await page.goto("/");

  await expect(page.locator("[data-boot]")).toContainText("panic: content.json not found", {
    timeout: 15_000,
  });
});
