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
  // Le modele local n'existe que dans Chrome, derriere un contexte securise. Le faux
  // modele pose le contrat attendu, rien de plus : il prouve l'usage, pas l'API.
  // Le Chromium de Playwright annonce un modele telechargeable mais absent, comme la majorite des visiteurs.
  retirerModele = (page: Page) => {
    return page.addInitScript(() => {
      Reflect.deleteProperty(globalThis, "LanguageModel");
    });
  },
  // « responseConstraint » fait rendre du JSON au vrai modele : un identifiant en sort
  // entre guillemets. Un faux modele qui rend l'identifiant nu cacherait ce piege.
  poserModele = (page: Page, choix: string) => {
    return page.addInitScript((id: string) => {
      Object.defineProperty(globalThis, "LanguageModel", {
        configurable: true,
        value: {
          availability: () => {
            return Promise.resolve("available");
          },
          create: () => {
            return Promise.resolve({
              destroy: () => {
                return undefined;
              },
              prompt: () => {
                return Promise.resolve(JSON.stringify(id));
              },
            });
          },
        },
      });
    }, choix);
  },
  // Un modele qui ne repond que sur ordre. Un minuteur ferait courir le test contre la
  // latence de la machine : l'attente doit tenir tant que le test ne l'a pas relachee.
  poserModeleLent = (page: Page) => {
    return page.addInitScript(() => {
      const { promise, reject, resolve } = Promise.withResolvers<string>();

      globalThis.repondre = (id: string) => {
        resolve(JSON.stringify(id));
      };
      Object.defineProperty(globalThis, "LanguageModel", {
        configurable: true,
        value: {
          availability: () => {
            return Promise.resolve("available");
          },
          create: () => {
            return Promise.resolve({
              destroy: () => {
                return undefined;
              },
              prompt: (_input: string, options?: { signal?: AbortSignal }) => {
                options?.signal?.addEventListener("abort", () => {
                  reject(new Error("coupé"));
                });

                return promise;
              },
            });
          },
        },
      });
    });
  },
  relacherModele = (page: Page) => {
    return page.evaluate(() => {
      globalThis.repondre?.("contact");
    });
  };

test("should answer with the portfolio text on ask, with no model and no network", async ({
  page,
}) => {
  await retirerModele(page);

  const cli = await boot(page);

  await page.context().setOffline(true);
  await cli.fill("ask accessibilité RGAA");
  await cli.press("Enter");

  const journal = page.locator("[data-journal]");

  await expect(journal).toContainText("RGAA");
  await expect(journal, "the answer names its source").toContainText("impact");
});

test("should say so instead of inventing when ask finds no answer", async ({ page }) => {
  await retirerModele(page);

  const cli = await boot(page);

  await cli.fill("ask zzzzzzz");
  await cli.press("Enter");

  await expect(page.locator("[data-journal]")).toContainText("rien ne répond");
});

test("should recall its usage when ask comes without a question", async ({ page }) => {
  await retirerModele(page);

  const cli = await boot(page);

  await cli.fill("ask");
  await cli.press("Enter");

  await expect(page.locator("[data-journal]")).toContainText("posez une question");
});

// Le modele choisit un identifiant dans une liste fermee, et c'est son choix qui repond.
// Ce qui s'affiche reste le texte du corpus : il ne parle jamais a la place de Benjamin.
test("should let the model answer first and take the text from the corpus", async ({ page }) => {
  await poserModele(page, "contact");

  const cli = await boot(page);

  await cli.fill("ask où travailles-tu à Nantes");
  await cli.press("Enter");

  const journal = page.locator("[data-journal]");

  await expect(journal, "the passage shown comes from the corpus").toContainText("48 heures");
  await expect(journal, "one answer, not two").not.toContainText("whoami");
});

// Un modele qui repond n'importe quoi ne doit rien pouvoir afficher : l'identifiant est
// cherche dans le corpus, et un inconnu ne designe rien.
test("should let the corpus answer when the model invents an identifier", async ({ page }) => {
  await poserModele(page, "une-section-qui-n-existe-pas");

  const cli = await boot(page);

  await cli.fill("ask où travailles-tu à Nantes");
  await cli.press("Enter");
  await expect(page.locator("[data-journal]"), "the corpus answer takes over").toContainText(
    "Nantes",
  );
});

// Deux « ask » de suite : le choix de la premiere question ne doit pas s'ecrire sous la
// reponse de la seconde. La coupure passe par le signal donne au modele.
test("should cut the model choice of the first question when a second one comes", async ({
  page,
}) => {
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
    "one model answer only, the one of the current question",
  ).toHaveCount(0);
});

// Une commande qu'on doit deja connaitre pour la taper n'existe pas pour le visiteur.
test("should make ask discoverable through the completion and through the help", async ({
  page,
}) => {
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
test("should show the wait for the model, then clear it", async ({ page }) => {
  await poserModeleLent(page);

  const cli = await boot(page),
    attente = page.locator("[data-thinking]");

  await cli.fill("ask où travailles-tu à Nantes");
  await cli.press("Enter");

  await expect(attente).toBeVisible();
  await expect(attente).toContainText("le modèle réfléchit");

  await relacherModele(page);
  await expect(page.locator("[data-journal]")).toContainText("48 heures");
  await expect(attente, "the wait clears with the answer").toHaveCount(0);
});

// « clear » vidait le journal sans arreter la question en vol : la reponse d'avant y
// tombait toute seule, dans un journal cense etre vide.
test("should stop the question in flight on clear", async ({ page }) => {
  await poserModeleLent(page);

  const cli = await boot(page),
    journal = page.locator("[data-journal]");

  await cli.fill("ask où travailles-tu à Nantes");
  await cli.press("Enter");
  await expect(page.locator("[data-thinking]")).toBeVisible();

  await cli.fill("clear");
  await cli.press("Enter");
  await expect(page.locator("[data-thinking]"), "the wait falls too").toHaveCount(0);

  await relacherModele(page);
  await expect(journal).not.toContainText("48 heures");
});

// Le modele repond en premier, donc son silence laisserait la question sans reponse. Celle
// du corpus attend pour ce cas precis, et elle doit sortir.
test("should let the corpus answer come out when the model stays silent", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(globalThis, "LanguageModel", {
      configurable: true,
      value: {
        availability: () => {
          return Promise.resolve("available");
        },
        create: () => {
          return Promise.reject(new Error("muet"));
        },
      },
    });
  });

  const cli = await boot(page);

  await cli.fill("ask accessibilité RGAA");
  await cli.press("Enter");

  const journal = page.locator("[data-journal]");

  await expect(journal).toContainText("RGAA");
  await expect(page.locator("[data-thinking]"), "the wait clears too").toHaveCount(0);
});

// L'etincelle est la seule chose qui dise au visiteur qu'un modele local est la. Sans
// modele, elle ne doit jamais apparaitre : elle promettrait un choix que personne ne fait.
test("should show the sparkle only when a model is there", async ({ page }) => {
  await retirerModele(page);

  const cli = await boot(page),
    liste = page.locator("[data-suggestions]");

  await cli.fill("a");
  await expect(liste).toContainText("ask");
  await expect(liste, "no model, no sparkle").not.toContainText("✨");
});

test("should carry the sparkle on the search name alone when a model is there", async ({
  page,
}) => {
  await poserModele(page, "contact");

  const cli = await boot(page),
    liste = page.locator("[data-suggestions]");

  await cli.fill("a");
  await expect(liste).toContainText("ask✨");
  await expect(
    liste.locator("[data-suggestion]", { hasText: /^ask$/u }),
    "the two names are never offered together",
  ).toHaveCount(0);
});

// L'aide doit nommer la commande telle qu'elle s'offre, sinon elle envoie dans le mur.
test("should name the search in the help under the name that is offered", async ({ page }) => {
  await poserModele(page, "contact");

  const cli = await boot(page);

  await cli.fill("help");
  await cli.press("Enter");
  await expect(page.locator("[data-result]")).toContainText("ask✨ <question>");
});

// Le defaut que la revue a trouve : le recouvrement de mots ne trouvait rien, et le modele
// n'etait meme pas consulte. C'est pourtant le seul cas ou il apporte quelque chose.
test("should still go through the model for a question that no word matches", async ({ page }) => {
  await poserModele(page, "contact");

  const cli = await boot(page);

  await cli.fill("ask comment tu bosses");
  await cli.press("Enter");

  const journal = page.locator("[data-journal]");

  await expect(journal, "the model chose a passage").toContainText("48 heures");
  await expect(journal).not.toContainText("rien ne répond");
});

// Un modele qui ignore la contrainte rend l'identifiant nu. Il doit rester utilisable :
// l'API ne promet pas que tous les modeles la respectent.
test("should still use an identifier returned without JSON", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(globalThis, "LanguageModel", {
      configurable: true,
      value: {
        availability: () => {
          return Promise.resolve("available");
        },
        create: () => {
          return Promise.resolve({
            destroy: () => {
              return undefined;
            },
            prompt: () => {
              return Promise.resolve("  contact  ");
            },
          });
        },
      },
    });
  });

  const cli = await boot(page);

  await cli.fill("ask où travailles-tu");
  await cli.press("Enter");
  await expect(page.locator("[data-journal]")).toContainText("48 heures");
});

// « rien ne repond dans ce portfolio » et « le modele a lache » se lisaient pareil. Le
// premier envoyait chercher le defaut dans le contenu, quand il etait dans le modele.
test("should tell a model failure apart from a missing answer", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(globalThis, "LanguageModel", {
      configurable: true,
      value: {
        availability: () => {
          return Promise.resolve("available");
        },
        create: () => {
          return Promise.reject(new Error("refus"));
        },
      },
    });
  });

  const cli = await boot(page);

  await cli.fill("ask zzzzz");
  await cli.press("Enter");

  const journal = page.locator("[data-journal]");

  await expect(journal).toContainText("le modèle local a refusé de répondre");
  await expect(journal, "the corpus answer follows anyway").toContainText("rien ne répond");
});
