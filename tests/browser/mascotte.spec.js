import { expect, test } from "@playwright/test";

const boot = async (page) => {
  await page.goto("/");
  await expect(page.locator("[data-boot]")).toHaveCount(0, { timeout: 10_000 });

  return page.getByLabel("Commande");
};

const mascot = (page) => page.locator("[data-mascot]");

// La construction empreinte le nom des feuilles pour le cache long : on compare la
// racine, pas l'empreinte.
const racine = (file) => file.replace(/\.[\da-f]{6,}\.png$/u, ".png");

// Les feuilles sont lourdes : on ne tire que celle qu'on montre.
const watchSheets = (page) => {
  const asked = [];

  page.on("request", (request) => {
    if (request.url().includes("/sprites/")) {
      asked.push(racine(request.url().split("/").pop()));
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

  expect(fond.image, "la feuille de repos").toMatch(/slime-idle(?:\.[\da-f]+)?\.png/u);
  expect(fond.animation, "douze frames").toBe("slime-12");
  expect(fond.lissage, "aucun lissage sur du pixel art").toBe("pixelated");
});

// Neuf feuilles pesent vingt kilo-octets : le premier rendu n'en tire qu'une.
test("le premier rendu ne charge que la feuille de repos", async ({ page }) => {
  const asked = watchSheets(page);

  await boot(page);
  await page.waitForTimeout(600);

  expect(asked).toEqual(["slime-idle.png"]);
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
  await mascot(page).click({ force: true });

  await expect(mascot(page)).toHaveClass(/slime--wink/u);
  await expect.poll(() => asked).toContain("slime-wink.png");
});

test("la frappe dans la saisie fait taper la mascotte", async ({ page }) => {
  const cli = await boot(page);

  await cli.pressSequentially("hel");

  await expect(mascot(page)).toHaveClass(/slime--type/u);
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

  const aller = (nom) =>
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

// Les couleurs sont cuites dans les PNG : les themes sombres les font tourner.
test("les thèmes sombres font tourner la teinte, les clairs non", async ({ page }) => {
  const filtre = (theme) =>
    page.evaluate((chosen) => {
      document.querySelector(".tm").dataset.theme = chosen;

      return getComputedStyle(document.querySelector("[data-mascot]")).filter;
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

test("la couronne tombe après le bon nombre de clics et survit au rechargement", async ({
  page,
}) => {
  await boot(page);

  const target = new Date().getFullYear() - 2000;

  await Array.from({ length: target }).reduce(
    (chain) => chain.then(() => mascot(page).click({ force: true })),
    Promise.resolve(),
  );

  await expect(mascot(page)).toHaveClass(/slime--crown/u);
  await expect(mascot(page), "le repos devient couronné").toHaveClass(/slime--king/u, {
    timeout: 5000,
  });

  await page.reload();
  await expect(page.locator("[data-boot]")).toHaveCount(0, { timeout: 10_000 });

  await expect(mascot(page), "la couronne est conservée sur l'appareil").toHaveClass(
    /slime--king/u,
  );
});

// La couronne acquise, aucune feuille sans couronne ne doit reprendre le repos.
test("la couronne ne se perd ni au repos demandé ni au clic", async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem("bd-term-opts", JSON.stringify({ crowned: true })),
  );

  const cli = await boot(page);

  await expect(mascot(page)).toHaveClass(/slime--king/u);

  // Lecture sans attente : une classe qui se corrige au bout de sa passe ne compte pas,
  // c'est justement la seconde et demie ou la couronne disparait.
  const classe = () => mascot(page).getAttribute("class");

  await cli.fill("/slime idle");
  await cli.press("Enter");
  expect(await classe(), "« idle » rend le repos couronné").toBe("slime slime--king");

  await mascot(page).click({ force: true });
  expect(await classe(), "le roi ne cligne pas sans sa couronne").toBe("slime slime--king");
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

  expect(box.width).toBe(64);
  expect(box.height).toBe(64);
  expect(await mascot(page).evaluate((node) => getComputedStyle(node).cursor)).toBe("grab");
});
