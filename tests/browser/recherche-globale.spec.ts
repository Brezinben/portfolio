import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

// La recherche globale ne s'ouvre qu'après le démarrage : le cadre de boot mange la touche.
const boot = async (page: Page) => {
    await page.emulateMedia({ colorScheme: "dark" });
    await page.goto("/");
    await expect(page.locator("[data-boot]")).toHaveCount(0, { timeout: 10_000 });
  },
  zone = (page: Page) => {
    return page.locator("[data-global]");
  },
  field = (page: Page) => {
    return page.locator("[data-global-input]");
  },
  open = async (page: Page) => {
    await page.keyboard.press("Control+k");
    await expect(zone(page)).toBeVisible();
  },
  saved = async (page: Page) => {
    return page.evaluate(() => {
      // SAFETY: la page vient d'écrire ce tableau elle-même. Un JSON illisible ferait tomber
      // le test ici, ce qui est le bon endroit.
      const marks = JSON.parse(localStorage["bd-term-achievements"] ?? "[]") as string[];

      return marks;
    });
  };

test("should open on the shortcut and close on escape", async ({ page }) => {
  await boot(page);
  await open(page);

  await expect(field(page)).toBeFocused();

  await page.keyboard.press("Escape");
  await expect(zone(page)).toHaveCount(0);
});

// Le focus revient là où il était : sans ce retour, la tabulation repart du corps de la page.
test("should give the focus back to the command line", async ({ page }) => {
  await boot(page);
  await page.locator("[data-cli] input").focus();
  await open(page);
  await page.keyboard.press("Escape");

  await expect(page.locator("[data-cli] input")).toBeFocused();
});

test("should rank the sections the typing points at", async ({ page }) => {
  await boot(page);
  await open(page);
  await field(page).fill("sta");

  await expect(page.locator("[data-global-row]").first()).toContainText("stack");
});

// Les accents ne départagent rien : l'index est francophone, et « eco » doit trouver.
test("should find a stack brick without its accents", async ({ page }) => {
  await boot(page);
  await open(page);
  await field(page).fill("eco-conception");

  await expect(page.locator("[data-global-row]")).toContainText([/Éco-conception/u]);
});

test("should complete towards the first hit on tab", async ({ page }) => {
  await boot(page);
  await open(page);
  await field(page).fill("sta");
  await expect(page.locator("[data-global-rest]")).toHaveText("ck");

  await page.keyboard.press("Tab");
  await expect(field(page)).toHaveValue("stack");
});

// Le contenu écrit « bd log --graph » et « bd show mission/kereis » : deux échos décoratifs
// que le répartiteur refuse. Seul l'identifiant ouvre la zone.
const OPENS: [string, string][] = [
  ["whoami", "Concepteur orchestrateur IA"],
  ["parcours", "2026"],
  ["contact", "Nantes"],
  ["kereis", "Kereis"],
];

for (const [typed, shown] of OPENS) {
  test(`should submit a command the dispatcher accepts for ${typed}`, async ({ page }) => {
    await boot(page);
    await open(page);
    await field(page).fill(typed);
    await page.keyboard.press("Enter");

    await expect(zone(page)).toHaveCount(0);
    await expect(page.locator("[data-pane='main']")).toContainText(shown);
    await expect(page.locator("[data-journal]")).not.toContainText("inconnue");
    await expect(page.locator("[data-journal]")).not.toContainText("introuvable");
  });
}

// La zone est modale : la tabulation boucle entre le champ et le bouton de fermeture. Sans
// cela le focus part dans la page derrière, comme il le ferait sans zone du tout.
test("should keep the tabulation inside the zone", async ({ page }) => {
  await boot(page);
  await open(page);
  await page.keyboard.press("Tab");

  await expect(page.locator("[data-global] [data-ctl='opt']")).toBeFocused();

  await page.keyboard.press("Tab");
  await expect(field(page)).toBeFocused();
});

// « une commande tapée, pas cliquée » : lancer depuis la zone débloque son succès, et ne
// débloque pas celui de la première commande.
test("should unlock its own achievement and leave the first command alone", async ({ page }) => {
  await boot(page);
  await open(page);
  await field(page).fill("whoami");
  await page.keyboard.press("Enter");
  await expect(zone(page)).toHaveCount(0);

  const marks = await saved(page);

  expect(marks).toContain("global-search");
  expect(marks).not.toContain("first-command");
});

test("should only fill the line for a command that wants an argument", async ({ page }) => {
  await boot(page);
  await open(page);
  await field(page).fill("theme");
  await page.keyboard.press("Enter");

  await expect(zone(page)).toHaveCount(0);
  await expect(page.locator("[data-cli] input")).toHaveValue("theme ");
});

test("should walk the hits with the arrows", async ({ page }) => {
  await boot(page);
  await open(page);
  await field(page).fill("s");

  const rows = page.locator("[data-global-row]");

  await expect(rows.first()).toHaveAttribute("aria-selected", "true");
  await page.keyboard.press("ArrowDown");
  await expect(rows.first()).toHaveAttribute("aria-selected", "false");
  await expect(rows.nth(1)).toHaveAttribute("aria-selected", "true");
});

// La zone montre ses trouvailles par groupe, et les flèches suivaient l'ordre du classement.
// Deux flèches vers le bas sautaient alors une ligne visible pour en prendre une plus loin.
test("should walk the rows in the order the eye reads them", async ({ page }) => {
  await boot(page);
  await open(page);
  await field(page).fill("sta");
  await page.keyboard.press("Tab");

  const rows = page.locator("[data-global-row]");

  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("ArrowDown");

  await expect(rows.nth(2)).toHaveAttribute("aria-selected", "true");
  await expect(rows.nth(2)).toContainText("whoami");
});
