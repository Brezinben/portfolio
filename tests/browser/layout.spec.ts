import type { Locator, Page } from "@playwright/test";
import { expect, test } from "@playwright/test";

// La poignee ne s'affiche que si le journal deborde : une tige a deplacer dans le vide
// ne servirait a rien.
const fill = async (cli: Locator) => {
    for (const _ of Array.from({ length: 6 })) {
      // Les commandes doivent s'enchainer : les paralleliser ne remplirait pas le journal.
      // eslint-disable-next-line no-await-in-loop
      await cli.fill("help");
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
test("la page ne dépasse jamais la hauteur de la fenêtre", async ({ page }) => {
  const cli = await boot(page);

  await Array.from({ length: 12 }).reduce<Promise<unknown>>(
    (chain) => chain.then(() => cli.fill("help")).then(() => cli.press("Enter")),
    Promise.resolve(),
  );

  const overflow = await page.evaluate(() => document.body.scrollHeight - window.innerHeight);

  expect(overflow, "aucun débordement vertical").toBeLessThanOrEqual(1);
});

test("le contenu reste collé en haut de son volet", async ({ page }) => {
  await boot(page);

  const align = await page
    .locator("[data-result]")
    .evaluate((node) => getComputedStyle(node).alignContent);

  expect(align).toBe("start");
});

test("sous 900 px les trois volets s'empilent", async ({ page }) => {
  await page.setViewportSize({ height: 800, width: 700 });
  await boot(page);

  const direction = await page
    .locator("[data-panes]")
    .evaluate((node) => getComputedStyle(node).flexDirection);

  expect(direction).toBe("column");
});

test("au-delà de 2400 px la mise en page se centre", async ({ page }) => {
  await page.setViewportSize({ height: 900, width: 3200 });
  await boot(page);

  const width = await page.locator("[data-panes]").evaluate((node) => node.clientWidth);

  expect(width).toBeLessThanOrEqual(2400);
});

test("les barres de défilement sont masquées", async ({ page }) => {
  await boot(page);

  const width = await page
    .locator("[data-journal]")
    .evaluate((node: HTMLElement) => node.offsetWidth - node.clientWidth);

  expect(width, "aucune gouttière de barre de défilement").toBe(0);
});

// La barre masquee est remplacee par un indicateur : sinon rien ne dit qu'il reste
// du contenu plus bas.
test("un indicateur signale qu'il reste du contenu", async ({ page }) => {
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
test("aucun libellé du volet gauche n'est coupé", async ({ page }) => {
  // Sous 1150 px le volet gauche touche son plancher : c'est la que « numérique
  // responsable » se coupait. Il passe desormais a la ligne.
  await page.setViewportSize({ height: 900, width: 1024 });
  await boot(page);

  const cut = await page.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>('[data-pane="nav"] *')]
      .filter((node) => node.scrollWidth > node.clientWidth)
      .map((node) => node.textContent.trim()),
  );

  expect(cut, "rien ne se coupe dans le volet gauche").toEqual([]);
});

// Les trois volets ont des bases fixes : le contenu d'une section ne decide plus de leur
// largeur. Une base tiree du contenu faisait sauter la mise en page a chaque changement.
test("la largeur des volets ne bouge pas d'une section à l'autre", async ({ page }) => {
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

// Un seul rayon pilote tous les coins arrondis : la valeur se teste dans le navigateur
// en changeant une variable, pas en chassant sept déclarations.
test("un seul rayon pilote tous les coins arrondis", async ({ page }) => {
  await boot(page);

  const rayons = () =>
    page.evaluate(() =>
      ["[data-ctl='opts']", "[data-pane='main']", "[data-pane='out']", "[data-ctl='nav']"].map(
        (cible) => getComputedStyle(document.querySelector<HTMLElement>(cible)!)!.borderRadius,
      ),
    );

  expect(await rayons(), "y compris les contrôles").toEqual(["5px", "5px", "5px", "5px"]);

  await page.evaluate(() =>
    document.querySelector<HTMLElement>(".tm")!.style.setProperty("--radius", "0px"),
  );

  expect(await rayons(), "la variable les mène tous").toEqual(["0px", "0px", "0px", "0px"]);
});

test("le journal se redimensionne au clavier et sa hauteur est conservée", async ({ page }) => {
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

  expect(await height(), "la hauteur survit au rechargement").toBe(after);
});

// Une hauteur de journal reglee sur une autre fenetre survit dans le stockage. Trop
// haute, elle ecrasait le resultat a zero et faisait deborder le volet central : la
// reponse de « contact » arrivait coupee.
test("un journal trop haut rend sa place au résultat au changement de section", async ({
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

  expect(sizes.result, "le résultat garde sa place").toBeGreaterThanOrEqual(120);
  expect(sizes.overflow, "le volet central tient dans son cadre").toBeLessThanOrEqual(1);
});

test("le journal ne descend jamais sous 44 px", async ({ page }) => {
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
