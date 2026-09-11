import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

// Ce fichier est le filet de la refonte CSS : il fige le rendu calcule avant que les 465
// declarations en ligne ne partent en classes. Il ne decrit aucune intention de design.
// Si un instantane bouge, c'est que le deplacement a change le rendu, pas que le rendu
// devait changer.
//
// Un instantane ne prouve rien s'il est pris sur un seul theme. « dark » est le defaut,
// « light » est le seul a redefinir --acc-text, « noctis » applique un hue-rotate.
const THEMES = ["dark", "light", "noctis"],
  // Ni width, ni height, ni transform, ni opacity : ils dependent de la fenetre ou de
  // l'instant. Les proprietes retenues sont celles que portent les declarations deplacees.
  PROPS = [
    "align-content",
    "align-items",
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
  test(`le châssis ne bouge pas en thème ${theme}`, async ({ page }) => {
    await boot(page, theme);

    await fige(page, `chassis-${theme}`, {
      "bouton-options": '[data-ctl="opts"]',
      "carte-missions": '[data-pane="nav"] > div > div:nth-of-type(2)',
      "carte-sections": '[data-pane="nav"] > div > div:nth-of-type(1)',
      "entete-carte": '[data-pane="nav"] > div > div:nth-of-type(1) > p',
      "liste-carte": '[data-pane="nav"] ul',
      "nav-non-selectionne": '[data-ctl="nav"][aria-current="false"]',
      "nav-selectionne": '[data-ctl="nav"][aria-current="true"]',
      panes: "[data-panes]",
      "volet-central": '[data-pane="main"]',
      "volet-gauche": '[data-pane="nav"]',
      "volet-sortie": '[data-pane="out"]',
    });
  });
}

// Le journal, la ligne de commande et la barre d'etat : le volet central hors resultat, et
// le chassis du volet de sortie.
for (const theme of THEMES) {
  test(`le journal ne bouge pas en thème ${theme}`, async ({ page }) => {
    await boot(page, theme);

    await fige(page, `journal-${theme}`, {
      cli: "#cli",
      gauge: "[data-gauge]",
      journal: "[data-journal]",
      "point-sortie": "[data-outdot]",
      resultat: "[data-result]",
      statut: "[data-status]",
      "volet-sortie-region": '[data-pane="out"] [tabindex="0"]',
    });
  });
}

// Les suggestions n'existent qu'une fois la saisie commencee.
for (const theme of THEMES) {
  test(`les suggestions ne bougent pas en thème ${theme}`, async ({ page }) => {
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
  test(`la modale d'options ne bouge pas en thème ${theme}`, async ({ page }) => {
    await boot(page, theme);

    await page.locator('[data-ctl="opts"]').click();
    await expect(page.locator("[data-opts]")).toBeVisible();
    // Les bascules sont toutes actives au demarrage. En eteindre une donne la paire.
    await page.locator("[data-toggle]").first().click();

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

// La frise vit dans la section « parcours », l'arbre dans « stack ». Aucune des deux n'est
// affichee au demarrage.
for (const theme of THEMES) {
  test(`la frise ne bouge pas en thème ${theme}`, async ({ page }) => {
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
  test(`l'arbre ne bouge pas en thème ${theme}`, async ({ page }) => {
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
