import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

// La premiere visite suit la preference du systeme : ces tests partent du thème sombre
// pour ne pas dependre du reglage de la machine qui les lance.
const boot = async (page: Page) => {
    await page.emulateMedia({ colorScheme: "dark" });
    await page.goto("/");
    await expect(page.locator("[data-boot]")).toHaveCount(0, { timeout: 10_000 });
  },
  opts = (page: Page) => page.getByRole("button", { name: "options" }),
  // Le focus entre dans la modale au tick suivant. Sans cette attente, une touche envoyée
  // juste après part avant lui : la modale ne la voit pas, et la page l'ignore parce que la
  // modale est ouverte. Les deux gestionnaires laissent tomber la touche.
  openOpts = async (page: Page) => {
    await opts(page).click();

    const dialog = page.getByRole("dialog");

    await expect(dialog.locator(":focus")).toHaveCount(1);

    return dialog;
  };

test("le bouton options ouvre la modale et le focus y entre", async ({ page }) => {
  await boot(page);
  await opts(page).click();

  const dialog = page.getByRole("dialog", { name: "Options d'affichage" });

  await expect(dialog).toBeVisible();
  await expect(dialog.locator(":focus")).toHaveCount(1);
});

test("les huit thèmes sont proposés", async ({ page }) => {
  await boot(page);
  await openOpts(page);

  const labels = ["ambra", "solis", "noctis", "azureus", "uva", "bordo", "lux", "hibernus"];

  await Promise.all(
    labels.map((label) => expect(page.getByRole("button", { name: label })).toHaveCount(1)),
  );
});

test("choisir un thème l'applique immédiatement", async ({ page }) => {
  await boot(page);
  await openOpts(page);
  await page.getByRole("button", { name: "noctis" }).click();

  await expect(page.locator(".tm")).toHaveAttribute("data-theme", "noctis");
});

test("échap ferme la modale et rend le focus au bouton", async ({ page }) => {
  await boot(page);
  await openOpts(page);
  await page.getByRole("dialog").press("Escape");

  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(opts(page)).toBeFocused();
});

// Les themes sont sur plusieurs lignes : les quatre fleches y naviguent, et sortir par le
// bas mene au premier reglage.
test("les quatre flèches naviguent dans la grille des thèmes", async ({ page }) => {
  await boot(page);
  const dialog = await openOpts(page);

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
  await openOpts(page);

  const animations = page.getByRole("button", { name: /animations/ });

  await animations.focus();
  await animations.press("ArrowRight");

  await expect(animations).toHaveAttribute("aria-pressed", "false");
  await expect(
    page.getByRole("button", { name: /output pane/ }),
    "le voisin ne bouge pas",
  ).toHaveAttribute("aria-pressed", "true");
});

// Le depart est le dernier theme, pas le theme actif : compter les pressions depuis le
// theme actif depend du nombre de colonnes, donc de la largeur de la fenetre. Les
// pressions en trop tombent alors dans le vide et le test ne peut plus echouer.
test("depuis la dernière ligne de thèmes, la flèche bas atteint les réglages", async ({ page }) => {
  await boot(page);

  const dialog = await openOpts(page);

  await page.getByRole("button", { name: "hibernus" }).focus();
  await dialog.press("ArrowDown");

  await expect(page.locator("[data-toggle]:focus")).toHaveCount(1);
});

test("la première visite suit la préférence claire du système", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/");
  await expect(page.locator("[data-boot]")).toHaveCount(0, { timeout: 10_000 });

  await expect(page.locator(".tm")).toHaveAttribute("data-theme", "light");
});

test("la première visite suit la préférence sombre du système", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/");
  await expect(page.locator("[data-boot]")).toHaveCount(0, { timeout: 10_000 });

  await expect(page.locator(".tm")).toHaveAttribute("data-theme", "dark");
});

// Le choix conserve prime sur la preference du systeme.
test("un thème déjà choisi ignore la préférence du système", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.addInitScript(() =>
    localStorage.setItem("bd-term-opts", JSON.stringify({ theme: "bordo" })),
  );
  await page.goto("/");
  await expect(page.locator("[data-boot]")).toHaveCount(0, { timeout: 10_000 });

  await expect(page.locator(".tm")).toHaveAttribute("data-theme", "bordo");
});

test("aucun réglage de taille du texte n'est proposé", async ({ page }) => {
  await boot(page);
  await openOpts(page);

  await expect(page.getByRole("dialog")).not.toContainText("taille");
});

// Les réglages sont conservés sur l'appareil, et la lecture filtre sur six clés.
test("le thème choisi survit à un rechargement", async ({ page }) => {
  await boot(page);
  await openOpts(page);
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

  await openOpts(page);
  await page.getByRole("button", { name: /output pane/ }).click();
  await page.getByRole("dialog").press("Escape");

  await expect(page.locator('[data-pane="out"]')).toBeHidden();
});

test("la tabulation boucle dans la modale", async ({ page }) => {
  await boot(page);
  const dialog = await openOpts(page);

  // Les tabulations doivent s'enchaîner : les paralléliser ne testerait plus la boucle.
  await Array.from({ length: 14 }).reduce<Promise<unknown>>(
    (chain) => chain.then(() => dialog.press("Tab")),
    Promise.resolve(),
  );

  await expect(dialog.locator(":focus"), "le focus ne doit pas sortir de la modale").toHaveCount(1);
});

// Les deux commandes ne rendaient qu'un écho : leur descripteur n'était appliqué nulle
// part. Rien ne le signalait, puisque rien ne les testait.
test("la commande theme applique le thème nommé", async ({ page }) => {
  await boot(page);

  const cli = page.getByLabel("Commande");

  await cli.fill("theme noctis");
  await cli.press("Enter");

  await expect(page.locator("[data-theme]")).toHaveAttribute("data-theme", "noctis");
  await expect(page.locator("[data-journal]")).toContainText("noctis");
});

test("la commande options ouvre la modale", async ({ page }) => {
  await boot(page);

  const cli = page.getByLabel("Commande");

  await cli.fill("options");
  await cli.press("Enter");

  await expect(page.getByRole("dialog", { name: "Options d'affichage" })).toBeVisible();
});

// La modale a deux ouvrants depuis que la commande existe. Echap doit rendre le focus a
// celui qui a ouvert, et non au bouton de l'en-tete que le visiteur n'a jamais touche.
test("échap rend le focus à la saisie quand la commande a ouvert la modale", async ({ page }) => {
  await boot(page);

  const cli = page.getByLabel("Commande");

  await cli.fill("options");
  await cli.press("Enter");

  await expect(page.getByRole("dialog")).toBeVisible();

  await page.keyboard.press("Escape");

  await expect(page.getByRole("dialog")).toBeHidden();
  await expect(cli).toBeFocused();
});
