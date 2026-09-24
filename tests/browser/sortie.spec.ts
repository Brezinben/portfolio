import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

const open = async (page: Page, hash: string) => {
    await page.goto(`/${hash}`);
    await expect(page.locator("[data-boot]")).toHaveCount(0, { timeout: 10_000 });
  },
  out = (page: Page) => {
    return page.locator('[data-pane="out"]');
  };

// La frise et l'arbre sont le contenu de la section : ils s'affichent au centre. Le volet
// de sortie garde ses paires et la fiche techno.
test("should show the timeline in the main pane", async ({ page }) => {
  await open(page, "#parcours");

  await expect(page.locator('[data-pane="main"] [data-timeline]')).toBeVisible();
  await expect(page.locator('[data-pane="out"] [data-timeline]')).toHaveCount(0);
  await expect(out(page)).toContainText("git log");
  await expect(page.locator('[data-pane="main"]')).toContainText("Kereis");
  await expect(page.getByRole("option")).not.toHaveCount(0);
});

test("should set the timeline years in tabular figures", async ({ page }) => {
  await open(page, "#parcours");

  const years = page.locator("[data-years]").first();

  await expect(years).toContainText("2026");
  expect(
    await years.evaluate((node) => {
      return getComputedStyle(node).fontVariantNumeric;
    }),
  ).toContain("tabular-nums");
});

test("should open the mission when a timeline entry is confirmed", async ({ page }) => {
  await open(page, "#parcours");
  await page.getByRole("option", { name: /Kereis/ }).click();

  await expect(page).toHaveURL(/#m-kereis$/);
});

// Le canvas dispose la stack comme la sortie d'un ls : un rail par domaine, et les
// technologies qui coulent en colonnes, chacune precedee de son trait d'arborescence.
test("should show the stack tree in the main pane, in columns", async ({ page }) => {
  await open(page, "#stack");

  await expect(page.locator('[data-pane="main"] [data-tree]')).toBeVisible();
  await expect(page.locator('[data-pane="out"] [data-tree]')).toHaveCount(0);
  await expect(page.locator('[data-pane="main"]')).toContainText("frontend");
  await expect(page.locator('[data-pane="main"]')).toContainText("domaines");

  const columns = await page
    .locator("[data-tech]")
    .first()
    .evaluate((node) => {
      return getComputedStyle(node.parentElement ?? node).gridTemplateColumns.split(" ").length;
    });

  expect(columns, "the technologies flow over several columns").toBeGreaterThan(1);
});

// Aucun texte d'invite au depart : rien ne s'affiche tant qu'aucune technologie n'a le
// focus. Des qu'une en a un, sa fiche suit immediatement.
test("should follow the focus with the tech note from the first technology", async ({ page }) => {
  await open(page, "#stack");

  await expect(page.locator("[data-technote]")).toHaveCount(0);

  await page.locator("[data-tech]", { hasText: "Vue.js" }).first().focus();

  await expect(page.locator("[data-technote]")).toContainText("Vue.js");

  await page.locator("[data-tech]", { hasText: "Docker" }).first().focus();

  await expect(page.locator("[data-technote]")).toContainText("Docker");
});

// La stack est une grille : les quatre fleches y naviguent, pas seulement la tabulation.
test("should move through the stack grid with the four arrows", async ({ page }) => {
  await open(page, "#stack");
  await page.locator("[data-tech]").first().focus();

  const focused = () => {
      return page.evaluate(() => {
        return document.activeElement?.textContent.trim() ?? "";
      });
    },
    first = await focused();

  await page.keyboard.press("ArrowRight");

  const second = await focused();

  expect(second).not.toBe(first);

  await page.keyboard.press("ArrowLeft");
  expect(await focused()).toBe(first);

  await page.keyboard.press("ArrowDown");
  expect(await focused(), "the down arrow moves one row down").not.toBe(first);

  await page.keyboard.press("ArrowUp");
  expect(await focused()).toBe(first);
});

// Chaque bloc de la stack est une grille independante. Un pas fixe, calcule sur la
// premiere ligne du premier bloc, faisait changer de colonne des qu'une ligne etait
// incomplete ou qu'on passait d'une categorie a la suivante.
test("should keep the column from one stack row to the next on arrow down", async ({ page }) => {
  await open(page, "#stack");

  const strayed = await page.evaluate(() => {
    const cells = [...document.querySelectorAll<HTMLElement>("[data-tech]")],
      // Une cellule est toujours dans la carte : elle vient de la meme liste.
      boxes = new Map(
        cells.map((cell) => {
          return [cell, cell.getBoundingClientRect()];
        }),
      ),
      boxOf = (cell: HTMLElement) => {
        return boxes.get(cell) ?? cell.getBoundingClientRect();
      },
      wrong: string[] = [],
      // La derniere ligne n'a rien en dessous : la fleche bas n'y promet rien.
      departures = cells.filter((cell) => {
        return cells.some((other) => {
          return boxOf(other).top > boxOf(cell).top + 1;
        });
      });

    for (const cell of departures) {
      cell.focus();
      cell.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "ArrowDown" }));

      const from = boxOf(cell),
        below = cells.filter((other) => {
          return boxOf(other).top > from.top + 1;
        }),
        next = Math.min(
          ...below.map((other) => {
            return boxOf(other).top;
          }),
        ),
        row = below.filter((other) => {
          return boxOf(other).top < next + 1;
        }),
        closest = Math.min(
          ...row.map((other) => {
            return Math.abs(boxOf(other).left - from.left);
          }),
        ),
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

  expect(strayed, "the down arrow takes the cell closest to the column").toEqual([]);
});

test("should colour the contact output by type", async ({ page }) => {
  await open(page, "#contact");

  const colours = await page
    .locator('[data-pane="main"] [data-result] span[data-tone]')
    .evaluateAll((nodes) => {
      return nodes.map((node) => {
        return getComputedStyle(node).color;
      });
    });

  expect(
    new Set(colours).size,
    "keys, values and punctuation do not share one colour",
  ).toBeGreaterThan(2);
  await expect(page.locator('[data-pane="main"]')).toContainText('"email"');
});

test("should preload its command in the command line on the contact section", async ({ page }) => {
  await open(page, "#contact");

  await expect(page.getByLabel("Commande")).toHaveValue("/send-mail benjamin.david1@hotmail.fr");
});
