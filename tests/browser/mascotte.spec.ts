import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

const boot = async (page: Page) => {
    await page.goto("/");
    await expect(page.locator("[data-boot]")).toHaveCount(0, { timeout: 10_000 });

    return page.getByLabel("Commande");
  },
  mascot = (page: Page) => page.locator("[data-mascot]"),
  // La construction fusionne les feuilles en une image. Ce n'est plus l'URL qui dit
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
  },
  // La saisie passe par de vrais evenements de pointeur : la mascotte capture le pointeur
  // au pointerdown, et sans capture les deplacements n'iraient nulle part.
  attraper = async (page: Page) => {
    const box = (await mascot(page).boundingBox())!;

    await page.mouse.move(box.x + 32, box.y + 32);
    await page.mouse.down();
  },
  // Plusieurs pas : un saut unique ne dirait pas le sens du deplacement.
  pousser = (page: Page, x: number, y: number) => page.mouse.move(x, y, { steps: 12 });

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

// Les trente-deux etats d'une forme tiennent dans une image : une requete, pas trente-deux.
// Et une seule forme part au demarrage.
test("une seule image porte les trente-deux états du slime", async ({ page }) => {
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

// Une passe de mue dure 2,4 s, et le visiteur regarde la modale. Elle rejoue donc tant que
// la modale reste ouverte : sinon elle finit avant qu'il ne la voie.
test("la mue rejoue tant que la modale d'options reste ouverte", async ({ page }) => {
  await boot(page);
  await page.getByRole("button", { name: "options" }).click();
  await page.getByRole("button", { name: "noctis" }).click();
  // Une passe et demie : une mue qui ne rejouerait pas serait déjà retombée au repos.
  await page.waitForTimeout(3600);

  await expect(mascot(page)).toHaveClass(/slime--morph/u);
});

// Trois façons de fermer la modale, un seul chemin dans le code. Une quatrième sortie qui
// oublierait la mue laisserait la mascotte dessus pour toujours.
const FERMETURES = [
  {
    fermer: (page: Page) => page.getByRole("button", { name: "close" }).click(),
    nom: "le bouton close",
  },
  { fermer: (page: Page) => page.getByRole("dialog").press("Escape"), nom: "la touche Échap" },
  // Le voile de la modale ferme au clic ; le coin haut gauche tombe hors de la boîte. On
  // vise le voile et non un point de l'écran : pendant la transition de vue, un clic à
  // l'aveugle atterrit sur la racine et se perd.
  {
    fermer: (page: Page) =>
      page
        .getByRole("dialog")
        .locator("..")
        .click({ position: { x: 5, y: 5 } }),
    nom: "un clic à l'extérieur",
  },
];

for (const { fermer, nom } of FERMETURES) {
  test(`fermer la modale par ${nom} rend la mascotte au repos`, async ({ page }) => {
    await boot(page);
    await page.getByRole("button", { name: "options" }).click();
    await page.getByRole("button", { name: "noctis" }).click();
    await expect(mascot(page)).toHaveClass(/slime--morph/u);

    await fermer(page);

    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(mascot(page), "la mue tient encore").toHaveClass(/slime--morph/u);
    await expect(mascot(page), "puis elle se pose").toHaveClass(/slime--idle/u, {
      timeout: 9000,
    });
  });
}

// « tu laisses un petit temps histoire qu'il ait fini, et tu mets la bonne couleur » : la
// mue porte la teinte d'un thème à l'autre, elle ne saute pas au premier instant.
test("la teinte arrive avec la mue, pas avant elle", async ({ page }) => {
  await boot(page);
  await page.getByRole("button", { name: "options" }).click();
  await page.getByRole("button", { name: "noctis" }).click();

  const teinte = () => mascot(page).evaluate((node) => getComputedStyle(node).filter),
    depart = await teinte();

  expect(depart, "la teinte part de l'ancien thème").not.toContain("hue-rotate(117deg)");

  await expect.poll(teinte, { timeout: 9000 }).toContain("hue-rotate(117deg)");
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

// Trois expressions jouaient « jump » et une quatrieme « wink » : la commande annoncait une
// emotion et rendait le geste d'a cote. Chacune porte maintenant sa feuille.
for (const expression of ["alert", "happy", "laugh", "sad", "scared", "sleep"]) {
  test(`l'expression ${expression} joue sa propre feuille`, async ({ page }) => {
    const cli = await boot(page);

    await cli.fill(`/slime ${expression}`);
    await cli.press("Enter");

    await expect(mascot(page)).toHaveClass(new RegExp(`slime--${expression}\\b`, "u"));
  });
}

// Une animation infinie n'emet jamais animationend. Sans le minuteur, ces trois-la
// tourneraient jusqu'a la fin de la visite.
test("les expressions qui bouclent rendent la main au repos", async ({ page }) => {
  const cli = await boot(page);

  await cli.fill("/slime scared");
  await cli.press("Enter");
  await expect(mascot(page)).toHaveClass(/slime--scared/u);
  // Trois cycles d'une seconde, plus le filet.
  await expect(mascot(page)).toHaveClass(/slime--idle/u, { timeout: 6000 });
});

test("slime kill fait exploser la mascotte, qui revient d'elle-même", async ({ page }) => {
  const cli = await boot(page);

  await cli.fill("/slime kill");
  await cli.press("Enter");
  await expect(mascot(page)).toHaveClass(/slime--boom/u);

  await expect(mascot(page)).toHaveClass(/slime--reform/u, { timeout: 15_000 });
  await expect(mascot(page)).not.toHaveClass(/slime--(?:boom|reform)/u, { timeout: 5000 });
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

test("attraper la mascotte joue la prise", async ({ page }) => {
  await boot(page);
  await attraper(page);

  await expect(mascot(page)).toHaveClass(/slime--grab/u);

  await page.mouse.up();
});

// Le plaquage naît du curseur qui sort de la piste, et non d'une collision entre le sprite
// et un bord. La mascotte est retenue, et elle montre qu'on tire dessus en vain.
test("le curseur hors de la piste plaque la mascotte contre ce bord", async ({ page }) => {
  await boot(page);

  const piste = (await page.locator("[data-track]").boundingBox())!,
    milieuX = piste.x + piste.width / 2,
    milieuY = piste.y + piste.height / 2,
    // La marge verticale figée vaut 24 px : on la dépasse franchement.
    dehors = 40;

  await attraper(page);

  await pousser(page, milieuX, piste.y - dehors);
  await expect(mascot(page), "au-dessus").toHaveClass(/slime--splatCeiling$/u);

  await pousser(page, milieuX, piste.y + piste.height + dehors);
  await expect(mascot(page), "en dessous").toHaveClass(/slime--splatFloor$/u);

  await pousser(page, piste.x - dehors, milieuY);
  await expect(mascot(page), "à gauche").toHaveClass(/slime--splatLeft$/u);

  await pousser(page, piste.x + piste.width + dehors, milieuY);
  await expect(mascot(page), "à droite").toHaveClass(/slime--splatRight$/u);

  await page.mouse.up();
});

// « steps(12) » finit sa course sur la treizieme case, qui n'existe pas : la bande fait
// douze cases, et le douzieme pas s'arrete a -768px, hors du dessin. Le plaquage tenait donc
// du vide, et la mascotte disparaissait sous la main qui la retenait.
test("un plaquage tenu longtemps garde sa dernière case", async ({ page }) => {
  await boot(page);

  const piste = (await page.locator("[data-track]").boundingBox())!;

  await attraper(page);
  await pousser(page, piste.x - 40, piste.y + piste.height / 2);
  await expect(mascot(page)).toHaveClass(/slime--splatLeft$/u);

  // La passe dure 0,96 s. On attend bien au-dela, comme une main qui ne lache pas.
  await page.waitForTimeout(1600);

  const arret = await mascot(page).evaluate((node) => getComputedStyle(node).backgroundPositionX);

  expect(arret, "la douzième case, pas la treizième").toBe("-704px");

  await page.mouse.up();
});

// Curseur en diagonale, les deux lectures sont vraies au meme instant. Sans les quatre
// coins, la mascotte jouait un mur alors qu'elle est collee aux deux.
test("le curseur en diagonale plaque la mascotte dans le coin", async ({ page }) => {
  await boot(page);

  const piste = (await page.locator("[data-track]").boundingBox())!,
    dehors = 40,
    gauche = piste.x - dehors,
    droite = piste.x + piste.width + dehors,
    haut = piste.y - dehors,
    bas = piste.y + piste.height + dehors;

  await attraper(page);

  await pousser(page, gauche, haut);
  await expect(mascot(page), "haut-gauche").toHaveClass(/slime--splatCeilingLeft/u);

  await pousser(page, droite, haut);
  await expect(mascot(page), "haut-droit").toHaveClass(/slime--splatCeilingRight/u);

  await pousser(page, gauche, bas);
  await expect(mascot(page), "bas-gauche").toHaveClass(/slime--splatFloorLeft/u);

  await pousser(page, droite, bas);
  await expect(mascot(page), "bas-droit").toHaveClass(/slime--splatFloorRight/u);

  await page.mouse.up();
});

// La piste a exactement la hauteur du sprite : le curseur en sortirait par le haut ou par
// le bas en une trentaine de pixels. Sans marge, un tremblement pendant un glisser
// horizontal ferait clignoter le sol et le plafond.
test("un tremblement vertical ne plaque pas la mascotte", async ({ page }) => {
  await boot(page);

  const piste = (await page.locator("[data-track]").boundingBox())!,
    depart = (await mascot(page).boundingBox())!;

  await attraper(page);
  // Hors de la piste, mais dans la marge : la prise tient.
  await pousser(page, depart.x + 32, piste.y - 10);

  await expect(mascot(page)).toHaveClass(/slime--grab/u);

  await page.mouse.up();
});

// « Il peut pas sortir de la boîte » : tirer loin dehors ne fait jamais franchir un bord.
test("la mascotte ne sort jamais de sa piste", async ({ page }) => {
  await boot(page);

  const piste = (await page.locator("[data-track]").boundingBox())!;

  await attraper(page);
  await pousser(page, piste.x + piste.width + 300, piste.y - 200);
  await expect(mascot(page)).toHaveClass(/slime--splat/u);

  const box = (await mascot(page).boundingBox())!;

  expect(Math.round(box.x), "elle reste après le bord gauche").toBeGreaterThanOrEqual(
    Math.round(piste.x),
  );
  expect(Math.round(box.x + box.width), "et avant le bord droit").toBeLessThanOrEqual(
    Math.round(piste.x + piste.width),
  );
  // La piste porte une bordure basse d'un pixel, et sa boîte la compte : on tolère ce pixel
  // plutôt que d'exiger une égalité que la mise en page ne promet pas.
  expect(Math.abs(box.y - piste.y), "et dans la bande de la piste").toBeLessThanOrEqual(1);

  await page.mouse.up();
});

// On la traîne pour la forcer d'un côté : elle n'a pas de vol de retour, elle reste posée
// là où on la lâche.
test("relâchée, la mascotte reste où on l'a posée", async ({ page }) => {
  await boot(page);

  const piste = (await page.locator("[data-track]").boundingBox())!;

  await attraper(page);
  await pousser(page, piste.x - 200, piste.y + 32);
  await page.mouse.up();

  await expect(mascot(page), "elle sursaute au lâcher").toHaveClass(/slime--jump/u);

  const box = (await mascot(page).boundingBox())!;

  expect(Math.round(box.x), "collée au bord gauche de sa piste").toBe(Math.round(piste.x));
});

// L'écran de démarrage garde sa fiction : la mascotte tire sa feuille d'attente derrière
// lui, comme avant qu'elle ne devienne fixe.
test("l'écran de démarrage couvre encore la mascotte", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("[data-boot]")).toBeVisible();

  const couverte = await page.evaluate(() => {
    const box = document.querySelector("[data-mascot]")?.getBoundingClientRect();

    return box
      ? document.elementFromPoint(box.x + 32, box.y + 32)?.closest("[data-boot]") !== null
      : false;
  });

  expect(couverte, "le démarrage reste devant").toBe(true);
});

// Elle est décorative et flotte au-dessus de la page : au repos elle ne doit voler aucun
// clic. Sa place de repos est la piste, qui est vide.
test("au repos, la mascotte ne couvre aucun contrôle", async ({ page }) => {
  await boot(page);

  const derriere = await page.evaluate(() => {
    const node = document.querySelector<HTMLElement>("[data-mascot]")!,
      box = node.getBoundingClientRect();

    node.style.pointerEvents = "none";

    const behind = document.elementFromPoint(box.x + 32, box.y + 32);

    node.style.pointerEvents = "";

    return behind?.closest("button, a[href], input, [tabindex='0']")?.tagName ?? "rien";
  });

  expect(derriere, "rien de cliquable derrière elle").toBe("rien");
});

test("redimensionner la fenêtre ramène la mascotte dans sa piste", async ({ page }) => {
  await boot(page);
  await page.setViewportSize({ height: 620, width: 820 });

  const piste = (await page.locator("[data-track]").boundingBox())!,
    box = (await mascot(page).boundingBox())!;

  expect(box.x + box.width, "elle tient dans la piste rétrécie").toBeLessThanOrEqual(
    Math.round(piste.x + piste.width),
  );
});

// Traîner n'est pas cliquer. Un clic naît toujours après le relâchement du pointeur :
// sans garde, cinq glissers faisaient exploser la mascotte comme cinq clics.
test("traîner la mascotte ne compte pas pour un clic", async ({ page }) => {
  await boot(page);

  await Array.from({ length: 5 }).reduce<Promise<unknown>>(
    (chain) =>
      chain
        .then(() => attraper(page))
        .then(() => pousser(page, 460, 240))
        .then(() => page.mouse.up())
        .then(() => expect(mascot(page)).toHaveClass(/slime--idle/u, { timeout: 9000 })),
    Promise.resolve(),
  );

  await expect(mascot(page), "cinq glissers n'explosent pas").not.toHaveClass(/slime--boom/u);

  // Le clic franc, lui, doit toujours répondre.
  await mascot(page).click({ force: true });

  await expect(mascot(page)).toHaveClass(/slime--wink/u);
});

// Une activite demande un accessoire. « bike » boucle : le minuteur est sa seule sortie.
test("slime activity joue l'activité, puis rend la main", async ({ page }) => {
  const cli = await boot(page);

  await cli.fill("/slime activity bike");
  await cli.press("Enter");
  await expect(mascot(page)).toHaveClass(/slime--bike/u);
  // Trois cycles de 0,96 s, plus le filet.
  await expect(mascot(page)).toHaveClass(/slime--idle/u, { timeout: 6000 });
});

// Le train est la seule feuille qui finit sans mascotte. Un decor vide sans retour serait
// un piege : « drop » la ramene.
test("le train emmène la mascotte, puis la chute la ramène", async ({ page }) => {
  const cli = await boot(page);

  await cli.fill("/slime activity train");
  await cli.press("Enter");
  await expect(mascot(page)).toHaveClass(/slime--train/u);

  await expect(mascot(page), "le quai reste vide").toHaveAttribute("data-gone", "true", {
    timeout: 4000,
  });
  await expect(mascot(page), "elle revient en tombant").toHaveClass(/slime--drop/u, {
    timeout: 6000,
  });
  await expect(mascot(page)).toHaveClass(/slime--idle/u, { timeout: 4000 });
});

// Une trouvaille vaut une celebration, sauf quand la commande dit deja une expression.
test("un easter egg sans expression déclenche le but", async ({ page }) => {
  const cli = await boot(page);

  await cli.fill("/coffee");
  await cli.press("Enter");

  await expect(mascot(page)).toHaveClass(/slime--goal/u);
});

test("un easter egg qui dit son expression garde son expression", async ({ page }) => {
  const cli = await boot(page);

  await cli.fill("/joke");
  await cli.press("Enter");

  await expect(mascot(page)).toHaveClass(/slime--laugh/u);
  await expect(mascot(page)).not.toHaveClass(/slime--goal/u);
});

// Lire l'aide d'une commande n'est pas une trouvaille. Le but se jouait sur l'usage, parce
// que la coquille n'y voyait qu'un easter egg qui ne bouge pas la mascotte.
test("lister l'usage de slime ne déclenche pas le but", async ({ page }) => {
  const cli = await boot(page);

  await cli.fill("/slime");
  await cli.press("Enter");

  await expect(page.locator("[data-journal]")).toContainText("/slime expression <nom>");
  await expect(mascot(page)).not.toHaveClass(/slime--goal/u);
});

// Le redemarrage remettait le journal a zero mais laissait la mascotte absente, avec le
// minuteur de l'ancienne session arme.
test("redémarrer ramène la mascotte partie en explosant", async ({ page }) => {
  const cli = await boot(page);

  await cli.fill("/slime kill");
  await cli.press("Enter");
  await expect(mascot(page)).toHaveAttribute("data-gone", "true");

  await cli.fill("reboot");
  await cli.press("Enter");
  await expect(page.locator("[data-boot]")).toHaveCount(0, { timeout: 10_000 });

  // Alpine retire l'attribut quand la valeur liee est fausse : l'absence est la preuve.
  await expect(mascot(page)).not.toHaveAttribute("data-gone", "true");
});

// Absente, la mascotte ne peut rien faire : le journal doit le dire au lieu d'annoncer un
// geste que la coquille avale.
test("le slime absent refuse la commande au lieu de mentir", async ({ page }) => {
  const cli = await boot(page);

  await cli.fill("/slime kill");
  await cli.press("Enter");
  await expect(mascot(page)).toHaveAttribute("data-gone", "true");

  await cli.fill("/slime drop");
  await cli.press("Enter");

  await expect(page.locator("[data-journal]")).toContainText("le slime n'est pas la");
});

// La chaine des formes : slime -> cube -> pingouin -> slime. Chaque appel monte d'un cran, le
// troisieme referme le cycle.
test("evolve fait monter la mascotte d'un cran dans la chaîne", async ({ page }) => {
  const cli = await boot(page);

  await cli.fill("/slime evolve");
  await cli.press("Enter");

  await expect(mascot(page)).toHaveClass(/slime--evolveCube\b/u);
  await expect(mascot(page)).toHaveAttribute("data-form", "cube");
  await expect(mascot(page)).toHaveClass(/slime--idle\b/u, { timeout: 6000 });

  await cli.fill("/slime evolve");
  await cli.press("Enter");

  await expect(mascot(page)).toHaveClass(/slime--evolvePingouin\b/u);
  await expect(mascot(page)).toHaveAttribute("data-form", "pingouin");
  await expect(mascot(page)).toHaveClass(/slime--idle\b/u, { timeout: 6000 });

  await cli.fill("/slime evolve");
  await cli.press("Enter");

  await expect(mascot(page)).toHaveClass(/slime--devolve\b/u);
  await expect(mascot(page)).toHaveClass(/slime--idle\b/u, { timeout: 6000 });
  await expect(mascot(page)).toHaveAttribute("data-form", "slime");
});

// La feuille d'une forme ne part qu'a la demande, et une seule fois.
test("la feuille du cube ne part qu'à la commande, et une seule fois", async ({ page }) => {
  const asked = watchSheets(page),
    cli = await boot(page);

  await page.waitForTimeout(600);
  expect(asked).toEqual(["slime-sheets.png"]);

  await cli.fill("/slime evolve");
  await cli.press("Enter");
  await expect(mascot(page)).toHaveClass(/slime--idle\b/u, { timeout: 6000 });

  expect(asked).toEqual(["slime-sheets.png", "cube-sheets.png"]);

  // Redevenir slime puis recommencer ne retire pas la feuille du cache.
  await cli.fill("/slime evolve");
  await cli.press("Enter");
  await expect(mascot(page)).toHaveClass(/slime--idle\b/u, { timeout: 8000 });

  expect(asked).toEqual(["slime-sheets.png", "cube-sheets.png", "pingouin-sheets.png"]);
});

// Une transformation tient ses 2,4 s : la frappe, une section ou un clic la couperaient au
// milieu. C'est le seul etat qui bloque sans faire disparaitre la mascotte.
test("rien ne coupe une transformation en cours", async ({ page }) => {
  const cli = await boot(page);

  await cli.fill("/slime evolve");
  await cli.press("Enter");
  await expect(mascot(page)).toHaveClass(/slime--evolveCube\b/u);

  await cli.fill("bonjour");
  await page.locator("[data-mascot]").click({ force: true });

  await expect(mascot(page)).toHaveClass(/slime--evolveCube\b/u);
  await expect(mascot(page)).toHaveClass(/slime--idle\b/u, { timeout: 6000 });
});

// Le journal ne doit pas annoncer un geste que la coquille avale, ni dire que la mascotte
// est absente alors qu'elle est la, en train de changer.
test("pendant la transformation, la commande est refusée sans mentir", async ({ page }) => {
  const cli = await boot(page);

  await cli.fill("/slime evolve");
  await cli.press("Enter");
  await expect(mascot(page)).toHaveClass(/slime--evolveCube\b/u);

  await cli.fill("/slime kill");
  await cli.press("Enter");

  await expect(page.locator("[data-journal]")).toContainText("la mascotte change de forme");
  await expect(page.locator("[data-journal]")).not.toContainText("le slime explose");
});

// L'evolution est un easter egg : la retrouver fait partie du jeu.
test("l'évolution ne survit pas à un rechargement", async ({ page }) => {
  const cli = await boot(page);

  await cli.fill("/slime evolve");
  await cli.press("Enter");
  await expect(mascot(page)).toHaveAttribute("data-form", "cube");

  await boot(page);

  await expect(mascot(page)).toHaveAttribute("data-form", "slime");
});
