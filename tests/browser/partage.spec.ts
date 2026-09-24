import type { Locator, Page } from "@playwright/test";
import { expect, test } from "@playwright/test";

const boot = async (page: Page) => {
    await page.goto("/");
    await expect(page.locator("[data-boot]")).toHaveCount(0, { timeout: 10_000 });

    return page.getByLabel("Commande");
  },
  run = async (cli: Locator, command: string) => {
    await cli.fill(command);
    await cli.press("Enter");
  };

test("should list the targets declared in the content when share runs alone", async ({ page }) => {
  const cli = await boot(page);

  await run(cli, "share");

  await expect(page.locator("[data-journal]")).toContainText("linkedin");
  await expect(page.locator("[data-journal]")).toContainText("github");
});

test("should copy the address on share link", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);

  const cli = await boot(page);

  await run(cli, "share link");

  await expect(page.locator("[data-journal]")).toContainText("partage vers");

  // L'adresse partagee est celle d'ou la page vient, pas celle que content.json annonce :
  // le lien copie depuis une preproduction doit ramener a cette preproduction.
  const here = await page.evaluate(() => {
    return globalThis.location.origin + globalThis.location.pathname;
  });

  expect(
    await page.evaluate(() => {
      return navigator.clipboard.readText();
    }),
  ).toContain(here);
});

test("should say so without opening anything on an unknown target", async ({ page }) => {
  const cli = await boot(page);

  await run(cli, "share nexistepas");

  await expect(page.locator("[data-journal]")).toContainText("cible inconnue");
});

// Consentement en deux temps : rien ne part avant un oui.
test("should announce what leaves and wait for the confirmation on propose", async ({ page }) => {
  const cli = await boot(page);

  await run(cli, "/propose ajouter une section veille");

  const journal = page.locator("[data-journal]");

  await expect(journal).toContainText("ajouter une section veille");
  await expect(journal).toContainText("analytics.brezinben.dpdns.org");
  await expect(journal).toContainText("Votre texte, et rien d'autre");
  await expect(journal).toContainText("Aucune adresse IP");
  await expect(journal).toContainText("oui ou non");
});

// La reponse attendue est deja ecrite : valider tient en une touche.
test("should prefill the command line with « oui » on propose", async ({ page }) => {
  const cli = await boot(page);

  await run(cli, "/propose une idée");

  await expect(cli).toHaveValue("oui");
});

// -y vaut consentement : le drapeau a ete tape avec l'idee.
test("should wait for no confirmation on propose -y", async ({ page }) => {
  const cli = await boot(page);

  await run(cli, "/propose -y une idée pressée");

  const journal = page.locator("[data-journal]");

  await expect(journal).toContainText("une idée pressée");
  await expect(journal).not.toContainText("oui ou non");
  await expect(cli, "the command line stays free").toHaveValue("");
});

test("should send nothing when the answer is « non »", async ({ page }) => {
  const cli = await boot(page);

  await run(cli, "/propose une idée");
  await run(cli, "non");

  await expect(page.locator("[data-journal]")).toContainText("rien n'a été envoyé");
});

test("should set no cookie", async ({ page, context }) => {
  const cli = await boot(page);

  await run(cli, "help");
  await run(cli, "/joke");

  expect(await context.cookies()).toEqual([]);
});

// GoatCounter bloque ou absent ne doit rien casser : le helper est silencieux.
test("should not break the page when the audience measurement is blocked", async ({ page }) => {
  await page.route("**/analytics.brezinben.dpdns.org/**", (route) => {
    return route.abort();
  });

  const cli = await boot(page);

  await run(cli, "/sudo");

  await expect(page.locator("[data-journal]")).toContainText("sudoers");
  await expect(page.locator('[data-pane="main"]')).toBeVisible();
});

// Ce que la page ouvre dans un autre onglet ou dans le client de courrier, sans l'ouvrir.
// La liste vit sur la racine du document : le test la relit comme un attribut.
const spyOpen = async (page: Page) => {
    await page.addInitScript(() => {
      globalThis.open = (url) => {
        const root = document.documentElement;

        root.dataset.opened = [root.dataset.opened, String(url)].filter(Boolean).join("\n");

        // Le contrat de window.open rend « null » quand rien ne s'ouvre.
        // oxlint-disable-next-line unicorn/no-null
        return null;
      };
    });
  },
  opened = async (page: Page) => {
    const list = await page.locator("html").getAttribute("data-opened");

    return (list ?? "").split("\n").filter(Boolean);
  };

// Le chemin principal d'un recruteur : l'adresse, puis le courrier, puis les profils.
test("should copy the address on email", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);

  const cli = await boot(page);

  await run(cli, "email");

  await expect(page.locator("[data-journal]")).toContainText("copié");
  expect(
    await page.evaluate(() => {
      return navigator.clipboard.readText();
    }),
  ).toMatch(/^[^@\s]+@[^@\s]+$/u);
});

test("should open the mail client on send-mail", async ({ page }) => {
  await spyOpen(page);

  const cli = await boot(page);

  await run(cli, "send-mail");

  await expect
    .poll(() => {
      return opened(page);
    })
    .toEqual([expect.stringMatching(/^mailto:[^@]+%40|^mailto:[^@]+@/u)]);
});

for (const target of ["linkedin", "github"]) {
  test(`should open the ${target} target in a new tab`, async ({ page }) => {
    await spyOpen(page);

    const cli = await boot(page);

    await run(cli, `share ${target}`);

    await expect
      .poll(() => {
        return opened(page);
      })
      .toEqual([expect.stringContaining(target)]);
  });
}

// Le consentement se juge au réseau : « non » ne part nulle part, « oui » part.
for (const [answer, sent] of [
  ["non", 0],
  ["oui", 1],
] as const) {
  test(`should send ${sent} request on « ${answer} »`, async ({ page }) => {
    const counted: string[] = [];

    await page.route("**/count.js", (route) => {
      return route.abort();
    });
    await page.route("**/count?**", (route) => {
      counted.push(route.request().url());

      return route.fulfill({ status: 200 });
    });

    const cli = await boot(page);

    await run(cli, "/propose une idée");
    await run(cli, answer);

    await expect(page.locator("[data-journal]")).toContainText(
      sent === 0 ? "rien n'a été envoyé" : "proposition envoyée",
    );
    expect(counted).toHaveLength(sent);
  });
}
