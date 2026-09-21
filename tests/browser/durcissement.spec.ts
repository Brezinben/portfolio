import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

// Compose plutot qu'ecrit en clair : no-script-url interdit le litteral, alors qu'il est
// ici la charge utile du test.
// Ce que le test sert a la place de content.json. La forme est celle d'un contenu
// normal : ce sont les valeurs qui sont hostiles, et c'est tout le sujet.
interface ContenuServi {
  feedback?: Record<string, string>;
  jokes?: string[];
  profile?: { email: string };
  sections?: unknown[];
  share?: unknown;
}

const SCRIPT = ["java", "script:"].join(""),
  HOSTILE = {
    feedback: { fallbackEmail: "a@b.c", host: "https://a.test", tool: "GoatCounter" },
    jokes: ["x"],
    profile: { email: "a@b.c" },
    sections: [
      {
        cmd: "bd whoami",
        id: "whoami",
        label: "whoami",
        lines: [{ t: "charge utile", tone: "fg);background-image:url(https://evil.example/pixel" }],
        out: {
          lines: [["k", "v", "fg2);background-image:url(https://evil.example/dl", "fg"]],
          title: "s",
        },
        sub: "s",
      },
    ],
    share: {
      targets: [
        { id: "piege", kind: "open", label: "piège", url: `${SCRIPT}globalThis.pwned = 1` },
      ],
      text: "t",
      title: "t",
      url: "https://exemple.test/",
    },
  },
  serve = (page: Page, body: ContenuServi) => {
    return page.route("**/content.json", (route) => {
      return route.fulfill({ body: JSON.stringify(body), contentType: "application/json" });
    });
  },
  boot = async (page: Page) => {
    await page.goto("/");
    await expect(page.locator("[data-boot]")).toHaveCount(0, { timeout: 10_000 });
  };

// Un ton venu du contenu est interpole dans un attribut style. Sans liste blanche, il
// ferme la declaration et fait sortir une requete vers un serveur tiers.
test("should send no request out when the content carries a hostile tone", async ({ page }) => {
  const leaked: string[] = [];

  page.on("request", (request) => {
    if (request.url().includes("evil.example")) {
      leaked.push(request.url());
    }
  });

  await serve(page, HOSTILE);
  await boot(page);
  await page.waitForTimeout(1500);

  expect(leaked, "the content must not be able to call a third-party server").toEqual([]);
  await expect(page.locator("[data-result]")).toContainText("charge utile");
});

// Une cible declaree dans le contenu ne doit pas pouvoir executer de script.
test("should never open a share target that carries a script URL", async ({ page }) => {
  await serve(page, HOSTILE);
  await boot(page);
  await page.evaluate(() => {
    // La page note ce qu'on a tente d'ouvrir : le faux n'ouvre et ne rend rien, c'est tout ce que le test observe.
    // SAFETY: « opened » est pose par ces deux lignes seules ; aucun autre code de la
    // page ne porte ce nom.
    const temoin = globalThis as typeof globalThis & { opened?: string };

    temoin.opened = "aucune";
    temoin.open = (url?: string | URL) => {
      temoin.opened = String(url);

      return globalThis.window;
    };
  });

  const cli = page.getByLabel("Commande");

  await cli.fill("share piege");
  await cli.press("Enter");
  await page.waitForTimeout(400);

  expect(
    await page.evaluate(() => {
      // SAFETY: « opened » vient d'etre pose par le faux « open » installe ci-dessus.
      return (globalThis as { opened?: string }).opened;
    }),
  ).toBe("aucune");
  await expect(page.locator("[data-journal]")).toContainText("cible inconnue");
});

// Une sequence pourcent invalide ne doit pas tuer la commande.
test("should raise no exception on a badly encoded URL", async ({ page }) => {
  const errors: string[] = [];

  page.on("pageerror", (error) => {
    return errors.push(error.message);
  });

  await serve(page, {
    ...HOSTILE,
    share: {
      ...HOSTILE.share,
      targets: [{ id: "casse", kind: "open", label: "c", url: "https://x.test/%E0%A4%A" }],
    },
  });
  await boot(page);

  const cli = page.getByLabel("Commande");

  await cli.fill("share casse");
  await cli.press("Enter");
  await page.waitForTimeout(400);

  expect(errors).toEqual([]);
});
