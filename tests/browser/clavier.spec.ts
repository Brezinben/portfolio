import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

const boot = async (page: Page) => {
    await page.goto("/");
    await expect(page.locator("[data-boot]")).toHaveCount(0, { timeout: 10_000 });
  },
  focusedId = (page: Page) => {
    return page.evaluate(() => {
      return document.activeElement?.id ?? "";
    });
  };

// Sans proposition à compléter, la ligne de commande ne garde pas Tab : un champ qui avale
// la touche enferme le visiteur au clavier (WCAG 2.1.2).
for (const key of ["Tab", "Shift+Tab"]) {
  test(`should leave the command line on ${key} when nothing completes`, async ({ page }) => {
    await boot(page);
    await page.locator("#cli").focus();
    await page.keyboard.press(key);

    expect(await focusedId(page)).not.toBe("cli");
  });
}

test("should never keep Shift+Tab in the command line, even with a proposal", async ({ page }) => {
  await boot(page);
  await page.locator("#cli").pressSequentially("/sl");
  await page.keyboard.press("Shift+Tab");

  expect(await focusedId(page)).not.toBe("cli");
});

// La poignée traite ses flèches. Le volet ne doit pas les traiter une seconde fois.
test("should keep the focus on the log handle while it resizes", async ({ page }) => {
  await boot(page);

  const cli = page.locator("#cli");

  for (const _ of Array.from({ length: 6 })) {
    // eslint-disable-next-line no-await-in-loop
    await cli.fill("xyzzy");
    // eslint-disable-next-line no-await-in-loop
    await cli.press("Enter");
  }

  const handle = page.getByRole("separator", { name: "Redimensionner le journal" });

  await handle.focus();
  await handle.press("ArrowUp");

  await expect(handle).toBeFocused();
});

// Le résultat prend le focus pour être lu : ses flèches le font défiler.
test("should scroll the result with the down arrow", async ({ page }) => {
  await page.setViewportSize({ height: 420, width: 1280 });
  await boot(page);

  const cli = page.locator("#cli"),
    result = page.locator("[data-result]");

  await cli.fill("help");
  await cli.press("Enter");
  await result.focus();
  await result.press("ArrowDown");

  await expect(result).toBeFocused();
  await expect
    .poll(() => {
      return result.evaluate((node) => {
        return node.scrollTop;
      });
    })
    .toBeGreaterThan(0);
});

// Sous mouvement réduit, la bascule des animations est désactivée. Le piège de Tab la
// visait quand même, et le focus restait sur place.
test("should move the focus on every Tab in the options under reduced motion", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await boot(page);
  await page.getByRole("button", { name: "options" }).click();

  const dialog = page.getByRole("dialog", { name: "Options d'affichage" }),
    seen: string[] = [];

  for (const _ of Array.from({ length: 12 })) {
    // eslint-disable-next-line no-await-in-loop
    await dialog.press("Tab");
    // eslint-disable-next-line no-await-in-loop
    const label = await page.evaluate(() => {
      return document.activeElement?.textContent?.trim() ?? "";
    });

    seen.push(label);
  }

  const stuck = seen.filter((label, index) => {
    return label === seen[index - 1];
  });

  expect(stuck, "Tab never leaves the focus in place").toEqual([]);
});

// Une alerte qu'on lit au clavier ne part pas sous le focus.
test("should keep a focused achievement alert on screen", async ({ page }) => {
  await page.clock.install();
  await boot(page);
  await page.locator("#cli").fill("ls");
  await page.keyboard.press("Enter");

  const button = page.locator("[data-ach-alert] button");

  await button.focus();
  await page.clock.fastForward(30_000);

  await expect(button).toBeFocused();
});

test("should not leave the focus on the page body when q closes the radio", async ({ page }) => {
  await boot(page);
  await page.locator("#cli").fill("/radio");
  await page.keyboard.press("Enter");

  const play = page.locator(".radio").getByRole("button").last();

  await play.focus();
  await play.press("q");

  await expect(page.locator(".radio")).toHaveCount(0);
  expect(
    await page.evaluate(() => {
      return document.activeElement === document.body;
    }),
  ).toBe(false);
});

// Entrée appartient au bouton qui a le focus : sur « close », elle ferme sans rien lancer.
test("should only close the global search on Enter over its close button", async ({ page }) => {
  await boot(page);
  await page.keyboard.press("Control+k");
  await page.getByRole("combobox", { name: "Recherche globale" }).fill("sta");
  await page
    .getByRole("dialog", { name: "Recherche globale" })
    .getByRole("button", { name: "close" })
    .focus();
  await page.keyboard.press("Enter");

  await expect(page.locator("[data-global]")).toHaveCount(0);
  await expect(page.locator("[data-pane='main']")).not.toContainText("bd stack");
});

// Une modale à la fois, et la page derrière elle ne prend plus le focus.
test("should not stack the global search over the options", async ({ page }) => {
  await boot(page);
  await page.getByRole("button", { name: "options" }).click();
  await page.keyboard.press("Control+k");

  await expect(page.getByRole("dialog")).toHaveCount(1);
  await expect(page.locator("main")).toHaveAttribute("inert");
});

// Une touche seule déclenche une action : le réglage doit pouvoir les couper (WCAG 2.1.4).
test("should ignore the single-key shortcuts once they are turned off", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("bd-term-opts", JSON.stringify({ shortcuts: false }));
  });
  await boot(page);
  await page.locator("body").press("j");

  await expect(page.locator("[data-pane='main']")).not.toContainText("bd log --graph");
});

// Une annonce passe par une région toujours montée : insérée déjà remplie, elle se tait.
test("should announce the number of hits of the global search", async ({ page }) => {
  await boot(page);
  await page.keyboard.press("Control+k");
  await page.getByRole("combobox", { name: "Recherche globale" }).fill("zzzzzz");

  await expect(page.getByRole("dialog").getByRole("status")).toHaveText("aucune trouvaille");
});
