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
            return animation.finished;
          }),
      );
    });
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

test("should keep the whole interface reachable by keyboard", async ({ page }) => {
  await boot(page);

  const reachable = await page.evaluate(() => {
    return [
      ...document.querySelectorAll<HTMLElement>("button, input, a[href], [tabindex='0']"),
    ].filter((node) => {
      return node.offsetParent !== null && node.tabIndex >= 0;
    }).length;
  });

  expect(reachable).toBeGreaterThan(10);
});

// L'ambre du theme clair est trop pale pour du texte : le decoratif garde sa teinte,
// le texte prend une variante plus sombre.
test("should separate the decorative amber from the text amber on the light theme", async ({
  page,
}) => {
  await withTheme(page, "light");

  const { decorative, text } = await page.evaluate(() => {
    const styles = getComputedStyle(document.querySelector<HTMLElement>(".tm")!);

    return {
      decorative: styles.getPropertyValue("--acc").trim(),
      text: styles.getPropertyValue("--acc-text").trim(),
    };
  });

  expect(decorative, "the decorative hue does not change").toBe("#e6a000");
  expect(text).not.toBe(decorative);
});

// Noctis n'a qu'un vert : l'accent et le succes portaient la meme teinte, et la cle
// d'une paire JSON ne se distinguait plus de sa valeur.
test("should separate the key from the value on the noctis theme", async ({ page }) => {
  await withTheme(page, "noctis");

  const { key, value } = await page.evaluate(() => {
    const styles = getComputedStyle(document.querySelector<HTMLElement>(".tm")!);

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

// La recherche globale est une modale : elle porte un combobox, une liste d'options et un
// focus capturé. Fermée, le scan de la page ne la voit pas du tout.
for (const theme of THEMES) {
  test(`should report no accessibility violation in the global search on the ${theme} theme`, async ({
    page,
  }) => {
    await withTheme(page, theme);
    await page.keyboard.press("Control+k");
    await expect(page.locator("[data-global]")).toBeVisible();
    await page.locator("[data-global-input]").fill("sta");
    await settled(page);

    const { violations } = await scan(page);

    expect(
      violations.map((entry) => {
        return `${entry.id}: ${entry.nodes.length}`;
      }),
    ).toEqual([]);
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
