import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

const boot = async (page: Page) => {
    await page.goto("/");
    await expect(page.locator("[data-boot]")).toHaveCount(0, { timeout: 10_000 });

    return page.getByLabel("Commande");
  },
  mascot = (page: Page) => page.locator("[data-mascot]"),
  // La construction fusionne les neuf feuilles en une image. Ce n'est plus l'URL qui dit
  // l'etat, c'est la bande : chaque etat lit sa tranche par background-position-y.
  bande = (page: Page) =>
    mascot(page).evaluate((node) => getComputedStyle(node).backgroundPositionY),
  // La construction empreinte le nom des feuilles pour le cache long : on compare la
  // racine, pas l'empreinte.
  racine = (file: string) => file.replace(/\.[\da-f]{6,}\.png$/u, ".png"),
  // Les feuilles sont lourdes : on ne tire que celle qu'on montre.
  watchSheets = (page: Page) => {
    const asked: string[] = [];

    page.on("request", (request) => {
      if (request.url().includes("/sprites/")) {
        asked.push(racine(request.url().split("/").pop() ?? ""));
      }
    });

    return asked;
  };

test("la mascotte est une feuille de sprites, jouée au repos", async ({ page }) => {
  await boot(page);

  await expect(mascot(page)).toBeVisible();
  await expect(mascot(page)).toHaveClass(/slime--idle/u);

  const fond = await mascot(page).evaluate((node) => ({
    animation: getComputedStyle(node).animationName,
    image: getComputedStyle(node).backgroundImage,
    lissage: getComputedStyle(node).imageRendering,
  }));

  expect(fond.image, "l'image fusionnée").toMatch(/slime-sheets(?:\.[\da-f]+)?\.png/u);
  expect(fond.animation, "douze frames").toBe("slime-12");
  expect(fond.lissage, "aucun lissage sur du pixel art").toBe("pixelated");
  expect(await bande(page), "le repos ouvre l'image").toBe("0px");
});

// Les neuf etats tiennent dans une image : une requete, pas neuf.
test("une seule image porte les neuf états", async ({ page }) => {
  const asked = watchSheets(page);

  await boot(page);
  await page.waitForTimeout(600);

  expect(asked).toEqual(["slime-sheets.png"]);
});

// Mouvement reduit : la mascotte disparait, et rien ne part sur le reseau pour elle.
test("en mouvement réduit, la mascotte disparaît et aucune feuille n'est chargée", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });

  const asked = watchSheets(page);

  await boot(page);
  await page.waitForTimeout(600);

  await expect(mascot(page)).toHaveCount(0);
  expect(asked, "aucune feuille demandée").toEqual([]);
  await expect(page.locator("[data-track]"), "la piste garde sa place").toHaveCount(1);
});

test("animations coupées, la mascotte disparaît et aucune feuille n'est chargée", async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem("bd-term-opts", JSON.stringify({ anim: false })),
  );

  const asked = watchSheets(page);

  await boot(page);
  await page.waitForTimeout(600);

  await expect(mascot(page)).toHaveCount(0);
  expect(asked, "aucune feuille demandée").toEqual([]);
  await expect(page.locator("[data-track]"), "la piste garde sa place").toHaveCount(1);
});

test("la mascotte est décorative et sort du parcours clavier", async ({ page }) => {
  await boot(page);

  await expect(mascot(page)).toHaveAttribute("aria-hidden", "true");
  expect(await mascot(page).getAttribute("role")).toBeNull();
  expect(await mascot(page).getAttribute("aria-label")).toBeNull();
  expect(await mascot(page).getAttribute("tabindex")).toBeNull();
});

test("un clic sur la mascotte joue le clin d'œil", async ({ page }) => {
  const asked = watchSheets(page);

  await boot(page);

  const repos = await bande(page);

  await mascot(page).click({ force: true });

  await expect(mascot(page)).toHaveClass(/slime--wink/u);
  expect(await bande(page), "le clin d'œil lit une autre bande").not.toBe(repos);
  expect(asked, "rien ne part : l'image est déjà là").toEqual(["slime-sheets.png"]);
});

test("la frappe dans la saisie fait taper la mascotte", async ({ page }) => {
  const cli = await boot(page);

  await cli.pressSequentially("hel");

  await expect(mascot(page)).toHaveClass(/slime--type/u);
  expect(await bande(page), "la frappe lit sa propre bande").not.toBe("0px");
});

// Les evenements d'animation remontent : sans « .self », la fin de l'animation d'un
// decor ramenait la mascotte au repos au milieu de sa propre boucle.
test("une animation de décor ne remet pas la mascotte au repos", async ({ page }) => {
  const cli = await boot(page);

  await cli.pressSequentially("he");
  await expect(mascot(page)).toHaveClass(/slime--type/u);

  await mascot(page).evaluate((node) => {
    const decor = document.createElement("span");

    node.append(decor);
    decor.dispatchEvent(new AnimationEvent("animationend", { bubbles: true }));
  });

  await expect(mascot(page), "la frappe continue").toHaveClass(/slime--type/u);
});

// « load » boucle sans fin : sa seule sortie est le minuteur de la commande. Revenir sur
// une section deja vue coupe ce minuteur, il faut rendre la main a la main.
test("revenir sur une section déjà vue sort la mascotte de la réflexion", async ({ page }) => {
  await boot(page);

  const aller = (nom: string) =>
    page
      .getByRole("button", { name: new RegExp(nom) })
      .first()
      .click();

  await aller("contact");
  await aller("whoami");

  await expect(mascot(page)).not.toHaveClass(/slime--load/u);
});

test("changer de thème déclenche la mue", async ({ page }) => {
  await boot(page);
  await page.getByRole("button", { name: "options" }).click();
  await page.getByRole("button", { name: "noctis" }).click();

  await expect(mascot(page)).toHaveClass(/slime--morph/u);
});

// Sans mascotte, changer de theme ne doit rien jouer ni rien telecharger : la promesse
// « aucune feuille en mouvement reduit » vaut aussi quand le theme change.
// Trop court, la personne qui tape ne voit jamais l'animation : elle regarde ses mots.
test("la frappe tient huit cents millisecondes après la dernière touche", async ({ page }) => {
  const cli = await boot(page);

  await cli.pressSequentially("hel");
  await expect(mascot(page)).toHaveClass(/slime--type/u);

  await page.waitForTimeout(550);
  expect(await mascot(page).getAttribute("class"), "elle tape encore à 550 ms").toBe(
    "slime slime--type",
  );

  await page.waitForTimeout(500);
  expect(await mascot(page).getAttribute("class"), "elle a rendu la main après 800 ms").not.toBe(
    "slime slime--type",
  );
});

// Anti-rebond : tant qu'on tape, le compte à rebours repart de zéro.
test("chaque touche relance le compte à rebours de la frappe", async ({ page }) => {
  const cli = await boot(page);

  // Six touches espacées de 600 ms, moins que le délai de retour : seule la relance à
  // chaque frappe garde la mascotte sur « type » jusqu'au bout.
  await Array.from({ length: 6 }).reduce<Promise<unknown>>(
    (chain) => chain.then(() => cli.press("h")).then(() => page.waitForTimeout(600)),
    Promise.resolve(),
  );

  expect(await mascot(page).getAttribute("class"), "la frappe n'a pas été coupée").toBe(
    "slime slime--type",
  );
});

test("changer de thème sans mascotte ne charge aucune feuille", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });

  const asked = watchSheets(page);

  await boot(page);
  await page.getByRole("button", { name: "options" }).click();
  await page.getByRole("button", { name: "noctis" }).click();
  await page.waitForTimeout(600);

  await expect(page.locator(".tm")).toHaveAttribute("data-theme", "noctis");
  await expect(mascot(page)).toHaveCount(0);
  expect(asked, "aucune feuille demandée").toEqual([]);
});

// Rallumer les animations apres un changement de theme remonte la mascotte : elle doit
// reprendre son repos, pas rester sur la mue d'un theme deja applique.
test("rallumer les animations après un changement de thème rend le repos", async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem("bd-term-opts", JSON.stringify({ anim: false })),
  );

  await boot(page);
  await page.getByRole("button", { name: "options" }).click();
  await page.getByRole("button", { name: "noctis" }).click();
  await page.getByRole("button", { name: /animations/ }).click();
  await page.getByRole("dialog").press("Escape");

  await expect(mascot(page)).toHaveCount(1);
  await expect(mascot(page)).toHaveClass(/slime--idle/u);
});

// Les couleurs sont cuites dans les PNG : les themes sombres les font tourner.
test("les thèmes sombres font tourner la teinte, les clairs non", async ({ page }) => {
  const filtre = (theme: string) =>
    page.evaluate((chosen) => {
      document.querySelector<HTMLElement>(".tm")!.dataset.theme = chosen;

      return getComputedStyle(document.querySelector<HTMLElement>("[data-mascot]")!)!.filter;
    }, theme);

  await boot(page);

  expect(await filtre("dark"), "l'ambre des feuilles est déjà celui du thème").toBe("none");
  expect(await filtre("noctis")).toContain("hue-rotate(117deg)");
  expect(await filtre("azureus")).toContain("hue-rotate(163deg)");
  expect(await filtre("uva")).toContain("hue-rotate(205deg)");
  expect(await filtre("bordo")).toContain("hue-rotate(306deg)");
  expect(await filtre("light"), "palette ambre inchangée").toBe("none");
  expect(await filtre("lux")).toBe("none");
  expect(await filtre("hibernus")).toBe("none");
});

// La ligne du journal dit « mise en veille » : la mascotte doit dormir, pas cligner.
test("la commande sleep endort vraiment la mascotte", async ({ page }) => {
  const cli = await boot(page);

  await cli.fill("/sleep");
  await cli.press("Enter");

  await expect(mascot(page)).toHaveClass(/slime--sleep/u);
});

test("les humeurs hilare et triste ont leur état", async ({ page }) => {
  const cli = await boot(page);

  await cli.fill("/slime laugh");
  await cli.press("Enter");
  await expect(mascot(page)).toHaveClass(/slime--jump/u);

  await cli.fill("/slime sad");
  await cli.press("Enter");
  await expect(mascot(page)).toHaveClass(/slime--sleep/u);
});

test("une commande fait parler la mascotte", async ({ page }) => {
  const cli = await boot(page);

  await cli.fill("/joke");
  await cli.press("Enter");

  await expect(page.locator("[data-bubble]")).toContainText("héhé");
});

// La position passe par le style, pas par l'état réactif : la faire transiter par Alpine
// ferait rerendre la page a chaque image.
test("la position est écrite directement dans le style", async ({ page }) => {
  const cli = await boot(page);

  await cli.fill("/slime drop");
  await cli.press("Enter");

  await expect.poll(() => mascot(page).evaluate((node) => node.style.left)).toMatch(/px$/u);
});

// Cinq clics font exploser le slime. Il ne repond plus a rien jusqu'a sa reapparition.
test("cinq clics font exploser la mascotte", async ({ page }) => {
  await boot(page);

  await Array.from({ length: 5 }).reduce<Promise<unknown>>(
    (chain) => chain.then(() => mascot(page).click({ force: true })),
    Promise.resolve(),
  );

  await expect(mascot(page)).toHaveClass(/slime--boom/u);
});

test("explosée, la mascotte ne répond plus", async ({ page }) => {
  const cli = await boot(page);

  await Array.from({ length: 5 }).reduce<Promise<unknown>>(
    (chain) => chain.then(() => mascot(page).click({ force: true })),
    Promise.resolve(),
  );
  await expect(mascot(page)).toHaveClass(/slime--boom/u);

  expect(
    await mascot(page).evaluate((node) => getComputedStyle(node).pointerEvents),
    "les débris ne se cliquent pas",
  ).toBe("none");

  await mascot(page).click({ force: true });
  await cli.pressSequentially("he");

  expect(await mascot(page).getAttribute("class"), "rien ne la déloge").toBe("slime slime--boom");
});

// Entre cinq et dix secondes plus tard, elle reprend forme, puis son repos.
test("la mascotte reprend forme après son explosion", async ({ page }) => {
  await boot(page);

  await Array.from({ length: 5 }).reduce<Promise<unknown>>(
    (chain) => chain.then(() => mascot(page).click({ force: true })),
    Promise.resolve(),
  );

  await expect(mascot(page)).toHaveClass(/slime--reform/u, { timeout: 15_000 });
  // Reformée, elle quitte l'explosion et se laisse de nouveau toucher. Son état exact
  // dépend du temps écoulé : dix secondes sans geste et la veille prend la main.
  await expect(mascot(page)).not.toHaveClass(/slime--(?:boom|reform)/u, { timeout: 5000 });
  expect(await mascot(page).evaluate((node) => getComputedStyle(node).pointerEvents)).toBe("auto");
});

test("plus rien ne parle de couronne", async ({ page }) => {
  await boot(page);

  const garde = await page.evaluate(() => localStorage.getItem("bd-term-opts"));

  expect(garde ?? "", "la couronne ne se conserve plus").not.toContain("crowned");
  await expect(mascot(page)).not.toHaveClass(/slime--(?:king|crown)/u);
});

// Couper les animations depuis la modale retire la mascotte sur-le-champ.
test("couper les animations retire la mascotte", async ({ page }) => {
  await boot(page);
  await page.getByRole("button", { name: "options" }).click();
  await page.getByRole("button", { name: /animations/ }).click();
  await page.getByRole("dialog").press("Escape");

  await expect(mascot(page)).toHaveCount(0);
});

// Le bloc de la mascotte doit etre assez grand pour etre clique : c'etait la cause du
// curseur faux et de la couronne inatteignable.
test("la mascotte offre une cible cliquable, pas un pixel", async ({ page }) => {
  await boot(page);

  const box = await mascot(page).boundingBox();

  expect(box!.width).toBe(64);
  expect(box!.height).toBe(64);
  expect(await mascot(page).evaluate((node) => getComputedStyle(node).cursor)).toBe("grab");
});
