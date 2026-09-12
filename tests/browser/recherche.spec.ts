import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

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
  // Un modele qui ne repond qu'a l'abandon : il laisse voir laquelle des deux questions
  // est coupee, ce qu'un modele instantane cacherait.
  poserModeleLent = (page: Page) =>
    page.addInitScript(() => {
      Object.defineProperty(globalThis, "LanguageModel", {
        configurable: true,
        value: {
          availability: () => Promise.resolve("available"),
          create: () =>
            Promise.resolve({
              destroy: () => undefined,
              prompt: (_input: string, options?: { signal?: AbortSignal }) => {
                const { promise, reject, resolve } = Promise.withResolvers<string>();

                options?.signal?.addEventListener("abort", () => {
                  reject(new Error("coupé"));
                });
                setTimeout(() => {
                  resolve("contact");
                }, 300);

                return promise;
              },
            }),
        },
      });
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
  const cli = await boot(page);

  await cli.fill("ask zzzzzzz");
  await cli.press("Enter");

  await expect(page.locator("[data-journal]")).toContainText("rien ne répond");
});

test("ask sans question rappelle comment l'employer", async ({ page }) => {
  const cli = await boot(page);

  await cli.fill("ask");
  await cli.press("Enter");

  await expect(page.locator("[data-journal]")).toContainText("posez une question");
});

// Le modele choisit un identifiant dans une liste fermee. Ce qui s'affiche reste le texte
// du corpus : il ne parle jamais a la place de Benjamin.
test("un modèle local ajoute sa piste, sans effacer la réponse lexicale", async ({ page }) => {
  await poserModele(page, "contact");

  const cli = await boot(page);

  await cli.fill("ask où travailles-tu à Nantes");
  await cli.press("Enter");

  const journal = page.locator("[data-journal]");

  await expect(journal).toContainText("le modèle local lit plutôt");
  await expect(journal, "le passage affiché vient du corpus").toContainText("48 heures");
});

// Un modele qui repond n'importe quoi ne doit rien pouvoir afficher : l'identifiant est
// cherche dans le corpus, et un inconnu ne designe rien.
test("un modèle qui invente un identifiant n'affiche rien", async ({ page }) => {
  await poserModele(page, "une-section-qui-n-existe-pas");

  const cli = await boot(page);

  await cli.fill("ask où travailles-tu à Nantes");
  await cli.press("Enter");
  await expect(page.locator("[data-journal]")).toContainText("Nantes");
  await expect(page.locator("[data-journal]")).not.toContainText("le modèle local lit plutôt");
});

test("ai dit honnêtement qu'aucun modèle n'est là", async ({ page }) => {
  await retirerModele(page);

  const cli = await boot(page);

  await cli.fill("ai");
  await cli.press("Enter");

  const journal = page.locator("[data-journal]");

  await expect(journal).toContainText("aucun modèle local");
  await expect(journal, "le repli est nommé").toContainText("marche quand même");
});

// L'API presente et le modele absent est le cas le plus frequent. Il n'est pas une panne,
// et la commande ne doit pas le dire comme si c'en etait une.
test("ai distingue un modèle installable d'un modèle absent", async ({ page }) => {
  const cli = await boot(page);

  await cli.fill("ai");
  await cli.press("Enter");

  await expect(page.locator("[data-journal]")).toContainText("installable, mais pas installé");
});

test("ai reconnaît un modèle présent", async ({ page }) => {
  await poserModele(page, "whoami");

  const cli = await boot(page);

  await cli.fill("ai");
  await cli.press("Enter");

  await expect(page.locator("[data-journal]")).toContainText("un modèle local répond");
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
  await expect(
    journal.locator("text=le modèle local lit plutôt"),
    "un seul choix de modèle, celui de la question en cours",
  ).toHaveCount(1);
});
