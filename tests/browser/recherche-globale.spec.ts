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

// Le cœur de la zone : elle n'exécute rien. La commande part dans le terminal, et c'est lui
// qui l'affiche. Sans cela, il faudrait écrire une seconde fois la sortie de chaque commande.
test("should submit the real command into the terminal", async ({ page }) => {
  await boot(page);
  await open(page);
  await field(page).fill("whoami");
  await page.keyboard.press("Enter");

  await expect(zone(page)).toHaveCount(0);
  await expect(page.locator("[data-pane='main']")).toContainText("bd whoami --verbose");
  await expect(page.locator("[data-pane='main']")).toContainText("Concepteur orchestrateur IA");
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

// Un nom qui attend un argument ne veut rien dire seul : la ligne se remplit, et rien ne part.
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
