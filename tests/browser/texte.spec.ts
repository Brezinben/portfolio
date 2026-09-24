import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

const THEMES = ["dark", "light", "noctis", "azureus", "uva", "bordo", "lux", "hibernus"],
  fond = (page: Page) => {
    return page.evaluate(() => {
      return getComputedStyle(document.body).backgroundColor;
    });
  };

// La page est le repli du portfolio : elle ne dépend d'aucune ressource externe, et son seul
// script ne fait que reprendre le thème. Une panne de ce script ne coûte rien.
test("should load the text version with no image and no external script", async ({ page }) => {
  await page.goto("/texte.html");

  await expect(page).toHaveTitle(/Benjamin David/);
  await expect(page.locator("html")).toHaveAttribute("lang", "fr");
  await expect(page.locator("img")).toHaveCount(0);
  await expect(page.locator("script[src]")).toHaveCount(0);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Benjamin David");

  const scripts = await page.locator("script").evaluateAll((nodes) => {
    return nodes.map((node) => {
      return node.textContent ?? "";
    });
  });

  expect(scripts).toHaveLength(1);
  expect(scripts[0]).toContain("dataset.theme");

  // Un plafond de taille, et non un compte de lignes : le formateur décide de la mise en
  // page depuis que « src/**/*.html » est sorti de ses exclusions. Ce qui compte reste le
  // même, un seul script et minuscule, et la page entière tient sans lui.
  expect(scripts[0]?.length ?? 0).toBeLessThanOrEqual(600);
});

test("should link the text version to the terminal version and to llms.txt", async ({ page }) => {
  await page.goto("/texte.html");

  await expect(page.getByRole("link", { name: "Version terminal" })).toHaveAttribute(
    "href",
    "index.html",
  );
  await expect(page.getByRole("link", { name: "llms.txt" })).toHaveAttribute("href", "llms.txt");
});

// La personne a déjà choisi son thème sur la version terminal. La page le reprend, et ne
// propose aucun sélecteur : elle sera lue, imprimée, ou passée en mode lecture.
for (const theme of THEMES) {
  test(`should take over the ${theme} theme on the text version`, async ({ page }) => {
    await page.addInitScript((chosen) => {
      localStorage.setItem("bd-term-opts", JSON.stringify({ theme: chosen }));
    }, theme);
    await page.goto("/texte.html");

    await expect(page.locator("html")).toHaveAttribute("data-theme", theme);

    const couleur = await fond(page);

    expect(couleur).not.toBe("rgba(0, 0, 0, 0)");
  });
}

// Deux thèmes suffisent à prouver que le relevé distingue vraiment les huit blocs : sans ce
// test, une feuille qui ignorerait data-theme passerait la boucle ci-dessus.
test("should not give the same background for two themes", async ({ page }) => {
  const lire = async (theme: string) => {
    await page.addInitScript((chosen) => {
      localStorage.setItem("bd-term-opts", JSON.stringify({ theme: chosen }));
    }, theme);
    await page.goto("/texte.html");

    return fond(page);
  };

  expect(await lire("noctis")).not.toBe(await lire("bordo"));
});

// Le script est un confort, pas une dépendance. Sans lui, la page garde ses couleurs et tout
// son contenu.
test("should keep the page whole without JavaScript", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false }),
    page = await context.newPage();

  await page.goto("/texte.html");

  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Benjamin David");
  await expect(page.getByRole("heading", { level: 2, name: "Contact" })).toBeVisible();
  expect(await fond(page)).not.toBe("rgba(0, 0, 0, 0)");

  await context.close();
});

// La page porte Atkinson Hyperlegible Next, dessinée pour la basse vision. Elle est
// auto-hébergée : un CDN de polices remettrait la requête tierce que le portage a supprimée.
test("should self-host the font and let nothing else out", async ({ page }) => {
  const vues: string[] = [];

  page.on("request", (requete) => {
    return vues.push(requete.url());
  });
  await page.goto("/texte.html");
  await page.evaluate(() => {
    return document.fonts.ready;
  });

  const origine = new URL(page.url()).origin,
    tiers = vues.filter((url) => {
      return new URL(url).origin !== origine;
    }),
    polices = vues.filter((url) => {
      return url.endsWith(".woff2");
    });

  expect(tiers, `third parties seen: ${JSON.stringify(tiers)}`).toEqual([]);
  expect(polices).toHaveLength(1);
  expect(polices[0]).toContain("atkinson-hyperlegible-next");

  const famille = await page.evaluate(() => {
    return getComputedStyle(document.body).fontFamily;
  });

  expect(famille).toContain("Atkinson Hyperlegible Next");
});

// Un lecteur d'écran navigue par repères et par titres. Les deux doivent tenir.
test("should offer its navigation landmarks", async ({ page }) => {
  await page.goto("/texte.html");

  await expect(page.getByRole("banner")).toHaveCount(1);
  await expect(page.getByRole("navigation")).toHaveCount(1);
  await expect(page.getByRole("main")).toHaveCount(1);
  await expect(page.getByRole("contentinfo")).toHaveCount(1);
  await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
});

test("should skip no heading level", async ({ page }) => {
  await page.goto("/texte.html");

  const niveaux = await page.locator("h1, h2, h3, h4, h5, h6").evaluateAll((nodes) => {
      return nodes.map((node) => {
        return Number(node.tagName.slice(1));
      });
    }),
    sauts = niveaux.filter((niveau, index) => {
      return index > 0 && niveau - Number(niveaux[index - 1]) > 1;
    });

  expect(niveaux[0]).toBe(1);
  expect(sauts).toEqual([]);
});

// L'image de partage porte une empreinte du contenu dans son nom et vit dans un dossier,
// donc le test relève le chemin entier. llms.txt garde un nom fixe à la racine : les robots
// le demandent par ce nom.
const PARTAGE = /property="og:image" content="https:\/\/[^"/]+\/(?<chemin>[^"]+\.png)"/u;

test("should serve the side files", async ({ request }) => {
  const page = await request.get("/texte.html"),
    html = await page.text(),
    partage = PARTAGE.exec(html)?.groups?.chemin;

  expect(partage, "texte.html must declare a share image").toBeDefined();

  const annexes: [string, string][] = [
      ["/llms.txt", "text/plain"],
      [`/${partage}`, "image/png"],
    ],
    responses = await Promise.all(
      annexes.map(([path]) => {
        return request.get(path);
      }),
    );

  for (const [index, response] of responses.entries()) {
    const [path, type] = annexes[index] ?? ["", ""];

    expect(response.status(), `${path} must be served`).toBe(200);
    expect(response.headers()["content-type"]).toContain(type);
  }
});
