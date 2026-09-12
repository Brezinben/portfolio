import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

// Le faux modele pose sa gachette sur la page. La declarer evite de la retrouver par une
// assertion de type, qui masquerait une vraie erreur si le nom changeait.
declare global {
  // eslint-disable-next-line no-var, vars-on-top
  var repondre: ((id: string) => void) | undefined;
}

const boot = async (page: Page) => {
    await page.goto("/");
    await expect(page.locator("[data-boot]")).toHaveCount(0, { timeout: 10_000 });

    return page.getByLabel("Commande");
  },
  // Le modele local n'existe que dans Chrome, derriere un contexte securise. Le faux modele
  // pose le contrat que la page attend, et rien de plus : il ne prouve pas l'API, il prouve
  // que la page s'en sert comme annonce.
  // Le Chromium de Playwright porte l'API, et annonce un modele telechargeable mais absent.
  // C'est aussi le cas majoritaire chez les visiteurs : l'API existe, le modele n'est pas la.
  retirerModele = (page: Page) =>
    page.addInitScript(() => {
      Reflect.deleteProperty(globalThis, "LanguageModel");
    }),
  poserModele = (page: Page, choix: string) =>
    page.addInitScript((id: string) => {
      Object.defineProperty(globalThis, "LanguageModel", {
        configurable: true,
        value: {
          availability: () => Promise.resolve("available"),
          create: () =>
            Promise.resolve({
              destroy: () => undefined,
              prompt: () => Promise.resolve(id),
            }),
        },
      });
    }, choix),
  // Un modele qui ne repond que sur ordre. Un minuteur ferait courir le test contre la
  // latence de la machine : l'attente doit tenir tant que le test ne l'a pas relachee.
  poserModeleLent = (page: Page) =>
    page.addInitScript(() => {
      const { promise, reject, resolve } = Promise.withResolvers<string>();

      globalThis.repondre = resolve;
      Object.defineProperty(globalThis, "LanguageModel", {
        configurable: true,
        value: {
          availability: () => Promise.resolve("available"),
          create: () =>
            Promise.resolve({
              destroy: () => undefined,
              prompt: (_input: string, options?: { signal?: AbortSignal }) => {
                options?.signal?.addEventListener("abort", () => {
                  reject(new Error("coupé"));
                });

                return promise;
              },
            }),
        },
      });
    }),
  relacherModele = (page: Page) =>
    page.evaluate(() => {
      globalThis.repondre?.("contact");
    });

test("ask répond avec le texte du portfolio, sans modèle et sans réseau", async ({ page }) => {
  await retirerModele(page);

  const cli = await boot(page);

  await page.context().setOffline(true);
  await cli.fill("ask accessibilité RGAA");
  await cli.press("Enter");

  const journal = page.locator("[data-journal]");

  await expect(journal).toContainText("RGAA");
  await expect(journal, "la réponse nomme sa source").toContainText("impact");
});

test("ask sans réponse le dit au lieu d'inventer", async ({ page }) => {
  await retirerModele(page);

  const cli = await boot(page);

  await cli.fill("ask zzzzzzz");
  await cli.press("Enter");

  await expect(page.locator("[data-journal]")).toContainText("rien ne répond");
});

test("ask sans question rappelle comment l'employer", async ({ page }) => {
  await retirerModele(page);

  const cli = await boot(page);

  await cli.fill("ask");
  await cli.press("Enter");

  await expect(page.locator("[data-journal]")).toContainText("posez une question");
});

// Le modele choisit un identifiant dans une liste fermee, et c'est son choix qui repond.
// Ce qui s'affiche reste le texte du corpus : il ne parle jamais a la place de Benjamin.
test("le modèle répond en premier, et le corpus fournit le texte", async ({ page }) => {
  await poserModele(page, "contact");

  const cli = await boot(page);

  await cli.fill("ask où travailles-tu à Nantes");
  await cli.press("Enter");

  const journal = page.locator("[data-journal]");

  await expect(journal, "le passage affiché vient du corpus").toContainText("48 heures");
  await expect(journal, "une seule réponse, pas deux").not.toContainText("whoami");
});

// Un modele qui repond n'importe quoi ne doit rien pouvoir afficher : l'identifiant est
// cherche dans le corpus, et un inconnu ne designe rien.
test("un modèle qui invente un identifiant laisse répondre le corpus", async ({ page }) => {
  await poserModele(page, "une-section-qui-n-existe-pas");

  const cli = await boot(page);

  await cli.fill("ask où travailles-tu à Nantes");
  await cli.press("Enter");
  await expect(
    page.locator("[data-journal]"),
    "la réponse du corpus reprend la main",
  ).toContainText("Nantes");
});

// Deux « ask » de suite : le choix de la premiere question ne doit pas s'ecrire sous la
// reponse de la seconde. La coupure passe par le signal donne au modele.
test("une seconde question coupe le choix du modèle sur la première", async ({ page }) => {
  await poserModeleLent(page);

  const cli = await boot(page);

  await cli.fill("ask où travailles-tu à Nantes");
  await cli.press("Enter");
  await cli.fill("ask accessibilité RGAA");
  await cli.press("Enter");

  const journal = page.locator("[data-journal]");

  await expect(journal).toContainText("RGAA");
  await relacherModele(page);
  await expect(
    journal.locator("text=48 heures"),
    "une seule réponse de modèle, celle de la question en cours",
  ).toHaveCount(0);
});

// Une commande qu'on doit deja connaitre pour la taper n'existe pas pour le visiteur.
test("ask se decouvre par la completion et par l'aide", async ({ page }) => {
  await retirerModele(page);

  const cli = await boot(page);

  await cli.fill("a");
  await expect(page.locator("[data-suggestions]")).toContainText("ask");

  await cli.fill("help");
  await cli.press("Enter");
  await expect(page.locator("[data-result]")).toContainText("ask <question>");
});

// Rien ne s'affiche avant que le modele ait choisi. Sans marque d'attente, la commande
// paraitrait sans effet.
test("l'attente du modèle se voit, puis disparaît", async ({ page }) => {
  await poserModeleLent(page);

  const cli = await boot(page),
    attente = page.locator("[data-thinking]");

  await cli.fill("ask où travailles-tu à Nantes");
  await cli.press("Enter");

  await expect(attente).toBeVisible();
  await expect(attente).toContainText("le modèle réfléchit");

  await relacherModele(page);
  await expect(page.locator("[data-journal]")).toContainText("48 heures");
  await expect(attente, "l'attente s'efface avec la réponse").toHaveCount(0);
});

// « clear » vidait le journal sans arreter la question en vol : la reponse d'avant y
// tombait toute seule, dans un journal cense etre vide.
test("clear arrête la question en vol", async ({ page }) => {
  await poserModeleLent(page);

  const cli = await boot(page),
    journal = page.locator("[data-journal]");

  await cli.fill("ask où travailles-tu à Nantes");
  await cli.press("Enter");
  await expect(page.locator("[data-thinking]")).toBeVisible();

  await cli.fill("clear");
  await cli.press("Enter");
  await expect(page.locator("[data-thinking]"), "l'attente tombe aussi").toHaveCount(0);

  await relacherModele(page);
  await expect(journal).not.toContainText("48 heures");
});

// Le modele repond en premier, donc son silence laisserait la question sans reponse. Celle
// du corpus attend pour ce cas precis, et elle doit sortir.
test("un modèle muet laisse la réponse du corpus sortir", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(globalThis, "LanguageModel", {
      configurable: true,
      value: {
        availability: () => Promise.resolve("available"),
        create: () => Promise.reject(new Error("muet")),
      },
    });
  });

  const cli = await boot(page);

  await cli.fill("ask accessibilité RGAA");
  await cli.press("Enter");

  const journal = page.locator("[data-journal]");

  await expect(journal).toContainText("RGAA");
  await expect(page.locator("[data-thinking]"), "l'attente s'efface aussi").toHaveCount(0);
});

// L'etincelle est la seule chose qui dise au visiteur qu'un modele local est la. Sans
// modele, elle ne doit jamais apparaitre : elle promettrait un choix que personne ne fait.
test("l'étincelle n'apparaît que si un modèle est là", async ({ page }) => {
  await retirerModele(page);

  const cli = await boot(page),
    liste = page.locator("[data-suggestions]");

  await cli.fill("a");
  await expect(liste).toContainText("ask");
  await expect(liste, "aucun modèle, aucune étincelle").not.toContainText("✨");
});

test("avec un modèle, la recherche porte l'étincelle et elle seule", async ({ page }) => {
  await poserModele(page, "contact");

  const cli = await boot(page),
    liste = page.locator("[data-suggestions]");

  await cli.fill("a");
  await expect(liste).toContainText("ask✨");
  await expect(
    liste.locator("[data-suggestion]", { hasText: /^ask$/u }),
    "les deux noms ne s'offrent jamais ensemble",
  ).toHaveCount(0);
});

// L'aide doit nommer la commande telle qu'elle s'offre, sinon elle envoie dans le mur.
test("l'aide nomme la recherche sous le nom qui s'offre", async ({ page }) => {
  await poserModele(page, "contact");

  const cli = await boot(page);

  await cli.fill("help");
  await cli.press("Enter");
  await expect(page.locator("[data-result]")).toContainText("ask✨ <question>");
});

// Le defaut que la revue a trouve : le recouvrement de mots ne trouvait rien, et le modele
// n'etait meme pas consulte. C'est pourtant le seul cas ou il apporte quelque chose.
test("une question qu'aucun mot ne trouve passe quand même par le modèle", async ({ page }) => {
  await poserModele(page, "contact");

  const cli = await boot(page);

  await cli.fill("ask comment tu bosses");
  await cli.press("Enter");

  const journal = page.locator("[data-journal]");

  await expect(journal, "le modèle a choisi un passage").toContainText("48 heures");
  await expect(journal).not.toContainText("rien ne répond");
});
