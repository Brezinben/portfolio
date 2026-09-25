import type { Locator, Page } from "@playwright/test";
import { expect, test } from "@playwright/test";
import { boxOf } from "../helpers/box.ts";
import { ringRatios } from "../helpers/contrast.ts";

// La poignee ne s'affiche que si le journal deborde : une tige a deplacer dans le vide
// ne servirait a rien. « help » ne remplit plus le journal, il reclame le resultat : une
// commande introuvable y laisse deux lignes, et c'est elle qui le fait deborder.
const fill = async (cli: Locator) => {
    for (const _ of Array.from({ length: 6 })) {
      // Les commandes doivent s'enchainer : les paralleliser ne remplirait pas le journal.
      // eslint-disable-next-line no-await-in-loop
      await cli.fill("xyzzy");
      // eslint-disable-next-line no-await-in-loop
      await cli.press("Enter");
    }
  },
  boot = async (page: Page) => {
    await page.goto("/");
    await expect(page.locator("[data-boot]")).toHaveCount(0, { timeout: 10_000 });

    return page.getByLabel("Commande");
  };

// L'experience terminale tient a une hauteur fixe : la page ne doit jamais grandir.
test("should never grow the page past the window height", async ({ page }) => {
  const cli = await boot(page);

  await Array.from({ length: 12 }).reduce<Promise<unknown>>((chain) => {
    return chain
      .then(() => {
        return cli.fill("help");
      })
      .then(() => {
        return cli.press("Enter");
      });
  }, Promise.resolve());

  const overflow = await page.evaluate(() => {
    return document.body.scrollHeight - window.innerHeight;
  });

  expect(overflow, "no vertical overflow").toBeLessThanOrEqual(1);
});

// Sur deux colonnes le journal tient dans 119 px, et la reponse de help en fait sept fois
// plus. Le resultat a la place, il la prend : le journal ne garde que l'echo.
test("should show the whole help answer in the result", async ({ page }) => {
  const cli = await boot(page);

  await cli.fill("help");
  await cli.press("Enter");

  const result = page.locator("[data-result]");

  await expect(result).toContainText("à vos risques");
  await expect(result).toContainText("Clavier");
  await expect(page.locator("[data-journal]")).not.toContainText("à vos risques");

  const shown = await result.evaluate((node) => {
    return {
      client: node.clientHeight,
      scroll: node.scrollHeight,
    };
  });

  expect(shown.scroll, "nothing stays hidden below the fold of the result").toBeLessThanOrEqual(
    shown.client + 1,
  );
});

// La sortie appartient à la section ouverte. Une réponse qui prend le résultat vidait le
// volet de droite, et le visiteur perdait le contexte de la section qu'il lisait.
test("should keep the output filled when a command takes the result", async ({ page }) => {
  const cli = await boot(page);

  await cli.fill("help");
  await cli.press("Enter");

  await expect(page.locator('[data-pane="out"]')).toContainText("système");
  await expect(page.locator('[data-pane="out"]')).toContainText("Développeur IA / Full Stack");

  // La colonne des clés se mesure sur la section, elle aussi : mesurée sur la réponse,
  // elle retombait à son plancher et la clé passait sous sa valeur.
  const chevauche = await page.evaluate(() => {
    return [...document.querySelectorAll('[data-pane="out"] dt')].some((key) => {
      const value = key.nextElementSibling;

      return value ? key.getBoundingClientRect().right > value.getBoundingClientRect().left : false;
    });
  });

  expect(chevauche, "no key slips under its value").toBe(false);
});

test("should name in the status bar the command that holds the result", async ({ page }) => {
  const cli = await boot(page);

  await cli.fill("help");
  await cli.press("Enter");

  await expect(page.locator('[data-pane="main"]')).toContainText("~/help");
});

// Le resultat appartient a la derniere demande : ouvrir une section le reprend.
test("should take the result back from the command when a section opens", async ({ page }) => {
  const cli = await boot(page);

  await cli.fill("help");
  await cli.press("Enter");
  await page.getByRole("button", { name: /stack/ }).first().click();

  await expect(page.locator("[data-result]")).not.toContainText("à vos risques");
  await expect(page.locator('[data-pane="main"]')).toContainText("~/stack");
});

test("should keep the content at the top of its pane", async ({ page }) => {
  await boot(page);

  const gap = await page.locator("[data-result]").evaluate((node) => {
    const first = node.firstElementChild?.getBoundingClientRect().top ?? Infinity;

    return first - node.getBoundingClientRect().top;
  });

  expect(gap, "the first line sits at the top, not in the middle").toBeLessThan(24);
});

test("should stack the three panes below 900 px", async ({ page }) => {
  await page.setViewportSize({ height: 800, width: 700 });
  await boot(page);

  const boxes = await Promise.all(
      ["nav", "main", "out"].map((name) => {
        return boxOf(page.locator(`[data-pane="${name}"]`));
      }),
    ),
    column = boxes.toSorted((one, two) => {
      return one.y - two.y;
    });

  for (const [index, box] of column.slice(1).entries()) {
    const above = column[index];

    expect(above && above.y + above.height, "each pane ends before the next").toBeLessThanOrEqual(
      box.y,
    );
  }
});

test("should centre the layout beyond 2400 px", async ({ page }) => {
  await page.setViewportSize({ height: 900, width: 3200 });
  await boot(page);

  const width = await page.locator("[data-panes]").evaluate((node) => {
    return node.clientWidth;
  });

  expect(width).toBeLessThanOrEqual(2400);
});

test("should hide the scrollbars", async ({ page }) => {
  await boot(page);

  const width = await page.locator("[data-journal]").evaluate((node: HTMLElement) => {
    return node.offsetWidth - node.clientWidth;
  });

  expect(width, "no scrollbar gutter").toBe(0);
});

// La barre masquee est remplacee par un indicateur : sinon rien ne dit qu'il reste
// du contenu plus bas.
test("should show an indicator while content remains below", async ({ page }) => {
  const cli = await boot(page);

  await Array.from({ length: 6 }).reduce<Promise<unknown>>((chain) => {
    return chain
      .then(() => {
        return cli.fill("help");
      })
      .then(() => {
        return cli.press("Enter");
      });
  }, Promise.resolve());
  await page.locator("[data-journal]").evaluate((node) => {
    node.scrollTo(0, 0);
  });

  await expect(page.locator("[data-more]")).toBeVisible();
});

// Les libelles de mission tenaient sur une ligne avec leur etat, et trois se coupaient.
// Le nom prend sa ligne, l'etat passe dessous, comme les sections juste au-dessus.
test("should never cut a label of the left pane", async ({ page }) => {
  // Sous 1150 px le volet gauche touche son plancher : c'est la que « numérique
  // responsable » se coupait. Il passe desormais a la ligne.
  await page.setViewportSize({ height: 900, width: 1024 });
  await boot(page);

  const cut = await page.evaluate(() => {
    return [...document.querySelectorAll<HTMLElement>('[data-pane="nav"] *')]
      .filter((node) => {
        return node.scrollWidth > node.clientWidth;
      })
      .map((node) => {
        return node.textContent.trim();
      });
  });

  expect(cut, "nothing is cut in the left pane").toEqual([]);
});

// Les trois volets ont des bases fixes : le contenu d'une section ne decide plus de leur
// largeur. Une base tiree du contenu faisait sauter la mise en page a chaque changement.
test("should keep the pane widths from one section to the next", async ({ page }) => {
  await boot(page);

  const widths = () => {
      return page.evaluate(() => {
        return ["nav", "main", "out"].map((pane) => {
          const node = document.querySelector<HTMLElement>(`[data-pane="${pane}"]`);

          if (!node) {
            throw new Error(`no ${pane} pane`);
          }

          return Math.round(node.clientWidth);
        });
      });
    },
    first = await widths();

  for (const id of ["parcours", "stack", "impact", "contact"]) {
    // Les sections s'ouvrent l'une après l'autre : les ouvrir ensemble ne mesurerait rien.
    // eslint-disable-next-line no-await-in-loop
    await page
      .getByRole("button", { name: new RegExp(id) })
      .first()
      .click();
    // eslint-disable-next-line no-await-in-loop
    expect(await widths(), `section ${id}`).toEqual(first);
  }
});

// Un indicateur de focus doit tenir 3:1 contre le fond qu'il borde (WCAG 1.4.11). Axe ne
// mesure pas les contours : ce test le fait, sur chaque thème.
for (const theme of ["dark", "light", "noctis", "azureus", "uva", "bordo", "lux", "hibernus"]) {
  test(`should draw every focus ring at 3:1 or more on the ${theme} theme`, async ({ page }) => {
    await page.addInitScript((choisi) => {
      localStorage["bd-term-opts"] = JSON.stringify({ anim: true, out: true, theme: choisi });
    }, theme);

    const cli = await boot(page);

    await fill(cli);

    const ratios = await page.evaluate(ringRatios, [
      '[data-ctl="nav"]',
      "[data-handle]",
      "[data-journal]",
      "[data-result]",
      '[data-pane="out"] [tabindex="0"]',
    ]);

    for (const entry of ratios) {
      expect(Number(entry.split(" ").at(-1)), entry).toBeGreaterThanOrEqual(3);
    }
  });
}

// L'invariant de CONTEXT.md : focalisable ⇒ élément intérieur ⇒ carré. Un outline suit le
// rayon de l'élément qu'il entoure, et un rayon sur un contrôle se voit d'abord à l'état
// sélectionné, où la frise reste carrée et la section ne l'était plus.
test("should keep every focusable element square", async ({ page }) => {
  await boot(page);
  // La modale porte quatre des six contrôles corrigés : sans elle le parcours les rate.
  await page.locator("[data-ctl='opts']").click();
  await expect(page.locator("[data-opts]")).toBeVisible();

  const arrondis = await page.evaluate(() => {
    return [...document.querySelectorAll<HTMLElement>('button, input, a[href], [tabindex="0"]')]
      .filter((node) => {
        return node.offsetParent !== null;
      })
      .filter((node) => {
        return getComputedStyle(node).borderRadius !== "0px";
      })
      .map((node) => {
        return `${node.tagName.toLowerCase()}[${node.dataset.ctl ?? "?"}]`;
      });
  });

  expect(arrondis, "focusable ⇒ inner ⇒ square").toEqual([]);
});

test("should resize the log with the keyboard and keep its height", async ({ page }) => {
  const cli = await boot(page);

  await fill(cli);

  const height = () => {
      return page.locator("[data-journal]").evaluate((node) => {
        return node.clientHeight;
      });
    },
    before = await height();

  await page.getByRole("separator", { name: "Redimensionner le journal" }).focus();
  await page.getByRole("separator", { name: "Redimensionner le journal" }).press("ArrowUp");
  await page.getByRole("separator", { name: "Redimensionner le journal" }).press("ArrowUp");

  const after = await height();

  expect(after).toBeGreaterThan(before);

  await page.reload();
  await expect(page.locator("[data-boot]")).toHaveCount(0, { timeout: 10_000 });

  expect(await height(), "the height survives a reload").toBe(after);
});

// Une hauteur de journal reglee sur une autre fenetre survit dans le stockage. Trop
// haute, elle ecrasait le resultat a zero et faisait deborder le volet central : la
// reponse de « contact » arrivait coupee.
test("should give the result its room back when a too tall log meets a new section", async ({
  page,
}) => {
  await page.addInitScript(() => {
    localStorage.setItem("bd-term-opts", JSON.stringify({ logH: 900 }));
  });
  await boot(page);
  await page
    .getByRole("button", { name: /contact/ })
    .first()
    .click();

  const sizes = await page.evaluate(() => {
    const pane = document.querySelector<HTMLElement>('[data-pane="main"]'),
      result = document.querySelector<HTMLElement>("[data-result]");

    if (!pane || !result) {
      throw new Error("no main pane or no result");
    }

    return { overflow: pane.scrollHeight - pane.clientHeight, result: result.clientHeight };
  });

  expect(sizes.result, "the result keeps its room").toBeGreaterThanOrEqual(120);
  expect(sizes.overflow, "the main pane fits in its frame").toBeLessThanOrEqual(1);
});

test("should never shrink the log below 44 px", async ({ page }) => {
  const cli = await boot(page);

  await fill(cli);

  const handle = page.getByRole("separator", { name: "Redimensionner le journal" });

  await handle.focus();
  await Array.from({ length: 20 }).reduce<Promise<unknown>>((chain) => {
    return chain.then(() => {
      return handle.press("ArrowDown");
    });
  }, Promise.resolve());

  // On lit le réglage lui-même, pas la hauteur rendue : le rendu arrondit au sous-pixel,
  // et la colonne empilée remplace la hauteur par un jeton.
  expect(await handle.getAttribute("aria-valuenow")).toBe("44");
});

// Le résultat garde le focus pendant qu'une commande tourne. Masquer la zone elle-même
// rendrait le focus au « body », et la tabulation suivante repartirait du haut de la page.
test("should keep the focus on the result while a command runs", async ({ page }) => {
  await boot(page);

  await page.locator("[data-result]").focus();
  await page.keyboard.press("j");

  await expect(page.locator("[data-result]")).toBeFocused();
});
