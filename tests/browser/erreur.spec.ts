import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { ringRatios } from "../helpers/contrast.ts";

const UNKNOWN = "/une/route/qui-n-existe-pas";
const HOME = /cd ~/u;
const PLAIN = /texte\.html/u;
const mascot = (page: Page) => {
  return page.getByRole("button", { name: "Caresser le slime" });
};

// Le sprite vit sur un pseudo-élément : le bouton, lui, ne porte aucun fond.
const band = (page: Page) => {
  return mascot(page).evaluate((node) => {
    return getComputedStyle(node, "::before").backgroundPositionY;
  });
};

const exit = (page: Page, name: RegExp) => {
  return page.getByRole("link", { name });
};

// Ce que la mise en avant dessine : le fond de la ligne, et sa barre d'accent.
const paint = (page: Page, name: RegExp) => {
  return exit(page, name).evaluate((node) => {
    return {
      bar: getComputedStyle(node).borderLeftColor,
      fill: getComputedStyle(node).backgroundColor,
    };
  });
};

const focusedText = (page: Page) => {
  return page.evaluate(() => {
    return document.activeElement?.textContent?.trim() ?? "";
  });
};

const setOptions = (page: Page, opts: string) => {
  return page.addInitScript((value) => {
    localStorage.setItem("bd-term-opts", value);
  }, opts);
};

// Caddy renvoie toute adresse inconnue vers cette page, et file_server y conserve le
// statut. Un corps sans le statut mentirait aux robots comme aux moteurs.
test("should answer 404 with the error page on an unknown address", async ({ page }) => {
  const answer = await page.goto(UNKNOWN);

  expect(answer?.status(), "the status the server answered").toBe(404);
  expect(answer?.headers()["content-type"]).toContain("text/html");
  await expect(page).toHaveTitle(/404/u);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex");
  await expect(page.getByText("route introuvable")).toBeVisible();
});

test("should show the requested path, truncated at fifty-two characters", async ({ page }) => {
  await page.goto(UNKNOWN);
  await expect(page.locator("[data-path]")).toHaveText(UNKNOWN);

  await page.goto(`/${"a".repeat(80)}`);

  const shown = await page.locator("[data-path]").textContent();

  expect(shown, "the path stops before it breaks the line").toHaveLength(52);
  expect(shown?.endsWith("…"), "and it says that it was cut").toBe(true);
});

// La page ne charge ni le contenu ni le point d'entrée : le thème ne peut lui venir que du
// stockage local, posé par la version terminal.
test("should take the theme from bd-term-opts", async ({ page }) => {
  const ground = () => {
    return page.evaluate(() => {
      return getComputedStyle(document.body).backgroundColor;
    });
  };

  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto(UNKNOWN);

  const fallback = await ground();

  await page.evaluate(() => {
    localStorage.setItem("bd-term-opts", JSON.stringify({ theme: "noctis" }));
  });
  await page.reload();

  await expect(page.locator("html")).toHaveAttribute("data-theme", "noctis");
  expect(await ground(), "the noctis background replaces the default one").not.toBe(fallback);
});

test("should draw the mascot from the merged sheet", async ({ page }) => {
  await page.goto(UNKNOWN);

  const sprite = await mascot(page).evaluate((node) => {
    return {
      animation: getComputedStyle(node, "::before").animationName,
      duration: getComputedStyle(node, "::before").animationDuration,
      image: getComputedStyle(node, "::before").backgroundImage,
    };
  });

  expect(sprite.image, "the merged image").toMatch(/slime-sheets(?:\.[\da-f]+)?\.png/u);
  expect(sprite.animation, "the sprite plays").not.toBe("none");
  expect(sprite.duration, "the sprite plays").not.toBe("0s");
});

// Le « hue-rotate » accorde les couleurs cuites dans le PNG au thème. Posé sur le bouton,
// il repeignait aussi son contour de focus : l'ambre y virait au rose sur quatre thèmes.
test("should keep the focus ring out of the mascot hue filter", async ({ page }) => {
  const filters = () => {
    return mascot(page).evaluate((node) => {
      return {
        button: getComputedStyle(node).filter,
        sprite: getComputedStyle(node, "::before").filter,
      };
    });
  };

  // Sans réglage, la page suit le système, et ni le sombre ni le clair ne tournent la teinte.
  await page.goto(UNKNOWN);

  const untouched = await filters();

  await page.evaluate(() => {
    localStorage.setItem("bd-term-opts", JSON.stringify({ theme: "azureus" }));
  });
  await page.reload();

  const tuned = await filters();

  expect(tuned.button, "the button draws the outline, so it stays unfiltered").toBe("none");
  expect(tuned.sprite, "the sprite follows the theme").not.toBe(untouched.sprite);
});

// Une seule sortie est mise en avant, et elle suit le pointeur comme le clavier. La
// première la porte au repos, et elle la perd dès qu'on passe à la suivante.
test("should move the highlight to the exit the visitor reaches", async ({ page }) => {
  await page.goto(UNKNOWN);

  const home = exit(page, HOME),
    plain = exit(page, PLAIN);

  await expect(home, "the home exit opens the page highlighted").toHaveAttribute(
    "data-primary",
    "",
  );

  const marked = await paint(page, HOME),
    resting = await paint(page, PLAIN);

  expect(marked, "and it is painted").not.toEqual(resting);

  await plain.focus();

  await expect(plain, "the keyboard moves the highlight").toHaveAttribute("data-primary", "");
  await expect(home, "and the first one loses it").not.toHaveAttribute("data-primary", "");
  expect(await paint(page, PLAIN), "the paint travels with it").toEqual(marked);
  expect(await paint(page, HOME), "the first one goes back to rest").toEqual(resting);
  expect(
    await plain.evaluate((node) => {
      return getComputedStyle(node).outlineStyle;
    }),
    "the ring says focus, which the highlight alone does not",
  ).toBe("solid");

  await home.hover();

  await expect(home, "the pointer moves it too").toHaveAttribute("data-primary", "");
  await expect(plain, "and only one exit carries it").not.toHaveAttribute("data-primary", "");
});

// Les flèches parcourent les contrôles du volet, comme sur la version terminal.
test("should move focus with the up and down arrows", async ({ page }) => {
  await page.goto(UNKNOWN);

  await page.keyboard.press("ArrowDown");
  await expect(mascot(page)).toBeFocused();

  await page.keyboard.press("ArrowDown");
  expect(await focusedText(page), "the first exit").toContain("cd ~");

  await page.keyboard.press("ArrowDown");
  expect(await focusedText(page), "the second exit").toContain("texte.html");

  await page.keyboard.press("ArrowUp");
  expect(await focusedText(page), "and back up").toContain("cd ~");

  // Comme moveInPane, la course s'arrête au bout : elle ne boucle pas.
  await page.keyboard.press("ArrowUp");
  await page.keyboard.press("ArrowUp");
  await expect(mascot(page), "the top holds").toBeFocused();
});

// Le clic est la seule interaction de la page. Il fait passer la mascotte en « happy »,
// puis la rend à « alert ».
test("should cheer the mascot up on a click, then bring it back", async ({ page }) => {
  await page.goto(UNKNOWN);

  const resting = await band(page);

  await mascot(page).click();

  await expect(mascot(page)).toHaveClass(/slime--happy/u);
  expect(await band(page), "happy reads its own band").not.toBe(resting);

  await expect(mascot(page)).toHaveClass(/slime--alert/u, { timeout: 4000 });
});

// Sans mouvement, la piste de la mascotte est retirée. Elle restait pourtant en tête de la
// course des flèches, et « focus » sur un élément non rendu ne fait rien : chaque pression
// visait le même vide, et la page avalait la frappe sans bouger.
test("should move focus with the arrows when the mascot is hidden", async ({ page }) => {
  await setOptions(page, JSON.stringify({ anim: false }));
  await page.goto(UNKNOWN);

  await page.keyboard.press("ArrowDown");
  expect(await focusedText(page), "the first exit, the mascot being gone").toContain("cd ~");

  await page.keyboard.press("ArrowDown");
  expect(await focusedText(page), "and the course goes on").toContain("texte.html");
});

// Une adresse que personne n'a écrite à la main arrive ici plus souvent qu'ailleurs.
// « decodeURI » y lève, et la levée emportait tout le reste du script : la bulle, le clic
// sur la mascotte et les flèches.
test("should stay alive on a malformed path", async ({ page }) => {
  const answer = await page.goto("/%E0%A4%A");

  expect(answer?.status(), "the status the server answered").toBe(404);
  await expect(page.locator("[data-path]"), "the path shows as it came").toHaveText("/%E0%A4%A");

  await mascot(page).click();
  await expect(mascot(page), "and the page still answers").toHaveClass(/slime--happy/u);
});

// Un thème inconnu ne correspond à aucun bloc : la page perdrait ses couleurs.
test("should fall back to a known theme when the stored one is unknown", async ({ page }) => {
  await setOptions(page, JSON.stringify({ theme: "chartreuse" }));
  await page.goto(UNKNOWN);

  await expect(page.locator("html")).toHaveAttribute("data-theme", /^(?:dark|light)$/u);
  expect(
    await page.evaluate(() => {
      return getComputedStyle(document.body).backgroundColor;
    }),
    "an unknown theme must not leave the page without colours",
  ).not.toBe("rgba(0, 0, 0, 0)");
});

test("should load no mascot sheet when animations are off", async ({ page }) => {
  await setOptions(page, JSON.stringify({ anim: false }));

  const asked: string[] = [];

  page.on("request", (request) => {
    if (request.url().includes("/sprites/")) {
      asked.push(request.url());
    }
  });

  await page.goto(UNKNOWN);
  await page.waitForTimeout(600);

  await expect(page.locator("html")).toHaveAttribute("data-anim", "false");
  await expect(page.locator("[data-track]")).toBeHidden();
  expect(asked, "no sheet requested").toEqual([]);
});

// Un attribut « style » battrait toute règle de la feuille, sans erreur et sans trace.
test("should carry no inline style attribute", async ({ page }) => {
  await page.goto(UNKNOWN);

  await expect(page.locator("[style]")).toHaveCount(0);
});

// Le style vit dans src/404.css et le script dans src/404.ts, pour qu'ils passent sous les
// mêmes outils que le reste. La construction les remet en ligne : une adresse inconnue ne
// doit pas coûter deux requêtes bloquantes de plus.
test("should inline the sheet and the script, and fetch neither", async ({ page }) => {
  await page.goto(UNKNOWN);

  await expect(page.locator('link[rel="stylesheet"]')).toHaveCount(0);
  await expect(page.locator("script[src]")).toHaveCount(0);
  await expect(page.locator("script"), "one script, written in place").toHaveCount(1);
});

test("should link back to the home page and to the text version", async ({ page }) => {
  await page.goto(UNKNOWN);

  await expect(exit(page, HOME)).toHaveAttribute("href", "/");
  await expect(exit(page, PLAIN)).toHaveAttribute("href", "/texte.html");
});

// La page introuvable a ses propres contours : ils tiennent 3:1 comme ceux du terminal.
for (const theme of ["dark", "light", "noctis", "azureus", "uva", "bordo", "lux", "hibernus"]) {
  test(`should draw its focus rings at 3:1 or more on the ${theme} theme`, async ({ page }) => {
    await setOptions(page, JSON.stringify({ theme }));
    await page.goto(UNKNOWN);

    for (const [selector, ratio] of await page.evaluate(ringRatios, [
      ".slime",
      '[data-ctl="nav"]',
    ])) {
      expect(ratio, selector).toBeGreaterThanOrEqual(3);
    }
  });
}
