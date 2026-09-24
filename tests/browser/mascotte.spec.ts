import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { boxOf } from "../helpers/box.ts";

const boot = async (page: Page) => {
    await page.goto("/");
    await expect(page.locator("[data-boot]")).toHaveCount(0, { timeout: 10_000 });

    return page.getByLabel("Commande");
  },
  mascot = (page: Page) => {
    return page.locator("[data-mascot]");
  },
  // La construction fusionne les feuilles en une image. Ce n'est plus l'URL qui dit
  // l'etat, c'est la bande : chaque etat lit sa tranche par background-position-y.
  bande = (page: Page) => {
    return mascot(page).evaluate((node) => {
      return getComputedStyle(node).backgroundPositionY;
    });
  },
  // La construction empreinte le nom des feuilles pour le cache long : on compare la
  // racine, pas l'empreinte.
  racine = (file: string) => {
    return file.replace(/\.[\da-f]{6,}\.png$/u, ".png");
  },
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
    const box = await boxOf(mascot(page));

    await page.mouse.move(box.x + 32, box.y + 32);
    await page.mouse.down();
  },
  // Plusieurs pas : un saut unique ne dirait pas le sens du deplacement.
  pousser = (page: Page, x: number, y: number) => {
    return page.mouse.move(x, y, { steps: 12 });
  };

test("should draw the mascot from a sprite sheet and play the idle state", async ({ page }) => {
  await boot(page);

  await expect(mascot(page)).toBeVisible();
  await expect(mascot(page)).toHaveClass(/slime--idle/u);

  const fond = await mascot(page).evaluate((node) => {
    return {
      animation: getComputedStyle(node).animationName,
      image: getComputedStyle(node).backgroundImage,
      lissage: getComputedStyle(node).imageRendering,
    };
  });

  expect(fond.image, "the merged image").toMatch(/slime-sheets(?:\.[\da-f]+)?\.png/u);
  expect(fond.animation, "twelve frames").toBe("slime-12");
  expect(fond.lissage, "no smoothing on pixel art").toBe("pixelated");
  expect(await bande(page), "idle opens the image").toBe("0px");
});

// Les trente-deux etats d'une forme tiennent dans une image : une requete, pas trente-deux.
// Et une seule forme part au demarrage.
test("should carry the thirty-two slime states in a single image", async ({ page }) => {
  const asked = watchSheets(page);

  await boot(page);
  await page.waitForTimeout(600);

  expect(asked).toEqual(["slime-sheets.png"]);
});

// Mouvement reduit : la mascotte disparait, et rien ne part sur le reseau pour elle.
test("should hide the mascot and load no sheet under reduced motion", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });

  const asked = watchSheets(page);

  await boot(page);
  await page.waitForTimeout(600);

  await expect(mascot(page)).toHaveCount(0);
  expect(asked, "no sheet requested").toEqual([]);
  await expect(page.locator("[data-track]"), "the track keeps its place").toHaveCount(1);
});

test("should hide the mascot and load no sheet when animations are off", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("bd-term-opts", JSON.stringify({ anim: false }));
  });

  const asked = watchSheets(page);

  await boot(page);
  await page.waitForTimeout(600);

  await expect(mascot(page)).toHaveCount(0);
  expect(asked, "no sheet requested").toEqual([]);
  await expect(page.locator("[data-track]"), "the track keeps its place").toHaveCount(1);
});

test("should keep the mascot decorative and out of the keyboard path", async ({ page }) => {
  await boot(page);

  await expect(mascot(page)).toHaveAttribute("aria-hidden", "true");
  expect(await mascot(page).getAttribute("role")).toBeNull();
  expect(await mascot(page).getAttribute("aria-label")).toBeNull();
  expect(await mascot(page).getAttribute("tabindex")).toBeNull();
});

test("should play the wink when the mascot is clicked", async ({ page }) => {
  const asked = watchSheets(page);

  await boot(page);

  const repos = await bande(page);

  await mascot(page).click({ force: true });

  await expect(mascot(page)).toHaveClass(/slime--wink/u);
  expect(await bande(page), "the wink reads another band").not.toBe(repos);
  expect(asked, "nothing leaves: the image is already there").toEqual(["slime-sheets.png"]);
});

test("should make the mascot type while the command line is typed", async ({ page }) => {
  const cli = await boot(page);

  await cli.pressSequentially("hel");

  await expect(mascot(page)).toHaveClass(/slime--type/u);
  expect(await bande(page), "typing reads its own band").not.toBe("0px");
});

// Les evenements d'animation remontent : sans « .self », la fin de l'animation d'un
// decor ramenait la mascotte au repos au milieu de sa propre boucle.
test("should not send the mascot back to idle when a decoration animation ends", async ({
  page,
}) => {
  const cli = await boot(page);

  await cli.pressSequentially("he");
  await expect(mascot(page)).toHaveClass(/slime--type/u);

  await mascot(page).evaluate((node) => {
    const decor = document.createElement("span");

    node.append(decor);
    decor.dispatchEvent(new AnimationEvent("animationend", { bubbles: true }));
  });

  await expect(mascot(page), "typing goes on").toHaveClass(/slime--type/u);
});

// « load » boucle sans fin : sa seule sortie est le minuteur de la commande. Revenir sur
// une section deja vue coupe ce minuteur, il faut rendre la main a la main.
test("should pull the mascot out of thinking when a section already seen opens again", async ({
  page,
}) => {
  await boot(page);

  const aller = (nom: string) => {
    return page
      .getByRole("button", { name: new RegExp(nom) })
      .first()
      .click();
  };

  await aller("contact");
  await aller("whoami");

  await expect(mascot(page)).not.toHaveClass(/slime--load/u);
});

test("should trigger the morph when the theme changes", async ({ page }) => {
  await boot(page);
  await page.getByRole("button", { name: "options" }).click();
  await page.getByRole("button", { name: "noctis" }).click();

  await expect(mascot(page)).toHaveClass(/slime--morph/u);
});

// Une passe de mue dure 2,4 s, et le visiteur regarde la modale. Elle rejoue donc tant que
// la modale reste ouverte : sinon elle finit avant qu'il ne la voie.
test("should replay the morph while the options modal stays open", async ({ page }) => {
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
    fermer: (page: Page) => {
      return page.getByRole("button", { name: "close" }).click();
    },
    nom: "the close button",
  },
  {
    fermer: (page: Page) => {
      return page.getByRole("dialog").press("Escape");
    },
    nom: "the Escape key",
  },
  // Le voile de la modale ferme au clic ; le coin haut gauche tombe hors de la boîte. On
  // vise le voile et non un point de l'écran : pendant la transition de vue, un clic à
  // l'aveugle atterrit sur la racine et se perd.
  {
    fermer: (page: Page) => {
      return page
        .getByRole("dialog")
        .locator("..")
        .click({ position: { x: 5, y: 5 } });
    },
    nom: "a click outside",
  },
];

for (const { fermer, nom } of FERMETURES) {
  test(`should return the mascot to idle when ${nom} closes the modal`, async ({ page }) => {
    await boot(page);
    await page.getByRole("button", { name: "options" }).click();
    await page.getByRole("button", { name: "noctis" }).click();
    await expect(mascot(page)).toHaveClass(/slime--morph/u);

    await fermer(page);

    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(mascot(page), "the morph still holds").toHaveClass(/slime--morph/u);
    await expect(mascot(page), "then the mascot settles").toHaveClass(/slime--idle/u, {
      timeout: 9000,
    });
  });
}

// « tu laisses un petit temps histoire qu'il ait fini, et tu mets la bonne couleur » : la
// mue porte la teinte d'un thème à l'autre, elle ne saute pas au premier instant.
test("should bring the hue with the morph, not before it", async ({ page }) => {
  await boot(page);
  await page.getByRole("button", { name: "options" }).click();
  await page.getByRole("button", { name: "noctis" }).click();

  const teinte = () => {
      return mascot(page).evaluate((node) => {
        return getComputedStyle(node).filter;
      });
    },
    depart = await teinte();

  expect(depart, "the hue starts from the old theme").not.toContain("hue-rotate(117deg)");

  await expect.poll(teinte, { timeout: 9000 }).toContain("hue-rotate(117deg)");
});

// Sans mascotte, changer de theme ne doit rien jouer ni rien telecharger : la promesse
// « aucune feuille en mouvement reduit » vaut aussi quand le theme change.
// Trop court, la personne qui tape ne voit jamais l'animation : elle regarde ses mots.
test("should hold the typing state for one thousand four hundred milliseconds after the last key", async ({
  page,
}) => {
  const cli = await boot(page);

  await cli.pressSequentially("hel");
  await expect(mascot(page)).toHaveClass(/slime--type/u);

  await page.waitForTimeout(1100);
  expect(await mascot(page).getAttribute("class"), "the mascot still types at 1100 ms").toBe(
    "slime slime--type",
  );

  await page.waitForTimeout(600);
  expect(await mascot(page).getAttribute("class"), "the mascot handed back after 1400 ms").not.toBe(
    "slime slime--type",
  );
});

// Anti-rebond : tant qu'on tape, le compte à rebours repart de zéro.
test("should restart the typing countdown on every key", async ({ page }) => {
  const cli = await boot(page);

  // Six touches espacées de 600 ms, moins que le délai de retour : seule la relance à
  // chaque frappe garde la mascotte sur « type » jusqu'au bout.
  await Array.from({ length: 6 }).reduce<Promise<unknown>>((chain) => {
    return chain
      .then(() => {
        return cli.press("h");
      })
      .then(() => {
        return page.waitForTimeout(600);
      });
  }, Promise.resolve());

  expect(await mascot(page).getAttribute("class"), "typing was not cut").toBe("slime slime--type");
});

test("should load no sheet when the theme changes without a mascot", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });

  const asked = watchSheets(page);

  await boot(page);
  await page.getByRole("button", { name: "options" }).click();
  await page.getByRole("button", { name: "noctis" }).click();
  await page.waitForTimeout(600);

  await expect(page.locator(".tm")).toHaveAttribute("data-theme", "noctis");
  await expect(mascot(page)).toHaveCount(0);
  expect(asked, "no sheet requested").toEqual([]);
});

// Rallumer les animations apres un changement de theme remonte la mascotte : elle doit
// reprendre son repos, pas rester sur la mue d'un theme deja applique.
test("should return to idle when animations come back after a theme change", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("bd-term-opts", JSON.stringify({ anim: false }));
  });

  await boot(page);
  await page.getByRole("button", { name: "options" }).click();
  await page.getByRole("button", { name: "noctis" }).click();
  await page.getByRole("button", { name: /animations/ }).click();
  await page.getByRole("dialog").press("Escape");

  await expect(mascot(page)).toHaveCount(1);
  await expect(mascot(page)).toHaveClass(/slime--idle/u);
});

// Les couleurs sont cuites dans les PNG : les themes sombres les font tourner.
test("should rotate the hue on dark themes and leave light themes alone", async ({ page }) => {
  const filtre = (theme: string) => {
    return page.evaluate((chosen) => {
      const shell = document.querySelector<HTMLElement>(".tm"),
        node = document.querySelector<HTMLElement>("[data-mascot]");

      if (!shell || !node) {
        throw new Error("no terminal or no mascot");
      }

      shell.dataset.theme = chosen;

      return getComputedStyle(node).filter;
    }, theme);
  };

  await boot(page);

  expect(await filtre("dark"), "the sheet amber is already the theme amber").toBe("none");
  expect(await filtre("noctis")).toContain("hue-rotate(117deg)");
  expect(await filtre("azureus")).toContain("hue-rotate(163deg)");
  expect(await filtre("uva")).toContain("hue-rotate(205deg)");
  expect(await filtre("bordo")).toContain("hue-rotate(306deg)");
  expect(await filtre("light"), "amber palette unchanged").toBe("none");
  expect(await filtre("lux")).toBe("none");
  expect(await filtre("hibernus")).toBe("none");
});

// La ligne du journal dit « mise en veille » : la mascotte doit dormir, pas cligner.
test("should really put the mascot to sleep on the sleep command", async ({ page }) => {
  const cli = await boot(page);

  await cli.fill("/sleep");
  await cli.press("Enter");

  await expect(mascot(page)).toHaveClass(/slime--sleep/u);
});

// Trois expressions jouaient « jump » et une quatrieme « wink » : la commande annoncait une
// emotion et rendait le geste d'a cote. Chacune porte maintenant sa feuille.
for (const expression of ["alert", "happy", "laugh", "sad", "scared", "sleep"]) {
  test(`should play its own sheet for the ${expression} expression`, async ({ page }) => {
    const cli = await boot(page);

    await cli.fill(`/slime ${expression}`);
    await cli.press("Enter");

    await expect(mascot(page)).toHaveClass(new RegExp(`slime--${expression}\\b`, "u"));
  });
}

// Une animation infinie n'emet jamais animationend. Sans le minuteur, ces trois-la
// tourneraient jusqu'a la fin de la visite.
test("should hand looping expressions back to idle", async ({ page }) => {
  const cli = await boot(page);

  await cli.fill("/slime scared");
  await cli.press("Enter");
  await expect(mascot(page)).toHaveClass(/slime--scared/u);
  // Trois cycles d'une seconde, plus le filet.
  await expect(mascot(page)).toHaveClass(/slime--idle/u, { timeout: 6000 });
});

test("should blow the mascot up on slime kill and bring it back by itself", async ({ page }) => {
  const cli = await boot(page);

  await cli.fill("/slime kill");
  await cli.press("Enter");
  await expect(mascot(page)).toHaveClass(/slime--boom/u);

  await expect(mascot(page)).toHaveClass(/slime--reform/u, { timeout: 15_000 });
  await expect(mascot(page)).not.toHaveClass(/slime--(?:boom|reform)/u, { timeout: 5000 });
});

test("should make the mascot speak on a command", async ({ page }) => {
  const cli = await boot(page);

  await cli.fill("/joke");
  await cli.press("Enter");

  await expect(page.locator("[data-bubble]")).toContainText("héhé");
});

// La position passe par le style, pas par l'état réactif : la faire transiter par Alpine
// ferait rerendre la page a chaque image.
test("should write the position straight into the style", async ({ page }) => {
  const cli = await boot(page);

  await cli.fill("/slime drop");
  await cli.press("Enter");

  await expect
    .poll(() => {
      return mascot(page).evaluate((node) => {
        return node.style.left;
      });
    })
    .toMatch(/px$/u);
});

// Cinq clics font exploser le slime. Il ne repond plus a rien jusqu'a sa reapparition.
test("should blow the mascot up after five clicks", async ({ page }) => {
  await boot(page);

  await Array.from({ length: 5 }).reduce<Promise<unknown>>((chain) => {
    return chain.then(() => {
      return mascot(page).click({ force: true });
    });
  }, Promise.resolve());

  await expect(mascot(page)).toHaveClass(/slime--boom/u);
});

test("should stop answering once the mascot has blown up", async ({ page }) => {
  const cli = await boot(page);

  await Array.from({ length: 5 }).reduce<Promise<unknown>>((chain) => {
    return chain.then(() => {
      return mascot(page).click({ force: true });
    });
  }, Promise.resolve());
  await expect(mascot(page)).toHaveClass(/slime--boom/u);

  expect(
    await mascot(page).evaluate((node) => {
      return getComputedStyle(node).pointerEvents;
    }),
    "the debris cannot be clicked",
  ).toBe("none");

  await mascot(page).click({ force: true });
  await cli.pressSequentially("he");

  expect(await mascot(page).getAttribute("class"), "nothing dislodges the mascot").toBe(
    "slime slime--boom",
  );
});

// Entre cinq et dix secondes plus tard, elle reprend forme, puis son repos.
test("should reform the mascot after its explosion", async ({ page }) => {
  await boot(page);

  await Array.from({ length: 5 }).reduce<Promise<unknown>>((chain) => {
    return chain.then(() => {
      return mascot(page).click({ force: true });
    });
  }, Promise.resolve());

  await expect(mascot(page)).toHaveClass(/slime--reform/u, { timeout: 15_000 });
  // Reformée, elle quitte l'explosion et se laisse de nouveau toucher. Son état exact
  // dépend du temps écoulé : dix secondes sans geste et la veille prend la main.
  await expect(mascot(page)).not.toHaveClass(/slime--(?:boom|reform)/u, { timeout: 5000 });
  expect(
    await mascot(page).evaluate((node) => {
      return getComputedStyle(node).pointerEvents;
    }),
  ).toBe("auto");
});

test("should no longer mention any crown", async ({ page }) => {
  await boot(page);

  const garde = await page.evaluate(() => {
    return localStorage.getItem("bd-term-opts");
  });

  expect(garde ?? "", "the crown is no longer stored").not.toContain("crowned");
  await expect(mascot(page)).not.toHaveClass(/slime--(?:king|crown)/u);
});

// Couper les animations depuis la modale retire la mascotte sur-le-champ.
test("should remove the mascot when animations are turned off", async ({ page }) => {
  await boot(page);
  await page.getByRole("button", { name: "options" }).click();
  await page.getByRole("button", { name: /animations/ }).click();
  await page.getByRole("dialog").press("Escape");

  await expect(mascot(page)).toHaveCount(0);
});

// Le bloc de la mascotte doit etre assez grand pour etre clique : c'etait la cause du
// curseur faux et de la couronne inatteignable.
test("should give the mascot a clickable target, not a pixel", async ({ page }) => {
  await boot(page);

  const box = await boxOf(mascot(page));

  expect(box.width).toBe(64);
  expect(box.height).toBe(64);
  expect(
    await mascot(page).evaluate((node) => {
      return getComputedStyle(node).cursor;
    }),
  ).toBe("grab");
});

test("should play the grab when the mascot is caught", async ({ page }) => {
  await boot(page);
  await attraper(page);

  await expect(mascot(page)).toHaveClass(/slime--grab/u);

  await page.mouse.up();
});

// Le plaquage naît du curseur qui sort de la piste, et non d'une collision entre le sprite
// et un bord. La mascotte est retenue, et elle montre qu'on tire dessus en vain.
test("should splat the mascot against the edge the cursor leaves the track by", async ({
  page,
}) => {
  await boot(page);

  const piste = await boxOf(page.locator("[data-track]")),
    milieuX = piste.x + piste.width / 2,
    milieuY = piste.y + piste.height / 2,
    // La marge verticale figée vaut 24 px : on la dépasse franchement.
    dehors = 40;

  await attraper(page);

  await pousser(page, milieuX, piste.y - dehors);
  await expect(mascot(page), "above").toHaveClass(/slime--splatCeiling$/u);

  await pousser(page, milieuX, piste.y + piste.height + dehors);
  await expect(mascot(page), "below").toHaveClass(/slime--splatFloor$/u);

  await pousser(page, piste.x - dehors, milieuY);
  await expect(mascot(page), "on the left").toHaveClass(/slime--splatLeft$/u);

  await pousser(page, piste.x + piste.width + dehors, milieuY);
  await expect(mascot(page), "on the right").toHaveClass(/slime--splatRight$/u);

  await page.mouse.up();
});

// « steps(12) » finit sa course sur la treizieme case, qui n'existe pas : la bande fait
// douze cases, et le douzieme pas s'arrete a -768px, hors du dessin. Le plaquage tenait donc
// du vide, et la mascotte disparaissait sous la main qui la retenait.
test("should keep the last frame of a splat that is held long", async ({ page }) => {
  await boot(page);

  const piste = await boxOf(page.locator("[data-track]"));

  await attraper(page);
  await pousser(page, piste.x - 40, piste.y + piste.height / 2);
  await expect(mascot(page)).toHaveClass(/slime--splatLeft$/u);

  // La passe dure 0,96 s. On attend bien au-dela, comme une main qui ne lache pas.
  await page.waitForTimeout(1600);

  const arret = await mascot(page).evaluate((node) => {
    return getComputedStyle(node).backgroundPositionX;
  });

  expect(arret, "the twelfth frame, not the thirteenth").toBe("-704px");

  await page.mouse.up();
});

// Curseur en diagonale, les deux lectures sont vraies au meme instant. Sans les quatre
// coins, la mascotte jouait un mur alors qu'elle est collee aux deux.
test("should splat the mascot into the corner when the cursor goes diagonal", async ({ page }) => {
  await boot(page);

  const piste = await boxOf(page.locator("[data-track]")),
    dehors = 40,
    gauche = piste.x - dehors,
    droite = piste.x + piste.width + dehors,
    haut = piste.y - dehors,
    bas = piste.y + piste.height + dehors;

  await attraper(page);

  await pousser(page, gauche, haut);
  await expect(mascot(page), "top left").toHaveClass(/slime--splatCeilingLeft/u);

  await pousser(page, droite, haut);
  await expect(mascot(page), "top right").toHaveClass(/slime--splatCeilingRight/u);

  await pousser(page, gauche, bas);
  await expect(mascot(page), "bottom left").toHaveClass(/slime--splatFloorLeft/u);

  await pousser(page, droite, bas);
  await expect(mascot(page), "bottom right").toHaveClass(/slime--splatFloorRight/u);

  await page.mouse.up();
});

// La piste a exactement la hauteur du sprite : le curseur en sortirait par le haut ou par
// le bas en une trentaine de pixels. Sans marge, un tremblement pendant un glisser
// horizontal ferait clignoter le sol et le plafond.
test("should not splat the mascot on a vertical shake", async ({ page }) => {
  await boot(page);

  const piste = await boxOf(page.locator("[data-track]")),
    depart = await boxOf(mascot(page));

  await attraper(page);
  // Hors de la piste, mais dans la marge : la prise tient.
  await pousser(page, depart.x + 32, piste.y - 10);

  await expect(mascot(page)).toHaveClass(/slime--grab/u);

  await page.mouse.up();
});

// « Il peut pas sortir de la boîte » : tirer loin dehors ne fait jamais franchir un bord.
test("should never let the mascot leave its track", async ({ page }) => {
  await boot(page);

  const piste = await boxOf(page.locator("[data-track]"));

  await attraper(page);
  await pousser(page, piste.x + piste.width + 300, piste.y - 200);
  await expect(mascot(page)).toHaveClass(/slime--splat/u);

  const box = await boxOf(mascot(page));

  expect(Math.round(box.x), "the mascot stays past the left edge").toBeGreaterThanOrEqual(
    Math.round(piste.x),
  );
  expect(Math.round(box.x + box.width), "and before the right edge").toBeLessThanOrEqual(
    Math.round(piste.x + piste.width),
  );
  // La piste porte une bordure basse d'un pixel, et sa boîte la compte : on tolère ce pixel
  // plutôt que d'exiger une égalité que la mise en page ne promet pas.
  expect(Math.abs(box.y - piste.y), "and inside the track band").toBeLessThanOrEqual(1);

  await page.mouse.up();
});

// On la traîne pour la forcer d'un côté : elle n'a pas de vol de retour, elle reste posée
// là où on la lâche.
test("should leave the mascot where it is released", async ({ page }) => {
  await boot(page);

  const piste = await boxOf(page.locator("[data-track]"));

  await attraper(page);
  await pousser(page, piste.x - 200, piste.y + 32);
  await page.mouse.up();

  await expect(mascot(page), "the mascot jumps on release").toHaveClass(/slime--jump/u);

  const box = await boxOf(mascot(page));

  expect(Math.round(box.x), "stuck to the left edge of its track").toBe(Math.round(piste.x));
});

// L'écran de démarrage garde sa fiction : la mascotte tire sa feuille d'attente derrière
// lui, comme avant qu'elle ne devienne fixe.
test("should still cover the mascot with the boot screen", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("[data-boot]")).toBeVisible();

  const couverte = await page.evaluate(() => {
    const box = document.querySelector("[data-mascot]")?.getBoundingClientRect();

    return box
      ? document.elementFromPoint(box.x + 32, box.y + 32)?.closest("[data-boot]") !== null
      : false;
  });

  expect(couverte, "the boot screen stays in front").toBe(true);
});

// Elle est décorative et flotte au-dessus de la page : au repos elle ne doit voler aucun
// clic. Sa place de repos est la piste, qui est vide.
test("should cover no inner element while the mascot is idle", async ({ page }) => {
  await boot(page);

  const derriere = await page.evaluate(() => {
    const node = document.querySelector<HTMLElement>("[data-mascot]");

    if (!node) {
      throw new Error("no mascot");
    }

    const box = node.getBoundingClientRect();

    node.style.pointerEvents = "none";

    const behind = document.elementFromPoint(box.x + 32, box.y + 32);

    node.style.pointerEvents = "";

    return behind?.closest("button, a[href], input, [tabindex='0']")?.tagName ?? "rien";
  });

  expect(derriere, "nothing clickable behind the mascot").toBe("rien");
});

test("should bring the mascot back into its track when the window is resized", async ({ page }) => {
  await boot(page);
  await page.setViewportSize({ height: 620, width: 820 });

  const piste = await boxOf(page.locator("[data-track]")),
    box = await boxOf(mascot(page));

  expect(box.x + box.width, "the mascot fits in the shrunk track").toBeLessThanOrEqual(
    Math.round(piste.x + piste.width),
  );
});

// Traîner n'est pas cliquer. Un clic naît toujours après le relâchement du pointeur :
// sans garde, cinq glissers faisaient exploser la mascotte comme cinq clics.
test("should not count a mascot drag as a click", async ({ page }) => {
  await boot(page);

  await Array.from({ length: 5 }).reduce<Promise<unknown>>((chain) => {
    return chain
      .then(() => {
        return attraper(page);
      })
      .then(() => {
        return pousser(page, 460, 240);
      })
      .then(() => {
        return page.mouse.up();
      })
      .then(() => {
        return expect(mascot(page)).toHaveClass(/slime--idle/u, { timeout: 9000 });
      });
  }, Promise.resolve());

  await expect(mascot(page), "five drags do not explode").not.toHaveClass(/slime--boom/u);

  // Le clic franc, lui, doit toujours répondre.
  await mascot(page).click({ force: true });

  await expect(mascot(page)).toHaveClass(/slime--wink/u);
});

// Une activite demande un accessoire. « bike » boucle : le minuteur est sa seule sortie.
test("should play the activity on slime activity, then hand back", async ({ page }) => {
  const cli = await boot(page);

  await cli.fill("/slime activity bike");
  await cli.press("Enter");
  await expect(mascot(page)).toHaveClass(/slime--bike/u);
  // Trois cycles de 0,96 s, plus le filet.
  await expect(mascot(page)).toHaveClass(/slime--idle/u, { timeout: 6000 });
});

// Le train est la seule feuille qui finit sans mascotte. Un decor vide sans retour serait
// un piege : « drop » la ramene.
test("should take the mascot away on the train, then drop it back", async ({ page }) => {
  const cli = await boot(page);

  await cli.fill("/slime activity train");
  await cli.press("Enter");
  await expect(mascot(page)).toHaveClass(/slime--train/u);

  await expect(mascot(page), "the platform stays empty").toHaveAttribute("data-gone", "true", {
    timeout: 4000,
  });
  await expect(mascot(page), "the mascot comes back falling").toHaveClass(/slime--drop/u, {
    timeout: 6000,
  });
  await expect(mascot(page)).toHaveClass(/slime--idle/u, { timeout: 4000 });
});

// Une trouvaille vaut une celebration, sauf quand la commande dit deja une expression.
test("should trigger the goal on an easter egg without expression", async ({ page }) => {
  const cli = await boot(page);

  await cli.fill("/coffee");
  await cli.press("Enter");

  await expect(mascot(page)).toHaveClass(/slime--goal/u);
});

test("should keep the expression of an easter egg that names one", async ({ page }) => {
  const cli = await boot(page);

  await cli.fill("/joke");
  await cli.press("Enter");

  await expect(mascot(page)).toHaveClass(/slime--laugh/u);
  await expect(mascot(page)).not.toHaveClass(/slime--goal/u);
});

// Lire l'aide d'une commande n'est pas une trouvaille. Le but se jouait sur l'usage, parce
// que la coquille n'y voyait qu'un easter egg qui ne bouge pas la mascotte.
test("should not trigger the goal when the slime usage is listed", async ({ page }) => {
  const cli = await boot(page);

  await cli.fill("/slime");
  await cli.press("Enter");

  await expect(page.locator("[data-journal]")).toContainText("/slime expression <nom>");
  await expect(mascot(page)).not.toHaveClass(/slime--goal/u);
});

// Le redemarrage remettait le journal a zero mais laissait la mascotte absente, avec le
// minuteur de l'ancienne session arme.
test("should bring back a mascot that left by exploding when the page reboots", async ({
  page,
}) => {
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
test("should refuse the command instead of lying while the slime is gone", async ({ page }) => {
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
test("should move the mascot one step up the chain on evolve", async ({ page }) => {
  const cli = await boot(page);

  await cli.fill("/slime evolve");
  await cli.press("Enter");

  await expect(mascot(page)).toHaveClass(/slime--evolveCube\b/u);
  await expect(mascot(page)).toHaveAttribute("data-form", "cube");
  // La bande, et pas seulement la classe : une regle de forme trop specifique ecrasait le
  // decalage vertical, et toutes les bandes retombaient sur la premiere.
  expect(await bande(page), "the transition opens its own band").toBe("-2048px");

  await expect(mascot(page)).toHaveClass(/slime--idle\b/u, { timeout: 6000 });
  expect(await bande(page), "the cube idle opens the first band").toBe("0px");

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
test("should request the cube sheet only on the command, and only once", async ({ page }) => {
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
test("should let nothing interrupt a transformation in progress", async ({ page }) => {
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
test("should refuse the command without lying during the transformation", async ({ page }) => {
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
test("should not keep the evolution across a reload", async ({ page }) => {
  const cli = await boot(page);

  await cli.fill("/slime evolve");
  await cli.press("Enter");
  await expect(mascot(page)).toHaveAttribute("data-form", "cube");

  await boot(page);

  await expect(mascot(page)).toHaveAttribute("data-form", "slime");
});

// Une forme evoluee doit jouer ses etats comme le slime : meme bande, meme feuille.
test("should play the cube states on the right bands", async ({ page }) => {
  const cli = await boot(page);

  await cli.fill("/slime evolve");
  await cli.press("Enter");
  await expect(mascot(page)).toHaveClass(/slime--idle\b/u, { timeout: 6000 });

  await cli.fill("/slime expression sleep");
  await cli.press("Enter");

  await expect(mascot(page)).toHaveClass(/slime--sleep\b/u);
  expect(await bande(page), "sleep does not open the idle band").not.toBe("0px");

  const feuille = await mascot(page).evaluate((node) => {
    return getComputedStyle(node).backgroundImage;
  });

  expect(feuille).toContain("cube-sheets");
});
