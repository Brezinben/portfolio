import { expect, test } from "@playwright/test";
import { AxeBuilder } from "@axe-core/playwright";
import type { Page } from "@playwright/test";

const THEMES = ["dark", "light", "noctis", "azureus", "uva", "bordo", "lux", "hibernus"],
  boot = async (page: Page) => {
    await page.goto("/");
    await expect(page.locator("[data-boot]")).toHaveCount(0, { timeout: 10_000 });
  },
  withTheme = async (page: Page, theme: string) => {
    await page.addInitScript((chosen) => {
      localStorage.setItem("bd-term-opts", JSON.stringify({ theme: chosen }));
    }, theme);
    await boot(page);
  },
  // Sans les regles de bonne pratique, le scan laissait passer une page sans « main » et
  // sans titre de niveau un. Elles ne sont pas des echecs WCAG, mais la section impact
  // annonce « structure semantique » : le scan doit tenir la promesse, pas la contourner.
  scan = (page: Page) => {
    return new AxeBuilder({ page }).analyze();
  },
  // Le scan mesure la couleur telle qu'elle est peinte. Lancé pendant le fondu d'entrée, il
  // lit des valeurs à mi-opacité et rapporte des écarts qui n'existent pas. On attend donc
  // les animations qui finissent ; le curseur et la mascotte, eux, ne finissent jamais.
  settled = (page: Page) => {
    return page.evaluate(() => {
      return Promise.all(
        document
          .getAnimations()
          .filter((animation) => {
            return animation.effect?.getComputedTiming().iterations !== Infinity;
          })
          .map((animation) => {
            // Une frappe annule l'animation d'entrée des lignes, et « finished » rejette
            // alors avec AbortError. Une animation annulée ne peint plus : elle est posée.
            return animation.finished.catch(() => {
              return animation;
            });
          }),
      );
    });
  },
  typedIsClean = async (page: Page, typed: string) => {
    await page.locator("[data-global-input]").fill(typed);
    await settled(page);

    const { violations } = await scan(page);

    expect(
      violations.map((entry) => {
        return `${entry.id}: ${entry.nodes.length}`;
      }),
      `the global search is clean with « ${typed} » typed`,
    ).toEqual([]);
  };

for (const theme of THEMES) {
  test(`should report no accessibility violation on the ${theme} theme`, async ({ page }) => {
    await withTheme(page, theme);

    const { violations } = await scan(page);

    expect(
      violations.map((entry) => {
        return `${entry.id}: ${entry.nodes.length}`;
      }),
    ).toEqual([]);
  });
}

// La page d'erreur porte les huit thèmes elle aussi, et une sortie mise en avant dont le
// fond teinte le texte. Elle échappait au scan : le portail ne la sert sur aucune adresse
// connue, donc aucune boucle ne l'atteignait.
for (const theme of THEMES) {
  test(`should report no accessibility violation on the error page with the ${theme} theme`, async ({
    page,
  }) => {
    await page.addInitScript((chosen) => {
      localStorage.setItem("bd-term-opts", JSON.stringify({ theme: chosen }));
    }, theme);
    await page.goto("/une/route/qui-n-existe-pas");
    await settled(page);

    const { violations } = await scan(page);

    expect(
      violations.map((entry) => {
        return `${entry.id}: ${entry.nodes.length}`;
      }),
    ).toEqual([]);
  });
}

// La version texte reprend les huit thèmes de la version terminal. Elle les porte sur du
// texte de lecture, pas sur une interface : le contraste s'y mesure séparément.
for (const theme of THEMES) {
  test(`should report no accessibility violation on the text version with the ${theme} theme`, async ({
    page,
  }) => {
    await page.addInitScript((chosen) => {
      localStorage.setItem("bd-term-opts", JSON.stringify({ theme: chosen }));
    }, theme);
    await page.goto("/texte.html");

    const { violations } = await scan(page);

    expect(
      violations.map((entry) => {
        return `${entry.id}: ${entry.nodes.length}`;
      }),
    ).toEqual([]);
  });
}

test("should stop every animation when reduced motion is on", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await boot(page);

  const animated = await page.evaluate(() => {
    return [...document.querySelectorAll<HTMLElement>("*")].filter((node) => {
      return getComputedStyle(node).animationName !== "none";
    }).length;
  });

  expect(animated).toBe(0);
});

// Deux contrôles échappent au plancher, et pour la même raison : ils vivent dans une ligne
// dense, dont la hauteur appartient au texte. L'entrée de frise et le badge des succès
// n'ont pas de place à prendre. Le compromis est assumé : la cible reste petite au doigt.
test("should give every interactive target at least 44 pixels", async ({ page }) => {
  await boot(page);

  const small = await page.evaluate(() => {
    return [
      ...document.querySelectorAll<HTMLElement>(
        'button:not([data-suggestion]):not([data-tech]):not([data-ctl="tl"]):not([data-ctl="ach"])',
      ),
    ]
      .filter((node) => {
        return node.offsetParent !== null;
      })
      .map((node) => {
        return {
          h: node.getBoundingClientRect().height,
          t: node.textContent.trim().slice(0, 20),
        };
      })
      .filter((entry) => {
        return entry.h < 44;
      });
  });

  expect(small).toEqual([]);
});

// Un visiteur au clavier atteint chaque section avec Tab seul.
test("should reach every section button with Tab", async ({ page }) => {
  await boot(page);

  const sections = await page.locator('[data-ctl="nav"]').count(),
    reached = new Set<number>();

  expect(sections, "the page lists its sections").toBeGreaterThan(0);

  for (const _ of Array.from({ length: 40 })) {
    // Le focus avance d'un pas à la fois : paralléliser n'aurait pas de sens.
    // oxlint-disable-next-line no-await-in-loop
    await page.keyboard.press("Tab");
    // oxlint-disable-next-line no-await-in-loop
    const at = await page.evaluate(() => {
      return [...document.querySelectorAll('[data-ctl="nav"]')].indexOf(
        document.activeElement ?? document.body,
      );
    });

    if (at !== -1) {
      reached.add(at);
    }
  }

  expect(reached.size, "every section button is on the Tab path").toBe(sections);
});

// Noctis n'a qu'un vert : l'accent et le succes portaient la meme teinte, et la cle
// d'une paire JSON ne se distinguait plus de sa valeur.
test("should separate the key from the value on the noctis theme", async ({ page }) => {
  await withTheme(page, "noctis");

  const { key, value } = await page.locator(".tm").evaluate((node) => {
    const styles = getComputedStyle(node);

    return {
      key: styles.getPropertyValue("--acc-text").trim(),
      value: styles.getPropertyValue("--ok").trim(),
    };
  });

  expect(value).not.toBe(key);
});

// Aucune API ne signale un lecteur d'écran, et le détecter reviendrait à détecter un
// handicap. La page propose donc, elle ne devine pas : le premier élément focalisable
// annonce la version texte, et la personne choisit.
test("should lead to the text version from the first focusable element", async ({ page }) => {
  await boot(page);
  await page.keyboard.press("Tab");

  const skip = page.locator("a.skip");

  await expect(skip).toBeFocused();
  await expect(skip).toHaveAttribute("href", "texte.html");

  // Hors écran au repos, dans la fenêtre une fois focalisé. Un « toBeVisible » ne le dirait
  // pas : un élément posé à left:-9999px reste visible au sens de Playwright.
  const dedans = await skip.evaluate((node) => {
    return node.getBoundingClientRect().left >= 0;
  });

  expect(dedans, "the link must enter the window when it receives the focus").toBe(true);

  const dehors = await skip.evaluate((node) => {
    node.blur();

    return node.getBoundingClientRect().right < 0;
  });

  expect(dehors, "the link must stay off screen without focus").toBe(true);
});

// Fermée, la recherche globale échappe au scan de la page.
for (const theme of THEMES) {
  test(`should report no accessibility violation in the global search on the ${theme} theme`, async ({
    page,
  }) => {
    await withTheme(page, theme);
    await page.keyboard.press("Control+k");
    await expect(page.locator("[data-global]")).toBeVisible();

    await typedIsClean(page, "");
    await typedIsClean(page, "zzzzzz");
    await typedIsClean(page, "sta");
  });
}

// Le lien doit survivre à un échec du script : c'est le repli de la page, pas une de ses
// fonctions. Il vit donc hors du composant Alpine et ne porte aucune variable de thème.
test("should keep the text version reachable without script", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false }),
    page = await context.newPage();

  await page.goto("/");
  await page.keyboard.press("Tab");

  await expect(page.locator("a.skip")).toBeFocused();

  await context.close();
});
