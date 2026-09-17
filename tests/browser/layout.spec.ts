import type { Locator, Page } from "@playwright/test";
import { expect, test } from "@playwright/test";

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

  await Array.from({ length: 12 }).reduce<Promise<unknown>>(
    (chain) => chain.then(() => cli.fill("help")).then(() => cli.press("Enter")),
    Promise.resolve(),
  );

  const overflow = await page.evaluate(() => document.body.scrollHeight - window.innerHeight);

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

  const shown = await result.evaluate((node) => ({
    client: node.clientHeight,
    scroll: node.scrollHeight,
  }));

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
  const chevauche = await page.evaluate(() =>
    [...document.querySelectorAll('[data-pane="out"] dt')].some((key) => {
      const value = key.nextElementSibling;

      return value ? key.getBoundingClientRect().right > value.getBoundingClientRect().left : false;
    }),
  );

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

  const align = await page
    .locator("[data-result]")
    .evaluate((node) => getComputedStyle(node).alignContent);

  expect(align).toBe("start");
});

test("should stack the three panes below 900 px", async ({ page }) => {
  await page.setViewportSize({ height: 800, width: 700 });
  await boot(page);

  const direction = await page
    .locator("[data-panes]")
    .evaluate((node) => getComputedStyle(node).flexDirection);

  expect(direction).toBe("column");
});

test("should centre the layout beyond 2400 px", async ({ page }) => {
  await page.setViewportSize({ height: 900, width: 3200 });
  await boot(page);

  const width = await page.locator("[data-panes]").evaluate((node) => node.clientWidth);

  expect(width).toBeLessThanOrEqual(2400);
});

test("should hide the scrollbars", async ({ page }) => {
  await boot(page);

  const width = await page
    .locator("[data-journal]")
    .evaluate((node: HTMLElement) => node.offsetWidth - node.clientWidth);

  expect(width, "no scrollbar gutter").toBe(0);
});

// La barre masquee est remplacee par un indicateur : sinon rien ne dit qu'il reste
// du contenu plus bas.
test("should show an indicator while content remains below", async ({ page }) => {
  const cli = await boot(page);

  await Array.from({ length: 6 }).reduce<Promise<unknown>>(
    (chain) => chain.then(() => cli.fill("help")).then(() => cli.press("Enter")),
    Promise.resolve(),
  );
  await page.locator("[data-journal]").evaluate((node) => node.scrollTo(0, 0));

  await expect(page.locator("[data-more]")).toBeVisible();
});

// Les libelles de mission tenaient sur une ligne avec leur etat, et trois se coupaient.
// Le nom prend sa ligne, l'etat passe dessous, comme les sections juste au-dessus.
test("should never cut a label of the left pane", async ({ page }) => {
  // Sous 1150 px le volet gauche touche son plancher : c'est la que « numérique
  // responsable » se coupait. Il passe desormais a la ligne.
  await page.setViewportSize({ height: 900, width: 1024 });
  await boot(page);

  const cut = await page.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>('[data-pane="nav"] *')]
      .filter((node) => node.scrollWidth > node.clientWidth)
      .map((node) => node.textContent.trim()),
  );

  expect(cut, "nothing is cut in the left pane").toEqual([]);
});

// Les trois volets ont des bases fixes : le contenu d'une section ne decide plus de leur
// largeur. Une base tiree du contenu faisait sauter la mise en page a chaque changement.
test("should keep the pane widths from one section to the next", async ({ page }) => {
  await boot(page);

  const widths = () =>
      page.evaluate(() =>
        ["nav", "main", "out"].map((pane) =>
          Math.round(document.querySelector<HTMLElement>(`[data-pane="${pane}"]`)!.clientWidth),
        ),
      ),
    first = await widths();

  await ["parcours", "stack", "impact", "contact"].reduce(
    (chain, id) =>
      chain
        .then(() =>
          page
            .getByRole("button", { name: new RegExp(id) })
            .first()
            .click(),
        )
        .then(() => widths())
        .then((seen) => expect(seen, `section ${id}`).toEqual(first)),
    Promise.resolve(),
  );
});

// Un seul rayon pilote les coins des zones : la valeur se teste dans le navigateur en
// changeant une variable, pas en chassant six déclarations.
test("should drive the rounded corners of every zone with a single radius", async ({ page }) => {
  await boot(page);
  await page.locator("[data-ctl='opts']").click();
  await expect(page.locator("[data-opts]")).toBeVisible();

  const rayons = () =>
    page.evaluate(() =>
      [
        "[data-pane='nav'] > div > div:nth-child(1)",
        "[data-pane='nav'] > div > div:nth-child(2)",
        "[data-pane='main']",
        "[data-pane='out']",
        "[data-opts]",
      ].map((cible) => getComputedStyle(document.querySelector<HTMLElement>(cible)!).borderRadius),
    );

  expect(await rayons(), "the five visible zones carry the radius").toEqual(
    Array.from({ length: 5 }, () => "5px"),
  );

  await page.evaluate(() =>
    document.querySelector<HTMLElement>(".tm")!.style.setProperty("--radius", "0px"),
  );

  expect(await rayons(), "the variable drives them all").toEqual(
    Array.from({ length: 5 }, () => "0px"),
  );
});

// Le cadre de démarrage est la sixième zone. Il meurt avec le boot : son rayon ne se lit
// que pendant.
test("should give the boot zone the radius too", async ({ page }) => {
  await page.goto("/");

  const cadre = page.locator("[data-boot] > div"),
    rayon = () => cadre.evaluate((node) => getComputedStyle(node).borderRadius);

  await expect(cadre).toBeVisible();

  expect(await rayon(), "the zone carries the radius").toBe("5px");

  await page.evaluate(() =>
    document.querySelector<HTMLElement>(".tm")!.style.setProperty("--radius", "0px"),
  );

  expect(await rayon(), "the variable drives it too").toBe("0px");
});

// L'invariant de CONTEXT.md : focalisable ⇒ élément intérieur ⇒ carré. Un outline suit le
// rayon de l'élément qu'il entoure, et un rayon sur un contrôle se voit d'abord à l'état
// sélectionné, où la frise reste carrée et la section ne l'était plus.
// Un contrôle prend l'ambre décoratif, une région de texte l'ambre textuel. En sombre les
// deux coïncident : c'est le thème clair qui prouve la règle, et c'est là que l'ambre
// décoratif tombe sous les 3:1 qu'un indicateur de focus demande.
for (const [theme, controle, texte] of [
  ["dark", "rgb(245, 184, 59)", "rgb(245, 184, 59)"],
  ["light", "rgb(230, 160, 0)", "rgb(143, 95, 0)"],
]) {
  test(`should mark the focus with the right amber on the ${theme} theme`, async ({ page }) => {
    await page.addInitScript((choisi) => {
      localStorage["bd-term-opts"] = JSON.stringify({ anim: true, out: true, theme: choisi });
    }, theme);

    const cli = await boot(page);

    await fill(cli);

    const marks = await page.evaluate(() =>
      ["[data-handle]", "[data-journal]", '[data-pane="out"] [tabindex="0"]'].map((selector) => {
        const node = document.querySelector<HTMLElement>(selector);

        node?.focus();

        return node ? getComputedStyle(node).outlineColor : "absent";
      }),
    );

    expect(marks).toEqual([controle, texte, texte]);
  });
}

test("should keep every focusable element square", async ({ page }) => {
  await boot(page);
  // La modale porte quatre des six contrôles corrigés : sans elle le parcours les rate.
  await page.locator("[data-ctl='opts']").click();
  await expect(page.locator("[data-opts]")).toBeVisible();

  const arrondis = await page.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>('button, input, a[href], [tabindex="0"]')]
      .filter((node) => node.offsetParent !== null)
      .filter((node) => getComputedStyle(node).borderRadius !== "0px")
      .map((node) => `${node.tagName.toLowerCase()}[${node.dataset.ctl ?? "?"}]`),
  );

  expect(arrondis, "focusable ⇒ inner ⇒ square").toEqual([]);
});

test("should resize the log with the keyboard and keep its height", async ({ page }) => {
  const cli = await boot(page);

  await fill(cli);

  const height = () => page.locator("[data-journal]").evaluate((node) => node.clientHeight),
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
  await page.addInitScript(() =>
    localStorage.setItem("bd-term-opts", JSON.stringify({ logH: 900 })),
  );
  await boot(page);
  await page
    .getByRole("button", { name: /contact/ })
    .first()
    .click();

  const sizes = await page.evaluate(() => {
    const pane = document.querySelector<HTMLElement>('[data-pane="main"]');

    return {
      overflow: pane!.scrollHeight - pane!.clientHeight,
      result: document.querySelector<HTMLElement>("[data-result]")!.clientHeight,
    };
  });

  expect(sizes.result, "the result keeps its room").toBeGreaterThanOrEqual(120);
  expect(sizes.overflow, "the main pane fits in its frame").toBeLessThanOrEqual(1);
});

test("should never shrink the log below 44 px", async ({ page }) => {
  const cli = await boot(page);

  await fill(cli);

  const handle = page.getByRole("separator", { name: "Redimensionner le journal" });

  await handle.focus();
  await Array.from({ length: 20 }).reduce<Promise<unknown>>(
    (chain) => chain.then(() => handle.press("ArrowDown")),
    Promise.resolve(),
  );

  // On lit le réglage lui-même, pas la hauteur rendue : le rendu arrondit au sous-pixel,
  // et la colonne empilée remplace la hauteur par un jeton.
  expect(await handle.getAttribute("aria-valuenow")).toBe("44");
});
