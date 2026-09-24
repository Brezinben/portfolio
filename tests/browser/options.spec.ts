import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

// La premiere visite suit la preference du systeme : ces tests partent du thème sombre
// pour ne pas dependre du reglage de la machine qui les lance.
const boot = async (page: Page) => {
    await page.emulateMedia({ colorScheme: "dark" });
    await page.goto("/");
    await expect(page.locator("[data-boot]")).toHaveCount(0, { timeout: 10_000 });
  },
  opts = (page: Page) => {
    return page.getByRole("button", { name: "options" });
  },
  // Le focus entre dans la modale au tick suivant. Sans cette attente, une touche envoyée
  // juste après part avant lui : la modale ne la voit pas, et la page l'ignore parce que la
  // modale est ouverte. Les deux gestionnaires laissent tomber la touche.
  openOpts = async (page: Page) => {
    await opts(page).click();

    const dialog = page.getByRole("dialog");

    await expect(dialog.locator(":focus")).toHaveCount(1);

    return dialog;
  };

test("should open the modal and move the focus into it on the options button", async ({ page }) => {
  await boot(page);
  await opts(page).click();

  const dialog = page.getByRole("dialog", { name: "Options d'affichage" });

  await expect(dialog).toBeVisible();
  await expect(dialog.locator(":focus")).toHaveCount(1);
});

test("should offer the eight themes", async ({ page }) => {
  await boot(page);
  await openOpts(page);

  const labels = ["ambra", "solis", "noctis", "azureus", "uva", "bordo", "lux", "hibernus"];

  await Promise.all(
    labels.map((label) => {
      return expect(page.getByRole("button", { name: label })).toHaveCount(1);
    }),
  );
});

test("should apply a theme as soon as it is chosen", async ({ page }) => {
  await boot(page);
  await openOpts(page);
  await page.getByRole("button", { name: "noctis" }).click();

  await expect(page.locator(".tm")).toHaveAttribute("data-theme", "noctis");
});

test("should close the modal and give the focus back to the button on escape", async ({ page }) => {
  await boot(page);
  await openOpts(page);
  await page.getByRole("dialog").press("Escape");

  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(opts(page)).toBeFocused();
});

// Les themes sont sur plusieurs lignes : les quatre fleches y naviguent, et sortir par le
// bas mene au premier reglage.
test("should move through the theme grid with the four arrows", async ({ page }) => {
  await boot(page);
  const dialog = await openOpts(page);

  await dialog.press("ArrowRight");
  await expect(page.locator(".tm")).toHaveAttribute("data-theme", "light");

  await dialog.press("ArrowDown");
  await expect(page.locator(".tm"), "the down arrow moves one row down").not.toHaveAttribute(
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
test("should change the setting that holds the focus on arrow right", async ({ page }) => {
  await boot(page);
  await openOpts(page);

  const animations = page.getByRole("button", { name: /animations/ });

  await animations.focus();
  await animations.press("ArrowRight");

  await expect(animations).toHaveAttribute("aria-pressed", "false");
  await expect(
    page.getByRole("button", { name: /output pane/ }),
    "the neighbour does not move",
  ).toHaveAttribute("aria-pressed", "true");
});

// Le depart est le dernier theme, pas le theme actif : compter les pressions depuis le
// theme actif depend du nombre de colonnes, donc de la largeur de la fenetre. Les
// pressions en trop tombent alors dans le vide et le test ne peut plus echouer.
test("should reach the settings on arrow down from the last theme row", async ({ page }) => {
  await boot(page);

  const dialog = await openOpts(page);

  await page.getByRole("button", { name: "hibernus" }).focus();
  await dialog.press("ArrowDown");

  await expect(page.locator("[data-toggle]:focus")).toHaveCount(1);
});

test("should follow the light preference of the system on the first visit", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/");
  await expect(page.locator("[data-boot]")).toHaveCount(0, { timeout: 10_000 });

  await expect(page.locator(".tm")).toHaveAttribute("data-theme", "light");
});

test("should follow the dark preference of the system on the first visit", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/");
  await expect(page.locator("[data-boot]")).toHaveCount(0, { timeout: 10_000 });

  await expect(page.locator(".tm")).toHaveAttribute("data-theme", "dark");
});

// Le choix conserve prime sur la preference du systeme.
test("should ignore the system preference when a theme is already chosen", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.addInitScript(() => {
    localStorage.setItem("bd-term-opts", JSON.stringify({ theme: "bordo" }));
  });
  await page.goto("/");
  await expect(page.locator("[data-boot]")).toHaveCount(0, { timeout: 10_000 });

  await expect(page.locator(".tm")).toHaveAttribute("data-theme", "bordo");
});

test("should offer no text size setting", async ({ page }) => {
  await boot(page);
  await openOpts(page);

  await expect(page.getByRole("dialog")).not.toContainText("taille");
});

// Les réglages sont conservés sur l'appareil, et la lecture filtre sur six clés.
test("should keep the chosen theme across a reload", async ({ page }) => {
  await boot(page);
  await openOpts(page);
  await page.getByRole("button", { name: "bordo" }).click();
  await page.getByRole("dialog").press("Escape");

  await page.reload();
  await expect(page.locator("[data-boot]")).toHaveCount(0, { timeout: 10_000 });

  await expect(page.locator(".tm")).toHaveAttribute("data-theme", "bordo");
});

test("should ignore a foreign key in the storage", async ({ page }) => {
  await boot(page);
  await page.evaluate(() => {
    localStorage.setItem("bd-term-opts", JSON.stringify({ section: "piraté", theme: "uva" }));
  });
  await page.reload();
  await expect(page.locator("[data-boot]")).toHaveCount(0, { timeout: 10_000 });

  await expect(page.locator(".tm")).toHaveAttribute("data-theme", "uva");
  await expect(page.locator('[data-pane="main"]')).toContainText("bd whoami --verbose");
});

test("should still boot with an unreadable storage", async ({ page }) => {
  await boot(page);
  await page.evaluate(() => {
    localStorage.setItem("bd-term-opts", "{ pas du json");
  });
  await page.reload();

  await expect(page.locator("[data-boot]")).toHaveCount(0, { timeout: 10_000 });
  await expect(page.locator('[data-pane="main"]')).toContainText("bd whoami --verbose");
});

// Deux réglages persistés qui ne feraient rien seraient le défaut que la taille du texte
// avait déjà : ils doivent agir sur la page.
test("should remove the output pane from the page when it is hidden", async ({ page }) => {
  await boot(page);
  await expect(page.locator('[data-pane="out"]')).toBeVisible();

  await openOpts(page);
  await page.getByRole("button", { name: /output pane/ }).click();
  await page.getByRole("dialog").press("Escape");

  await expect(page.locator('[data-pane="out"]')).toBeHidden();
});

test("should loop the tab key inside the modal", async ({ page }) => {
  await boot(page);
  const dialog = await openOpts(page);

  // Les tabulations doivent s'enchaîner : les paralléliser ne testerait plus la boucle.
  await Array.from({ length: 14 }).reduce<Promise<unknown>>((chain) => {
    return chain.then(() => {
      return dialog.press("Tab");
    });
  }, Promise.resolve());

  await expect(dialog.locator(":focus"), "the focus must not leave the modal").toHaveCount(1);
});

// Les deux commandes ne rendaient qu'un écho : leur descripteur n'était appliqué nulle
// part. Rien ne le signalait, puisque rien ne les testait.
test("should apply the named theme on the theme command", async ({ page }) => {
  await boot(page);

  const cli = page.getByLabel("Commande");

  await cli.fill("theme noctis");
  await cli.press("Enter");

  await expect(page.locator("[data-theme]")).toHaveAttribute("data-theme", "noctis");
  await expect(page.locator("[data-journal]")).toContainText("noctis");
});

test("should open the modal on the options command", async ({ page }) => {
  await boot(page);

  const cli = page.getByLabel("Commande");

  await cli.fill("options");
  await cli.press("Enter");

  await expect(page.getByRole("dialog", { name: "Options d'affichage" })).toBeVisible();
});

// La modale a deux ouvrants depuis que la commande existe. Echap doit rendre le focus a
// celui qui a ouvert, et non au bouton de l'en-tete que le visiteur n'a jamais touche.
test("should give the focus back to the command line on escape when the command opened the modal", async ({
  page,
}) => {
  await boot(page);

  const cli = page.getByLabel("Commande");

  await cli.fill("options");
  await cli.press("Enter");

  await expect(page.getByRole("dialog")).toBeVisible();

  await page.keyboard.press("Escape");

  await expect(page.getByRole("dialog")).toBeHidden();
  await expect(cli).toBeFocused();
});

// Sous mouvement réduit, la bascule des animations ne peut plus rien changer : la page
// coupe déjà tout. La laisser active ferait croire le contraire.
test("should lock the animation toggle under reduced motion", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await boot(page);
  await openOpts(page);

  const anim = page.locator("[data-opts] [data-toggle]").first();

  await expect(anim).toBeDisabled();
  await expect(anim).toContainText("système");
  await expect(page.locator("[data-opts] [data-toggle]").nth(1)).toBeEnabled();
});

// Le clavier de la modale ne doit pas contourner le verrou que le clic respecte.
test("should not toggle a locked option with the arrow", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await boot(page);
  await openOpts(page);

  const anim = page.locator("[data-opts] [data-toggle]").first();

  await page.keyboard.press("ArrowRight");

  await expect(anim).toContainText("système");
});
