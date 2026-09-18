import { expect, test } from "@playwright/test";
import { setTimeout } from "node:timers/promises";

const PANIC = "panic: content.json not found";

// Les quatre cas de démarrage, servis par interception plutôt qu'en abîmant src/.
test("should reach the terminal with a valid content", async ({ page }) => {
  await page.goto("/");

  await expect(page.locator("[data-boot]")).toHaveCount(0, { timeout: 10_000 });
  await expect(page.locator('[data-pane="main"]')).toContainText("bd whoami --verbose");
});

test("should show the panic screen instead of an empty terminal when the content is missing", async ({
  page,
}) => {
  await page.route("**/content.json", (route) => {
    return route.fulfill({ status: 404 });
  });
  await page.goto("/");

  await expect(page.locator("[data-boot]")).toContainText(PANIC, { timeout: 10_000 });
  await expect(page.locator("[data-boot]")).toContainText("HTTP 404");
  await expect(page.locator("[data-boot]")).toContainText(
    "Le contenu de ce portfolio vit dans un JSON.",
  );
});

test("should detect and name a malformed content", async ({ page }) => {
  await page.route("**/content.json", (route) => {
    return route.fulfill({ body: '{"profile":{}}', contentType: "application/json" });
  });
  await page.goto("/");

  await expect(page.locator("[data-boot]")).toContainText(PANIC, { timeout: 10_000 });
  await expect(page.locator("[data-boot]")).toContainText("sections manquantes ou vides");
});

// Le boot attend le contenu : il ne doit jamais céder la place à une coquille vide.
test("should keep the boot screen on while the content is slow", async ({ page }) => {
  await page.route("**/content.json", async (route) => {
    await setTimeout(3000);
    await route.continue();
  });
  await page.goto("/");

  await expect(page.locator("[data-boot]")).toBeVisible();
  await page.waitForTimeout(2500);
  await expect(
    page.locator("[data-boot]"),
    "the boot must hold as long as the JSON is missing",
  ).toBeVisible();
  await expect(page.locator("[data-boot]")).toHaveCount(0, { timeout: 15_000 });
});

// Le retry relance le meme chargement : il ne sert qu'une fois le contenu revenu.
test("should offer retry and the text version on the panic screen", async ({ page }) => {
  let broken = true;

  await page.route("**/content.json", (route) => {
    return broken ? route.fulfill({ status: 500 }) : route.continue();
  });
  await page.goto("/");

  await expect(page.locator("[data-boot]")).toContainText(PANIC, { timeout: 15_000 });
  await expect(
    page.locator("[data-boot]").getByRole("link", { name: "version texte" }),
  ).toHaveAttribute("href", "texte.html");

  broken = false;
  await page.getByRole("button", { name: "retry" }).click();

  await expect(page.locator("[data-boot]")).toHaveCount(0, { timeout: 15_000 });
  await expect(page.locator('[data-pane="main"]')).toContainText("bd whoami --verbose");
});
