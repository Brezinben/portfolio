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
  values = (page: Page) => {
    return page.locator(".radio__params b");
  },
  field = (page: Page) => {
    return page.getByLabel(/^Seed/);
  },
  play = (page: Page) => {
    return page.locator(".radio__ctl button").last();
  },
  reseed = (page: Page) => {
    return page.locator(".radio__ctl button").first();
  },
  // « 1:20 » vaut vingt : le test compare des secondes, pas des chaînes.
  seconds = (shown: string | null) => {
    return Number.parseInt(shown?.split(":")[1] ?? "0", 10);
  },
  heightOf = (node: Locator) => {
    return node.evaluate((el) => {
      return el.getBoundingClientRect().height;
    });
  };

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
    built = async () => {
      return page.evaluate(() => {
        return document.documentElement.dataset["built"] ?? "0";
      });
    };

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

        return bar.evaluate((node) => {
          return node.style.getPropertyValue("--bar");
        });
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
    scrolls = await pane.evaluate((node) => {
      return node.scrollHeight > node.clientHeight + 1;
    });

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
    height = async () => {
      return bar.evaluate((node) => {
        return node.style.getPropertyValue("--bar");
      });
    };

  await expect.poll(height, { timeout: 8000 }).toMatch(/^\d+\.\d%$/u);

  await cli.fill("options");
  await cli.press("Enter");
  await page.getByRole("button", { name: /animation/iu }).click();
  await page.keyboard.press("Escape");

  // Deux images suffiraient à le voir bouger : une seconde ne laisse aucun doute.
  const frozen = await height();

  await page.waitForTimeout(1000);

  expect(await height(), "the loop wrote nothing more").toBe(frozen);

  const drawn = await bar.evaluate((node) => {
    return getComputedStyle(node).height;
  });

  expect(Number.parseFloat(drawn), "the frame stays readable").toBeGreaterThan(0);
});

// Le code de la radio ne part pas au premier chargement : peu de visiteurs taperont la
// commande. Il arrive par import dynamique, une fois, au moment où elle est tapée.
test("should download the radio chunk only when the command is typed", async ({ page }) => {
  const pulled: string[] = [];

  page.on("request", (request) => {
    return pulled.push(request.url());
  });

  const cli = await boot(page);

  expect(
    pulled.filter((url) => {
      return url.includes("radio");
    }),
    "nothing radio on first load",
  ).toEqual([]);

  await cli.fill("/radio");
  await cli.press("Enter");
  await expect(page.locator(".radio")).toBeVisible();

  const chunks = pulled.filter((url) => {
    return /\/radio\.[\da-f]+\.js$/u.test(url);
  });

  expect(chunks, "the chunk arrives once, stamped").toHaveLength(1);
});

// Les huit thèmes suivent sans une couleur en dur : les teintes sortent de « --acc » par
// color-mix, donc deux thèmes ne peignent pas pareil. La commande « theme » les traverse
// sans recharger — huit démarrages dépassaient la limite de temps en intégration.
test("should paint the bars from the theme accent on every theme", async ({ page }) => {
  const cli = await open(page),
    painted: string[] = [];

  for (const theme of THEMES) {
    // eslint-disable-next-line no-await-in-loop
    await cli.fill(`theme ${theme}`);
    // eslint-disable-next-line no-await-in-loop
    await cli.press("Enter");
    // eslint-disable-next-line no-await-in-loop
    await expect(page.locator(".tm")).toHaveAttribute("data-theme", theme);

    // eslint-disable-next-line no-await-in-loop
    const paint = await page
      .locator("[data-radio-bar] u")
      .first()
      .evaluate((node) => {
        return getComputedStyle(node).backgroundImage;
      });

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
    tone = () => {
      return head.locator("[data-outdot]").evaluate((node) => {
        return getComputedStyle(node).color;
      });
    };

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

  await expect
    .poll(
      async () => {
        return clock.textContent();
      },
      { timeout: 8000 },
    )
    .not.toBe("0:00");

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

  await expect
    .poll(
      async () => {
        return clock.textContent();
      },
      { timeout: 8000 },
    )
    .not.toBe("0:00");

  await page.locator("body").click({ position: { x: 5, y: 5 } });
  await page.keyboard.press("m");

  await expect(page.locator(".radio")).toHaveAttribute("data-audio", "muet");

  const muted = await clock.textContent();

  await expect
    .poll(
      async () => {
        return clock.textContent();
      },
      { timeout: 8000 },
    )
    .not.toBe(muted);

  await page.keyboard.press("m");

  await expect(page.locator(".radio")).toHaveAttribute("data-audio", "on");
});

// Le gain maître est réécrit à chaque lecture, et c'est là que le son coupé se rendait tout
// seul. Tirer une seed relance le morceau : le son doit rester coupé jusqu'à ce qu'on le
// redemande.
test("should keep the sound cut across a new seed", async ({ page }) => {
  await open(page);

  const shown = await values(page).allTextContents(),
    before = shown.join(",");

  await page.locator("body").click({ position: { x: 5, y: 5 } });
  await page.keyboard.press("m");
  await expect(page.locator(".radio")).toHaveAttribute("data-audio", "muet");

  await page.keyboard.press("r");

  await expect
    .poll(async () => {
      const next = await values(page).allTextContents();

      return next.join(",");
    })
    .not.toBe(before);
  await expect(page.locator(".radio"), "the new tune stays silent").toHaveAttribute(
    "data-audio",
    "muet",
  );

  await page.keyboard.press("m");
  await expect(page.locator(".radio")).toHaveAttribute("data-audio", "on");
});

// Le son coupé se lit sur le glyphe : un « ▶ » pendant que la musique tourne mentirait, et
// un « ‖ » ne dirait pas que rien ne sort. Le premier clic rend le son et arrête la
// musique, le second la relance — le bouton ne fait jamais deux choses à la fois.
test("should show the cut sound on the glyph and take two clicks to hear again", async ({
  page,
}) => {
  await open(page);

  const glyph = page.locator(".radio__glyph");

  await expect(glyph).toHaveText("‖");

  await page.locator("body").click({ position: { x: 5, y: 5 } });
  await page.keyboard.press("m");

  await expect(page.locator(".radio")).toHaveAttribute("data-audio", "muet");
  await expect(glyph, "the cut sound has its own sign").toHaveText("⊘");
  await expect(play(page)).toHaveText("⊘");

  await glyph.click();

  await expect(page.locator(".radio"), "the first click gives the sound back").toHaveAttribute(
    "data-audio",
    "pause",
  );
  await expect(glyph).toHaveText("▶");

  await glyph.click();

  await expect(page.locator(".radio"), "the second click starts it again").toHaveAttribute(
    "data-audio",
    "on",
  );
  await expect(glyph).toHaveText("‖");
});

// Le nombre de barres suit la largeur du volet, et se refait au redimensionnement : la
// bande doit rester lisible quand la fenêtre change, pas seulement à l'ouverture.
test("should refit the bars when the window changes", async ({ page }) => {
  await page.setViewportSize({ height: 900, width: 1280 });
  await open(page);

  const bars = page.locator("[data-radio-bar]");

  await expect(bars).toHaveCount(20);

  // 950 px et non 700 : sous 900 px les volets s'empilent, donc celui de sortie s'élargit
  // au lieu de rétrécir. Le volet tombe ici à 257 px, sous le seuil.
  await page.setViewportSize({ height: 900, width: 950 });

  await expect(bars, "a narrower pane carries fewer bars").toHaveCount(16);

  await page.setViewportSize({ height: 900, width: 1280 });

  await expect(bars, "and they come back when it widens").toHaveCount(20);
});

// Un onglet en arrière-plan qui continue de jouer est une impolitesse. La pause rendue au
// retour n'est que celle-là : une pause demandée par le visiteur ne se défait pas seule.
test("should hush the tune while the tab is hidden", async ({ page }) => {
  await open(page);

  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", { configurable: true, value: true });
    document.dispatchEvent(new Event("visibilitychange"));
  });

  await expect(page.locator(".radio")).toHaveAttribute("data-audio", "pause");

  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", { configurable: true, value: false });
    document.dispatchEvent(new Event("visibilitychange"));
  });

  await expect(page.locator(".radio"), "coming back gives it back").toHaveAttribute(
    "data-audio",
    "on",
  );
});

// Le volet de sortie est la seule surface de la radio, et « /radio » le rallume pour cette
// raison. L'éteindre la laisserait jouer sans rien pour l'arrêter : elle se ferme avec lui.
test("should close the radio when the output pane is switched off", async ({ page }) => {
  const cli = await open(page);

  await cli.fill("options");
  await cli.press("Enter");
  await page.getByRole("button", { name: /output pane/iu }).click();
  await page.keyboard.press("Escape");

  await expect(page.locator(".radio")).toHaveCount(0);

  const built = await page.evaluate(() => {
    return document.querySelectorAll("[data-radio-bar]").length;
  });

  expect(built, "nothing of the radio is left behind").toBe(0);
});
