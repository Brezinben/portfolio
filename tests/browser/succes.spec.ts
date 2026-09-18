import { expect, test } from "@playwright/test";
import { ACHIEVEMENTS } from "../../src/interpret.ts";
import type { Page } from "@playwright/test";

// La liste des succès ne s'ouvre qu'après le démarrage : le badge vit dans le pied, que le
// cadre de démarrage recouvre.
const boot = async (page: Page) => {
    await page.emulateMedia({ colorScheme: "dark" });
    await page.goto("/");
    await expect(page.locator("[data-boot]")).toHaveCount(0, { timeout: 10_000 });
  },
  badge = (page: Page) => {
    return page.locator("[data-ctl='ach']");
  },
  alert = (page: Page) => {
    return page.locator("[data-ach-alert]");
  },
  type = async (page: Page, command: string) => {
    await page.locator("input").first().fill(command);
    await page.keyboard.press("Enter");
  },
  saved = async (page: Page) => {
    return page.evaluate(() => {
      // SAFETY: la page vient d'écrire ce tableau elle-même. L'affirmation ne sert qu'à
      // rendre le contenu comparable, et un JSON illisible ferait tomber le test ici.
      const marks = JSON.parse(localStorage["bd-term-achievements"] ?? "[]") as string[];

      return marks;
    });
  };

test("should start with nothing won and nothing to look at", async ({ page }) => {
  await boot(page);

  await expect(badge(page)).toHaveAttribute("aria-label", `succès : 0 sur ${ACHIEVEMENTS.length}`);
  await expect(page.locator("[data-ach-new]")).toHaveCount(0);
});

// Une commande tapée en débloque deux : la première commande, et la commande elle-même.
// Deux déblocages rapprochés font la queue, ils ne s'écrasent pas.
test("should queue one alert per unlocked achievement", async ({ page }) => {
  await boot(page);
  await type(page, "help");

  await expect(alert(page)).toContainText("succès débloqué");
  await expect(alert(page)).toContainText("première commande");
  await expect(alert(page)).toContainText("le manuel", { timeout: 15_000 });
  await expect(badge(page)).toHaveAttribute(
    "aria-label",
    new RegExp(`succès : 2 sur ${ACHIEVEMENTS.length}`, "u"),
  );
});

test("should nudge the badge until the list is opened, and not one second longer", async ({
  page,
}) => {
  await boot(page);
  await type(page, "ls");

  await expect(page.locator("[data-ach-new]")).toHaveCount(1);
  await badge(page).click();
  await expect(page.getByRole("dialog", { name: "Succès" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator("[data-ach-new]")).toHaveCount(0);
});

// Le bandeau et la liste prennent le focus comme tout élément intérieur : contour de 2 px
// en accent, posé à l'intérieur, jamais arrondi. Sans « data-ctl », le bandeau tombait sur
// l'anneau du navigateur.
test("should mark the focus on the alert like every other inner element", async ({ page }) => {
  await boot(page);
  await type(page, "ls");
  await alert(page).locator("button").focus();

  const marked = await alert(page)
    .locator("button")
    .evaluate((node) => {
      const style = getComputedStyle(node);

      return [style.outlineWidth, style.outlineStyle, style.outlineOffset, style.borderRadius];
    });

  expect(marked).toEqual(["2px", "solid", "-2px", "0px"]);
});

// La tabulation doit atteindre le bouton de fermeture. Sans lui dans la boucle, « échap »
// était la seule sortie de la liste. Le focus part de la première entrée : une tabulation
// arrière atteint donc le dernier élément, qui est ce bouton.
test("should reach the close button by tabbing through the list", async ({ page }) => {
  await boot(page);
  await badge(page).click();
  await page.keyboard.press("Shift+Tab");

  await expect(page.getByRole("button", { name: "close" })).toBeFocused();
});

// Une ligne que le répartiteur refuse ne débloque rien. Il rend pourtant l'effet de mesure
// « commande » : « out » le pose avant de savoir si la commande existe.
test("should unlock nothing on a command that does not exist", async ({ page }) => {
  await boot(page);
  await type(page, "pipo");

  await expect(alert(page)).toBeHidden();
  await expect(badge(page)).toHaveAttribute("aria-label", `succès : 0 sur ${ACHIEVEMENTS.length}`);
});

// L'alerte qui a ouvert la liste disparaît au bout de dix secondes. Le focus doit revenir
// au badge, et non tomber sur le corps de la page.
test("should give the focus back to the badge when the alert that opened the list is gone", async ({
  page,
}) => {
  // « première commande » est déjà acquis : « ls » n'en débloque donc qu'un, et la file ne
  // remet pas une seconde alerte à l'écran pendant que l'on attend la disparition.
  await page.goto("/");
  await page.evaluate(() => {
    return localStorage.setItem("bd-term-achievements", JSON.stringify(["first-command"]));
  });
  await boot(page);
  await type(page, "ls");
  await alert(page).locator("button").click();
  await expect(alert(page)).toBeHidden({ timeout: 20_000 });
  await page.keyboard.press("Escape");

  await expect(badge(page)).toBeFocused();
});

test("should move the focus into the list and give it back to the badge", async ({ page }) => {
  await boot(page);
  await badge(page).click();

  const dialog = page.getByRole("dialog", { name: "Succès" });

  await expect(dialog.locator(":focus")).toHaveCount(1);
  await page.keyboard.press("ArrowDown");
  await expect(dialog.locator(":focus")).toHaveCount(1);
  await page.keyboard.press("Escape");
  await expect(badge(page)).toBeFocused();
});

// Un succès verrouillé garde son rang. Son sous-titre est une suite de « ??? » de longueur
// variable : une liste de longueurs identiques fait grille de mots croisés.
test("should hide what is still locked", async ({ page }) => {
  await boot(page);
  await badge(page).click();

  const rows = page.locator("[data-ach-row]"),
    hidden = await rows.locator("[data-ach-title]").allTextContents();

  await expect(rows).toHaveCount(ACHIEVEMENTS.length);
  expect(
    hidden.every((title) => {
      return title === "???";
    }),
  ).toBe(true);
  expect(new Set(await rows.locator("[data-ach-trigger]").allTextContents()).size).toBeGreaterThan(
    1,
  );
});

test("should keep a won achievement across a reload", async ({ page }) => {
  await boot(page);
  await type(page, "ls");
  await expect(badge(page)).toHaveAttribute(
    "aria-label",
    new RegExp(`succès : 2 sur ${ACHIEVEMENTS.length}`, "u"),
  );

  await page.reload();
  await expect(page.locator("[data-boot]")).toHaveCount(0, { timeout: 10_000 });
  await expect(badge(page)).toHaveAttribute(
    "aria-label",
    new RegExp(`succès : 2 sur ${ACHIEVEMENTS.length}`, "u"),
  );
  expect(await saved(page)).toContain("ls");
});

// Le volet de sortie coupé retire l'alerte, et rien ne se replie sur le journal. Le badge
// porte alors le signal à lui seul.
test("should show no alert when the output pane is off", async ({ page }) => {
  await boot(page);
  await page.getByRole("button", { name: "options" }).click();

  const options = page.getByRole("dialog", { name: "Options d'affichage" });

  await expect(options).toBeVisible();
  await page.getByRole("button", { name: "output pane" }).click();
  await expect(page.locator("[data-pane='out']")).toBeHidden();
  await page.keyboard.press("Escape");
  await expect(options).toBeHidden();
  await type(page, "ls");

  await expect(alert(page)).toBeHidden();
  await expect(page.locator("[data-ach-new]")).toHaveCount(1);
});

// La page introuvable et la version texte écrivent leur clé. La version terminal la trouve
// au chargement suivant, et le badge s'agite : l'alerte, elle, appartient au moment du
// déblocage.
test("should pick up what the side pages wrote", async ({ page }) => {
  await page.goto("/texte.html");
  await page.goto("/une/route/qui-n-existe-pas");
  await boot(page);

  await expect(badge(page)).toHaveAttribute(
    "aria-label",
    `succès : 2 sur ${ACHIEVEMENTS.length}, 2 non regardés`,
  );
  await expect(alert(page)).toHaveCount(0);
});

test("should ignore a key the catalogue no longer carries", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => {
    return localStorage.setItem("bd-term-achievements", JSON.stringify(["konami", "ls"]));
  });
  await boot(page);

  await expect(badge(page)).toHaveAttribute(
    "aria-label",
    new RegExp(`succès : 1 sur ${ACHIEVEMENTS.length}`, "u"),
  );
});
