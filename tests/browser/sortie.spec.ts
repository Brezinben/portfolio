import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

const open = async (page: Page, hash: string) => {
    await page.goto(`/${hash}`);
    await expect(page.locator("[data-boot]")).toHaveCount(0, { timeout: 10_000 });
  },
  out = (page: Page) => page.locator('[data-pane="out"]');

// La frise et l'arbre sont le contenu de la section : ils s'affichent au centre. Le volet
// de sortie garde ses paires et la fiche techno.
test("la frise du parcours s'affiche dans le volet central", async ({ page }) => {
  await open(page, "#parcours");

  await expect(page.locator('[data-pane="main"] [data-timeline]')).toBeVisible();
  await expect(page.locator('[data-pane="out"] [data-timeline]')).toHaveCount(0);
  await expect(out(page)).toContainText("git log");
  await expect(page.locator('[data-pane="main"]')).toContainText("Kereis");
  await expect(page.getByRole("option")).not.toHaveCount(0);
});

test("les années de la frise sont en chiffres tabulaires", async ({ page }) => {
  await open(page, "#parcours");

  const years = page.locator("[data-years]").first();

  await expect(years).toContainText("2026");
  expect(await years.evaluate((node) => getComputedStyle(node).fontVariantNumeric)).toContain(
    "tabular-nums",
  );
});

test("valider une entrée de la frise ouvre la fiche de mission", async ({ page }) => {
  await open(page, "#parcours");
  await page.getByRole("option", { name: /Kereis/ }).click();

  await expect(page).toHaveURL(/#m-kereis$/);
});

// Le canvas dispose la stack comme la sortie d'un ls : un rail par domaine, et les
// technologies qui coulent en colonnes, chacune precedee de son trait d'arborescence.
test("l'arbre de la stack s'affiche au centre, en colonnes", async ({ page }) => {
  await open(page, "#stack");

  await expect(page.locator('[data-pane="main"] [data-tree]')).toBeVisible();
  await expect(page.locator('[data-pane="out"] [data-tree]')).toHaveCount(0);
  await expect(page.locator('[data-pane="main"]')).toContainText("frontend");
  await expect(page.locator('[data-pane="main"]')).toContainText("domaines");

  const columns = await page
    .locator("[data-tech]")
    .first()
    .evaluate(
      (node) => getComputedStyle(node.parentElement!).gridTemplateColumns.split(" ").length,
    );

  expect(columns, "les technologies coulent sur plusieurs colonnes").toBeGreaterThan(1);
});

// Aucun texte d'invite au depart : rien ne s'affiche tant qu'aucune technologie n'a le
// focus. Des qu'une en a un, sa fiche suit immediatement.
test("la fiche techno suit le focus dès la première technologie", async ({ page }) => {
  await open(page, "#stack");

  await expect(page.locator("[data-technote]")).toHaveCount(0);

  await page.locator("[data-tech]", { hasText: "Vue.js" }).first().focus();

  await expect(page.locator("[data-technote]")).toContainText("Vue.js");

  await page.locator("[data-tech]", { hasText: "Docker" }).first().focus();

  await expect(page.locator("[data-technote]")).toContainText("Docker");
});

// La stack est une grille : les quatre fleches y naviguent, pas seulement la tabulation.
test("les quatre flèches naviguent dans la grille de la stack", async ({ page }) => {
  await open(page, "#stack");
  await page.locator("[data-tech]").first().focus();

  const focused = () => page.evaluate(() => document.activeElement!.textContent.trim()),
    first = await focused();

  await page.keyboard.press("ArrowRight");

  const second = await focused();

  expect(second).not.toBe(first);

  await page.keyboard.press("ArrowLeft");
  expect(await focused()).toBe(first);

  await page.keyboard.press("ArrowDown");
  expect(await focused(), "la flèche bas descend d'une ligne").not.toBe(first);

  await page.keyboard.press("ArrowUp");
  expect(await focused()).toBe(first);
});

// Chaque bloc de la stack est une grille independante. Un pas fixe, calcule sur la
// premiere ligne du premier bloc, faisait changer de colonne des qu'une ligne etait
// incomplete ou qu'on passait d'une categorie a la suivante.
test("la flèche bas garde la colonne d'une ligne de la stack à la suivante", async ({ page }) => {
  await open(page, "#stack");

  const strayed = await page.evaluate(() => {
    const cells = [...document.querySelectorAll<HTMLElement>("[data-tech]")],
      // Une cellule est toujours dans la carte : elle vient de la meme liste.
      boxes = new Map(cells.map((cell) => [cell, cell.getBoundingClientRect()])),
      boxOf = (cell: HTMLElement) => boxes.get(cell)!,
      wrong: string[] = [],
      // La derniere ligne n'a rien en dessous : la fleche bas n'y promet rien.
      departures = cells.filter((cell) =>
        cells.some((other) => boxOf(other).top > boxOf(cell).top + 1),
      );

    for (const cell of departures) {
      cell.focus();
      cell.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "ArrowDown" }));

      const from = boxOf(cell),
        below = cells.filter((other) => boxOf(other).top > from.top + 1),
        next = Math.min(...below.map((other) => boxOf(other).top)),
        row = below.filter((other) => boxOf(other).top < next + 1),
        closest = Math.min(...row.map((other) => Math.abs(boxOf(other).left - from.left))),
        landed = document.activeElement,
        arrivee = landed instanceof HTMLElement ? landed : undefined;

      if (!arrivee || !cells.includes(arrivee)) {
        wrong.push(`${cell.textContent?.trim()} → hors de la grille`);
      } else if (Math.abs(boxOf(arrivee).left - from.left) > closest + 1) {
        wrong.push(`${cell.textContent?.trim()} → ${arrivee.textContent?.trim()}`);
      }
    }

    return wrong;
  });

  expect(strayed, "la flèche bas prend la cellule la plus proche de la colonne").toEqual([]);
});

test("la sortie contact est colorée par type", async ({ page }) => {
  await open(page, "#contact");

  const colours = await page
    .locator('[data-pane="main"] [data-result] span[data-tone]')
    .evaluateAll((nodes) => nodes.map((node) => getComputedStyle(node).color));

  expect(
    new Set(colours).size,
    "clés, valeurs et ponctuation ne partagent pas une couleur",
  ).toBeGreaterThan(2);
  await expect(page.locator('[data-pane="main"]')).toContainText('"email"');
});

test("la section contact précharge sa commande dans la saisie", async ({ page }) => {
  await open(page, "#contact");

  await expect(page.getByLabel("Commande")).toHaveValue("/send-mail benjamin.david1@hotmail.fr");
});
