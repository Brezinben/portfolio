import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

// La mesure d'audience est un script tiers : le test la remplace par un compteur. Seul
// « hits » se déclare ici, « umami » portant déjà son contrat dans src/app.ts.
declare global {
  // eslint-disable-next-line no-var, vars-on-top
  var hits: string[];
}

const boot = async (page: Page, hash = "") => {
    await page.goto(`/${hash}`);
    await expect(page.locator("[data-boot]")).toHaveCount(0, { timeout: 10_000 });
  },
  main = (page: Page) => {
    return page.locator('[data-pane="main"]');
  };

// De gauche à droite : valider une section mène à sa première prise. La stack ouvre sur
// sa première techno, et non sur la ligne de commande, qui est plus loin dans le volet.
test("should move to the first inner element of the section on arrow right", async ({ page }) => {
  await boot(page);
  await page
    .getByRole("button", { name: /^stack/ })
    .first()
    .focus();
  await page.keyboard.press("ArrowRight");

  await expect(page.locator("[data-tech]").first()).toBeFocused();
});

// Le contour du focus déborde de quatre pixels, et le résultat défile, donc il rogne.
test("should keep the focus outline inside the result, down to the last column", async ({
  page,
}) => {
  await boot(page, "#stack");

  const debord = await page.evaluate(() => {
    const box = document.querySelector<HTMLElement>("[data-result]")!.getBoundingClientRect();

    return [...document.querySelectorAll<HTMLElement>("[data-tech]")].reduce((pire, node) => {
      return Math.max(pire, node.getBoundingClientRect().right + 4 - box.right);
    }, -999);
  });

  expect(debord, "four pixels of outline fit on the right").toBeLessThanOrEqual(0);
});

test("should give every section a shareable anchor", async ({ page }) => {
  await boot(page);
  await page.getByRole("button", { name: /^stack/ }).click();

  await expect(page).toHaveURL(/#stack$/);
  await expect(main(page)).toContainText("bd stack --tree");
});

test("should open its section directly from an anchor", async ({ page }) => {
  await boot(page, "#formation");

  await expect(main(page)).toContainText("bd learn --history");
});

test("should fall back to whoami on an unknown anchor", async ({ page }) => {
  await boot(page, "#nexistepas");

  await expect(main(page)).toContainText("bd whoami --verbose");
});

test("should go back to the previous section on the browser back button", async ({ page }) => {
  await boot(page);
  await page.getByRole("button", { name: /^stack/ }).click();
  await expect(main(page)).toContainText("bd stack --tree");

  await page.goBack();

  await expect(main(page)).toContainText("bd whoami --verbose");
});

test("should make every mission reachable and give it an anchor", async ({ page }) => {
  await boot(page);
  await page.getByRole("button", { name: /kereis/i }).click();

  await expect(page).toHaveURL(/#m-kereis$/);
});

// Première visite : la commande se tape. Retour : immédiat, l'effet ne devient pas une attente.
test("should type the command on the first visit and answer at once on return", async ({
  page,
}) => {
  await boot(page);
  await page.getByRole("button", { name: /^stack/ }).click();

  const typing = Date.now();

  await expect(main(page)).toContainText("bd stack --tree --depth=2");

  const first = Date.now() - typing;

  await page.getByRole("button", { name: /^whoami/ }).click();
  await expect(main(page)).toContainText("bd whoami --verbose");

  const again = Date.now();

  await page.getByRole("button", { name: /^stack/ }).click();
  await expect(main(page)).toContainText("bd stack --tree --depth=2");

  expect(Date.now() - again, "a section already seen answers faster").toBeLessThan(first);
});

test("should change section with j and k", async ({ page }) => {
  await boot(page);
  await page.locator("body").press("j");

  await expect(main(page)).toContainText("bd log --graph");

  await page.locator("body").press("k");

  await expect(main(page)).toContainText("bd whoami --verbose");
});

test("should change pane with the left and right arrows", async ({ page }) => {
  await boot(page);
  await page.locator("body").press("ArrowRight");

  await expect(page.locator('[data-pane="main"] :focus')).toHaveCount(1);
});

test("should focus the command line on the slash key", async ({ page }) => {
  await boot(page);
  await page.locator("body").press("/");

  await expect(page.getByLabel("Commande")).toBeFocused();
});

// Dans une liste a une colonne, la fleche droite valide et descend vers le volet suivant.
// La frise fait exception : elle mène à la première techno sur la stack. Une section
// sans prise mène à la ligne de commande.
test("should confirm a section and go down into the main pane on arrow right", async ({ page }) => {
  await boot(page);
  await page.locator('[data-ctl="nav"]').first().focus();
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("ArrowRight");

  await expect(main(page)).toContainText("bd log --graph");
  await expect(
    page.locator('[data-ctl="tl"]').first(),
    "the focus goes down into the main pane",
  ).toBeFocused();
});

test("should lead to the command line for a section without an inner element", async ({ page }) => {
  await boot(page);
  await page.locator('[data-ctl="nav"]').first().focus();
  await page.keyboard.press("ArrowRight");

  await expect(page.getByLabel("Commande")).toBeFocused();
});

test("should walk the section list with the up and down arrows", async ({ page }) => {
  await boot(page);
  await page.locator('[data-ctl="nav"]').first().focus();

  const focused = () => {
      return page.evaluate(() => {
        return document.activeElement!.textContent.trim();
      });
    },
    first = await focused();

  await page.keyboard.press("ArrowDown");
  expect(await focused()).not.toBe(first);

  await page.keyboard.press("ArrowUp");
  expect(await focused()).toBe(first);
});

// Le système répète une touche maintenue, et le navigateur fabrique un clic par répétition.
// Valider au clavier envoyait alors une mesure par répétition, pour un seul geste.
test("should measure one section when enter is held down", async ({ page }) => {
  await page.addInitScript(() => {
    globalThis.hits = [];
    globalThis.umami = {
      track: (name) => {
        globalThis.hits.push(name);
      },
    };
  });
  await page.goto("/");
  await expect(page.locator("[data-boot]")).toHaveCount(0, { timeout: 10_000 });
  await page.evaluate(() => {
    globalThis.hits = [];
  });
  await page.locator('[data-ctl="nav"]').nth(2).focus();

  const key = { code: "Enter", key: "Enter", nativeVirtualKeyCode: 13, windowsVirtualKeyCode: 13 },
    cdp = await page.context().newCDPSession(page);

  // Le clic naît du couple « rawKeyDown » puis « char » : sans le second, rien ne s'active.
  const press = async (autoRepeat: boolean) => {
    await cdp.send("Input.dispatchKeyEvent", { ...key, autoRepeat, type: "rawKeyDown" });
    await cdp.send("Input.dispatchKeyEvent", { ...key, autoRepeat, text: "\r", type: "char" });
  };

  await press(false);

  // Dix répétitions du système, comme une touche tenue une seconde.
  await Array.from({ length: 10 }).reduce<Promise<unknown>>((chain) => {
    return chain.then(() => {
      return press(true);
    });
  }, Promise.resolve());
  await cdp.send("Input.dispatchKeyEvent", { ...key, type: "keyUp" });

  const sections = await page.evaluate(() => {
    return globalThis.hits.filter((name) => {
      return name === "section";
    }).length;
  });

  expect(sections, "one gesture, one measure").toBe(1);
});
