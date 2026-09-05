import { expect, test } from "@playwright/test";

const boot = async (page) => {
  await page.goto("/");
  await expect(page.locator("[data-boot]")).toHaveCount(0, { timeout: 10_000 });
};

const opts = (page) => page.getByRole("button", { name: "options" });

test("le bouton options ouvre la modale et le focus y entre", async ({ page }) => {
  await boot(page);
  await opts(page).click();

  const dialog = page.getByRole("dialog", { name: "Options d'affichage" });

  await expect(dialog).toBeVisible();
  await expect(dialog.locator(":focus")).toHaveCount(1);
});

test("les huit thèmes sont proposés", async ({ page }) => {
  await boot(page);
  await opts(page).click();

  const labels = ["ambra", "solis", "noctis", "azureus", "uva", "bordo", "lux", "hibernus"];

  await Promise.all(
    labels.map((label) => expect(page.getByRole("button", { name: label })).toHaveCount(1)),
  );
});

test("choisir un thème l'applique immédiatement", async ({ page }) => {
  await boot(page);
  await opts(page).click();
  await page.getByRole("button", { name: "noctis" }).click();

  await expect(page.locator(".tm")).toHaveAttribute("data-theme", "noctis");
});

test("échap ferme la modale et rend le focus au bouton", async ({ page }) => {
  await boot(page);
  await opts(page).click();
  await page.getByRole("dialog").press("Escape");

  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(opts(page)).toBeFocused();
});

// Les themes sont sur plusieurs lignes : les quatre fleches y naviguent, et sortir par le
// bas mene au premier reglage.
test("les quatre flèches naviguent dans la grille des thèmes", async ({ page }) => {
  await boot(page);
  await opts(page).click();

  const dialog = page.getByRole("dialog");

  await dialog.press("ArrowRight");
  await expect(page.locator(".tm")).toHaveAttribute("data-theme", "light");

  await dialog.press("ArrowDown");
  await expect(page.locator(".tm"), "la flèche bas descend d'une ligne").not.toHaveAttribute(
    "data-theme",
    "light",
  );

  await dialog.press("ArrowUp");
  await expect(page.locator(".tm")).toHaveAttribute("data-theme", "light");

  await dialog.press("ArrowLeft");
  await expect(page.locator(".tm")).toHaveAttribute("data-theme", "dark");
});

// Le reglage modifie doit etre celui qui a le focus, quel que soit le chemin pour y
// arriver : un compteur separe se desynchronisait de la tabulation.
test("la flèche droite modifie le réglage qui a le focus", async ({ page }) => {
  await boot(page);
  await opts(page).click();

  const animations = page.getByRole("button", { name: /animations/ });

  await animations.focus();
  await animations.press("ArrowRight");

  await expect(animations).toHaveAttribute("aria-pressed", "false");
  await expect(
    page.getByRole("button", { name: /output pane/ }),
    "le voisin ne bouge pas",
  ).toHaveAttribute("aria-pressed", "true");
});

test("depuis la dernière ligne de thèmes, la flèche bas atteint les réglages", async ({ page }) => {
  await boot(page);
  await opts(page).click();

  const dialog = page.getByRole("dialog");

  // Le focus entre dans la modale au tick suivant. Sans cette attente, la premiere fleche
  // part avant, et le parcours commence d'ailleurs que du theme actif.
  await expect(dialog.locator(":focus")).toHaveCount(1);

  await Array.from({ length: 6 }).reduce(
    (chain) => chain.then(() => dialog.press("ArrowDown")),
    Promise.resolve(),
  );

  await expect(page.locator("[data-toggle]:focus")).toHaveCount(1);
});

test("aucun réglage de taille du texte n'est proposé", async ({ page }) => {
  await boot(page);
  await opts(page).click();

  await expect(page.getByRole("dialog")).not.toContainText("taille");
});

// Les réglages sont conservés sur l'appareil, et la lecture filtre sur six clés.
test("le thème choisi survit à un rechargement", async ({ page }) => {
  await boot(page);
  await opts(page).click();
  await page.getByRole("button", { name: "bordo" }).click();
  await page.getByRole("dialog").press("Escape");

  await page.reload();
  await expect(page.locator("[data-boot]")).toHaveCount(0, { timeout: 10_000 });

  await expect(page.locator(".tm")).toHaveAttribute("data-theme", "bordo");
});

test("une clé étrangère dans le stockage est ignorée", async ({ page }) => {
  await boot(page);
  await page.evaluate(() =>
    localStorage.setItem("bd-term-opts", JSON.stringify({ section: "piraté", theme: "uva" })),
  );
  await page.reload();
  await expect(page.locator("[data-boot]")).toHaveCount(0, { timeout: 10_000 });

  await expect(page.locator(".tm")).toHaveAttribute("data-theme", "uva");
  await expect(page.locator('[data-pane="main"]')).toContainText("bd whoami --verbose");
});

test("un stockage illisible n'empêche pas le démarrage", async ({ page }) => {
  await boot(page);
  await page.evaluate(() => localStorage.setItem("bd-term-opts", "{ pas du json"));
  await page.reload();

  await expect(page.locator("[data-boot]")).toHaveCount(0, { timeout: 10_000 });
  await expect(page.locator('[data-pane="main"]')).toContainText("bd whoami --verbose");
});

// Deux réglages persistés qui ne feraient rien seraient le défaut que la taille du texte
// avait déjà : ils doivent agir sur la page.
test("masquer le volet de sortie le retire de la page", async ({ page }) => {
  await boot(page);
  await expect(page.locator('[data-pane="out"]')).toBeVisible();

  await opts(page).click();
  await page.getByRole("button", { name: /output pane/ }).click();
  await page.getByRole("dialog").press("Escape");

  await expect(page.locator('[data-pane="out"]')).toBeHidden();
});

test("la tabulation boucle dans la modale", async ({ page }) => {
  await boot(page);
  await opts(page).click();

  const dialog = page.getByRole("dialog");

  // Les tabulations doivent s'enchaîner : les paralléliser ne testerait plus la boucle.
  await Array.from({ length: 14 }).reduce(
    (chain) => chain.then(() => dialog.press("Tab")),
    Promise.resolve(),
  );

  await expect(dialog.locator(":focus"), "le focus ne doit pas sortir de la modale").toHaveCount(1);
});
