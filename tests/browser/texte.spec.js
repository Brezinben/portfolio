import { expect, test } from "@playwright/test";

test("la version texte se charge sans script ni image", async ({ page }) => {
  await page.goto("/texte.html");

  await expect(page).toHaveTitle(/Benjamin David/);
  await expect(page.locator("html")).toHaveAttribute("lang", "fr");
  await expect(page.locator("script")).toHaveCount(0);
  await expect(page.locator("img")).toHaveCount(0);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Benjamin David");
});

test("la version texte renvoie vers la version terminal et vers llms.txt", async ({ page }) => {
  await page.goto("/texte.html");

  await expect(page.getByRole("link", { name: "Version terminal" })).toHaveAttribute(
    "href",
    "index.html",
  );
  await expect(page.getByRole("link", { name: "llms.txt" })).toHaveAttribute("href", "llms.txt");
});

// Le lien de secours de l'écran de panique pointe vers cette page : aucun lien
// de la version texte ne doit renvoyer vers un fichier du canvas.
test("aucun lien ne pointe vers le canvas", async ({ page }) => {
  await page.goto("/texte.html");

  const hrefs = await page
    .locator("a[href]")
    .evaluateAll((links) => links.map((link) => link.getAttribute("href")));

  expect(hrefs.filter((href) => href.includes(".dc.html"))).toEqual([]);
});

const ANNEXES = [
  ["/llms.txt", "text/plain"],
  ["/share.png", "image/png"],
];

test("les fichiers annexes sont servis", async ({ request }) => {
  const responses = await Promise.all(ANNEXES.map(([path]) => request.get(path)));

  for (const [index, response] of responses.entries()) {
    const [path, type] = ANNEXES[index];

    expect(response.status(), `${path} doit être servi`).toBe(200);
    expect(response.headers()["content-type"]).toContain(type);
  }
});
