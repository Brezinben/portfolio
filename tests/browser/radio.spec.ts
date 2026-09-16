import type { Locator, Page } from "@playwright/test";
import { expect, test } from "@playwright/test";

// La seed témoin du test unitaire. Ce que le volet en affiche doit correspondre aux
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
  field = (page: Page) => page.getByLabel(/^Seed/),
  play = (page: Page) => page.locator(".radio__ctl button").last(),
  reseed = (page: Page) => page.locator(".radio__ctl button").first(),
  // « 1:20 » vaut vingt : le test compare des secondes, pas des chaînes.
  seconds = (shown: string | null) => Number.parseInt(shown?.split(":")[1] ?? "0", 10),
  heightOf = (node: Locator) => node.evaluate((el) => el.getBoundingClientRect().height);

// Taper la commande est le geste : le morceau part tout de suite. Rien ne sonne avant, et
// le contexte audio ne se monte même pas — un portfolio qui joue à l'ouverture est un
// portfolio qu'on referme.
test("should build no audio context before the command is typed", async ({ page }) => {
  // Le compteur passe par un attribut de la page plutôt que par une variable globale : il
  // se relit alors sans rien affirmer sur le type de « globalThis ».
  await page.addInitScript(() => {
    const real = globalThis.AudioContext;

    globalThis.AudioContext = class extends real {
      constructor() {
        super();

        const root = document.documentElement;

        root.dataset["built"] = String(Number(root.dataset["built"] ?? 0) + 1);
      }
    };
  });

  const cli = await boot(page),
    built = async () => page.evaluate(() => document.documentElement.dataset["built"] ?? "0");

  expect(await built(), "nothing is built at page load").toBe("0");

  await cli.fill("/radio");
  await cli.press("Enter");
  await expect(page.locator(".radio")).toBeVisible();

  await expect(page.locator(".radio__params p")).toHaveCount(5);
  await expect(page.locator(".radio"), "the tune starts on the command").toHaveAttribute(
    "data-audio",
    "on",
  );
  expect(await built(), "exactly one context, built by the command").toBe("1");
});

// Le son doit vraiment sortir, pas seulement l'état du volet le dire. L'analyseur est en
// bout de chaîne, donc mesurer des niveaux prouve que le graphe joue. La silhouette écrit
// des pourcentages entiers, l'analyseur une décimale : la décimale est la signature.
test("should really feed the analyser once the command runs", async ({ page }) => {
  await open(page);

  await expect
    .poll(
      async () => {
        const bar = page.locator("[data-radio-bar]").first();

        return bar.evaluate((node) => node.style.getPropertyValue("--bar"));
      },
      { timeout: 8000 },
    )
    .toMatch(/^\d+\.\d%$/u);
});

// Les chiffres se groupent par trois : une seed se dicte à voix haute et se recopie.
test("should group the seed digits in threes", async ({ page }) => {
  await open(page);

  const shown = await field(page).inputValue();

  expect(shown).toMatch(/^\d{1,3}(?: \d{3})+$/u);
});

// C'est la propriété centrale de la commande : même seed, même morceau. Les valeurs
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

// Une seed vide ne doit pas se charger comme seed zéro : le champ se remet au nombre
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

// Animation coupée : la boucle de rendu s'arrête côté JS, pas seulement le mouvement CSS.
// Le gel est une image fixe lisible, jamais une disparition. Le son, lui, continue : le
// réglage porte sur le mouvement, pas sur la lecture.
test("should stop the render loop when animation is off", async ({ page }) => {
  const cli = await open(page),
    bar = page.locator("[data-radio-bar]").first(),
    height = async () => bar.evaluate((node) => node.style.getPropertyValue("--bar"));

  await expect.poll(height, { timeout: 8000 }).toMatch(/^\d+\.\d%$/u);

  await cli.fill("options");
  await cli.press("Enter");
  await page.getByRole("button", { name: /animation/iu }).click();
  await page.keyboard.press("Escape");

  // Deux images suffiraient à le voir bouger : une seconde ne laisse aucun doute.
  const frozen = await height();

  await page.waitForTimeout(1000);

  expect(await height(), "the loop wrote nothing more").toBe(frozen);

  const drawn = await bar.evaluate((node) => getComputedStyle(node).height);

  expect(Number.parseFloat(drawn), "the frame stays readable").toBeGreaterThan(0);
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

// Le glyphe qui précède la seed commande la lecture, comme le bouton du bas : c'est là
// que l'œil va quand il lit le nombre. Il doit donc être une cible, pas une décoration.
test("should let the glyph beside the seed drive playback", async ({ page }) => {
  await open(page);

  const glyph = page.locator(".radio__glyph");

  await expect(glyph).toHaveText("‖");

  await glyph.click();

  await expect(page.locator(".radio")).toHaveAttribute("data-audio", "pause");
  await expect(glyph).toHaveText("▶");
  await expect(play(page)).toHaveText("▶");

  await glyph.click();

  await expect(page.locator(".radio")).toHaveAttribute("data-audio", "on");

  const box = await glyph.boundingBox();

  expect(box?.height ?? 0, "the glyph keeps its target size").toBeGreaterThanOrEqual(44);
});

// Le point d'état de l'en-tête dit ce que la sortie fait vraiment. Une radio en pause
// n'est pas en ordre : elle attend, et prend donc le ton d'une commande en vol.
test("should tell the real state in the pane header", async ({ page }) => {
  await open(page);

  const head = page.locator('[data-pane="out"] .zone__head'),
    tone = () => head.locator("[data-outdot]").evaluate((node) => getComputedStyle(node).color);

  await expect(head).toContainText("radio");
  await expect(head).toContainText("live");

  const live = await tone();

  await page.locator(".radio__glyph").click();

  await expect(head).toContainText("pause");
  await expect(head).not.toContainText("live");
  expect(await tone(), "pause does not read as in order").not.toBe(live);
});

// Le clavier global ne doit pas voler les touches du champ de seed. Les flèches y déplacent
// le curseur, et « j » s'y tape : sans cette garde, corriger un nombre collé était
// impossible, et « j » fermait la radio en changeant de section.
test("should leave the seed field its own keys", async ({ page }) => {
  await open(page);

  const seed = field(page);

  await seed.click();
  await seed.press("ArrowLeft");
  await seed.press("ArrowLeft");

  await expect(seed, "the field keeps the focus").toBeFocused();

  await seed.press("j");

  await expect(page.locator(".radio"), "j types, it does not navigate").toBeVisible();
  expect(await seed.inputValue(), "the letter is refused, the digits stay").toMatch(/\d/u);
});

// Espace appartient au bouton qui a le focus. Le lui prendre couperait le clavier sur les
// deux seuls contrôles du volet.
test("should let a focused button keep the space key", async ({ page }) => {
  await open(page);

  const shown = await values(page).allTextContents(),
    before = shown.join(",");

  await reseed(page).focus();
  await reseed(page).press(" ");

  await expect(page.locator(".radio"), "playback is untouched").toHaveAttribute("data-audio", "on");
  await expect
    .poll(async () => {
      const next = await values(page).allTextContents();

      return next.join(",");
    })
    .not.toBe(before);
});

// Reprendre n'est pas rejouer : la pause laisse le curseur où il est, donc la boucle
// continue au lieu de repartir à la première mesure, et l'horloge reste d'accord avec elle.
test("should resume the tune instead of restarting it", async ({ page }) => {
  await open(page);

  const clock = page.locator(".radio__label span").last();

  await expect.poll(async () => clock.textContent(), { timeout: 8000 }).not.toBe("0:00");

  const before = await clock.textContent();

  await page.locator(".radio__glyph").click();
  await expect(page.locator(".radio")).toHaveAttribute("data-audio", "pause");
  await page.locator(".radio__glyph").click();

  await expect(page.locator(".radio")).toHaveAttribute("data-audio", "on");

  const after = await clock.textContent();

  expect(after, "the clock does not fall back to zero").not.toBe("0:00");
  expect(seconds(after), "the clock kept counting the same tune").toBeGreaterThanOrEqual(
    seconds(before),
  );
});

// Les raccourcis valent sur toute la page, pas seulement dans le volet : le pied de page
// les annonce sans dire où poser le focus. Ils s'effacent devant une saisie, et la ligne de
// commande reste une saisie — « r » doit pouvoir s'y taper.
test("should honour the shortcuts from anywhere but a text field", async ({ page }) => {
  const cli = await open(page);

  const shown = await values(page).allTextContents(),
    before = shown.join(",");

  await page.locator("body").click({ position: { x: 5, y: 5 } });
  await page.keyboard.press("r");

  await expect
    .poll(
      async () => {
        const next = await values(page).allTextContents();

        return next.join(",");
      },
      { timeout: 8000 },
    )
    .not.toBe(before);

  await cli.click();
  await cli.fill("");
  await cli.press("r");

  expect(await cli.inputValue(), "the command line still types r").toBe("r");
});

// « m » coupe le son sans arrêter le morceau : le chronomètre continue, et reprendre
// retrouve la boucle là où elle en est. C'est ce qui le distingue d'« espace ».
test("should mute without stopping the tune", async ({ page }) => {
  await open(page);

  const clock = page.locator(".radio__label span").last();

  await expect.poll(async () => clock.textContent(), { timeout: 8000 }).not.toBe("0:00");

  await page.locator("body").click({ position: { x: 5, y: 5 } });
  await page.keyboard.press("m");

  await expect(page.locator(".radio")).toHaveAttribute("data-audio", "muet");

  const muted = await clock.textContent();

  await expect.poll(async () => clock.textContent(), { timeout: 8000 }).not.toBe(muted);

  await page.keyboard.press("m");

  await expect(page.locator(".radio")).toHaveAttribute("data-audio", "on");
});

// Le son coupé et la pause sont deux axes séparés. Reprendre après une pause ne doit pas
// rendre le son que personne n'a redemandé : le gain maître est réécrit par la reprise, et
// c'est là que les deux états se désynchronisaient.
test("should keep the sound cut across a pause", async ({ page }) => {
  await open(page);

  await page.locator("body").click({ position: { x: 5, y: 5 } });
  await page.keyboard.press("m");
  await expect(page.locator(".radio")).toHaveAttribute("data-audio", "muet");

  await page.keyboard.press(" ");
  await expect(page.locator(".radio"), "space still pauses").toHaveAttribute("data-audio", "pause");

  await page.keyboard.press(" ");
  await expect(page.locator(".radio"), "the sound stays cut").toHaveAttribute("data-audio", "muet");

  await page.keyboard.press("m");
  await expect(page.locator(".radio")).toHaveAttribute("data-audio", "on");
});
