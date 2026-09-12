import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

// Ce fichier fige le rendu calculé. Il ne décrit aucune intention de design : si un
// instantané bouge, c'est que le style a changé, pas qu'il devait changer.
// Il sert un déplacement de déclarations du balisage vers la feuille, où la relecture ne
// voit rien et où le navigateur voit tout.
//
// Un instantane ne prouve rien s'il est pris sur un seul theme. « dark » est le defaut,
// « light » est le seul a redefinir --acc-text, « noctis » applique un hue-rotate.
const THEMES = ["dark", "light", "noctis"],
  // Ni width, ni height, ni transform, ni opacity : ils dependent de la fenetre ou de
  // l'instant. Les proprietes retenues sont celles que portent les declarations deplacees.
  PROPS = [
    "align-content",
    "align-items",
    "animation-delay",
    "animation-duration",
    "animation-name",
    "background-color",
    "border-bottom-color",
    "border-bottom-style",
    "border-bottom-width",
    "border-left-color",
    "border-left-style",
    "border-left-width",
    "border-radius",
    "border-top-color",
    "border-top-width",
    "box-sizing",
    "color",
    "column-gap",
    "display",
    "flex-basis",
    "flex-direction",
    "flex-grow",
    "flex-shrink",
    "font-family",
    "font-size",
    "font-weight",
    "grid-template-columns",
    "justify-content",
    "letter-spacing",
    "line-height",
    "list-style-type",
    "margin-bottom",
    "margin-top",
    "min-height",
    "min-width",
    "outline-color",
    "outline-width",
    "overflow-x",
    "overflow-y",
    "padding-left",
    "padding-top",
    "position",
    "row-gap",
    "text-align",
    "transition-duration",
    "transition-property",
    "white-space",
  ],
  // Un theme se pose avant le demarrage : l'appliquer apres laisserait une transition en
  // cours au moment de la mesure.
  // La section ouverte vient de l'ancre, jamais du stockage : « restore » ne lit que
  // quatre cles, et « section » n'en fait pas partie.
  boot = async (page: Page, theme: string, section = "") => {
    await page.addInitScript(
      (saved: string) => globalThis.localStorage.setItem("bd-term-opts", saved),
      JSON.stringify({ theme }),
    );
    await page.setViewportSize({ height: 900, width: 1280 });
    await page.goto(section === "" ? "/" : `/#${section}`);
    await expect(page.locator("[data-boot]")).toHaveCount(0, { timeout: 10_000 });
    await expect(page.locator(".tm")).toHaveAttribute("data-theme", theme);
  },
  // Playwright compare un instantane au fichier du meme nom. Le theme entre dans le nom :
  // trois themes, trois fichiers, et la difference se lit sans deviner lequel a bouge.
  fige = async (page: Page, nom: string, selectors: Record<string, string>) => {
    const arg: [[string, string][], string[]] = [Object.entries(selectors), PROPS],
      // Un selecteur absent laisse la trace « absent » plutot qu'une erreur : l'instantane
      // doit dire qu'un element a disparu, pas s'arreter a la premiere disparition.
      mesure = await page.evaluate(
        ([entries, props]) =>
          Object.fromEntries(
            entries.map(([label, selector]) => {
              const node = document.querySelector(selector);

              if (!(node instanceof HTMLElement)) {
                return [label, "absent"];
              }

              const computed = globalThis.getComputedStyle(node);

              return [
                label,
                Object.fromEntries(props.map((prop) => [prop, computed.getPropertyValue(prop)])),
              ];
            }),
          ),
        arg,
      );

    expect(JSON.stringify(mesure, undefined, 2)).toMatchSnapshot(`${nom}.json`);
  };

// Le chassis : les six zones qui portent le rayon, et les trois volets qui les tiennent.
for (const theme of THEMES) {
  test(`should keep the chassis unchanged on the ${theme} theme`, async ({ page }) => {
    await boot(page, theme);

    await fige(page, `chassis-${theme}`, {
      "bouton-options": '[data-ctl="opts"]',
      "carte-missions": '[data-pane="nav"] > div > div:nth-of-type(2)',
      "carte-sections": '[data-pane="nav"] > div > div:nth-of-type(1)',
      "entete-carte": '[data-pane="nav"] > div > div:nth-of-type(1) > p',
      "lien-pied": '.tm footer a[href="texte.html"]',
      "liste-carte": '[data-pane="nav"] ul',
      "nav-non-selectionne": '[data-ctl="nav"][aria-current="false"]',
      "nav-selectionne": '[data-ctl="nav"][aria-current="true"]',
      panes: "[data-panes]",
      "pied-de-page": ".tm footer",
      "volet-central": '[data-pane="main"]',
      "volet-gauche": '[data-pane="nav"]',
      "volet-sortie": '[data-pane="out"]',
    });
  });
}

// Le journal, la ligne de commande et la barre d'etat : le volet central hors resultat, et
// le chassis du volet de sortie.
for (const theme of THEMES) {
  test(`should keep the log unchanged on the ${theme} theme`, async ({ page }) => {
    await boot(page, theme);

    await fige(page, `journal-${theme}`, {
      cli: "#cli",
      gauge: "[data-gauge]",
      journal: "[data-journal]",
      "liste-sortie": '[data-pane="out"] dl',
      "point-sortie": "[data-outdot]",
      resultat: "[data-result]",
      statut: "[data-status]",
      "volet-sortie-region": '[data-pane="out"] [tabindex="0"]',
    });
  });
}

// La poignee n'apparait qu'une fois le journal deborde.
for (const theme of THEMES) {
  test(`should keep the overflowing log unchanged on the ${theme} theme`, async ({ page }) => {
    await boot(page, theme);

    const cli = page.getByLabel("Commande");

    for (const _ of Array.from({ length: 6 })) {
      // Les commandes doivent s'enchainer : les paralleliser ne remplirait pas le journal.
      // eslint-disable-next-line no-await-in-loop
      await cli.fill("xyzzy");
      // eslint-disable-next-line no-await-in-loop
      await cli.press("Enter");
    }

    await expect(page.locator("[data-handle]")).toBeVisible();
    await fige(page, `deborde-${theme}`, { poignee: "[data-handle]" });
  });
}

// Trois regles de survol dormaient : un style en ligne les battait. Elles s'appliquent
// depuis que le style a quitte le balisage, et rien ne les couvrait.
for (const theme of THEMES) {
  test(`should keep the hover unchanged on the ${theme} theme`, async ({ page }) => {
    await boot(page, theme);

    await page.locator('[data-ctl="opts"]').hover();
    await fige(page, `survol-${theme}`, { "bouton-options": '[data-ctl="opts"]' });
  });
}

// Les suggestions n'existent qu'une fois la saisie commencee.
for (const theme of THEMES) {
  test(`should keep the suggestions unchanged on the ${theme} theme`, async ({ page }) => {
    await boot(page, theme);

    // « c » propose plusieurs commandes : la premiere est selectionnee d'office, les
    // autres donnent l'autre moitie de la paire. Un premier mot porte une description,
    // et c'est elle qui fait apparaitre l'indice.
    await page.getByLabel("Commande").fill("c");
    await expect(page.locator("[data-suggestion]").nth(1)).toBeVisible();

    await fige(page, `suggestions-${theme}`, {
      boite: "[data-suggestions]",
      indice: "[data-sugg-hint]",
      "suggestion-non-selectionnee": '[data-suggestion][aria-selected="false"]',
      "suggestion-selectionnee": '[data-suggestion][aria-selected="true"]',
    });
  });
}

// La modale d'options porte les deux dernieres familles d'etat : le choix de theme et la
// bascule.
for (const theme of THEMES) {
  test(`should keep the options modal unchanged on the ${theme} theme`, async ({ page }) => {
    await boot(page, theme);

    await page.locator('[data-ctl="opts"]').click();
    await expect(page.locator("[data-opts]")).toBeVisible();
    // Les bascules sont toutes actives au demarrage, et en eteindre une donne la paire.
    // Jamais la premiere : c'est le reglage d'animation, et l'eteindre couperait le popIn
    // de la modale, la seule animation deplacee que cet instantane puisse verifier.
    await page.locator("[data-toggle]").nth(1).click();

    await fige(page, `options-${theme}`, {
      "bascule-active": '[data-toggle][aria-pressed="true"]',
      "bascule-inactive": '[data-toggle][aria-pressed="false"]',
      fermer: '[data-ctl="opt"]:not([data-toggle]):not([data-theme-choice])',
      modale: "[data-opts]",
      "theme-actif": '[data-theme-choice][aria-pressed="true"]',
      "theme-inactif": '[data-theme-choice][aria-pressed="false"]',
    });
  });
}

// Le reglage d'animation n'a jamais touche le demarrage, et il ne le doit pas : la
// coupure figerait un splash dont les minuteries, elles, ne raccourcissent pas.
for (const theme of THEMES) {
  test(`should keep the boot unchanged on the ${theme} theme`, async ({ page }) => {
    await page.setViewportSize({ height: 900, width: 1280 });
    await page.addInitScript(
      (saved: string) => globalThis.localStorage.setItem("bd-term-opts", saved),
      JSON.stringify({ anim: false, theme }),
    );
    await page.goto("/");

    const cadre = page.locator("[data-boot]");

    await expect(cadre).toBeVisible();
    await fige(page, `demarrage-${theme}`, {
      "cadre-boot": "[data-boot]",
      "ligne-boot": "[data-boot] > div p",
      "zone-boot": "[data-boot] > div",
    });
  });
}

// La frise vit dans la section « parcours », l'arbre dans « stack ». Aucune des deux n'est
// affichee au demarrage.
for (const theme of THEMES) {
  test(`should keep the timeline unchanged on the ${theme} theme`, async ({ page }) => {
    await boot(page, theme, "parcours");
    await expect(page.locator("[data-timeline]")).toBeVisible();

    await fige(page, `frise-${theme}`, {
      frise: "[data-timeline]",
      "tl-non-selectionne": '[data-ctl="tl"][aria-selected="false"]',
      "tl-selectionne": '[data-ctl="tl"][aria-selected="true"]',
    });
  });
}

for (const theme of THEMES) {
  test(`should keep the tree unchanged on the ${theme} theme`, async ({ page }) => {
    await boot(page, theme, "stack");
    await expect(page.locator("[data-tree]")).toBeVisible();
    // Aucune technologie n'est pressee au depart. En designer une donne la paire.
    await page.locator('[data-ctl="tech"]').first().click();

    await fige(page, `arbre-${theme}`, {
      arbre: "[data-tree]",
      guide: "[data-guide]",
      "tech-non-pressee": '[data-ctl="tech"][aria-pressed="false"]',
      "tech-pressee": '[data-ctl="tech"][aria-pressed="true"]',
    });
  });
}
