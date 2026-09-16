import type { Locator, Page } from "@playwright/test";
import { expect, test } from "@playwright/test";

// La graine témoin du test unitaire. Ce que le volet en affiche doit correspondre aux
// paramètres gelés : sinon le volet décrit un morceau qu'on n'entend pas.
const THEMES = ["dark", "light", "noctis", "azureus", "uva", "bordo", "lux", "hibernus"];
const WITNESS = "8093451772146";

const boot = async (page: Page) => {
    await page.goto("/");
    await expect(page.locator("[data-boot]")).toHaveCount(0, { timeout: 10_000 });

    return page.getByLabel("Commande");
  },
  open = async (page: Page) => {
    const cli = await boot(page);

    await cli.fill("/radio");
    await cli.press("Enter");
    await expect(page.locator(".radio")).toBeVisible();

    return cli;
  },
  values = (page: Page) => page.locator(".radio__params b"),
  field = (page: Page) => page.getByLabel(/^Graine/),
  play = (page: Page) => page.locator(".radio__ctl button").last(),
  reseed = (page: Page) => page.locator(".radio__ctl button").first(),
  heightOf = (node: Locator) => node.evaluate((el) => el.getBoundingClientRect().height);

// Le son ne part jamais tout seul. Chrome refuse d'ailleurs de démarrer un contexte audio
// sans geste, et un portfolio qui se met à jouer à l'ouverture est un portfolio qu'on ferme.
test("should make no sound before a gesture", async ({ page }) => {
  await open(page);

  await expect(page.locator(".radio")).toHaveAttribute("data-audio", "muet");
  await expect(page.locator(".radio__params p")).toHaveCount(5);
});

// Les chiffres se groupent par trois : une graine se dicte à voix haute et se recopie.
test("should group the seed digits in threes", async ({ page }) => {
  await open(page);

  const shown = await field(page).inputValue();

  expect(shown).toMatch(/^\d{1,3}(?: \d{3})+$/u);
});

// C'est la propriété centrale de la commande : même graine, même morceau. Les valeurs
// attendues sont celles que le test unitaire gèle.
test("should replay the very same tune from a pasted seed", async ({ page }) => {
  await open(page);

  const shown = await values(page).allTextContents(),
    before = shown.join(",");

  await reseed(page).click();
  await expect
    .poll(async () => {
      const next = await values(page).allTextContents();

      return next.join(",");
    })
    .not.toBe(before);

  await field(page).fill(WITNESS);
  await field(page).press("Enter");

  await expect(values(page).nth(0)).toHaveText("106 bpm");
  await expect(values(page).nth(1)).toHaveText("mi majeur");
  await expect(values(page).nth(2)).toHaveText("I V vi IV");
  await expect(values(page).nth(3)).toHaveText("triangle");
  await expect(values(page).nth(4)).toContainText("3/4");
});

// Une graine vide ne doit pas se charger comme graine zéro : le champ se remet au nombre
// courant plutôt que de partir sur un morceau qui n'a pas été demandé.
test("should refuse an empty seed instead of loading zero", async ({ page }) => {
  await open(page);

  await field(page).fill(WITNESS);
  await field(page).press("Enter");
  await field(page).fill("");
  await field(page).press("Enter");

  expect(await field(page).inputValue()).toBe("8 093 451 772 146");
  await expect(values(page).nth(0)).toHaveText("106 bpm");
});

// « q » quitte, et le contexte audio se ferme avec. Un contexte laissé ouvert continue de
// tourner en fond et garde le matériel audio réservé.
test("should give the pane back to the section on q", async ({ page }) => {
  await open(page);

  await play(page).click();
  await expect(page.locator(".radio")).toHaveAttribute("data-audio", "on");

  await play(page).press("q");

  await expect(page.locator(".radio")).toHaveCount(0);
  await expect(page.locator('[data-pane="out"] dl')).toBeVisible();
});

// La navigation reprend le volet de sortie : la radio ne peut pas y survivre, sinon son
// contexte audio tournerait sans volet pour le montrer.
test("should close the radio when another section opens", async ({ page }) => {
  const cli = await open(page);

  await cli.fill("cd stack");
  await cli.press("Enter");

  await expect(page.locator(".radio")).toHaveCount(0);
});

// Le volet vit dans une page bornée à 100dvh sans défilement. Le spectre est le seul
// élément qui cède : la barre d'action et la ligne de raccourcis sont les seuls contrôles,
// et se faisaient rogner dans la maquette.
test("should keep the controls visible on a 540 pixel high window", async ({ page }) => {
  await page.setViewportSize({ height: 540, width: 1280 });
  await open(page);

  await expect(page.locator(".radio__ctl")).toBeInViewport();
  await expect(page.locator(".radio__foot")).toBeInViewport();
  expect(
    await heightOf(play(page)),
    "the play button keeps its target size",
  ).toBeGreaterThanOrEqual(44);

  const pane = page.locator('[data-pane="out"]'),
    scrolls = await pane.evaluate((node) => node.scrollHeight > node.clientHeight + 1);

  expect(scrolls, "the pane does not overflow").toBe(false);
});

// Le spectre se comprime, il ne grandit pas : testée en « flex: 1 1 auto », la bande
// mangeait tout le volet sur grand écran.
test("should never stretch the spectrum band beyond its ceiling", async ({ page }) => {
  await page.setViewportSize({ height: 1200, width: 1600 });
  await open(page);

  expect(await heightOf(page.locator(".radio__viz"))).toBeLessThanOrEqual(148);
});

// Animation coupée : la silhouette reste lisible, et la boucle de rendu s'arrête côté JS.
// Le gel est une image fixe, jamais une disparition.
test("should freeze a readable silhouette when animation is off", async ({ page }) => {
  const cli = await open(page);

  await cli.fill("options");
  await cli.press("Enter");
  await page.getByRole("button", { name: /animation/iu }).click();
  await page.keyboard.press("Escape");

  const animated = await page
    .locator("[data-radio-bar] u")
    .first()
    .evaluate((node) => getComputedStyle(node).animationName);

  expect(animated, "no keyframe runs with the setting off").toBe("none");

  const drawn = await page
    .locator("[data-radio-bar] u")
    .first()
    .evaluate((node) => getComputedStyle(node).height);

  expect(Number.parseFloat(drawn), "the silhouette stays drawn").toBeGreaterThan(0);
});

// Le code de la radio ne part pas au premier chargement : peu de visiteurs taperont la
// commande. Il arrive par import dynamique, une fois, au moment où elle est tapée.
test("should download the radio chunk only when the command is typed", async ({ page }) => {
  const pulled: string[] = [];

  page.on("request", (request) => pulled.push(request.url()));

  const cli = await boot(page);

  expect(
    pulled.filter((url) => url.includes("radio")),
    "nothing radio on first load",
  ).toEqual([]);

  await cli.fill("/radio");
  await cli.press("Enter");
  await expect(page.locator(".radio")).toBeVisible();

  const chunks = pulled.filter((url) => /\/radio\.[\da-f]+\.js$/u.test(url));

  expect(chunks, "the chunk arrives once, stamped").toHaveLength(1);
});

// Les huit thèmes suivent sans une seule couleur en dur : les deux teintes des barres
// sortent de « --acc » par color-mix. Un thème qui rendrait la même peinture qu'un autre
// dirait qu'une valeur a été recopiée au lieu d'être dérivée.
test("should paint the bars from the theme accent on every theme", async ({ page }) => {
  const painted: string[] = [];

  for (const theme of THEMES) {
    // eslint-disable-next-line no-await-in-loop
    await page.addInitScript((chosen) => {
      localStorage.setItem("bd-term-opts", JSON.stringify({ theme: chosen }));
    }, theme);
    // eslint-disable-next-line no-await-in-loop
    await open(page);

    // eslint-disable-next-line no-await-in-loop
    const paint = await page
      .locator("[data-radio-bar] u")
      .first()
      .evaluate((node) => getComputedStyle(node).backgroundImage);

    expect(paint, `${theme} paints a gradient`).toContain("gradient");
    painted.push(paint);
  }

  expect(new Set(painted).size, "each theme paints its own accent").toBe(THEMES.length);
});
